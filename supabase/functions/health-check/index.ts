/**
 * health-check — Public endpoint for uptime monitoring
 * Returns system status + DB connectivity check.
 * verify_jwt = false (public endpoint for UptimeRobot / BetterUptime)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    status: "ok",
    version: Deno.env.get("DEPLOY_VERSION") ?? "unknown",
  };

  // Test DB connectivity
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase
      .from("app_settings")
      .select("key")
      .limit(1)
      .maybeSingle();
    checks.db = error ? "degraded" : "ok";
    if (error) checks.db_error = error.message;
  } catch (e) {
    checks.db = "down";
    checks.db_error = String(e);
    checks.status = "degraded";
  }

  checks.latency_ms = Date.now() - start;

  const httpStatus = checks.status === "ok" ? 200 : 503;
  return new Response(JSON.stringify(checks), {
    status: httpStatus,
    headers: corsHeaders,
  });
});
