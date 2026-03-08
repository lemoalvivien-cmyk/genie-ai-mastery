/**
 * openclaw-sync-job
 * Reçoit les callbacks de statut depuis OpenClaw (webhook).
 * Persiste résultats, logs et artefacts. JAMAIS d'invention de résultats.
 *
 * SÉCURITÉ ZERO-TRUST :
 * - Si OPENCLAW_WEBHOOK_SECRET configuré → HMAC-SHA256 obligatoire, toute requête sans signature valide est rejetée.
 * - Si OPENCLAW_WEBHOOK_SECRET ABSENT → exige un JWT utilisateur authentifié côté serveur (auth.getUser).
 *   Un callback anonyme n'est JAMAIS accepté.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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

  // ── PATH 1 : Webhook signé par HMAC (appels depuis OpenClaw runtime) ────────
  if (OPENCLAW_WEBHOOK_SECRET) {
    const signature = req.headers.get("X-OpenClaw-Signature") ?? "";
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing webhook signature (X-OpenClaw-Signature)" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(OPENCLAW_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );

    let sigBytes: Uint8Array;
    try {
      sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    } catch {
      return new Response(JSON.stringify({ error: "Invalid signature encoding" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

  // ── PATH 2 : Pas de secret configuré — JWT utilisateur OBLIGATOIRE ────────
  // Un callback anonyme n'est JAMAIS accepté. L'absence de OPENCLAW_WEBHOOK_SECRET
  // ne crée PAS une backdoor publique.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return new Response(JSON.stringify({
      error: "Unauthorized: provide either a signed webhook (X-OpenClaw-Signature) or a valid Bearer JWT",
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Valider le JWT côté serveur
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized: invalid or expired JWT" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: OpenClawCallback;
  try {
    payload = await req.json() as OpenClawCallback;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Vérifier que l'utilisateur est propriétaire du job OU admin
  if (payload.job_id) {
    const { data: job } = await sb
      .from("openclaw_jobs")
      .select("user_id, org_id")
      .eq("id", payload.job_id)
      .single();

    if (job && job.user_id !== user.id) {
      const { data: roles } = await sb.rpc("get_my_roles");
      const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden: you do not own this job" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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

  if (event_type === "progress") {
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (event_type === "completed") {
    // CRITICAL: ne jamais inventer un résultat si OpenClaw n'en fournit pas
    if (!payload.result_summary && !payload.result_json) {
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
