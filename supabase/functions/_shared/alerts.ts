/**
 * alerts.ts — Shared alerting module for Edge Functions
 *
 * Sends structured alerts to:
 *  1. Sentry (via HTTP envelope API — no npm SDK needed in Deno)
 *  2. Slack (incoming webhook)
 *  3. Email (Resend API — to ALERT_EMAIL_TO manager address)
 *
 * All channels are fire-and-forget (best-effort, never throw).
 * Call `sendAlert(alert)` from any Edge Function.
 */

export type AlertLevel = "warning" | "error" | "critical";

export interface Alert {
  level: AlertLevel;
  title: string;
  message: string;
  source: string; // Edge Function name, e.g. "ai-queue-processor"
  context?: Record<string, unknown>;
}

// ── Sentry HTTP API (no SDK required in Deno) ─────────────────────────────────

async function sendToSentry(alert: Alert): Promise<void> {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return;

  try {
    // Parse DSN to get ingest URL
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace("/", "");
    const ingestUrl = `${url.protocol}//${url.host}/api/${projectId}/envelope/`;

    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: new Date().toISOString(),
      platform: "other",
      level: alert.level === "warning" ? "warning" : "error",
      logger: alert.source,
      message: {
        formatted: `[${alert.source}] ${alert.title}: ${alert.message}`,
      },
      tags: {
        source: alert.source,
        alert_level: alert.level,
        ...(alert.context ? Object.fromEntries(
          Object.entries(alert.context)
            .filter(([, v]) => typeof v === "string" || typeof v === "number")
            .map(([k, v]) => [k, String(v)])
        ) : {}),
      },
      extra: alert.context ?? {},
    };

    const envelopeHeader = JSON.stringify({
      event_id: event.event_id,
      sent_at: new Date().toISOString(),
      dsn,
    });
    const itemHeader = JSON.stringify({ type: "event", length: JSON.stringify(event).length });
    const body = `${envelopeHeader}\n${itemHeader}\n${JSON.stringify(event)}`;

    await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}`,
      },
      body,
      signal: AbortSignal.timeout(3000),
    });
  } catch (_e) { /* best-effort */ }
}

// ── Slack Incoming Webhook ─────────────────────────────────────────────────────

const LEVEL_EMOJI: Record<AlertLevel, string> = {
  warning: "⚠️",
  error: "🔴",
  critical: "🚨",
};

const LEVEL_COLOR: Record<AlertLevel, string> = {
  warning: "#F59E0B",
  error: "#EF4444",
  critical: "#7C3AED",
};

async function sendToSlack(alert: Alert): Promise<void> {
  const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!webhookUrl) return;

  try {
    const emoji = LEVEL_EMOJI[alert.level];
    const color = LEVEL_COLOR[alert.level];

    const contextFields = alert.context
      ? Object.entries(alert.context)
          .slice(0, 6)
          .map(([k, v]) => `• *${k}*: \`${String(v).slice(0, 120)}\``)
          .join("\n")
      : "";

    const payload = {
      attachments: [
        {
          color,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `${emoji} ${alert.title}`,
                emoji: true,
              },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Source*\n\`${alert.source}\`` },
                { type: "mrkdwn", text: `*Niveau*\n${alert.level.toUpperCase()}` },
                { type: "mrkdwn", text: `*Heure*\n${new Date().toISOString()}` },
                { type: "mrkdwn", text: `*Message*\n${alert.message.slice(0, 300)}` },
              ],
            },
            ...(contextFields ? [{
              type: "section",
              text: { type: "mrkdwn", text: `*Contexte*\n${contextFields}` },
            }] : []),
            {
              type: "context",
              elements: [{
                type: "mrkdwn",
                text: "Formetoialia · Monitoring Backend",
              }],
            },
          ],
        },
      ],
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
  } catch (_e) { /* best-effort */ }
}

// ── Email via Resend ──────────────────────────────────────────────────────────

