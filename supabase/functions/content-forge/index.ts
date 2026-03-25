import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronSecret } from "../_shared/cron-auth.ts";

const ALLOWED_ORIGINS = [
  "https://formetoialia.com",
  "https://www.formetoialia.com",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".lovable.app") ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };
}

// ── OpenRouter call helper ─────────────────────────────────────────────────────
async function openrouterCall(params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  apiKey: string;
}): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://formetoialia.com",
      "X-Title": "Formetoialia Content Forge",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter [${params.model}] HTTP ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Parse JSON safely ──────────────────────────────────────────────────────────
function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? (JSON.parse(match[0]) as T) : fallback;
  } catch (_e) {
    return fallback;
  }
}

// ── Check if a threat is relevant to a module ─────────────────────────────────
async function checkRelevance(params: {
  threatTitle: string;
  threatSummary: string;
  moduleTitle: string;
  moduleDomain: string;
  moduleSubtitle: string;
  apiKey: string;
}): Promise<{ relevant: boolean; reason: string; affected_section?: string }> {
  const raw = await openrouterCall({
    model: "deepseek/deepseek-chat",
    apiKey: params.apiKey,
    maxTokens: 300,
    temperature: 0.1,
    systemPrompt: `Tu es un expert en contenu pédagogique (IA, cybersécurité, vibe coding).
Détermine si une menace ou actualité impacte un module de formation spécifique.
Réponds UNIQUEMENT en JSON: {"relevant": true/false, "reason": "...", "affected_section": "titre de la section concernée ou null"}`,
    userPrompt: `Menace/Actualité: "${params.threatTitle}"
Résumé: "${params.threatSummary}"

Module: "${params.moduleTitle}" (domaine: ${params.moduleDomain})
Sous-titre: "${params.moduleSubtitle}"

Est-ce que cette menace rend une partie du contenu du module obsolète ou nécessite une mise à jour ?`,
  });

  return safeParseJson(raw, { relevant: false, reason: "parse_error" });
}

// ── Model A: Writer ── régénère une section ──────────────────────────────────
async function rewriteSection(params: {
  threatTitle: string;
  threatSummary: string;
  moduleTitle: string;
  currentSection: { title: string; body: string; key_points?: string[] };
  affectedSection: string;
  apiKey: string;
}): Promise<{ title: string; body: string; key_points: string[]; warning?: string } | null> {
  const raw = await openrouterCall({
    model: "deepseek/deepseek-chat",
    apiKey: params.apiKey,
    maxTokens: 1200,
    temperature: 0.4,
    systemPrompt: `Tu es un expert pédagogique spécialisé en cybersécurité et IA.
Tu dois mettre à jour une section d'un module de formation en intégrant une nouvelle information.
RÈGLES STRICTES:
- Garde le même ton pédagogique et le niveau de difficulté
- Ne fais aucune affirmation sans base factuelle
- Si incertain, signale-le avec ⚠️
- Réponds UNIQUEMENT en JSON avec les champs: {"title": "...", "body": "...", "key_points": ["...", ...], "warning": "..." ou null}
- "body" doit faire entre 150 et 400 mots
- "key_points" doit contenir 3 à 5 points clés`,
    userPrompt: `Module: "${params.moduleTitle}"
Section à mettre à jour: "${params.affectedSection}"

Contenu actuel:
TITRE: ${params.currentSection.title}
CORPS: ${params.currentSection.body}
POINTS CLÉS: ${(params.currentSection.key_points ?? []).join(" | ")}

Nouvelle menace/information à intégrer:
TITRE: ${params.threatTitle}
RÉSUMÉ: ${params.threatSummary}

Génère la section mise à jour en JSON.`,
  });

  return safeParseJson(raw, null);
}

