import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ── AI helper ─────────────────────────────────────────────────────────────────
async function callAI(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 1200,
): Promise<string> {
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: maxTokens,
      temperature: 0.6,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Parse JSON safely from AI output ─────────────────────────────────────────
function parseJSON<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PathStep {
  module_slug: string;
  difficulty: "debutant" | "intermediaire" | "expert";
  estimated_time: number; // minutes
  motivation_hook: string;
  step_type: "module" | "exercise" | "sleep_session" | "simulation" | "quiz";
  domain: string;
  branch_label: string; // which "universe branch" this belongs to
  cve_alert?: string; // injected if recent CVE is relevant
  branch_divergence?: {
    if_mastered: string; // next slug if user succeeds
    if_struggled: string; // next slug if user needs remediation
  };
}

interface AdaptivePath {
  persona_snapshot: string;
  temporal_mirror: string; // description of simulated future user in 6 months
  active_branch: string;
  steps: PathStep[];
  recommended_weekly_rhythm: string;
  top_cve_focus: string | null;
}

interface UserProfile {
  persona: string;
  level: number;
  full_name: string | null;
  org_id: string | null;
}

interface SkillGap {
  name: string;
  domain: string;
  score: number;
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(token);

  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const { branch = "optimal", regenerate = false } = body as {
    branch?: string;
    regenerate?: boolean;
  };

  // ── Fetch user context in parallel ───────────────────────────────────────
  const [profileRes, masteryRes, progressRes, streakRes, modulesRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("persona, level, full_name, org_id")
        .eq("id", user.id)
        .maybeSingle(),

      supabase
        .from("skill_mastery")
        .select("p_mastery, skill_id, skills(name, domain, slug)")
        .eq("user_id", user.id)
        .order("p_mastery", { ascending: true })
        .limit(10),

      supabase
        .from("progress")
        .select("module_id, status, score, modules(slug, title, domain)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(15),

      supabase
        .from("user_streaks")
        .select("current_streak, total_xp, longest_streak")
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("modules")
        .select("slug, title, domain, difficulty")
        .eq("is_published", true)
        .limit(50),
    ]);

  const profile = (profileRes.data as UserProfile | null) ?? {
    persona: "salarie",
    level: 1,
    full_name: null,
    org_id: null,
  };

  type MasteryRow = {
    p_mastery: number;
    skill_id: string;
    skills: { name: string; domain: string; slug: string } | null;
  };
  const masteryData = (masteryRes.data ?? []) as MasteryRow[];

  const topGaps: SkillGap[] = masteryData
    .filter((m) => m.skills)
    .slice(0, 3)
    .map((m) => ({
      name: m.skills!.name,
      domain: m.skills!.domain,
      score: Math.round(m.p_mastery * 100),
    }));

  const completedSlugs = (progressRes.data ?? [])
    .filter((p) => p.status === "completed")
    .map(
      (p) =>
        (p.modules as { slug?: string } | null)?.slug ?? p.module_id,
    );

  const availableSlugs = (modulesRes.data ?? [])
    .filter((m) => !completedSlugs.includes(m.slug))
    .map((m) => `${m.slug} [${m.domain}/${m.difficulty}]`)
    .slice(0, 30);

  const streakData = streakRes.data as {
    current_streak?: number;
    total_xp?: number;
    longest_streak?: number;
  } | null;

  // ── Check cache (skip if regenerate flag) ────────────────────────────────
  if (!regenerate) {
    const { data: cached } = await supabase
      .from("brain_generated_modules")
      .select("content, created_at")
      .eq("user_id", user.id)
      .eq("generated_by", "adaptive-path-engine")
      .eq("status", "active")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .maybeSingle();

    if (cached?.content) {
      return new Response(JSON.stringify(cached.content), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ── Chain of thought prompt ───────────────────────────────────────────────
  const systemPrompt = `Tu es le moteur de parcours adaptatif de Formetoialia.
Tu utilises deux concepts clés :

1. **TEMPORAL MIRROR** : Simule l'utilisateur dans 6 mois si il suit le parcours optimal vs s'il ne fait rien. Décris cette vision du futur dans "temporal_mirror".

2. **INFINITE BRANCHING** : Chaque step a un branch_divergence — si maîtrisé → branche A, si en difficulté → branche B (remédiation). Cela crée des univers parallèles de formation.

Chaîne de pensée OBLIGATOIRE :
1. Analyse le profil actuel (persona, niveau, gaps, streak)
2. Simule le futur utilisateur dans 6 mois (Temporal Mirror)
3. Identifie les 3 branches possibles (optimal / challenger / recovery)
4. Priorise les menaces CVE récentes dans les premières steps
5. Génère le parcours

Format de sortie : JSON valide UNIQUEMENT (sans markdown), structure :
{
  "persona_snapshot": "résumé 1 ligne du profil actuel",
  "temporal_mirror": "description du futur utilisateur dans 6 mois si il suit ce parcours vs s'il abandonne",
  "active_branch": "optimal|challenger|recovery",
  "recommended_weekly_rhythm": "ex: 2 modules + 1 simulation par semaine",
  "top_cve_focus": "CVE récent le plus critique pour ce profil (ou null)",
  "steps": [
    {
      "module_slug": "slug-du-module",
      "difficulty": "debutant|intermediaire|expert",
      "estimated_time": 15,
      "motivation_hook": "phrase percutante style Tony Stark pour motiver",
      "step_type": "module|exercise|sleep_session|simulation|quiz",
      "domain": "cyber|ia_pro|ia_perso|vibe_coding",
      "branch_label": "optimal",
      "cve_alert": "si pertinent, CVE ID ou null",
      "branch_divergence": {
        "if_mastered": "slug-module-suivant-si-reussi",
        "if_struggled": "slug-module-remédiation"
      }
    }
  ]
}

Génère EXACTEMENT 7 steps couvrant les 4 semaines à venir.
Les sleep_session sont des révisions légères (< 10 min) à faire avant de dormir.
Les simulation sont des attaques réelles simulées (30 min).`;

  const userPrompt = `PROFIL UTILISATEUR :
- Persona : ${profile.persona}
- Niveau : ${profile.level}/5
- Streak : ${streakData?.current_streak ?? 0} jours
- XP total : ${streakData?.total_xp ?? 0}
- Branche demandée : ${branch}

TOP GAPS (lacunes prioritaires) :
${topGaps.length > 0 ? topGaps.map((g) => `- ${g.name} (${g.domain}) : ${g.score}% de maîtrise`).join("\n") : "- Aucune donnée de maîtrise encore"}

MODULES DÉJÀ COMPLÉTÉS :
${completedSlugs.slice(0, 10).join(", ") || "Aucun"}

MODULES DISPONIBLES (utilise ces slugs) :
${availableSlugs.join("\n")}

Génère le parcours adaptatif avec Temporal Mirror + Infinite Branching.`;

  let adaptivePath: AdaptivePath | null = null;

  try {
    const raw = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    adaptivePath = parseJSON<AdaptivePath>(raw);

    if (!adaptivePath || !Array.isArray(adaptivePath.steps)) {
      throw new Error("Invalid AI response structure");
    }
  } catch (err) {
    console.error("AI generation failed:", err);
    // Fallback path
    adaptivePath = {
      persona_snapshot: `${profile.persona} niveau ${profile.level}`,
      temporal_mirror:
        "Dans 6 mois avec ce parcours : autonomie complète sur les cybermenaces IA. Sans formation : exposé aux attaques GPT-4 phishing qui trompent 94% des employés.",
      active_branch: branch,
      recommended_weekly_rhythm: "2 modules + 1 simulation par semaine",
      top_cve_focus: "CVE-2024-3400 (PAN-OS) — critique pour les profils entreprise",
      steps: [
        {
          module_slug: availableSlugs[0]?.split(" ")[0] ?? "phishing-ia-fondamentaux",
          difficulty: profile.level <= 2 ? "debutant" : "intermediaire",
          estimated_time: 20,
          motivation_hook:
            "Iron Man n'avait pas de JARVIS au début. Toi non plus. Mais ça va changer.",
          step_type: "module",
          domain: topGaps[0]?.domain ?? "cyber",
          branch_label: "optimal",
          branch_divergence: {
            if_mastered: availableSlugs[1]?.split(" ")[0] ?? "phishing-avance",
            if_struggled: "phishing-ia-fondamentaux",
          },
        },
      ],
    };
  }

  // ── Persist to brain_generated_modules for caching ───────────────────────
  await supabase
    .from("brain_generated_modules")
    .upsert(
      {
        user_id: user.id,
        title: `Parcours adaptatif — ${new Date().toLocaleDateString("fr-FR")}`,
        domain: topGaps[0]?.domain ?? "cyber",
        content: adaptivePath as unknown as Record<string, unknown>,
        status: "active",
        generated_by: "adaptive-path-engine",
        predicted_gap: topGaps[0]?.score ?? null,
        target_skill: topGaps[0]?.name ?? null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "user_id,generated_by", ignoreDuplicates: false },
    )
    .eq("generated_by", "adaptive-path-engine");

  // ── Track brain event ─────────────────────────────────────────────────────
  await supabase.from("brain_events").insert({
    user_id: user.id,
    org_id: profile.org_id,
    event_type: "adaptive_path_generated",
    metadata: {
      branch: adaptivePath.active_branch,
      steps_count: adaptivePath.steps.length,
      top_gap: topGaps[0]?.name ?? null,
    },
  });

  return new Response(JSON.stringify(adaptivePath), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
