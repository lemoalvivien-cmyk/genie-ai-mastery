/**
 * ai-queue-enqueue — Enqueue an AI job and return immediately.
 * Caller receives { job_id, status: "queued" } in < 200ms.
 * The actual AI work is done by ai-queue-processor (background).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthenticatedUser, createServiceClient, handleOptions } from "../_shared/auth.ts";

const ALLOWED_TYPES = ["chat", "pdf", "brain"] as const;
type JobType = typeof ALLOWED_TYPES[number];

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const preflight = handleOptions(req, corsHeaders);
  if (preflight) return preflight;

  try {
    const supabase = createServiceClient();
    const user = await getAuthenticatedUser(req, supabase);

    const body = await req.json().catch(() => ({}));
    const { job_type, payload } = body as { job_type?: string; payload?: unknown };

    if (!job_type || !(ALLOWED_TYPES as readonly string[]).includes(job_type)) {
      return new Response(
        JSON.stringify({ error: `job_type must be one of: ${ALLOWED_TYPES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ error: "payload must be a non-null object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert job — returns immediately
    const { data: job, error: insertErr } = await supabase
      .from("ai_jobs")
      .insert({
        user_id: user.id,
        job_type: job_type as JobType,
        payload,
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (insertErr || !job) {
      console.error("[ai-queue-enqueue] insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to enqueue job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fire-and-forget: trigger processor asynchronously (non-blocking)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    EdgeRuntime.waitUntil(
      fetch(`${SUPABASE_URL}/functions/v1/ai-queue-processor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ job_id: job.id }),
      }).catch((e) => console.warn("[ai-queue-enqueue] processor trigger failed:", e)),
    );

    return new Response(
      JSON.stringify({
        job_id: job.id,
        status: "queued",
        created_at: job.created_at,
        poll_url: `${SUPABASE_URL}/functions/v1/ai-queue-enqueue/status?job_id=${job.id}`,
      }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    if (e instanceof Response) {
      const body = await e.text();
      return new Response(body, {
        status: e.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("[ai-queue-enqueue] unexpected:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
