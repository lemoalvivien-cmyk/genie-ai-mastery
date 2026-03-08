/**
 * openclaw-dev-harness
 * ─────────────────────────────────────────────────────────────────────
 * DEV_ONLY_OPENCLAW_RUNTIME — Émulateur local du contrat API OpenClaw.
 *
 * ⚠️  CE FICHIER EST EXCLUSIVEMENT POUR LE DÉVELOPPEMENT LOCAL.
 *     Il ne doit JAMAIS être utilisé en production.
 *     Toutes les réponses sont marquées dev_only: true.
 *
 * CORRECTION AUTH CALLBACK (2026-03-08) :
 *   Les callbacks vers openclaw-sync-job sont signés avec HMAC-SHA256
 *   en utilisant OPENCLAW_WEBHOOK_SECRET (via header X-OpenClaw-Signature).
 *   L'ancien mécanisme SUPABASE_ANON_KEY comme pseudo-JWT EST SUPPRIMÉ.
 *   openclaw-sync-job accepte ces callbacks via PATH 1 (signature HMAC).
 *
 * Contrat émulé :
 *   GET  /health          → {"status":"ok","version":"dev-harness-1.0","tools":[...],"dev_only":true}
 *   POST /jobs            → accepte le job, planifie un callback auto dans ~4s
 *   GET  /jobs/:id        → retourne l'état simulé du job
 *
 * Usage :
 *   1. S'assurer que OPENCLAW_WEBHOOK_SECRET est configuré dans les secrets
 *   2. Enregistrer un runtime pointant vers cette fonction (voir docs/openclaw-dev-setup.md)
 *   3. Utiliser uniquement en dev/staging, jamais en prod
 *   4. Le flag dev_only: true est présent dans toutes les réponses
 * ─────────────────────────────────────────────────────────────────────
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// ── CORRECTION : on utilise OPENCLAW_WEBHOOK_SECRET pour signer les callbacks HMAC ──
// Plus jamais SUPABASE_ANON_KEY comme faux JWT pour sync-job.
const OPENCLAW_WEBHOOK_SECRET = Deno.env.get("OPENCLAW_WEBHOOK_SECRET") ?? "";

// ── Tool profiles émulés ──────────────────────────────────────────
const EMULATED_TOOLS: Record<string, string[]> = {
  tutor_readonly: ["web_search", "knowledge_search", "ai_summarize"],
  browser_lab: ["browser_navigate", "browser_screenshot", "browser_extract"],
  scheduled_coach: ["ai_generate", "notification_send", "knowledge_search"],
};

// ── Signe un payload JSON avec HMAC-SHA256 ─────────────────────────
// Produit la même signature que ce que vérifie openclaw-sync-job PATH 1.
async function signHmacSha256(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(OPENCLAW_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// ── Envoie un callback signé vers openclaw-sync-job ───────────────
// CORRECTION : utilise HMAC-SHA256 via X-OpenClaw-Signature.
// sync-job vérifie cette signature via PATH 1 (OPENCLAW_WEBHOOK_SECRET configuré).
// Aucun SUPABASE_ANON_KEY utilisé ici.
async function sendSignedCallback(payload: Record<string, unknown>): Promise<void> {
  const syncUrl = `${SUPABASE_URL}/functions/v1/openclaw-sync-job`;
  const body = JSON.stringify(payload);

  if (!OPENCLAW_WEBHOOK_SECRET) {
    // DEV_ONLY : si aucun secret configuré, on log et on skip le callback.
    // Cela évite d'envoyer un callback non signé qui serait rejeté par sync-job.
    console.warn("[DEV_ONLY_OPENCLAW_RUNTIME] OPENCLAW_WEBHOOK_SECRET non configuré — callback ignoré pour job_id:", payload.job_id);
    return;
  }

  const signature = await signHmacSha256(body);

  await fetch(syncUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // ✅ CORRECTION : signature HMAC-SHA256 — plus de faux JWT ANON_KEY
      "X-OpenClaw-Signature": signature,
    },
    body,
  }).catch((err) => {
    console.error("[DEV_ONLY_OPENCLAW_RUNTIME] Callback failed:", err);
  });
}

// ── Simule une exécution et envoie les callbacks signés ──────────
async function simulateJobExecution(jobId: string, jobType: string, prompt: string): Promise<void> {
  // Attendre 2.5s pour simuler une exécution réelle
  await new Promise(r => setTimeout(r, 2500));

  // Callback progress — signé HMAC
  await sendSignedCallback({
    job_id: jobId,
    event_type: "progress",
    message: "[DEV_ONLY] Simulation en cours — traitement du prompt…",
    metadata: { dev_only: true, step: "processing", elapsed_ms: 1000 },
  });

  await new Promise(r => setTimeout(r, 1500));

  // Callback artifact — signé HMAC
  await sendSignedCallback({
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
  });

  // Callback completed — signé HMAC
  await sendSignedCallback({
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
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Auth minimale : Accept OPENCLAW_API_TOKEN OU JWT utilisateur ──
  // Le harness est plus permissif que la prod pour faciliter les tests dev
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth) {
    return new Response(JSON.stringify({ error: "Authorization required", dev_only: true }), {
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
      callback_auth: "hmac-sha256 via X-OpenClaw-Signature (OPENCLAW_WEBHOOK_SECRET)",
      webhook_secret_configured: OPENCLAW_WEBHOOK_SECRET.length > 0,
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
      return new Response(JSON.stringify({ error: "Invalid JSON body", dev_only: true }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobId = body.job_id as string;
    const jobType = (body.job_type ?? "custom") as string;
    const prompt = (body.prompt ?? "") as string;

    if (!jobId) {
      return new Response(JSON.stringify({ error: "job_id is required", dev_only: true }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!OPENCLAW_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({
        error: "OPENCLAW_WEBHOOK_SECRET non configuré — impossible d'envoyer des callbacks signés",
        dev_only: true,
        fix: "Configurer OPENCLAW_WEBHOOK_SECRET dans les secrets Supabase Edge Functions",
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Démarrer la simulation en arrière-plan (callbacks signés HMAC)
    simulateJobExecution(jobId, jobType, prompt);

    return new Response(JSON.stringify({
      job_id: jobId,
      accepted: true,
      dev_only: true,
      warning: "DEV_ONLY_OPENCLAW_RUNTIME — simulation en cours, callback HMAC signé dans ~4s",
      callback_auth: "hmac-sha256",
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
