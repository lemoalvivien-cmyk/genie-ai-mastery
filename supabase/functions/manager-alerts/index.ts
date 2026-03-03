import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://genie-ia.app",
  "https://genie-ai-mastery.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Fetch all organizations with email reminders enabled
    const { data: orgs, error: orgsErr } = await supabase
      .from("organizations")
      .select("id, name, email_reminders_enabled, completion_deadline_days, seats_max")
      .eq("email_reminders_enabled", true);

    if (orgsErr) throw orgsErr;
    if (!orgs?.length) return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: corsHeaders });

    let alertsSent = 0;

    for (const org of orgs) {
      // Get org stats
      const { data: stats } = await supabase.rpc("calculate_org_stats", { _org_id: org.id });

      // Get managers for this org
      const { data: managers } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("org_id", org.id)
        .eq("role", "manager");

      if (!managers?.length) continue;

      const managerEmails = managers.map((m: { email: string }) => m.email);

      // Check if completion rate < 50%
      const completionRate = stats?.completion_rate ?? 100;
      if (completionRate < 50) {
        console.log(`Org ${org.name}: completion rate ${completionRate}% < 50% — alerting managers: ${managerEmails.join(", ")}`);
        alertsSent++;
        // In production: send email via LOVABLE_API_KEY or external email service
      }

      // Find learners who are overdue
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

      // Log audit entry for each org processed
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
