/**
 * rate-limit-login — Server-side brute-force protection
 *
 * Checks & records login attempts using the login_attempts table.
 * Blocks after 5 failed attempts from same IP+email within 15 min.
 *
 * Public endpoint (no JWT needed — called before auth).
 * Protected against abuse via IP hashing — never stores raw IPs.
 *
 * Body: { email: string; success?: boolean }
 * Returns: { allowed: boolean; attempts: number; remaining_ms: number; blocked_until?: string }
 */
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAlert, rateLimitAlert } from "../_shared/alerts.ts";

// Alert threshold: only alert when attempts reach these values (avoid spam)
const ALERT_THRESHOLDS = [5, 10, 20, 50];

// SHA-256 hash using Web Crypto API (available in Deno)
async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // ── Parse body ─────────────────────────────────────────────────────────
    let body: { email?: string; success?: boolean } = {};
    try {
      body = await req.json();
    } catch (_e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: JSON_HEADERS,
      });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400, headers: JSON_HEADERS,
      });
    }
    const success = body.success === true;

    // ── Hash IP + email — never store raw data ─────────────────────────────
    const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("cf-connecting-ip")
      ?? "unknown";

    const [ipHash, emailHash] = await Promise.all([
      sha256hex(rawIp),
      sha256hex(email),
    ]);

    // ── Call SECURITY DEFINER function ────────────────────────────────────
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await adminClient.rpc("check_login_rate_limit", {
      _ip_hash:    ipHash,
      _email_hash: emailHash,
      _success:    success,
    });

    if (error) {
      // Fail open — never block login on infra error
      console.error("[rate-limit-login] DB error:", error.message);
      return new Response(
        JSON.stringify({ allowed: true, error: "rate_limit_unavailable" }),
        { headers: JSON_HEADERS }
      );
    }

    const result = data as {
      allowed: boolean;
      attempts: number;
      remaining_ms: number;
      blocked_until: string | null;
    };

    // ── Audit log every check for observability ────────────────────────────
    if (!success && !result.allowed) {
      try {
        await adminClient.from("audit_logs").insert({
          user_id:       null,
          action:        "login_blocked",
          event_type:    "login_blocked",
          resource_type: "auth",
          details: {
            email_hash:    emailHash,
            ip_hash:       ipHash,
            attempts:      result.attempts,
            blocked_until: result.blocked_until,
          },
          ip_address: rawIp,
        });
      } catch (_e) { /* never fail the main flow */ }

      // ── Alert on threshold breaches (fire-and-forget) ──────────────────
      if (ALERT_THRESHOLDS.includes(result.attempts)) {
        EdgeRuntime.waitUntil(
          sendAlert(rateLimitAlert({
            emailHash,
            ipHash,
            attempts: result.attempts,
            blockedUntil: result.blocked_until,
          }))
        );
      }
    }

    return new Response(JSON.stringify(result), { headers: JSON_HEADERS });

  } catch (err) {
    console.error("[rate-limit-login] Unexpected error:", err);
    // Fail open
    return new Response(
      JSON.stringify({ allowed: true, error: String(err) }),
      { headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" } }
    );
  }
});
