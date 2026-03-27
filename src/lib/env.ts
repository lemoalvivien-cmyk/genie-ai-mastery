/**
 * env.ts — Single source of truth for all client-side environment variables.
 *
 * Rules:
 * 1. Only VITE_ prefixed variables are allowed (Vite strips everything else).
 * 2. No secret / server-only variable should ever appear here.
 * 3. All other files must import from this module instead of reading import.meta.env directly.
 */

function required(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return value as string;
}

function optional(key: string, fallback = ""): string {
  return (import.meta.env[key] as string) ?? fallback;
}

// ── Supabase (public / anon) ─────────────────────────────────────────────────
export const SUPABASE_URL = required("VITE_SUPABASE_URL");
export const SUPABASE_ANON_KEY = required("VITE_SUPABASE_PUBLISHABLE_KEY");
export const SUPABASE_PROJECT_ID = required("VITE_SUPABASE_PROJECT_ID");

// ── Observability ────────────────────────────────────────────────────────────
export const SENTRY_DSN = optional("VITE_SENTRY_DSN");
export const APP_VERSION = optional("VITE_APP_VERSION", "latest");

// ── Feature flags (read via src/config/features.ts, not directly) ────────────
// Feature flags use their own envFlag() helper in features.ts.
// Do NOT duplicate them here.

// ── OpenClaw dev flag ────────────────────────────────────────────────────────
export const OPENCLAW_ENABLED = optional("VITE_OPENCLAW_ENABLED", "false") === "true";

// ── Derived helpers ──────────────────────────────────────────────────────────
export function edgeFunctionUrl(fnName: string): string {
  return `${SUPABASE_URL}/functions/v1/${fnName}`;
}

// ── Build mode ───────────────────────────────────────────────────────────────
export const MODE = import.meta.env.MODE as string;
export const IS_DEV = import.meta.env.DEV as boolean;
export const IS_PROD = import.meta.env.PROD as boolean;
