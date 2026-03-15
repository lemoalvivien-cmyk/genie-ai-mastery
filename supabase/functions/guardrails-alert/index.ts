/**
 * guardrails-alert — Cron-triggered (daily) + on-demand
 * - Vérifie dépassement de budget IA/jour par org
 * - Kill-switch auto si threshold critique
 * - Log une alerte dans analytics_events
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { verifyCronSecret } from "../_shared/cron-auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const COST_ALERT_THRESHOLD_EUR = 10;    // Alert if any org exceeds €10/day
const COST_KILL_THRESHOLD_EUR   = 25;   // Hard kill if any org exceeds €25/day
const GLOBAL_DAILY_COST_CAP_EUR = 150;  // Global kill if total day cost exceeds €150

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Auth: CRON_SECRET (called by pg_cron, no JWT) ──────────────────────────
  try {
    verifyCronSecret(req);
  } catch (resp) {
    return resp as Response;
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const today = new Date().toISOString().slice(0, 10);
  const results: string[] = [];

  try {
    // ── 1. Per-org cost check ─────────────────────────────────────────────
    const { data: orgUsage } = await admin
      .from("ai_usage_daily")
      .select("org_id, cost_estimate")
      .eq("date", today)
      .not("org_id", "is", null);

    const orgCosts: Record<string, number> = {};
    for (const row of orgUsage ?? []) {
      if (row.org_id) orgCosts[row.org_id] = (orgCosts[row.org_id] ?? 0) + row.cost_estimate;
    }

    for (const [orgId, cost] of Object.entries(orgCosts)) {
      if (cost >= COST_KILL_THRESHOLD_EUR) {
        // Force eco mode for this org
        await admin.from("org_budgets").upsert({
          org_id: orgId,
          eco_mode_forced: true,
          eco_triggered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        await admin.from("analytics_events").insert({
          event_name: "guardrail_kill_switch_org",
          properties: { org_id: orgId, cost_eur: cost, threshold: COST_KILL_THRESHOLD_EUR, date: today },
        });
        results.push(`KILL org=${orgId} cost=${cost.toFixed(2)}`);
      } else if (cost >= COST_ALERT_THRESHOLD_EUR) {
        await admin.from("analytics_events").insert({
          event_name: "guardrail_cost_alert_org",
          properties: { org_id: orgId, cost_eur: cost, threshold: COST_ALERT_THRESHOLD_EUR, date: today },
        });
        results.push(`ALERT org=${orgId} cost=${cost.toFixed(2)}`);
      }
    }

    // ── 2. Global cost check ──────────────────────────────────────────────
    const globalCost = Object.values(orgCosts).reduce((s, v) => s + v, 0);
    if (globalCost >= GLOBAL_DAILY_COST_CAP_EUR) {
      // Set global kill switch in app_settings
      await admin.from("app_settings").upsert({
        key: "global_ai_kill_switch",
        value: { enabled: true, triggered_at: new Date().toISOString(), cost_eur: globalCost },
        updated_at: new Date().toISOString(),
      });
      await admin.from("analytics_events").insert({
        event_name: "guardrail_global_kill_switch",
        properties: { global_cost_eur: globalCost, threshold: GLOBAL_DAILY_COST_CAP_EUR, date: today },
      });
      results.push(`GLOBAL KILL cost=${globalCost.toFixed(2)}`);
    }

    // ── 3. Invoice failed → track churn risk ─────────────────────────────
    const { data: recentFailed } = await admin
      .from("analytics_events")
      .select("properties")
      .eq("event_name", "invoice_failed")
      .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString());

    if ((recentFailed?.length ?? 0) > 0) {
      results.push(`Invoice failures in last 24h: ${recentFailed!.length}`);
    }

    console.log("[GUARDRAILS]", results.join(" | "));

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[GUARDRAILS] ERROR", String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
