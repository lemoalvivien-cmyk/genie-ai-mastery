/**
 * SleepForge v1.0 — Génération de modules personnalisés 24/7
 *
 * Déclenché par pg_cron toutes les nuits à 02h00 UTC.
 * Pour chaque utilisateur actif dans les 3 derniers jours :
 *   1. Lit le brain state (risk_score, top gaps, agent_states)
 *   2. Appelle le Predictor Agent pour identifier le prochain échec
 *   3. Génère un micro-module ciblé (5-7 min) via le Tuteur Agent
 *   4. Insère dans brain_generated_modules (status='pending')
 *   5. Envoie un brain_event 'sleepforge_generated' pour analytics
 *
 * Auth: X-CRON-SECRET header (no JWT)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const CRON_SECRET  = Deno.env.get("CRON_SECRET") ?? "";
const LOVABLE_KEY  = Deno.env.get("LOVABLE_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SK  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── LLM call ──────────────────────────────────────────────────────────────────
async function callLLM(prompt: string, maxTokens = 600): Promise<string> {
  if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY missing");
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`LLM ${resp.status}`);
  const d = await resp.json();
  return d.choices?.[0]?.message?.content ?? "";
}

// ── Build module content ──────────────────────────────────────────────────────
async function generateModule(brain: {
  risk_score: number;
  knowledge_graph: Record<string, unknown>;
  persona: string;
  level: number;
  completed_modules: number;
}): Promise<{
  title: string;
  description: string;
  domain: string;
  content: Record<string, unknown>;
  target_skill: string;
  predicted_gap: number;
}> {
  const predictPrompt = `Tu es le Predictor Agent Formetoialia Brain.
Profil: persona=${brain.persona}, niveau=${brain.level}/5, modules=${brain.completed_modules}, risk_score=${brain.risk_score}/100.
Réponds UNIQUEMENT en JSON valide:
{"prediction":"...","risk_domain":"phishing|ransomware|iam|cloud|zero_trust|prompt_injection","confidence_pct":75,"module_title":"...","module_description":"...","urgency":"high|medium|low","target_skill":"...","predicted_failure_hours":24}`;

  const predictRaw = await callLLM(predictPrompt, 300);
  let prediction: Record<string, unknown>;
  try {
    const m = predictRaw.match(/\{[\s\S]*?\}/);
    prediction = m ? JSON.parse(m[0]) : {};
  } catch { prediction = {}; }

  const domain     = (prediction.risk_domain as string)     ?? "cyber";
  const title      = (prediction.module_title as string)     ?? `Module SleepForge — ${domain}`;
  const desc       = (prediction.module_description as string) ?? "";
  const confidence = (prediction.confidence_pct as number)  ?? 60;
  const skill      = (prediction.target_skill as string)    ?? domain;

  // Generate full module content
  const contentPrompt = `Tu es le Tuteur Formetoialia Brain. Génère un micro-module cyber 5-7 min.
Domaine: ${domain}. Titre: "${title}". Niveau: ${brain.level}/5. Persona: ${brain.persona}.
Réponds UNIQUEMENT en JSON:
{
  "theory": "2-3 paragraphes clés, exemples concrets",
  "quiz": [
    {"q":"Question?","options":["A","B","C","D"],"correct":0,"explanation":"..."},
    {"q":"Question?","options":["A","B","C","D"],"correct":2,"explanation":"..."},
    {"q":"Question?","options":["A","B","C","D"],"correct":1,"explanation":"..."}
  ],
  "practical_exercise": {"title":"...","steps":["...","...","..."],"expected_outcome":"..."},
  "key_takeaways": ["takeaway 1","takeaway 2","takeaway 3"],
  "mitre_techniques": ["T1566","T1078"],
  "estimated_minutes": 6
}`;

  const contentRaw = await callLLM(contentPrompt, 800);
  let moduleContent: Record<string, unknown> = {};
  try {
    const m = contentRaw.match(/\{[\s\S]*\}/);
    if (m) moduleContent = JSON.parse(m[0]);
  } catch { /* use empty */ }

  return {
    title,
    description: desc,
    domain,
    content: { ...moduleContent, generated_by: "sleepforge_v1", forge_time: new Date().toISOString() },
    target_skill: skill,
    predicted_gap: confidence,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: X-CRON-SECRET or Bearer CRON_SECRET
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SK);
  const startTime = Date.now();

  try {
    // ── Fetch active users (last 3 days) with brain state ─────────────────
    const since = new Date(Date.now() - 3 * 86400000).toISOString();

    const { data: activeUsers, error: usersErr } = await supabase
      .from("genie_brain")
      .select("user_id, org_id, predicted_risk_score, knowledge_graph")
      .gte("last_analysis_at", since)
      .limit(50); // Process max 50 per run to stay within time budget

    if (usersErr) throw usersErr;
    if (!activeUsers?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "No active users" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // ── Get profiles for persona + level ──────────────────────────────────
    const userIds = activeUsers.map(u => u.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, persona, level")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    // ── Count completed modules per user ──────────────────────────────────
    const { data: progressCounts } = await supabase
      .from("progress")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "completed");

    const completedMap = new Map<string, number>();
    for (const p of progressCounts ?? []) {
      completedMap.set(p.user_id, (completedMap.get(p.user_id) ?? 0) + 1);
    }

    // ── Check existing forge today (skip duplicates) ──────────────────────
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("brain_generated_modules")
      .select("user_id")
      .in("user_id", userIds)
      .gte("created_at", today)
      .eq("generated_by", "sleepforge_v1");

    const alreadyForged = new Set((existing ?? []).map(e => e.user_id));

    // ── Process users ─────────────────────────────────────────────────────
    let generated = 0;
    let skipped   = 0;

    // Process in parallel batches of 5
    const toProcess = activeUsers.filter(u => !alreadyForged.has(u.user_id));

    for (let i = 0; i < toProcess.length; i += 5) {
      const batch = toProcess.slice(i, i + 5);
      await Promise.all(batch.map(async (user) => {
        try {
          const profile = profileMap.get(user.user_id);
          const brain = {
            risk_score:        user.predicted_risk_score ?? 50,
            knowledge_graph:   (user.knowledge_graph as Record<string, unknown>) ?? {},
            persona:           profile?.persona ?? "salarie",
            level:             profile?.level   ?? 1,
            completed_modules: completedMap.get(user.user_id) ?? 0,
          };

          const module = await generateModule(brain);

          await Promise.all([
            // Insert module
            supabase.from("brain_generated_modules").insert({
              user_id:       user.user_id,
              org_id:        user.org_id ?? null,
              title:         module.title,
              description:   module.description,
              domain:        module.domain,
              content:       module.content,
              target_skill:  module.target_skill,
              predicted_gap: module.predicted_gap,
              generated_by:  "sleepforge_v1",
              status:        "pending",
              expires_at:    new Date(Date.now() + 48 * 3600000).toISOString(), // 48h shelf life
            }),

            // Log brain event
            supabase.from("brain_events").insert({
              user_id:    user.user_id,
              org_id:     user.org_id ?? null,
              event_type: "sleepforge_generated",
              risk_score: brain.risk_score,
              metadata: {
                module_title:  module.title,
                domain:        module.domain,
                predicted_gap: module.predicted_gap,
                forge_run_ms:  Date.now() - startTime,
              },
            }),
          ]);
          generated++;
        } catch (err) {
          console.error(`SleepForge failed for ${user.user_id}:`, err);
          skipped++;
        }
      }));
    }

    const latency = Date.now() - startTime;
    console.log(`SleepForge run: ${generated} generated, ${skipped} failed, ${alreadyForged.size} skipped (already done). Latency: ${latency}ms`);

    return new Response(
      JSON.stringify({ ok: true, generated, skipped, already_done: alreadyForged.size, latency_ms: latency }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("SleepForge fatal:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
