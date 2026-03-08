/**
 * openclaw-sync-job
 * Reçoit les callbacks de statut depuis OpenClaw (webhook).
 * Persiste résultats, logs et artefacts. JAMAIS d'invention de résultats.
 * Vérifie la signature OPENCLAW_WEBHOOK_SECRET si configuré.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENCLAW_WEBHOOK_SECRET = Deno.env.get("OPENCLAW_WEBHOOK_SECRET") ?? "";

interface OpenClawCallback {
  job_id: string;
  event_type: "progress" | "completed" | "failed" | "artifact";
  message?: string;
  result_summary?: string;
  result_json?: Record<string, unknown>;
  error_message?: string;
  artifact?: {
    type: "text" | "json" | "screenshot" | "pdf" | "html" | "log";
    content?: string;
    storage_path?: string;
    mime_type?: string;
    size_bytes?: number;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Verify webhook signature (if configured) ───────────────
  if (OPENCLAW_WEBHOOK_SECRET) {
    const signature = req.headers.get("X-OpenClaw-Signature") ?? "";
    const body = await req.text();

    if (!signature || !OPENCLAW_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Missing webhook signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // HMAC-SHA256 verification
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(OPENCLAW_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));

    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the already-read body
    let payload: OpenClawCallback;
    try {
      payload = JSON.parse(body) as OpenClawCallback;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return await processCallback(sb, payload, corsHeaders);
  }

  // ── No secret: require auth token (internal calls) ────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  // Allow service role internal calls
  let payload: OpenClawCallback;
  try {
    payload = await req.json() as OpenClawCallback;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the job exists and token belongs to its owner (or is service role)
  if (token) {
    const { data: { user } } = await sb.auth.getUser(token);
    if (user) {
      const { data: job } = await sb.from("openclaw_jobs").select("user_id").eq("id", payload.job_id).single();
      if (!job || job.user_id !== user.id) {
        const { data: roles } = await sb.rpc("get_my_roles");
        const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }
  }

  return await processCallback(sb, payload, corsHeaders);
});

async function processCallback(
  sb: ReturnType<typeof createClient>,
  payload: OpenClawCallback,
  headers: Record<string, string>
): Promise<Response> {
  const { job_id, event_type } = payload;

  if (!job_id || typeof job_id !== "string") {
    return new Response(JSON.stringify({ error: "job_id required" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // ── Load job to verify it exists ──────────────────────────
  const { data: job } = await sb.from("openclaw_jobs").select("id, status").eq("id", job_id).single();
  if (!job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // ── Record event ──────────────────────────────────────────
  await sb.from("openclaw_job_events").insert({
    job_id,
    event_type,
    message: payload.message ?? event_type,
    metadata: payload.metadata ?? {},
  });

  // ── Process event type ────────────────────────────────────
  if (event_type === "progress") {
    // No status change, just log
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (event_type === "completed") {
    // CRITICAL: only persist what OpenClaw actually returned
    if (!payload.result_summary && !payload.result_json) {
      // Mark as failed if no result provided — we do NOT invent results
      await sb.from("openclaw_jobs").update({
        status: "failed",
        error_message: "OpenClaw returned completed event without result data",
        completed_at: new Date().toISOString(),
      }).eq("id", job_id);

      return new Response(JSON.stringify({ received: true, warning: "No result data provided" }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    await sb.from("openclaw_jobs").update({
      status: "succeeded",
      result_summary: payload.result_summary ?? null,
      result_json: payload.result_json ?? null,
      completed_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", job_id);
  }

  if (event_type === "failed") {
    await sb.from("openclaw_jobs").update({
      status: "failed",
      error_message: payload.error_message ?? "OpenClaw reported failure without details",
      completed_at: new Date().toISOString(),
    }).eq("id", job_id);
  }

  if (event_type === "artifact" && payload.artifact) {
    const art = payload.artifact;
    await sb.from("openclaw_artifacts").insert({
      job_id,
      artifact_type: art.type,
      storage_path: art.storage_path ?? null,
      mime_type: art.mime_type ?? null,
      size_bytes: art.size_bytes ?? null,
      metadata: {
        ...(art.metadata ?? {}),
        content_preview: art.content ? art.content.slice(0, 500) : undefined,
      },
    });
  }

  return new Response(JSON.stringify({ received: true, event_type }), {
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
