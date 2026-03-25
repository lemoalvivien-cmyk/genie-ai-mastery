/**
 * Shield middleware — IP rate limiting + abuse detection + structured logging
 * Used by chat-completion, generate-pdf, verify endpoints
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Config ───────────────────────────────────────────────────────────────────
export const SHIELD_CONFIG = {
  demo:    { maxRequests: 1,   windowHours: 24 },
  verify:  { maxRequests: 20,  windowHours: 1  },
  chat:    { maxRequests: 40,  windowHours: 1  },
  pdf:     { maxRequests: 10,  windowHours: 1  },
  default: { maxRequests: 100, windowHours: 1  },
} as const;

// ─── Spam/loop patterns for chat ─────────────────────────────────────────────
const SPAM_PATTERNS = [
  /(.{10,})\1{3,}/,
  /^(.)\1{30,}$/,
  /(?:[\w\s]{1,20}\s?){50,}/,
];

const LOOP_DETECTION_WINDOW_MS = 10_000;
const LOOP_DETECTION_THRESHOLD = 5;

// In-memory per-worker loop detector (resets on cold start)
const recentMessages = new Map<string, { hash: string; count: number; firstSeen: number }>();

// ─── Helpers ──────────────────────────────────────────────────────────────────
export async function hashIp(ip: string): Promise<string> {
  const enc = new TextEncoder().encode(ip + Deno.env.get("SUPABASE_JWT_SECRET", "fti-shield-salt"));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

async function hashText(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text.slice(0, 200).toLowerCase().replace(/\s+/g, " ").trim());
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export async function hashStack(stack: string): Promise<string> {
  const enc = new TextEncoder().encode(stack.slice(0, 500));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── Structured logger ────────────────────────────────────────────────────────
export interface LogContext {
  requestId: string;
  fn: string;
  userId?: string | null;
  orgId?: string | null;
  startMs: number;
}

export function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function logRequest(ctx: LogContext, statusCode: number): void {
  const latencyMs = Date.now() - ctx.startMs;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  admin.from("edge_logs").insert({
    request_id: ctx.requestId,
    fn: ctx.fn,
    user_id: ctx.userId ?? null,
    org_id: ctx.orgId ?? null,
    status_code: statusCode,
    latency_ms: latencyMs,
  }).then(() => {}).catch(() => {});
}

export async function logEdgeError(
  ctx: LogContext,
  statusCode: number,
  err: unknown,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const latencyMs = Date.now() - ctx.startMs;
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? (err.stack ?? message) : message;
  const stack_hash = await hashStack(stack);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  admin.from("edge_errors").insert({
    request_id: ctx.requestId,
    fn: ctx.fn,
    user_id: ctx.userId ?? null,
    org_id: ctx.orgId ?? null,
    message: message.slice(0, 500),
    stack_hash,
    status_code: statusCode,
    latency_ms: latencyMs,
    meta,
  }).then(() => {}).catch(() => {});
}

// ─── IP rate limit check (via DB function) ───────────────────────────────────
/**
 * FAIL-CLOSED: on DB error, denies the request and logs a warning.
 * Prevents bypass of rate-limits during infrastructure incidents.
 */
export async function checkIpRateLimit(
  ipHash: string,
  endpoint: string,
  maxRequests: number,
  windowHours: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const { data, error } = await admin.rpc("check_ip_rate_limit", {
      _ip_hash: ipHash,
      _endpoint: endpoint,
      _max_requests: maxRequests,
      _window_hours: windowHours,
    });

    if (error) {
      // Fail-closed: DB error → deny + log (never silently allow)
      console.error(`[shield] rate-limit DB error on ${endpoint}: ${error.message}`);
      return { allowed: false, reason: "rate_limit_service_error" };
    }

    return { allowed: data?.allowed ?? false, reason: data?.reason };
  } catch (e) {
    console.error(`[shield] rate-limit network error on ${endpoint}:`, e);
    return { allowed: false, reason: "rate_limit_unavailable" };
  }
}

// ─── User abuse score check ───────────────────────────────────────────────────
export async function checkUserAbuse(userId: string): Promise<{ blocked: boolean; score: number }> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data } = await admin
    .from("profiles")
    .select("abuse_score, abuse_blocked_until")
    .eq("id", userId)
    .single();

  if (!data) return { blocked: false, score: 0 };

  const isBlocked = data.abuse_blocked_until && new Date(data.abuse_blocked_until) > new Date();
  return { blocked: !!isBlocked, score: data.abuse_score ?? 0 };
}

// ─── Record abuse (fire-and-forget) ──────────────────────────────────────────
export function recordAbuse(
  userId: string | null,
  ipHash: string,
  flagType: string,
  severity: "low" | "medium" | "high" | "critical",
  details: Record<string, unknown> = {},
): void {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  admin.rpc("record_abuse", {
    _user_id: userId,
    _ip_hash: ipHash,
    _flag_type: flagType,
    _severity: severity,
    _details: details,
  }).then(() => {}).catch(() => {});
}

// ─── Chat loop / spam detection ───────────────────────────────────────────────
export async function detectChatAbuse(
  userId: string,
  lastMessage: string,
): Promise<{ suspicious: boolean; reason?: string }> {
  if (SPAM_PATTERNS.some(p => p.test(lastMessage))) {
    return { suspicious: true, reason: "spam_pattern" };
  }

  const msgHash = await hashText(lastMessage);
  const now = Date.now();
  const key = `${userId}:${msgHash}`;
  const existing = recentMessages.get(key);

  if (existing) {
    if (now - existing.firstSeen < LOOP_DETECTION_WINDOW_MS) {
      existing.count++;
      if (existing.count >= LOOP_DETECTION_THRESHOLD) {
        return { suspicious: true, reason: "spam_loop" };
      }
    } else {
      recentMessages.set(key, { hash: msgHash, count: 1, firstSeen: now });
    }
  } else {
    if (recentMessages.size > 500) {
      const cutoff = now - LOOP_DETECTION_WINDOW_MS * 2;
      for (const [k, v] of recentMessages.entries()) {
        if (v.firstSeen < cutoff) recentMessages.delete(k);
      }
    }
    recentMessages.set(key, { hash: msgHash, count: 1, firstSeen: now });
  }

  return { suspicious: false };
}

// ─── Verify endpoint fingerprint + cache ─────────────────────────────────────
export function buildVerifyCacheHeaders(attestationId: string): Record<string, string> {
  return {
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "ETag": `"verify-${attestationId}"`,
    "Vary": "Accept-Encoding",
  };
}
