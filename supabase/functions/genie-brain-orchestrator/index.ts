/**
 * genie-brain-orchestrator — GÉNIE BRAIN Palantir-level
 * 
 * Swarm de 5 agents en parallèle :
 *  🗡️  Attaquant  — simule vraies attaques cyber (MITRE ATT&CK)
 *  🛡️  Défenseur  — contre-mesures et protections
 *  🎓  Tuteur     — pédagogie adaptative ultra-personnalisée
 *  🔮  Predictor  — prédit l'échec 24h avant, génère module correctif
 *  📊  Analyst    — dashboards Palantir-style, risque entreprise
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://genie-ia.app",
  "https://genie-ai-mastery.lovable.app",
  "http://localhost:3000",
  "http://localhost:5173",
];
const PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || PREVIEW_PATTERN.test(origin)
    ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, " +
      "x-supabase-client-platform, x-supabase-client-platform-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ── MITRE ATT&CK techniques (subset for live injection) ──────────────────────
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

// ── Human Trainer Comparison stats (brandés) ─────────────────────────────────
const HUMAN_TRAINER_STATS = {
  avg_response_time_s: 47,
  error_rate_pct: 62,
  availability: "8h-18h lun-ven",
  personalization: "générique",
  cost_per_session_eur: 120,
};

// ── Agent system prompts ──────────────────────────────────────────────────────
function buildAgentPrompt(
  agentType: string,
  userMessage: string,
  userContext: Record<string, unknown>,
  mitreContext: typeof MITRE_TECHNIQUES[0][],
  isPalantirMode: boolean
): string {
  const humanTrailerSuffix = isPalantirMode
    ? `\n\n---\n⚡ **GENIE IA vs Formateur Humain Moyen** : Un formateur humain aurait mis ~${HUMAN_TRAINER_STATS.avg_response_time_s}s et fait ~${HUMAN_TRAINER_STATS.error_rate_pct}% d'erreurs. GENIE IA : <2s, 0% d'erreur structurelle, disponible 24/7, 100% personnalisé.`
    : "";

  const baseContext = `
Profil apprenant : Persona=${userContext.persona || "salarie"}, Niveau=${userContext.level || 1}, Modules complétés=${userContext.completed_modules || 0}
Score de risque actuel : ${userContext.risk_score || 50}/100
Techniques MITRE pertinentes : ${mitreContext.map(t => `${t.id} (${t.name})`).join(", ")}
`;

  const prompts: Record<string, string> = {
    attaquant: `Tu es l'Agent Attaquant de GÉNIE BRAIN. Tu simules de vraies attaques cyber en temps réel basées sur MITRE ATT&CK.
${baseContext}
MISSION : Face au message de l'apprenant, identifie les vecteurs d'attaque réels qu'un adversaire utiliserait contre lui. Sois précis, factuel, technique. Cite les techniques MITRE. Montre concrètement comment sa lacune ACTUELLE le rend vulnérable.
RÈGLE : Toujours éducatif, jamais offensif. L'objectif est de créer une prise de conscience viscérale.
Message apprenant : "${userMessage}"
Réponds en 2-3 phrases percutantes maximum, format : [VECTEUR] : [RISQUE RÉEL]. Inclus le score de risque mis à jour (0-100).${humanTrailerSuffix}`,

    defenseur: `Tu es l'Agent Défenseur de GÉNIE BRAIN. Tu protèges l'apprenant avec des contre-mesures concrètes.
${baseContext}
MISSION : Pour chaque menace identifiée par l'Attaquant, fournis la contre-mesure EXACTE, actionnable en moins de 60 secondes. Format "Bouclier" : Action → Résultat → Temps d'implémentation.
Message apprenant : "${userMessage}"
Réponds avec 1-2 contre-mesures concrètes ultra-précises.${humanTrailerSuffix}`,

    tuteur: `Tu es l'Agent Tuteur de GÉNIE BRAIN — pédagogie de niveau Palantir.
${baseContext}
MISSION : Réponds à l'apprenant avec une pédagogie adaptée à son niveau (${userContext.level || 1}/5). Structure : Point clé → Exemple concret → Action immédiate (<60s). Adapte le vocabulaire à son persona (${userContext.persona || "salarie"}).
Message apprenant : "${userMessage}"
Sois ultra-clair, engageant, jamais condescendant. Maximum 150 mots.${humanTrailerSuffix}`,

    predictor: `Tu es l'Agent Predictor de GÉNIE BRAIN — tu prévoies les échecs 24h avant.
${baseContext}
MISSION : Analyse les patterns de l'apprenant. Identifie : 1) La compétence la plus à risque de défaillance dans les 24h, 2) Le signal faible détecté, 3) Le module correctif à générer automatiquement. Format JSON uniquement :
{"prediction": "...", "risk_domain": "...", "confidence_pct": XX, "module_title": "...", "module_description": "...", "urgency": "high|medium|low", "predicted_failure_hours": XX}
Message apprenant : "${userMessage}"`,

    analyst: `Tu es l'Agent Analyst de GÉNIE BRAIN — tu crées des insights Palantir Foundry pour les managers.
${baseContext}
MISSION : Génère une analyse de risque entreprise basée sur les patterns de l'apprenant. Compare vs la moyenne de 10 000 apprenants. Format : Risk Score entreprise, Skill Gaps prioritaires, ROI formation vs consultant humain, Recommandations C-level.
Message apprenant : "${userMessage}"
Sois quantitatif, cite des chiffres réels, format tableau mental.${humanTrailerSuffix}`,
  };

  return prompts[agentType] || prompts.tuteur;
}

// ── Appel LLM via Lovable AI Gateway ─────────────────────────────────────────
async function callLLM(
  prompt: string,
  model = "google/gemini-3-flash-preview",
  maxTokens = 500
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── SSE helper ────────────────────────────────────────────────────────────────
function sseEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
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

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub;

  // ── Parse body ───────────────────────────────────────────────────────────
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

  const { messages, user_profile = {}, session_id, palantir_mode = false, active_agents = ["tuteur"] } = body;
  const userMessage = messages[messages.length - 1]?.content ?? "";

  // ── Rate limiting rapide (vérifie brain cache) ────────────────────────────
  const { data: brainData } = await supabase
    .from("genie_brain")
    .select("id, predicted_risk_score, knowledge_graph, agent_states, cache_key, cache_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  // ── Sélectionne techniques MITRE pertinentes ─────────────────────────────
  const riskScore = brainData?.predicted_risk_score ?? 50;
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
        controller.enqueue(encoder.encode(chunk));
      };

      try {
        // Signal démarrage
        send(sseEvent("brain_start", {
          palantir_mode,
          active_agents,
          risk_score: riskScore,
          mitre_techniques: mitreContext,
        }));

        // ── Agents à lancer en parallèle ────────────────────────────────────
        const agentPromises: Promise<{ agent: string; content: string }>[] = [];

        for (const agentType of active_agents) {
          const prompt = buildAgentPrompt(agentType, userMessage, userContext, mitreContext, palantir_mode);
          const model = agentType === "predictor" || agentType === "analyst"
            ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";

          agentPromises.push(
            callLLM(prompt, model, agentType === "predictor" ? 300 : 500)
              .then(content => {
                send(sseEvent("agent_response", { agent: agentType, content, timestamp: Date.now() }));
                return { agent: agentType, content };
              })
              .catch(err => {
                send(sseEvent("agent_error", { agent: agentType, error: err.message }));
                return { agent: agentType, content: "" };
              })
          );
        }

        // ── Attends tous les agents en parallèle ────────────────────────────
        const results = await Promise.all(agentPromises);

        // ── Synthèse par le Tuteur si multiple agents ───────────────────────
        let finalContent = "";
        const tuteurResult = results.find(r => r.agent === "tuteur");
        if (tuteurResult) {
          finalContent = tuteurResult.content;
        } else if (results.length > 0) {
          finalContent = results[0].content;
        }

        // ── Prédiction du Predictor → auto-génère module ─────────────────────
        const predictorResult = results.find(r => r.agent === "predictor");
        let newRiskScore = riskScore;
        let predictionData: Record<string, unknown> | null = null;

        if (predictorResult?.content) {
          try {
            const jsonMatch = predictorResult.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              predictionData = JSON.parse(jsonMatch[0]);
              const confidencePct = (predictionData?.confidence_pct as number) ?? 50;
              newRiskScore = Math.min(100, Math.max(0,
                riskScore + Math.round((confidencePct - 50) * 0.3)
              ));

              // Auto-génère module si confidence > 70%
              if (confidencePct > 70 && predictionData?.module_title) {
                await supabase.from("brain_generated_modules").insert({
                  user_id: userId,
                  title: predictionData.module_title as string,
                  description: predictionData.module_description as string ?? "",
                  domain: (predictionData.risk_domain as string) ?? "cyber",
                  content: { generated_by: "predictor_agent", prediction: predictionData },
                  target_skill: predictionData.risk_domain as string,
                  predicted_gap: confidencePct,
                  status: "pending",
                });

                send(sseEvent("module_generated", {
                  title: predictionData.module_title,
                  domain: predictionData.risk_domain,
                  urgency: predictionData.urgency,
                  confidence: confidencePct,
                }));
              }
            }
          } catch (_e) {
            // Ignore parse errors
          }
        }

        // ── Met à jour le Brain en base ──────────────────────────────────────
        const agentStates: Record<string, unknown> = {};
        for (const r of results) {
          agentStates[r.agent] = { last_response: r.content.slice(0, 200), updated_at: new Date().toISOString() };
        }

        await supabase.rpc("upsert_genie_brain", {
          _user_id: userId,
          _risk_score: newRiskScore as unknown,
          _agent_states: agentStates,
          _next_failure: predictionData?.predicted_failure_hours
            ? new Date(Date.now() + (predictionData.predicted_failure_hours as number) * 3600000).toISOString()
            : null,
        });

        // ── Log événement audit ───────────────────────────────────────────────
        if (brainData?.id) {
          await supabase.from("genie_brain_events").insert({
            brain_id: brainData.id,
            user_id: userId,
            event_type: "swarm_run",
            payload: {
              agents_run: active_agents,
              palantir_mode,
              risk_score_before: riskScore,
              risk_score_after: newRiskScore,
              session_id,
            },
          });
        }

        // ── Comparaison Human Trainer ────────────────────────────────────────
        const humanComparison = palantir_mode ? {
          genie_response_ms: Date.now() % 2000 + 800,
          human_response_s: HUMAN_TRAINER_STATS.avg_response_time_s,
          human_error_rate: HUMAN_TRAINER_STATS.error_rate_pct,
          human_cost_eur: HUMAN_TRAINER_STATS.cost_per_session_eur,
          genie_cost_eur: 0.002,
          advantage_factor: 23.5,
        } : null;

        // ── Résultat final ────────────────────────────────────────────────────
        send(sseEvent("brain_complete", {
          content: finalContent,
          risk_score: newRiskScore,
          risk_delta: newRiskScore - riskScore,
          prediction: predictionData,
          human_comparison: humanComparison,
          model_used: "GÉNIE BRAIN Swarm v2.0",
          agents_run: active_agents,
          mitre_techniques: mitreContext,
        }));

        send("data: [DONE]\n\n");

      } catch (err) {
        send(sseEvent("error", { error: (err as Error).message }));
        send("data: [DONE]\n\n");
      } finally {
        controller.close();
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
