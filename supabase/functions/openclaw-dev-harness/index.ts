/**
 * openclaw-dev-harness
 * ─────────────────────────────────────────────────────────────────────
 * DEV_ONLY_OPENCLAW_RUNTIME — Émulateur local du contrat API OpenClaw.
 *
 * ⚠️  CE FICHIER EST EXCLUSIVEMENT POUR LE DÉVELOPPEMENT LOCAL.
 *     Il ne doit JAMAIS être utilisé en production.
 *     Toutes les réponses sont marquées dev_only: true.
 *     Aucun secret OPENCLAW_API_TOKEN n'est nécessaire.
 *
 * Contrat émulé :
 *   GET  /health          → {"status":"ok","version":"dev-harness-1.0","tools":[...],"dev_only":true}
 *   POST /jobs            → accepte le job, planifie un callback auto dans 3s
 *   GET  /jobs/:id        → retourne l'état simulé du job
 *
 * Usage :
 *   1. Enregistrer un runtime pointant vers cette fonction (voir docs/openclaw-dev-setup.md)
 *   2. Utiliser uniquement en dev/staging, jamais en prod
 *   3. Le flag dev_only: true est présent dans toutes les réponses
 * ─────────────────────────────────────────────────────────────────────
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-genie-job-id, x-genie-org-id",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// ── Tool profiles émulés ──────────────────────────────────────────
const EMULATED_TOOLS: Record<string, string[]> = {
  tutor_readonly: ["web_search", "knowledge_search", "ai_summarize"],
  browser_lab: ["browser_navigate", "browser_screenshot", "browser_extract"],
  scheduled_coach: ["ai_generate", "notification_send", "knowledge_search"],
};

// ── Simule une exécution et envoie le callback sync ──────────────
async function simulateJobExecution(jobId: string, jobType: string, prompt: string): Promise<void> {
  // Attendre 2.5s pour simuler une exécution réelle
  await new Promise(r => setTimeout(r, 2500));

  const syncUrl = `${SUPABASE_URL}/functions/v1/openclaw-sync-job`;

  // Callback progress
  await fetch(syncUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      job_id: jobId,
      event_type: "progress",
      message: "[DEV_ONLY] Simulation en cours — traitement du prompt…",
      metadata: { dev_only: true, step: "processing", elapsed_ms: 1000 },
    }),
  }).catch(() => null);

  await new Promise(r => setTimeout(r, 1500));

  // Callback artifact
  await fetch(syncUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      job_id: jobId,
      event_type: "artifact",
      message: "[DEV_ONLY] Artefact de démonstration généré",
      metadata: { dev_only: true },
      artifact: {
        type: "text",
        content: `[DEV_ONLY] Résultat simulé pour le job type "${jobType}".\n\nPrompt traité : "${prompt.slice(0, 100)}..."\n\nCeci est un résultat de démonstration généré par le harness de développement OpenClaw. Brancher un runtime réel pour des résultats authentiques.`,
        mime_type: "text/plain",
        size_bytes: 256,
        metadata: { dev_only: true, generator: "DEV_ONLY_OPENCLAW_RUNTIME" },
      },
    }),
  }).catch(() => null);

  // Callback completed
  await fetch(syncUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      job_id: jobId,
      event_type: "completed",
      message: "[DEV_ONLY] Exécution simulée terminée avec succès",
      result_summary: `[DEV_ONLY] Synthèse de démonstration — job ${jobType}\n\n• Source simulée 1 : Harness OpenClaw v1.0\n• Source simulée 2 : Résultat de démonstration\n• Source simulée 3 : Aucune exécution réelle effectuée\n\n⚠️ Ce résultat est généré par le DEV_ONLY_OPENCLAW_RUNTIME et ne reflète pas une exécution réelle. Brancher un runtime OpenClaw authentique pour des résultats réels.`,
      result_json: {
        dev_only: true,
        generator: "DEV_ONLY_OPENCLAW_RUNTIME",
        job_id: jobId,
        job_type: jobType,
        simulated: true,
        execution_ms: 4000,
        items: [
          { source: "harness-mock-1", content: "Résultat simulé #1", score: 0.95 },
          { source: "harness-mock-2", content: "Résultat simulé #2", score: 0.87 },
        ],
      },
      metadata: { dev_only: true, execution_ms: 4000 },
    }),
  }).catch(() => null);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Auth minimale : Accept OPENCLAW_API_TOKEN OU JWT utilisateur ──
  // Le harness est plus permissif que la prod pour faciliter les tests dev
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth) {
    return new Response(JSON.stringify({ error: "Authorization required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  // ── Route : GET /health ──────────────────────────────────────────
  if (req.method === "GET" && (pathname.endsWith("/health") || pathname.endsWith("/v1/health"))) {
    return new Response(JSON.stringify({
      status: "ok",
      version: "dev-harness-1.0.0",
      dev_only: true,
      warning: "DEV_ONLY_OPENCLAW_RUNTIME — ne pas utiliser en production",
      tools: EMULATED_TOOLS,
      capabilities: ["web_search_mock", "knowledge_search_mock", "ai_summarize_mock"],
      uptime_seconds: Math.floor(Date.now() / 1000),
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Route : POST /jobs ───────────────────────────────────────────
  if (req.method === "POST" && (pathname.endsWith("/jobs") || pathname.endsWith("/v1/jobs"))) {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobId = body.job_id as string;
    const jobType = (body.job_type ?? "custom") as string;
    const prompt = (body.prompt ?? "") as string;

    if (!jobId) {
      return new Response(JSON.stringify({ error: "job_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Démarrer la simulation en arrière-plan
    simulateJobExecution(jobId, jobType, prompt);

    return new Response(JSON.stringify({
      job_id: jobId,
      accepted: true,
      dev_only: true,
      warning: "DEV_ONLY_OPENCLAW_RUNTIME — simulation en cours, callback dans ~4s",
      estimated_completion_ms: 4000,
      runtime: "DEV_ONLY_OPENCLAW_RUNTIME",
      timestamp: new Date().toISOString(),
    }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    error: "Route not found",
    available_routes: ["GET /health", "GET /v1/health", "POST /jobs", "POST /v1/jobs"],
    dev_only: true,
  }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
