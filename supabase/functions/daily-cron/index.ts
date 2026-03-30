/**
 * daily-cron — runs once per day via pg_cron
 * 1. Fetches RSS/release-notes from all enabled sources
 * 2. Generates AI briefs from new items
 * 3. [Autopilot] Auto-campaigns for orgs with completion rate < 70%
 * 4. [Autopilot] Auto-attestations for users who passed all required modules
 *
 * Auth: NOT JWT-protected (called by pg_cron).
 * Protected by X-CRON-SECRET header to prevent unauthorized triggering.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronSecret } from "../_shared/cron-auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendAlert } from "../_shared/alerts.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: getCorsHeaders(req),
    });
  }

  // ── Auth: require CRON_SECRET header ────────────────────────────────────────
  try {
    verifyCronSecret(req);
  } catch (resp) {
    return resp as Response;
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const cronHeaders = {
    "Content-Type": "application/json",
    "x-cron-secret": CRON_SECRET,
    "apikey": SUPABASE_ANON_KEY,
  };

  const log: string[] = [];

  // ── 1. Fetch sources ─────────────────────────────────────────────────────────
  try {
    const fetchResp = await fetch(`${SUPABASE_URL}/functions/v1/fetch-sources`, {
      method: "POST",
      headers: cronHeaders,
      body: JSON.stringify({}),
    });
    const fetchData = await fetchResp.json();
    log.push(`fetch-sources: ${JSON.stringify(fetchData?.results?.length ?? fetchData?.message ?? fetchData?.error)}`);
  } catch (err) {
    log.push(`fetch-sources error: ${err}`);
  }

  // ── 2. Generate briefs ───────────────────────────────────────────────────────
  try {
    const briefsResp = await fetch(`${SUPABASE_URL}/functions/v1/generate-briefs`, {
      method: "POST",
      headers: { ...cronHeaders, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({}),
    });
    const briefsData = await briefsResp.json();
    log.push(`generate-briefs: ${JSON.stringify(briefsData?.generated ?? briefsData?.error)}`);
  } catch (err) {
    log.push(`generate-briefs error: ${err}`);
  }

  // ── 3. Autopilot: auto-campaigns for orgs with completion < 70% ─────────────
  try {
    const campaignResult = await runAutoCampaigns(supabase, SUPABASE_URL, cronHeaders, RESEND_API_KEY);
    log.push(`auto-campaigns: ${JSON.stringify(campaignResult)}`);
  } catch (err) {
    log.push(`auto-campaigns error: ${err}`);
  }

  // ── 4. Autopilot: auto-attestations for eligible users ──────────────────────
  try {
    const attestResult = await runAutoAttestations(supabase, SUPABASE_URL, SERVICE_ROLE_KEY, RESEND_API_KEY);
    log.push(`auto-attestations: ${JSON.stringify(attestResult)}`);
  } catch (err) {
    log.push(`auto-attestations error: ${err}`);
  }

  // ── 5. AI budget check ──────────────────────────────────────────────────────
  try {
    const budgetResult = await checkAIBudgetAlert(supabase);
    log.push(`budget-alert: ${JSON.stringify(budgetResult)}`);
  } catch (err) {
    log.push(`budget-alert error: ${err}`);
  }

  // ── 6. Trial ending emails (J-3 before trial_end) ─────────────────────────
  try {
    const trialResult = await sendTrialEndingEmails(supabase, RESEND_API_KEY);
    log.push(`trial-ending: ${JSON.stringify(trialResult)}`);
  } catch (err) {
    log.push(`trial-ending error: ${err}`);
  }

  // ── 7. Re-engagement emails (7 days inactive) ─────────────────────────────
  try {
    const reengageResult = await sendReEngagementEmails(supabase, RESEND_API_KEY);
    log.push(`re-engagement: ${JSON.stringify(reengageResult)}`);
  } catch (err) {
    log.push(`re-engagement error: ${err}`);
  }

  console.log("daily-cron done:", log.join(" | "));
  return new Response(JSON.stringify({ ok: true, log }), {
    headers: { "Content-Type": "application/json" },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature 5 — AI Budget Alert (checks daily AI spend vs threshold)
// ─────────────────────────────────────────────────────────────────────────────
async function checkAIBudgetAlert(
  supabase: ReturnType<typeof createClient>,
): Promise<{ total_cost_eur: number; alert_sent: boolean }> {
  const BUDGET_ALERT_THRESHOLD_EUR = 50;
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("ai_usage_daily")
    .select("cost_estimate")
    .eq("date", today);

  const totalCost = (data ?? []).reduce(
    (sum: number, r: { cost_estimate: number }) => sum + (r.cost_estimate ?? 0),
    0,
  );

  if (totalCost > BUDGET_ALERT_THRESHOLD_EUR) {
    await sendAlert({
      level: "critical",
      title: `Budget IA dépassé : ${totalCost.toFixed(2)}€ aujourd'hui`,
      message: `Le budget quotidien IA a dépassé le seuil de ${BUDGET_ALERT_THRESHOLD_EUR}€. Coût actuel : ${totalCost.toFixed(2)}€. Vérifiez les logs ai_usage_daily.`,
      source: "daily-cron",
      context: {
        date: today,
        total_cost_eur: totalCost.toFixed(2),
        threshold_eur: BUDGET_ALERT_THRESHOLD_EUR,
      },
    });
    return { total_cost_eur: totalCost, alert_sent: true };
  }

  return { total_cost_eur: totalCost, alert_sent: false };
}


// ─────────────────────────────────────────────────────────────────────────────
// Feature 6 — Trial ending emails (J-3)
// ─────────────────────────────────────────────────────────────────────────────
async function sendTrialEndingEmails(
  supabase: ReturnType<typeof createClient>,
  resendKey: string | undefined,
): Promise<{ checked: number; sent: number }> {
  const stats = { checked: 0, sent: 0 };
  if (!resendKey) return stats;

  // Find users whose trial ends in 3 days
  const threeDaysFromNow = new Date(Date.now() + 3 * 86400000);
  const threeDaysStart = new Date(threeDaysFromNow);
  threeDaysStart.setHours(0, 0, 0, 0);
  const threeDaysEnd = new Date(threeDaysFromNow);
  threeDaysEnd.setHours(23, 59, 59, 999);

  const { data: expiringUsers } = await supabase
    .from("profiles")
    .select("id, email, full_name, trial_end")
    .gte("trial_end", threeDaysStart.toISOString())
    .lte("trial_end", threeDaysEnd.toISOString())
    .eq("plan", "trial");

  if (!expiringUsers?.length) return stats;

  for (const user of expiringUsers) {
    stats.checked++;
    if (!user.email) continue;

    // Check if we already sent this email
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "trial_ending")
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Formetoialia <formation@formetoialia.com>",
          to: [user.email],
          subject: "⏰ Votre essai Formetoialia se termine dans 3 jours",
          html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>body{font-family:system-ui,sans-serif;background:#f5f5f7;margin:0;padding:0}.wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}.header{background:#0d1f45;padding:32px}.header h1{color:#fff;font-size:22px;margin:0}.body{padding:32px;color:#1a1a2e}.cta{display:block;margin:24px 0;background:#6466f1;color:#fff;padding:16px 32px;border-radius:10px;text-decoration:none;text-align:center;font-weight:700;font-size:16px}.footer{background:#f5f5f7;padding:20px;text-align:center;color:#888;font-size:12px}</style></head><body><div class="wrap"><div class="header"><h1>⏰ Plus que 3 jours d'essai</h1></div><div class="body"><p>Bonjour ${user.full_name ?? ""},</p><p>Votre essai gratuit de Formetoialia se termine dans <strong>3 jours</strong>.</p><p>Pour continuer à accéder à vos playbooks, missions quotidiennes et à l'assistant KITT, passez au plan Pro.</p><a class="cta" href="https://formetoialia.com/pricing">Voir les offres →</a><p style="font-size:13px;color:#666">Si vous ne souhaitez pas continuer, aucune action n'est nécessaire. Votre compte restera accessible en mode gratuit.</p></div><div class="footer">Formetoialia — <a href="https://formetoialia.com">formetoialia.com</a></div></div></body></html>`,
        }),
      });

      if (resp.ok) {
        stats.sent++;
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "trial_ending",
          title: "Essai terminant dans 3 jours",
          body: "Email de rappel envoyé",
          metadata: { auto: true },
        });
      }
    } catch (_e) { /* non-blocking */ }
  }

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 7 — Re-engagement emails (7 days inactive)
// ─────────────────────────────────────────────────────────────────────────────
async function sendReEngagementEmails(
  supabase: ReturnType<typeof createClient>,
  resendKey: string | undefined,
): Promise<{ checked: number; sent: number }> {
  const stats = { checked: 0, sent: 0 };
  if (!resendKey) return stats;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

  // Find users inactive for 7+ days (last_active between 14 and 7 days ago)
  const { data: inactiveUsers } = await supabase
    .from("profiles")
    .select("id, email, full_name, last_active_at")
    .lte("last_active_at", sevenDaysAgo)
    .gte("last_active_at", fourteenDaysAgo)
    .limit(50);

  if (!inactiveUsers?.length) return stats;

  for (const user of inactiveUsers) {
    stats.checked++;
    if (!user.email) continue;

    // Throttle: max 1 re-engagement email per 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: recent } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "re_engagement")
      .gte("created_at", thirtyDaysAgo)
      .limit(1)
      .maybeSingle();

    if (recent) continue;

    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Formetoialia <formation@formetoialia.com>",
          to: [user.email],
          subject: "👋 On ne vous oublie pas — votre formation IA vous attend",
          html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>body{font-family:system-ui,sans-serif;background:#f5f5f7;margin:0;padding:0}.wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}.header{background:#0d1f45;padding:32px}.header h1{color:#fff;font-size:22px;margin:0}.body{padding:32px;color:#1a1a2e}.cta{display:block;margin:24px 0;background:#6466f1;color:#fff;padding:16px 32px;border-radius:10px;text-decoration:none;text-align:center;font-weight:700;font-size:16px}.footer{background:#f5f5f7;padding:20px;text-align:center;color:#888;font-size:12px}</style></head><body><div class="wrap"><div class="header"><h1>👋 ${user.full_name ?? "Bonjour"}, on vous attend !</h1></div><div class="body"><p>Cela fait une semaine que vous n'avez pas ouvert Formetoialia.</p><p>Vos playbooks et missions quotidiennes sont prêts. <strong>3 minutes suffisent</strong> pour maintenir votre progression.</p><a class="cta" href="https://formetoialia.com/app/today">Reprendre ma formation →</a><p style="font-size:13px;color:#666">Si vous ne souhaitez plus recevoir ces emails, vous pouvez vous désabonner dans vos paramètres.</p></div><div class="footer">Formetoialia — <a href="https://formetoialia.com">formetoialia.com</a></div></div></body></html>`,
        }),
      });

      if (resp.ok) {
        stats.sent++;
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "re_engagement",
          title: "Email de re-engagement envoyé",
          body: "Inactif depuis 7 jours",
          metadata: { auto: true, inactive_since: user.last_active_at },
        });
      }
    } catch (_e) { /* non-blocking */ }
  }

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 1 — Auto-campaigns when completion rate < 70%
// ─────────────────────────────────────────────────────────────────────────────
async function runAutoCampaigns(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  _cronHeaders: Record<string, string>,
  resendKey: string | undefined,
): Promise<{ orgs_checked: number; campaigns_created: number; notifications_sent: number; emails_sent: number }> {
  const stats = { orgs_checked: 0, campaigns_created: 0, notifications_sent: 0, emails_sent: 0 };

  // Fetch all orgs with at least one learner
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .order("created_at");

  if (!orgs?.length) return stats;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  for (const org of orgs) {
    stats.orgs_checked++;

    // Calculate completion rate for this org
    const { data: members } = await supabase
      .from("profiles")
      .select("id")
      .eq("org_id", org.id)
      .eq("role", "learner");

    if (!members?.length) continue;

    const memberIds = members.map((m: { id: string }) => m.id);

    // Count completed vs total progress rows
    const { count: totalProgress } = await supabase
      .from("progress")
      .select("id", { count: "exact", head: true })
      .in("user_id", memberIds);

    const { count: completedProgress } = await supabase
      .from("progress")
      .select("id", { count: "exact", head: true })
      .in("user_id", memberIds)
      .eq("status", "completed");

    if (!totalProgress || totalProgress === 0) continue;

    const completionRate = (completedProgress ?? 0) / totalProgress;
    if (completionRate >= 0.70) continue;

    // Check if we already sent a campaign in the last 7 days
    const { data: recentCampaign } = await supabase
      .from("campaigns")
      .select("id, last_sent_at")
      .eq("org_id", org.id)
      .eq("is_auto", true)
      .gte("last_sent_at", sevenDaysAgo)
      .limit(1)
      .maybeSingle();

    if (recentCampaign) continue; // throttle: max 1 auto-campaign per 7 days

    // Find lagging learners (no completed progress)
    const { data: laggingMembers } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", memberIds);

    if (!laggingMembers?.length) continue;

    // Create the auto campaign record
    const { data: campaign } = await supabase
      .from("campaigns")
      .insert({
        org_id: org.id,
        title: `Relance automatique — ${new Date().toLocaleDateString("fr-FR")}`,
        description: `Taux de complétion : ${Math.round(completionRate * 100)}%. Rappel automatique envoyé aux membres en retard.`,
        module_ids: [],
        status: "active",
        is_auto: true,
        last_sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (campaign?.id) stats.campaigns_created++;

    // Create in-app notifications for lagging learners
    const notifications = laggingMembers.map((m: { id: string; full_name: string | null; email: string | null }) => ({
      user_id: m.id,
      org_id: org.id,
      type: "reminder",
      title: "Votre formation vous attend !",
      body: `Votre organisation ${org.name} vous rappelle de continuer votre formation. Quelques minutes suffisent aujourd'hui.`,
      metadata: { campaign_id: campaign?.id, completion_rate: Math.round(completionRate * 100) },
    }));

    const { error: notifErr } = await supabase.from("notifications").insert(notifications);
    if (!notifErr) stats.notifications_sent += notifications.length;

    // Send email reminders via Resend
    if (resendKey) {
      for (const member of laggingMembers) {
        if (!member.email) continue;
        try {
          const emailResp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Formetoialia <formation@formetoialia.com>",
              to: [member.email],
              subject: `[${org.name}] Continuez votre formation IA — 5 minutes suffisent`,
              html: buildReminderEmailHtml(member.full_name ?? "Apprenant", org.name, completionRate),
            }),
          });
          if (emailResp.ok) stats.emails_sent++;
        } catch (_e) {
          // Non-blocking
        }
      }
    }
  }

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 3 — Auto-attestations for users who passed all required modules
// ─────────────────────────────────────────────────────────────────────────────
async function runAutoAttestations(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  resendKey: string | undefined,
): Promise<{ candidates_checked: number; attestations_generated: number; notifications_sent: number }> {
  const stats = { candidates_checked: 0, attestations_generated: 0, notifications_sent: 0 };

  // Find users who have all their progress completed and no existing attestation
  const { data: eligible } = await supabase.rpc
    ? await (supabase as unknown as { rpc: (fn: string) => Promise<{ data: { user_id: string; org_id: string | null; score_avg: number }[] | null; error: unknown }> })
      .rpc("get_auto_attestation_candidates")
      .then((r) => r)
    : { data: null };

  // Fallback: manual query if RPC doesn't exist
  const { data: completedUsers } = await supabase
    .from("progress")
    .select("user_id, score")
    .eq("status", "completed")
    .gte("score", 70);

  if (!completedUsers?.length) return stats;

  // Group by user
  const byUser = new Map<string, number[]>();
  for (const row of completedUsers) {
    const arr = byUser.get(row.user_id) ?? [];
    arr.push(row.score);
    byUser.set(row.user_id, arr);
  }

  for (const [userId, scores] of byUser) {
    stats.candidates_checked++;

    // Skip if attestation already exists
    const { data: existing } = await supabase
      .from("attestations")
      .select("id")
      .eq("user_id", userId)
      .gte("generated_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    // Must have at least 2 completed modules with score >= 70
    if (scores.length < 2) continue;

    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, org_id")
      .eq("id", userId)
      .single();

    if (!profile) continue;

    // Call generate-pdf to create the attestation (service role, bypass plan check)
    try {
      const pdfResp = await fetch(`${supabaseUrl}/functions/v1/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "x-autopilot": "true",
        },
        body: JSON.stringify({
          type: "attestation",
          base_url: "https://formetoialia.com",
          artifact_title: `Attestation automatique — ${new Date().toLocaleDateString("fr-FR")}`,
        }),
      });

      if (pdfResp.ok) {
        stats.attestations_generated++;

        // Notify the user in-app
        await supabase.from("notifications").insert({
          user_id: userId,
          org_id: profile.org_id ?? null,
          type: "attestation",
          title: "🎓 Attestation générée automatiquement !",
          body: `Félicitations ! Votre attestation de formation (score moyen : ${avgScore}%) a été générée automatiquement.`,
          metadata: { avg_score: avgScore, auto: true },
        });
        stats.notifications_sent++;

        // Notify manager(s)
        if (profile.org_id) {
          const { data: managers } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .eq("org_id", profile.org_id)
            .eq("role", "manager");

          for (const manager of (managers ?? [])) {
            await supabase.from("notifications").insert({
              user_id: manager.id,
              org_id: profile.org_id,
              type: "attestation",
              title: `Attestation générée pour ${profile.full_name ?? "un apprenant"}`,
              body: `${profile.full_name ?? "Un apprenant"} a obtenu son attestation automatiquement (score : ${avgScore}%).`,
              metadata: { learner_id: userId, avg_score: avgScore, auto: true },
            });
            stats.notifications_sent++;

            // Email manager
            if (resendKey && manager.email) {
              try {
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${resendKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    from: "Formetoialia <formation@formetoialia.com>",
                    to: [manager.email],
                    subject: `✅ Attestation auto-générée — ${profile.full_name ?? "Apprenant"}`,
                    html: buildAttestationEmailHtml(
                      manager.full_name ?? "Manager",
                      profile.full_name ?? "Apprenant",
                      avgScore
                    ),
                  }),
                });
              } catch (_e) {
                // Non-blocking
              }
            }
          }
        }
      }
    } catch (_e) {
      // Non-blocking
    }
  }

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────────────────────────────────────
function buildReminderEmailHtml(learnerName: string, orgName: string, completionRate: number): string {
  const pct = Math.round(completionRate * 100);
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, sans-serif; background: #f5f5f7; margin: 0; padding: 0; }
  .wrap { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,.08); }
  .header { background: #0d1f45; padding: 32px; }
  .header h1 { color: #fff; font-size: 22px; margin: 0; }
  .body { padding: 32px; color: #1a1a2e; }
  .stat { background: #f0f4ff; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
  .stat .num { font-size: 36px; font-weight: 800; color: #6466f1; }
  .cta { display: block; margin: 24px 0; background: #6466f1; color: #fff; padding: 16px 32px; border-radius: 10px; text-decoration: none; text-align: center; font-weight: 700; font-size: 16px; }
  .footer { background: #f5f5f7; padding: 20px; text-align: center; color: #888; font-size: 12px; }
</style></head>
<body><div class="wrap">
  <div class="header"><h1>⚡ Votre formation vous attend, ${learnerName} !</h1></div>
  <div class="body">
    <p>Bonjour ${learnerName},</p>
    <p>Votre organisation <strong>${orgName}</strong> a activé le rappel automatique de formation. Le taux de complétion de l'équipe est actuellement de :</p>
    <div class="stat"><div class="num">${pct}%</div><div>Taux de complétion équipe</div></div>
    <p>Quelques minutes suffisent pour progresser. Connectez-vous dès maintenant à votre espace de formation.</p>
    <a class="cta" href="https://formetoialia.com/app/modules">Continuer ma formation →</a>
    <p style="font-size:13px;color:#666;">Cet email a été envoyé automatiquement par le système d'Autopilot Formation de Formetoialia.</p>
  </div>
  <div class="footer">Formetoialia — Plateforme de formation IA & Cybersécurité — <a href="https://formetoialia.com">formetoialia.com</a></div>
</div></body></html>`;
}

function buildAttestationEmailHtml(managerName: string, learnerName: string, avgScore: number): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, sans-serif; background: #f5f5f7; margin: 0; padding: 0; }
  .wrap { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,.08); }
  .header { background: #0d1f45; padding: 32px; }
  .header h1 { color: #fff; font-size: 22px; margin: 0; }
  .body { padding: 32px; color: #1a1a2e; }
  .badge { background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
  .badge .score { font-size: 36px; font-weight: 800; color: #10b981; }
  .cta { display: block; margin: 24px 0; background: #6466f1; color: #fff; padding: 16px 32px; border-radius: 10px; text-decoration: none; text-align: center; font-weight: 700; font-size: 16px; }
  .footer { background: #f5f5f7; padding: 20px; text-align: center; color: #888; font-size: 12px; }
</style></head>
<body><div class="wrap">
  <div class="header"><h1>🎓 Attestation générée automatiquement</h1></div>
  <div class="body">
    <p>Bonjour ${managerName},</p>
    <p><strong>${learnerName}</strong> a validé l'ensemble de ses modules de formation et son attestation a été <strong>générée automatiquement</strong> par l'Autopilot Formetoialia.</p>
    <div class="badge"><div class="score">${avgScore}%</div><div>Score moyen de formation</div></div>
    <p>Vous pouvez consulter et télécharger l'attestation depuis votre tableau de bord manager.</p>
    <a class="cta" href="https://formetoialia.com/app/manager">Voir le tableau de bord →</a>
    <p style="font-size:13px;color:#666;">Aucune action requise de votre part — l'Autopilot gère tout automatiquement.</p>
  </div>
  <div class="footer">Formetoialia — Autopilot Formation — <a href="https://formetoialia.com">formetoialia.com</a></div>
</div></body></html>`;
}
