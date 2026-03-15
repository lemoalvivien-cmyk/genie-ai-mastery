/**
 * genie-brain-orchestrator v3.1 — Secured · Audited · Rate-limited
 *
 * Auth: getUser() réseau (verify_jwt=true) — aucun getClaims() local.
 * Security: rate-limit 30 req/min + audit_log sur chaque appel.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── MITRE ATT&CK ─────────────────────────────────────────────────────────────
const MITRE_TECHNIQUES = [
  { id: "T1566", name: "Phishing", tactic: "Initial Access", risk: 85 },
  { id: "T1078", name: "Valid Accounts", tactic: "Privilege Escalation", risk: 90 },
  { id: "T1110", name: "Brute Force", tactic: "Credential Access", risk: 75 },
  { id: "T1190", name: "Exploit Public-Facing App", tactic: "Initial Access", risk: 80 },
  { id: "T1059", name: "Command & Scripting", tactic: "Execution", risk: 70 },
  { id: "T1486", name: "Data Encrypted for Impact", tactic: "Impact", risk: 95 },
  { id: "T1055", name: "Process Injection", tactic: "Defense Evasion", risk: 88 },
  { id: "T1027", name: "Obfuscated Files", tactic: "Defense Evasion", risk: 72 },
];

const HUMAN_TRAINER_STATS = {
  avg_response_time_s: 47,
  error_rate_pct: 62,
  availability: "8h-18h lun-ven",
  personalization: "générique",
  cost_per_session_eur: 120,
};

// ── Rate limiting (in-memory, per instance) ───────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxPerMin = 30): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMin) return false;
  entry.count++;
  return true;
}

// ── Agent prompts ─────────────────────────────────────────────────────────────
function buildAgentPrompt(
  agentType: string,
  userMessage: string,
  userContext: Record<string, unknown>,
  mitreContext: typeof MITRE_TECHNIQUES,
  isPalantirMode: boolean
): string {
  const humanSuffix = isPalantirMode
    ? `\n\n---\n⚡ **GENIE IA vs Formateur Humain** : ~${HUMAN_TRAINER_STATS.avg_response_time_s}s vs <2s · ${HUMAN_TRAINER_STATS.error_rate_pct}% erreur vs 0% · 120€/session vs 0.002€.`
    : "";

  const ctx = `Profil: Persona=${userContext.persona||"salarie"}, Niveau=${userContext.level||1}, Modules=${userContext.completed_modules||0}. Score risque: ${userContext.risk_score||50}/100. MITRE: ${mitreContext.map(t=>`${t.id}(${t.name})`).join(", ")}.`;

  const prompts: Record<string, string> = {
    attaquant: `Tu es l'Agent Attaquant GÉNIE BRAIN. Simule de vraies attaques MITRE ATT&CK.
${ctx}
MISSION: Identifie les vecteurs d'attaque réels vs "${userMessage}". Cite les techniques MITRE. Montre comment sa lacune le rend vulnérable. 2-3 phrases max. Format: [VECTEUR]: [RISQUE RÉEL]. Inclus risk_score mis à jour.${humanSuffix}`,

    defenseur: `Tu es l'Agent Défenseur GÉNIE BRAIN. Contre-mesures concrètes.
${ctx}
MISSION: Pour "${userMessage}", fournis 1-2 contre-mesures exactes, actionnables en <60s. Format: Action → Résultat → Temps.${humanSuffix}`,

    tuteur: `Tu es l'Agent Tuteur GÉNIE BRAIN — pédagogie Palantir niveau ${userContext.level||1}/5.
${ctx}
MISSION: Réponds à "${userMessage}". Structure: Point clé → Exemple concret → Action immédiate. Max 120 mots. Adapté au persona ${userContext.persona||"salarie"}.${humanSuffix}`,

    predictor: `Tu es l'Agent Predictor GÉNIE BRAIN. Prévoie les échecs 24h avant.
${ctx}
MISSION: Analyse "${userMessage}". Réponds UNIQUEMENT en JSON valide:
{"prediction":"...","risk_domain":"...","confidence_pct":75,"module_title":"...","module_description":"...","urgency":"high|medium|low","predicted_failure_hours":24}`,

    analyst: `Tu es l'Agent Analyst GÉNIE BRAIN — insights Palantir Foundry.
${ctx}
MISSION: Analyse de risque entreprise pour "${userMessage}". ROI vs consultant, Skill Gaps, recommandations C-level. Sois quantitatif.${humanSuffix}`,
  };

  return prompts[agentType] ?? prompts.tuteur;
}

// ── LLM call via Lovable AI Gateway ──────────────────────────────────────────
async function callLLM(
  prompt: string,
  model = "google/gemini-3-flash-preview",
  maxTokens = 400
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  for (let attempt = 0; attempt < 2; attempt++) {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.65,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (resp.status === 429 && attempt === 0) {
      await new Promise(r => setTimeout(r, 800));
      continue;
    }
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`LLM ${resp.status}: ${txt.slice(0, 200)}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
  throw new Error("LLM: max retries exceeded");
}

// ── SSE helper ────────────────────────────────────────────────────────────────
function sseEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ── Auth: getUser() réseau — source de vérité ─────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = user.id;

  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (!checkRateLimit(userId)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    messages: Array<{ role: string; content: string }>;
    user_profile?: Record<string, unknown>;
    session_id?: string;
    palantir_mode?: boolean;
    active_agents?: string[];
  };

  try {
    body = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    messages,
    user_profile = {},
    session_id,
    palantir_mode = false,
    active_agents = ["tuteur"],
  } = body;

  const userMessage = messages[messages.length - 1]?.content ?? "";

  // ── Audit log — appel tracé ───────────────────────────────────────────────
  const ipHash = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "brain_orchestrator",
      event_type: "brain_orchestrator",
      resource_type: "genie_brain",
      details: {
        agents: active_agents,
        palantir_mode,
        session_id: session_id ?? null,
      },
      ip_address: ipHash,
    });
  } catch (_e) { /* never fail the main flow */ }

  // ── Load brain state + org_id ─────────────────────────────────────────────
  const [brainResult, profileResult] = await Promise.all([
    supabase.from("genie_brain")
      .select("id, predicted_risk_score, knowledge_graph, agent_states")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles")
      .select("org_id")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const brainData = brainResult.data;
  const orgId = profileResult.data?.org_id ?? null;
  const riskScore: number = brainData?.predicted_risk_score ?? 50;

  const mitreContext = MITRE_TECHNIQUES
    .filter(t => t.risk >= (100 - riskScore - 20))
    .slice(0, 3);

  const userContext = {
    ...user_profile,
    risk_score: riskScore,
    knowledge_graph: brainData?.knowledge_graph ?? {},
  };

  // ── Streaming SSE ─────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        try { controller.enqueue(encoder.encode(chunk)); } catch (_e) { /* closed */ }
      };

      let errorType: string | null = null;

      try {
        send(sseEvent("brain_start", {
          palantir_mode,
          active_agents,
          risk_score: riskScore,
          mitre_techniques: mitreContext,
        }));

        const agentPromises = active_agents.map(agentType => {
          const prompt = buildAgentPrompt(agentType, userMessage, userContext, mitreContext, palantir_mode);
          const model = (agentType === "predictor" || agentType === "analyst")
            ? "google/gemini-2.5-flash"
            : "google/gemini-3-flash-preview";
          const maxTok = agentType === "predictor" ? 250 : 400;

          return callLLM(prompt, model, maxTok)
            .then(content => {
              send(sseEvent("agent_response", { agent: agentType, content, timestamp: Date.now() }));
              return { agent: agentType, content, ok: true };
            })
            .catch(err => {
              send(sseEvent("agent_error", { agent: agentType, error: err.message }));
              errorType = errorType ?? err.message.slice(0, 80);
              return { agent: agentType, content: "", ok: false };
            });
        });

        const results = await Promise.all(agentPromises);
        const latencyMs = Date.now() - startTime;

        const tuteurResult = results.find(r => r.agent === "tuteur");
        const finalContent = tuteurResult?.content || results.find(r => r.ok)?.content || "";

        const predictorResult = results.find(r => r.agent === "predictor");
        let newRiskScore = riskScore;
        let predictionData: Record<string, unknown> | null = null;

        if (predictorResult?.content) {
          try {
            const jsonMatch = predictorResult.content.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              predictionData = JSON.parse(jsonMatch[0]);
              const conf = (predictionData?.confidence_pct as number) ?? 50;
              newRiskScore = Math.min(100, Math.max(0, riskScore + Math.round((conf - 50) * 0.3)));

              if (conf > 70 && predictionData?.module_title) {
                await supabase.from("brain_generated_modules").insert({
                  user_id: userId,
                  org_id: orgId,
                  title: predictionData.module_title as string,
                  description: (predictionData.module_description as string) ?? "",
                  domain: (predictionData.risk_domain as string) ?? "cyber",
                  content: { generated_by: "predictor_agent", prediction: predictionData },
                  target_skill: predictionData.risk_domain as string,
                  predicted_gap: conf,
                  status: "pending",
                });
                send(sseEvent("module_generated", {
                  title: predictionData.module_title,
                  domain: predictionData.risk_domain,
                  urgency: predictionData.urgency,
                  confidence: conf,
                }));
              }
            }
          } catch (_e) { /* ignore JSON parse failures */ }
        }

        const agentStates: Record<string, unknown> = {};
        for (const r of results) {
          agentStates[r.agent] = { last_response: r.content.slice(0, 200), updated_at: new Date().toISOString() };
        }

        await Promise.all([
          supabase.rpc("upsert_genie_brain", {
            _user_id: userId,
            _risk_score: newRiskScore as unknown,
            _agent_states: agentStates,
            _next_failure: predictionData?.predicted_failure_hours
              ? new Date(Date.now() + (predictionData.predicted_failure_hours as number) * 3600000).toISOString()
              : null,
          }),
          supabase.from("brain_events").insert({
            user_id: userId,
            org_id: orgId,
            event_type: "swarm_completed",
            session_id: session_id ?? null,
            risk_score: newRiskScore,
            agents_used: active_agents,
            agents_count: active_agents.length,
            latency_ms: latencyMs,
            error_type: errorType,
            metadata: {
              palantir_mode,
              risk_delta: newRiskScore - riskScore,
              agents_ok: results.filter(r => r.ok).length,
              agents_failed: results.filter(r => !r.ok).length,
            },
          } as never),
        ]);

        const humanComparison = palantir_mode ? {
          genie_response_ms: latencyMs,
          human_response_s: HUMAN_TRAINER_STATS.avg_response_time_s,
          human_error_rate: HUMAN_TRAINER_STATS.error_rate_pct,
          human_cost_eur: HUMAN_TRAINER_STATS.cost_per_session_eur,
          genie_cost_eur: 0.002,
          advantage_factor: Math.round(HUMAN_TRAINER_STATS.avg_response_time_s * 1000 / Math.max(1, latencyMs)),
        } : null;

        send(sseEvent("brain_complete", {
          content: finalContent,
          risk_score: newRiskScore,
          risk_delta: newRiskScore - riskScore,
          prediction: predictionData,
          human_comparison: humanComparison,
          model_used: "GÉNIE BRAIN Swarm v3.1",
          agents_run: active_agents,
          mitre_techniques: mitreContext,
          latency_ms: latencyMs,
        }));

        send("data: [DONE]\n\n");

      } catch (err) {
        const msg = (err as Error).message;
        errorType = msg.slice(0, 80);
        send(sseEvent("error", { error: msg }));
        send("data: [DONE]\n\n");

        try {
          await supabase.from("brain_events").insert({
            user_id: userId,
            org_id: orgId,
            event_type: "swarm_completed",
            session_id: session_id ?? null,
            latency_ms: Date.now() - startTime,
            error_type: errorType,
            agents_count: active_agents.length,
            metadata: { error: msg },
          } as never);
        } catch (_e) { /* silent */ }
      } finally {
        try { controller.close(); } catch (_e) { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
});
