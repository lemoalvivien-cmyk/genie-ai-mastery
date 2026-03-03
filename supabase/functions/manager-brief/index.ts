import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

const log = (step: string, d?: unknown) =>
  console.log(`[MANAGER-BRIEF] ${step}${d ? " - " + JSON.stringify(d) : ""}`);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const inactiveThresholdMs = 14 * 86400000;
    const now = Date.now();

    // Fetch all orgs
    const { data: orgs, error: orgsErr } = await supabase
      .from("organizations")
      .select("id, name, plan, completion_deadline_days");
    if (orgsErr) throw orgsErr;

    log("Processing orgs", { count: orgs?.length ?? 0, week: weekStartStr });

    let processed = 0;
    for (const org of orgs ?? []) {
      try {
        // Learners in org
        const { data: members } = await supabase
          .from("profiles")
          .select("id, full_name, last_active_at")
          .eq("org_id", org.id);

        if (!members?.length) continue;

        const userIds = members.map((m: { id: string }) => m.id);

        // Progress data
        const { data: progressRows } = await supabase
          .from("progress")
          .select("user_id, status, score, module_id, updated_at")
          .in("user_id", userIds);

        const totalLearners = members.length;
        const deadlineDays = org.completion_deadline_days ?? 30;
        const lateThresholdMs = deadlineDays * 86400000;

        // Compute per-user stats
        type AtRiskUser = { id: string; full_name: string | null; reason: string; last_active: string | null };
        const atRiskUsers: AtRiskUser[] = [];
        let completedCount = 0;
        let totalProgressEntries = 0;
        const scores: number[] = [];

        for (const member of members) {
          const userProg = progressRows?.filter((p: { user_id: string }) => p.user_id === member.id) ?? [];
          const completed = userProg.filter((p: { status: string }) => p.status === "completed");
          completedCount += completed.length;
          totalProgressEntries += userProg.length;
          completed.forEach((p: { score: number | null }) => { if (p.score != null) scores.push(p.score); });

          const lastActive = member.last_active_at ? new Date(member.last_active_at).getTime() : null;
          const isInactive = !lastActive || (now - lastActive) > inactiveThresholdMs;
          const isLate = lastActive && (now - lastActive) > lateThresholdMs;

          if (isInactive) {
            atRiskUsers.push({ id: member.id, full_name: member.full_name, reason: "inactive", last_active: member.last_active_at });
          } else if (isLate) {
            atRiskUsers.push({ id: member.id, full_name: member.full_name, reason: "late", last_active: member.last_active_at });
          }
        }

        const completionRate = totalProgressEntries > 0
          ? Math.round((completedCount / totalProgressEntries) * 100)
          : 0;
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;

        // Top 5 skill gaps: modules with lowest completion rates
        const moduleCompletions: Record<string, { completed: number; total: number; id: string }> = {};
        for (const p of progressRows ?? []) {
          if (!moduleCompletions[p.module_id]) moduleCompletions[p.module_id] = { completed: 0, total: 0, id: p.module_id };
          moduleCompletions[p.module_id].total++;
          if (p.status === "completed") moduleCompletions[p.module_id].completed++;
        }

        // Fetch module titles for top gaps
        const moduleIds = Object.keys(moduleCompletions);
        let topGaps: { module_id: string; title: string; rate: number }[] = [];
        if (moduleIds.length) {
          const { data: mods } = await supabase
            .from("modules")
            .select("id, title")
            .in("id", moduleIds);

          topGaps = Object.entries(moduleCompletions)
            .map(([mid, stats]) => ({
              module_id: mid,
              title: mods?.find((m: { id: string; title: string }) => m.id === mid)?.title ?? mid,
              rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            }))
            .sort((a, b) => a.rate - b.rate)
            .slice(0, 5);
        }

        // Upsert weekly report
        await supabase.from("org_weekly_reports").upsert({
          org_id: org.id,
          week_start: weekStartStr,
          completion_rate: completionRate,
          avg_score: avgScore,
          at_risk_count: atRiskUsers.length,
          inactive_count: atRiskUsers.filter((u) => u.reason === "inactive").length,
          top_gaps: topGaps,
          at_risk_users: atRiskUsers,
          total_learners: totalLearners,
        }, { onConflict: "org_id,week_start" });

        log("Report upserted", { org: org.name, completionRate, atRisk: atRiskUsers.length });
        processed++;
      } catch (orgErr) {
        log("Error for org", { org: org.id, error: String(orgErr) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed, week: weekStartStr }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("FATAL", { error: String(err) });
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
