import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronSecret } from "../_shared/cron-auth.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    verifyCronSecret(req);
  } catch (resp) {
    return resp as Response;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: orgs, error: orgsErr } = await supabase
      .from("organizations")
      .select("id, name, email_reminders_enabled, completion_deadline_days, seats_max")
      .eq("email_reminders_enabled", true);

    if (orgsErr) throw orgsErr;
    if (!orgs?.length) return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: corsHeaders });

    let alertsSent = 0;

    for (const org of orgs) {
      const { data: stats } = await supabase.rpc("calculate_org_stats", { _org_id: org.id });

      const { data: managers } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("org_id", org.id)
        .eq("role", "manager");

      if (!managers?.length) continue;

      const managerEmails = managers.map((m: { email: string }) => m.email);

      const completionRate = stats?.completion_rate ?? 100;
      if (completionRate < 50) {
        console.log(`Org ${org.name}: completion rate ${completionRate}% < 50% — alerting managers: ${managerEmails.join(", ")}`);
        alertsSent++;
      }

      const deadlineDays = org.completion_deadline_days ?? 30;
      const cutoff = new Date(Date.now() - deadlineDays * 86400000).toISOString();

      const { data: overdue } = await supabase
        .from("profiles")
        .select("id, full_name, email, last_active_at")
        .eq("org_id", org.id)
        .eq("role", "learner")
        .lt("last_active_at", cutoff);

      if (overdue?.length) {
        console.log(`Org ${org.name}: ${overdue.length} overdue learner(s)`);
        alertsSent += overdue.length;
      }

      await supabase.from("audit_logs").insert({
        action: "manager_alert_check",
        resource_type: "organization",
        resource_id: org.id,
        details: {
          completion_rate: completionRate,
          overdue_count: overdue?.length ?? 0,
          managers_notified: managerEmails.length,
        },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, processed: orgs.length, alertsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("manager-alerts error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
