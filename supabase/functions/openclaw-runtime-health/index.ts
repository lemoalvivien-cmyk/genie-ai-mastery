/**
 * openclaw-runtime-health
 * Vérifie la santé d'un runtime OpenClaw et met à jour le statut en DB.
 * Jamais accessible sans auth serveur solide (JWT requis).
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
const OPENCLAW_TIMEOUT_MS = parseInt(Deno.env.get("OPENCLAW_TIMEOUT_MS") ?? "10000");

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
  let runtime_id: string;
  try {
    const body = await req.json();
    runtime_id = body.runtime_id;
    if (!runtime_id) throw new Error("missing runtime_id");
  } catch {
    return new Response(JSON.stringify({ error: "runtime_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Load runtime ────────────────────────────────────────────
  const { data: runtime, error: rtErr } = await sb
    .from("openclaw_runtimes")
    .select("*")
    .eq("id", runtime_id)
    .single();

  if (rtErr || !runtime) {
    return new Response(JSON.stringify({ error: "Runtime not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Permission: must be org member, manager, or admin ──────
  const { data: profile } = await sb.from("profiles").select("org_id").eq("id", user.id).single();
  const { data: rolesData } = await sb.rpc("get_my_roles");
  const roles: string[] = (rolesData ?? []).map((r: { role: string }) => r.role);
  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager") || isAdmin;
  const isOrgMember = profile?.org_id === runtime.org_id;

  if (!isOrgMember && !isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!isManager && !isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden: manager or admin required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── If OpenClaw not configured → honest status ─────────────
  if (!OPENCLAW_API_TOKEN) {
    await sb.from("openclaw_runtimes").update({
      status: "offline",
      last_healthcheck_at: new Date().toISOString(),
    }).eq("id", runtime_id);

    return new Response(JSON.stringify({
      runtime_id,
      status: "offline",
      reason: "OPENCLAW_API_TOKEN not configured",
      last_healthcheck_at: new Date().toISOString(),
      tools_available: [],
      version: null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Real healthcheck ───────────────────────────────────────
  let newStatus: "healthy" | "degraded" | "offline" = "offline";
  let healthData: Record<string, unknown> = {};

  try {
    const healthUrl = `${runtime.base_url}/v1/health`;
    const resp = await fetch(healthUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${OPENCLAW_API_TOKEN}`,
        "X-Genie-Runtime-Id": runtime_id,
      },
      signal: AbortSignal.timeout(OPENCLAW_TIMEOUT_MS),
    });

    const respText = await resp.text();
    try { healthData = JSON.parse(respText); } catch { healthData = { raw: respText }; }

    if (resp.ok) {
      newStatus = "healthy";
    } else if (resp.status >= 500) {
      newStatus = "degraded";
    } else {
      newStatus = "offline";
    }
  } catch (err) {
    newStatus = "offline";
    healthData = { error: String(err) };
  }

  // ── Update DB ──────────────────────────────────────────────
  await sb.from("openclaw_runtimes").update({
    status: newStatus,
    last_healthcheck_at: new Date().toISOString(),
  }).eq("id", runtime_id);

  return new Response(JSON.stringify({
    runtime_id,
    runtime_name: runtime.name,
    status: newStatus,
    environment: runtime.environment,
    tool_profile: runtime.tool_profile,
    last_healthcheck_at: new Date().toISOString(),
    tools_available: healthData.tools ?? [],
    version: healthData.version ?? null,
    raw: healthData,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