// ── Model B: Validator ── vérifie les hallucinations ─────────────────────────
async function validateSection(params: {
  originalSection: { title: string; body: string };
  updatedSection: { title: string; body: string; key_points: string[] };
  threatTitle: string;
  threatSummary: string;
  apiKey: string;
}): Promise<{ passed: boolean; confidence: number; reason: string; issues?: string[] }> {
  const raw = await openrouterCall({
    model: "anthropic/claude-3-haiku",
    apiKey: params.apiKey,
    maxTokens: 500,
    temperature: 0.1,
    systemPrompt: `Tu es un validateur de contenu pédagogique spécialisé en détection d'hallucinations IA.
Ta mission: vérifier qu'un contenu mis à jour est factuel, cohérent et n'invente pas de faits.
Réponds UNIQUEMENT en JSON: {
  "passed": true/false,
  "confidence": 0.0-1.0,
  "reason": "explication courte",
  "issues": ["problème 1", ...] ou []
}
Critères d'échec:
- Chiffres ou statistiques inventés sans source
- Dates ou noms d'entités incorrects
- Contradictions internes
- Affirmations trop absolues ("toujours", "jamais", "impossible")
- Contenu hors-sujet par rapport à la menace`,
    userPrompt: `Section originale:
TITRE: ${params.originalSection.title}
CORPS: ${params.originalSection.body}

Section mise à jour proposée:
TITRE: ${params.updatedSection.title}
CORPS: ${params.updatedSection.body}
POINTS CLÉS: ${params.updatedSection.key_points.join(" | ")}

Menace justifiant la mise à jour:
${params.threatTitle}: ${params.threatSummary}

Valide cette mise à jour.`,
  });

  return safeParseJson(raw, {
    passed: false,
    confidence: 0,
    reason: "validator_parse_error",
    issues: ["Impossible de parser la réponse du validateur"],
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Auth: CRON_SECRET (called by pg_cron, no JWT) ──────────────────────────
  try {
    verifyCronSecret(req);
  } catch (resp) {
    return resp as Response;
  }

  const runStart = Date.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!OPENROUTER_API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: "OPENROUTER_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: { module_id?: string; dry_run?: boolean } = {};
  try { body = await req.json(); } catch (_e) { /* cron call, no body */ }
  const isDryRun = body.dry_run === true;

  const summary = {
    threats_analyzed: 0,
    modules_checked: 0,
    updates_attempted: 0,
    updates_applied: 0,
    updates_rejected: 0,
    errors: 0,
    duration_ms: 0,
  };

  try {
    // ── 1. Fetch recent cyber threat items (last 48h) ─────────────────────────
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: recentItems, error: itemsError } = await supabase
      .from("source_items")
      .select("id, title, summary, source_id, published_at, sources_watchlist!inner(domain, name, tags)")
      .gte("created_at", since)
      .not("summary", "is", null)
      .limit(30);

    if (itemsError) throw itemsError;

    const { data: legacyItems } = await supabase
      .from("source_items")
      .select("id, title, summary, source_id, published_at, sources!inner(domain, name)")
      .gte("created_at", since)
      .not("summary", "is", null)
      .limit(20);

    type ThreatItem = { id: string; title: string; summary: string; source: string; domain: string };
    const threatMap = new Map<string, ThreatItem>();

    (recentItems ?? []).forEach((item: Record<string, unknown>) => {
      const sw = item.sources_watchlist as Record<string, string> | null;
      if (!sw) return;
      const key = String(item.title).slice(0, 80);
      if (!threatMap.has(key)) {
        threatMap.set(key, {
          id: String(item.id),
          title: String(item.title),
          summary: String(item.summary ?? "").slice(0, 500),
          source: String(sw.name ?? ""),
          domain: String(sw.domain ?? "general"),
        });
      }
    });

    (legacyItems ?? []).forEach((item: Record<string, unknown>) => {
      const src = item.sources as Record<string, string> | null;
      if (!src) return;
      const key = String(item.title).slice(0, 80);
      if (!threatMap.has(key)) {
        threatMap.set(key, {
          id: String(item.id),
          title: String(item.title),
          summary: String(item.summary ?? "").slice(0, 500),
          source: String(src.name ?? ""),
          domain: String(src.domain ?? "general"),
        });
      }
    });

    const threats = Array.from(threatMap.values());
    summary.threats_analyzed = threats.length;

    if (threats.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, summary: { ...summary, message: "No recent threats found" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Fetch published modules ─────────────────────────────────────────
    const moduleQuery = supabase
      .from("modules")
      .select("id, slug, title, subtitle, domain, content_json, version")
      .eq("is_published", true);

    if (body.module_id) moduleQuery.eq("id", body.module_id);

    const { data: modules, error: modError } = await moduleQuery.limit(50);
    if (modError) throw modError;
    summary.modules_checked = (modules ?? []).length;

    // ── 3. Process each (threat × module) pair — max 10 pairs per run ─────
    const PAIR_LIMIT = 10;
    let pairsProcessed = 0;

    for (const threat of threats) {
      if (pairsProcessed >= PAIR_LIMIT) break;

      for (const mod of modules ?? []) {
        if (pairsProcessed >= PAIR_LIMIT) break;

        const logEntry: Record<string, unknown> = {
          module_id: mod.id,
          module_slug: mod.slug,
          threat_source: threat.source,
          threat_title: threat.title.slice(0, 300),
          model_writer: "deepseek/deepseek-chat",
          model_validator: "anthropic/claude-3-haiku",
          old_version: mod.version ?? 1,
        };

        const stepStart = Date.now();

        try {
          const relevance = await checkRelevance({
            threatTitle: threat.title,
            threatSummary: threat.summary,
            moduleTitle: mod.title,
            moduleDomain: mod.domain,
            moduleSubtitle: mod.subtitle ?? "",
            apiKey: OPENROUTER_API_KEY,
          });

          if (!relevance.relevant) continue;
          pairsProcessed++;
          summary.updates_attempted++;

          const contentJson = mod.content_json as {
            sections: Array<{ title: string; body: string; key_points?: string[]; warning?: string; examples?: unknown[] }>;
          };
          const sections = contentJson?.sections ?? [];

          const affectedIdx = sections.findIndex(
            (s) => relevance.affected_section &&
              s.title.toLowerCase().includes(relevance.affected_section.toLowerCase().slice(0, 20))
          ) ?? 0;
          const targetIdx = affectedIdx >= 0 ? affectedIdx : 0;
          const targetSection = sections[targetIdx];

          if (!targetSection) {
            logEntry.error = "No section found to update";
            logEntry.validation_passed = false;
            logEntry.duration_ms = Date.now() - stepStart;
            await supabase.from("forge_log").insert(logEntry);
            continue;
          }

          const updatedSection = await rewriteSection({
            threatTitle: threat.title,
            threatSummary: threat.summary,
            moduleTitle: mod.title,
            currentSection: targetSection,
            affectedSection: relevance.affected_section ?? targetSection.title,
            apiKey: OPENROUTER_API_KEY,
          });

          if (!updatedSection) {
            logEntry.error = "Writer model returned empty content";
            logEntry.validation_passed = false;
            logEntry.duration_ms = Date.now() - stepStart;
            await supabase.from("forge_log").insert(logEntry);
            summary.updates_rejected++;
            continue;
          }

          const validation = await validateSection({
            originalSection: targetSection,
            updatedSection,
            threatTitle: threat.title,
            threatSummary: threat.summary,
            apiKey: OPENROUTER_API_KEY,
          });

          logEntry.validation_passed = validation.passed;
          logEntry.validation_reason = `[${validation.confidence.toFixed(2)}] ${validation.reason}${validation.issues?.length ? " | Issues: " + validation.issues.join("; ") : ""}`;
          logEntry.duration_ms = Date.now() - stepStart;

          if (!validation.passed || validation.confidence < 0.70) {
            summary.updates_rejected++;
            await supabase.from("forge_log").insert(logEntry);
            console.log(`❌ Rejected update for ${mod.slug}: ${validation.reason}`);
            continue;
          }

          if (!isDryRun) {
            const newSections = [...sections];
            newSections[targetIdx] = {
              ...targetSection,
              ...updatedSection,
              examples: targetSection.examples,
            };

            const newVersion = (mod.version ?? 1) + 1;
            logEntry.new_version = newVersion;

            const { error: updateError } = await supabase
              .from("modules")
              .update({
                content_json: { ...contentJson, sections: newSections },
                version: newVersion,
                updated_at: new Date().toISOString(),
                confidence_score: Math.min(0.98, (mod as Record<string, unknown>).confidence_score as number ?? 0.85),
              })
              .eq("id", mod.id);

            if (updateError) {
              logEntry.error = `DB update failed: ${updateError.message}`;
              summary.errors++;
            } else {
              summary.updates_applied++;
              console.log(`✅ Updated module ${mod.slug} (v${newVersion}) — ${threat.title.slice(0, 60)}`);
            }
          } else {
            summary.updates_applied++;
            console.log(`🔍 DRY RUN — Would update ${mod.slug}: ${validation.reason}`);
          }

          await supabase.from("forge_log").insert(logEntry);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Error processing ${mod.slug} × ${threat.title.slice(0, 40)}:`, msg);
          summary.errors++;
          await supabase.from("forge_log").insert({
            ...logEntry,
            error: msg.slice(0, 500),
            validation_passed: false,
            duration_ms: Date.now() - stepStart,
          });
        }
      }
    }

    summary.duration_ms = Date.now() - runStart;

    return new Response(
      JSON.stringify({ ok: true, summary, dry_run: isDryRun }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("content-forge fatal error:", msg);
    summary.duration_ms = Date.now() - runStart;

    return new Response(
      JSON.stringify({ ok: false, error: msg, summary }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
