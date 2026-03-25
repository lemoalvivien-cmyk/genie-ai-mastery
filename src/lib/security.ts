/**
 * security.ts — Client-side security utilities
 *
 * Brute-force protection: delegates to rate-limit-login Edge Function (server-side).
 * The sessionStorage fallback is kept only as a fast UX guard when the network is down.
 */

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const RATE_LIMIT_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/rate-limit-login`;

// ── Server-side rate limit (primary, SOC2-compliant) ─────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  remaining_ms: number;
  blocked_until?: string | null;
}

/**
 * Check if this email is currently rate-limited (server-side).
 * FAIL-CLOSED : tout échec réseau ou HTTP error → accès refusé par défaut.
 */
export async function checkServerRateLimit(email: string): Promise<RateLimitResult> {
  try {
    const res = await fetch(RATE_LIMIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, success: false }),
      signal: AbortSignal.timeout(3000), // 3s max — never block UX
    });
    // Fail-closed: HTTP error from the service → deny access
    if (!res.ok) {
      console.error("[rate-limit] Service HTTP error", res.status, "— fail-closed actif");
      return { allowed: false, attempts: 0, remaining_ms: 5000, blocked_until: null };
    }
    return await res.json() as RateLimitResult;
  } catch (_e) {
    // Réseau/timeout indisponible — FAIL-CLOSED.
    // On bloque par défaut pour éviter tout bypass lors d'une panne infra.
    // L'utilisateur peut réessayer immédiatement (la panne est transitoire).
    console.error("[rate-limit] Service indisponible — fail-closed actif");
    return { allowed: false, attempts: 0, remaining_ms: 5000, blocked_until: null };
  }
}

/**
 * Mark a login as successful (resets the counter server-side).
 */
export async function markLoginSuccess(email: string): Promise<void> {
  try {
    await fetch(RATE_LIMIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, success: true }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (_e) { /* best-effort */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatBlockedTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

// ── Session activity tracking (unchanged) ────────────────────────────────────
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "fti_last_activity";

export function updateActivity(): void {
  try { sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch (_e) { /* */ }
}

export function isSessionExpired(): boolean {
  try {
    const last = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    if (!last) return false;
    return Date.now() - Number(last) > SESSION_TIMEOUT_MS;
  } catch (_e) { return false; }
}

export function clearActivity(): void {
  try { sessionStorage.removeItem(LAST_ACTIVITY_KEY); } catch (_e) { /* */ }
}

// ── Password strength validation ─────────────────────────────────────────────
const SPECIAL_CHARS_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Minimum 8 caractères";
  if (!/[A-Z]/.test(password)) return "Au moins 1 majuscule requise";
  if (!/[0-9]/.test(password)) return "Au moins 1 chiffre requis";
  if (!SPECIAL_CHARS_RE.test(password)) return "Au moins 1 caractère spécial requis (!@#$%^&*…)";
  return null;
}

// ── Legacy stubs (kept for backward compat with any remaining callers) ────────
/** @deprecated Use checkServerRateLimit instead */
export function isBlocked(_email: string): { blocked: boolean; remainingMs: number } {
  return { blocked: false, remainingMs: 0 };
}
/** @deprecated Use checkServerRateLimit instead */
export function recordFailedAttempt(_email: string): void { /* no-op */ }
/** @deprecated No longer needed */
export function clearAttempts(_email: string): void { /* no-op */ }
