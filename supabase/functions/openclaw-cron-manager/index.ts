/**
 * openclaw-cron-manager
 * Gère les routines pédagogiques planifiées.
 * Sécurisé par CRON_SECRET (appels automatisés) + JWT (appels manuels manager).
 *
 * SÉCURITÉ :
 * - Un manager ne peut créer des routines QUE pour son organisation (org scoped).
 * - Un admin peut créer des routines pour n'importe quelle organisation.
 * - body.org_id est validé contre l'org réelle du manager appelant.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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

  // ── Auth: CRON_SECRET (appels automatisés) ou JWT manager/admin ─────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecret = req.headers.get("X-Cron-Secret") ?? "";

  let isCronCall = false;
  let isAuthorized = false;
  let callerUserId: string | null = null;
  let callerOrgId: string | null = null;
  let isAdmin = false;

  if (cronSecret && CRON_SECRET && cronSecret === CRON_SECRET) {
    isCronCall = true;
    isAuthorized = true;
    isAdmin = true; // cron runs with full trust
  } else {
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: no token provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    callerUserId = user.id;

    // Load caller org
    const { data: profile } = await sb
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();
    callerOrgId = profile?.org_id ?? null;

    const { data: rolesData } = await sb.rpc("get_my_roles");
    const roles: string[] = (rolesData ?? []).map((r: { role: string }) => r.role);
    isAdmin = roles.includes("admin");
    const isManager = roles.includes("manager");

    if (isAdmin || isManager) {
      isAuthorized = true;
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

  // ── ACTION: list_pending ──────────────────────────────────────────────────
  if (action === "list_pending") {
    // Managers only see runtimes from their org; admins see all
    const query = sb
      .from("openclaw_runtimes")
      .select("id, org_id, name, status, tool_profile")
      .eq("tool_profile", "scheduled_coach")
      .eq("status", "healthy");

    if (!isAdmin && callerOrgId) {
      query.eq("org_id", callerOrgId);
    }

    const { data: runtimes } = await query;

    return new Response(JSON.stringify({
      message: "Cron manager operational",
      is_cron_call: isCronCall,
      available_coach_runtimes: runtimes ?? [],
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── ACTION: create_scheduled_job ──────────────────────────────────────────
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

    if (!body.org_id || !body.runtime_id || !body.title || !body.prompt) {
      return new Response(JSON.stringify({ error: "org_id, runtime_id, title, prompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SECURITY: org-scope check ─────────────────────────────────────────────
    // Managers can only create routines for their own org.
    // Admins and cron calls are unrestricted.
    if (!isAdmin && !isCronCall) {
      if (!callerOrgId) {
        return new Response(JSON.stringify({ error: "Forbidden: your account has no associated organization" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (body.org_id !== callerOrgId) {
        return new Response(JSON.stringify({
          error: "Forbidden: managers can only create scheduled jobs for their own organization",
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Verify runtime belongs to the target org and has correct profile
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

    const { data: orgMembers } = await sb
      .from("profiles")
      .select("id")
      .eq("org_id", body.org_id)
      .limit(500);

    const createdJobs: string[] = [];

    for (const member of (orgMembers ?? []).slice(0, 1)) {
      const { data: job } = await sb
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
          metadata: {
            schedule_description: body.schedule_description,
            created_by_cron: isCronCall,
            created_by_user: callerUserId,
          },
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