async function sendToEmail(alert: Alert): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("ALERT_EMAIL_TO");
  if (!resendKey || !to) return;

  // Only send emails for error/critical — skip warnings to avoid spam
  if (alert.level === "warning") return;

  try {
    const contextRows = alert.context
      ? Object.entries(alert.context)
          .map(([k, v]) => `<tr><td style="padding:4px 8px;font-weight:600;white-space:nowrap">${k}</td><td style="padding:4px 8px;font-family:monospace;word-break:break-all">${String(v).slice(0, 500)}</td></tr>`)
          .join("")
      : "";

    const levelBadge: Record<AlertLevel, string> = {
      warning: "background:#F59E0B;color:#000",
      error: "background:#EF4444;color:#fff",
      critical: "background:#7C3AED;color:#fff",
    };

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f0f0f;color:#e5e5e5">
  <div style="border-left:4px solid ${LEVEL_COLOR[alert.level]};padding:16px 20px;background:#1a1a1a;border-radius:0 8px 8px 0;margin-bottom:20px">
    <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.05em;margin-bottom:8px;${levelBadge[alert.level]}">${alert.level.toUpperCase()}</span>
    <h2 style="margin:0 0 6px;font-size:18px">${alert.title}</h2>
    <p style="margin:0;color:#a1a1a1;font-size:14px"><strong style="color:#e5e5e5">Source :</strong> ${alert.source}</p>
  </div>
  <p style="background:#1a1a1a;padding:12px 16px;border-radius:8px;font-size:14px">${alert.message}</p>
  ${contextRows ? `
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;background:#1a1a1a;border-radius:8px;overflow:hidden">
    <thead><tr><th colspan="2" style="padding:8px 12px;text-align:left;background:#262626;color:#a1a1a1;font-weight:600;letter-spacing:.05em;font-size:11px">CONTEXTE</th></tr></thead>
    <tbody>${contextRows}</tbody>
  </table>` : ""}
  <p style="margin-top:24px;font-size:11px;color:#555">Formetoialia · Backend Monitoring · ${new Date().toISOString()}</p>
</body>
</html>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "alerts@formetoialia.com",
        to: [to],
        subject: `[${alert.level.toUpperCase()}] ${alert.title} — ${alert.source}`,
        html,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (_e) { /* best-effort */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send an alert to all configured channels (Sentry + Slack + Email).
 * Fire-and-forget — never throws.
 */
export async function sendAlert(alert: Alert): Promise<void> {
  await Promise.allSettled([
    sendToSentry(alert),
    sendToSlack(alert),
    sendToEmail(alert),
  ]);
}

/**
 * Rate-limit breach alert helper.
 */
export function rateLimitAlert(opts: {
  emailHash: string;
  ipHash: string;
  attempts: number;
  blockedUntil: string | null;
}): Alert {
  return {
    level: opts.attempts >= 10 ? "critical" : "warning",
    title: "Rate-limit breach — Login bloqué",
    message: `${opts.attempts} tentatives consécutives bloquées`,
    source: "rate-limit-login",
    context: {
      email_hash: opts.emailHash.slice(0, 16) + "…",
      ip_hash: opts.ipHash.slice(0, 16) + "…",
      attempts: opts.attempts,
      blocked_until: opts.blockedUntil ?? "unknown",
    },
  };
}

/**
 * AI job failure alert helper.
 */
export function aiJobFailedAlert(opts: {
  jobId: string;
  jobType: string;
  userId: string | null;
  error: string;
}): Alert {
  return {
    level: opts.jobType === "pdf" ? "error" : "warning",
    title: `AI job échoué — ${opts.jobType.toUpperCase()}`,
    message: opts.error.slice(0, 400),
    source: "ai-queue-processor",
    context: {
      job_id: opts.jobId,
      job_type: opts.jobType,
      user_id: opts.userId ?? "anonymous",
      error: opts.error.slice(0, 200),
    },
  };
}

/**
 * All-providers-failed alert (critical).
 */
export function allProvidersFailed(opts: {
  jobId: string;
  jobType: string;
  userId: string | null;
}): Alert {
  return {
    level: "critical",
    title: "TOUS les providers LLM en échec",
    message: "OpenRouter + Groq + Fireworks ont tous échoué. Vérifiez les API keys.",
    source: "ai-queue-processor",
    context: {
      job_id: opts.jobId,
      job_type: opts.jobType,
      user_id: opts.userId ?? "anonymous",
    },
  };
}
