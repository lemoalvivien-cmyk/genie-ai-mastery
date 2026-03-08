/**
 * openclaw-dispatch-job
 * Prend un job queued, valide les permissions, construit la requête vers
 * OpenClaw, envoie la mission, marque le job running.
 * AUCUN secret OpenClaw n'est exposé côté client.
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
const OPENCLAW_API_TOKEN = Deno.env.get("OPENCLAW_API_TOKEN") ?? "";
const OPENCLAW_TIMEOUT_MS = parseInt(Deno.env.get("OPENCLAW_TIMEOUT_MS") ?? "30000");

// Tool profile → allowed tools mapping
const TOOL_PROFILE_TOOLS: Record<string, string[]> = {
  tutor_readonly: ["web_search", "web_fetch", "knowledge_search", "ai_summarize"],
  browser_lab: ["browser_navigate", "browser_screenshot", "browser_extract", "browser_pdf"],
  scheduled_coach: ["knowledge_search", "ai_generate", "notification_send"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Auth ────────────────────────────────────────────────────
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Parse body ─────────────────────────────────────────────
  let job_id: string;
  try {
    const body = await req.json();
    job_id = body.job_id;
    if (!job_id || typeof job_id !== "string") throw new Error("missing job_id");
  } catch {
    return new Response(JSON.stringify({ error: "job_id (string) is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Load job ───────────────────────────────────────────────
  const { data: job, error: jobErr } = await sb
    .from("openclaw_jobs")
    .select("*, openclaw_runtimes(*)")
    .eq("id", job_id)
    .single();

  if (jobErr || !job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Permission check: owner, manager, or admin ────────────
  const isOwner = job.user_id === user.id;
  const { data: rolesData } = await sb.rpc("get_my_roles");
  const roles: string[] = (rolesData ?? []).map((r: { role: string }) => r.role);
  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager") || roles.includes("admin");

  if (!isOwner && !isAdmin && !isManager) {
    return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Status validation ──────────────────────────────────────
  if (job.status !== "queued") {
    return new Response(JSON.stringify({
      error: `Cannot dispatch job in status: ${job.status}. Only 'queued' jobs can be dispatched.`,
    }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Approval check ────────────────────────────────────────
  if (job.approval_required && !job.approved_by) {
    return new Response(JSON.stringify({ error: "Job requires approval before dispatch" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const runtime = job.openclaw_runtimes;
  if (!runtime) {
    return new Response(JSON.stringify({ error: "Runtime not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Runtime health check ───────────────────────────────────
  if (runtime.status === "offline") {
    await sb.from("openclaw_job_events").insert({
      job_id,
      event_type: "dispatch_blocked",
      message: "Runtime hors ligne — dispatch refusé",
      metadata: { runtime_id: runtime.id, runtime_status: runtime.status },
    });
    return new Response(JSON.stringify({ error: "Runtime is offline" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Build OpenClaw payload ─────────────────────────────────
  const allowedTools = TOOL_PROFILE_TOOLS[runtime.tool_profile] ?? [];
  const openclawPayload = {
    job_id: job.id,
    job_type: job.job_type,
    prompt: job.prompt,
    payload: job.payload,
    tool_profile: runtime.tool_profile,
    allowed_tools: allowedTools,
    max_runtime_seconds: 120,
    callback_url: `${SUPABASE_URL}/functions/v1/openclaw-sync-job`,
    metadata: {
      org_id: job.org_id,
      user_id: job.user_id,
      created_at: job.created_at,
    },
  };

  // ── Mark job as running ────────────────────────────────────
  await sb.from("openclaw_jobs").update({
    status: "running",
    started_at: new Date().toISOString(),
  }).eq("id", job_id);

  await sb.from("openclaw_job_events").insert({
    job_id,
    event_type: "dispatch_started",
    message: `Dispatch vers runtime ${runtime.name} (${runtime.environment})`,
    metadata: {
      runtime_id: runtime.id,
      tool_profile: runtime.tool_profile,
      allowed_tools: allowedTools,
      base_url: runtime.base_url,
    },
  });

  // ── Attempt dispatch to OpenClaw ───────────────────────────
  // If OPENCLAW_API_TOKEN is not configured → job is marked as "waiting for runtime"
  // This is HONEST behaviour: we don't fake a result.
  if (!OPENCLAW_API_TOKEN) {
    await sb.from("openclaw_jobs").update({
      status: "failed",
      error_message: "OpenClaw runtime not configured: OPENCLAW_API_TOKEN missing. Configure the secret to enable real dispatching.",
      completed_at: new Date().toISOString(),
    }).eq("id", job_id);

    await sb.from("openclaw_job_events").insert({
      job_id,
      event_type: "dispatch_failed",
      message: "Runtime OpenClaw non configuré — OPENCLAW_API_TOKEN absent",
      metadata: { reason: "missing_credentials" },
    });

    return new Response(JSON.stringify({
      success: false,
      job_id,
      status: "failed",
      message: "OpenClaw runtime non configuré. Veuillez configurer OPENCLAW_API_TOKEN.",
    }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Real dispatch ──────────────────────────────────────────
  try {
    const dispatchUrl = `${runtime.base_url}/v1/jobs`;
    const dispatchResp = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENCLAW_API_TOKEN}`,
        "X-Genie-Job-Id": job.id,
        "X-Genie-Org-Id": job.org_id,
      },
      body: JSON.stringify(openclawPayload),
      signal: AbortSignal.timeout(OPENCLAW_TIMEOUT_MS),
    });

    const respText = await dispatchResp.text();
    let respData: unknown;
    try { respData = JSON.parse(respText); } catch { respData = { raw: respText }; }

    if (!dispatchResp.ok) {
      await sb.from("openclaw_jobs").update({
        status: "failed",
        error_message: `OpenClaw rejected job: HTTP ${dispatchResp.status} — ${respText.slice(0, 500)}`,
        completed_at: new Date().toISOString(),
      }).eq("id", job_id);

      await sb.from("openclaw_job_events").insert({
        job_id,
        event_type: "dispatch_failed",
        message: `OpenClaw a rejeté le job (HTTP ${dispatchResp.status})`,
        metadata: { status_code: dispatchResp.status, response: respData },
      });

      return new Response(JSON.stringify({
        success: false,
        job_id,
        status: "failed",
        message: `OpenClaw dispatch failed: ${dispatchResp.status}`,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success: OpenClaw accepted the job
    await sb.from("openclaw_job_events").insert({
      job_id,
      event_type: "dispatch_accepted",
      message: "Job accepté par OpenClaw runtime",
      metadata: { response: respData, dispatched_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({
      success: true,
      job_id,
      status: "running",
      message: "Job dispatché vers OpenClaw. Suivi en cours.",
      openclaw_response: respData,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (dispatchErr) {
    const errMsg = String(dispatchErr);
    await sb.from("openclaw_jobs").update({
      status: "failed",
      error_message: `Dispatch network error: ${errMsg}`,
      completed_at: new Date().toISOString(),
    }).eq("id", job_id);

    await sb.from("openclaw_job_events").insert({
      job_id,
      event_type: "dispatch_error",
      message: `Erreur réseau lors du dispatch: ${errMsg}`,
      metadata: { error: errMsg },
    });

    return new Response(JSON.stringify({
      success: false,
      job_id,
      status: "failed",
      message: `Network error: ${errMsg}`,
    }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
