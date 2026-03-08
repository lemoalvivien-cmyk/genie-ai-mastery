/**
 * openclaw-cron-manager
 * Gère les routines pédagogiques planifiées.
 * Sécurisé par CRON_SECRET (appels automatisés) + JWT (appels manuels manager).
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
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

interface ScheduledJob {
  org_id: string;
  runtime_id: string;
  job_type: "scheduled_coach";
  title: string;
  prompt: string;
  payload?: Record<string, unknown>;
  schedule_description: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Auth: CRON_SECRET ou JWT manager/admin ─────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecret = req.headers.get("X-Cron-Secret") ?? "";

  let isCronCall = false;
  let isAuthorized = false;
  let callerUserId: string | null = null;

  if (cronSecret && CRON_SECRET && cronSecret === CRON_SECRET) {
    isCronCall = true;
    isAuthorized = true;
  } else {
    const token = authHeader.replace("Bearer ", "");
    if (token) {
      const { data: { user } } = await sb.auth.getUser(token);
      if (user) {
        callerUserId = user.id;
        const { data: rolesData } = await sb.rpc("get_my_roles");
        const roles: string[] = (rolesData ?? []).map((r: { role: string }) => r.role);
        if (roles.includes("admin") || roles.includes("manager")) {
          isAuthorized = true;
        }
      }
    }
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized: manager/admin or cron secret required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "list_pending";

  // ── ACTION: list_pending — list jobs scheduled for now ──────
  if (action === "list_pending") {
    const { data: runtimes } = await sb
      .from("openclaw_runtimes")
      .select("id, org_id, name, status, tool_profile")
      .eq("tool_profile", "scheduled_coach")
      .eq("status", "healthy");

    return new Response(JSON.stringify({
      message: "Cron manager operational",
      is_cron_call: isCronCall,
      available_coach_runtimes: runtimes ?? [],
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── ACTION: create_scheduled_job ────────────────────────────
  if (action === "create_scheduled_job") {
    let body: ScheduledJob;
    try {
      body = await req.json() as ScheduledJob;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate
    if (!body.org_id || !body.runtime_id || !body.title || !body.prompt) {
      return new Response(JSON.stringify({ error: "org_id, runtime_id, title, prompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify runtime belongs to org and is scheduled_coach
    const { data: runtime } = await sb
      .from("openclaw_runtimes")
      .select("id, org_id, tool_profile, status, name")
      .eq("id", body.runtime_id)
      .eq("org_id", body.org_id)
      .single();

    if (!runtime) {
      return new Response(JSON.stringify({ error: "Runtime not found in this organization" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (runtime.tool_profile !== "scheduled_coach") {
      return new Response(JSON.stringify({ error: "Runtime must use scheduled_coach tool profile" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get org members to create a job per learner (or a single org-wide job)
    const { data: orgMembers } = await sb
      .from("profiles")
      .select("id")
      .eq("org_id", body.org_id)
      .limit(500);

    const createdJobs: string[] = [];

    // Create one representative job (in production, could create per-user)
    for (const member of (orgMembers ?? []).slice(0, 1)) {
      const { data: job, error: jobErr } = await sb
        .from("openclaw_jobs")
        .insert({
          org_id: body.org_id,
          user_id: callerUserId ?? member.id,
          runtime_id: body.runtime_id,
          job_type: "scheduled_coach",
          title: body.title,
          prompt: body.prompt,
          payload: {
            ...(body.payload ?? {}),
            scheduled: true,
            schedule_description: body.schedule_description ?? "scheduled_routine",
            target_org_id: body.org_id,
            member_count: orgMembers?.length ?? 0,
          },
          status: "queued",
          risk_level: "low",
          approval_required: false,
        })
        .select("id")
        .single();

      if (job) {
        createdJobs.push(job.id);
        await sb.from("openclaw_job_events").insert({
          job_id: job.id,
          event_type: "scheduled_created",
          message: `Routine programmée créée: ${body.title}`,
          metadata: { schedule_description: body.schedule_description, created_by_cron: isCronCall },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      created_job_ids: createdJobs,
      org_id: body.org_id,
      runtime_name: runtime.name,
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
