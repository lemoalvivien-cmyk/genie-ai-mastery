/**
 * _shared/cors.ts — Palantir-grade CORS middleware
 *
 * Single source of truth for ALL edge functions.
 * Supports formetoialia.com + all Lovable preview/sandbox URLs.
 * getCorsHeaders(origin) — pass req.headers.get("origin")
 * handleCorsPreflight(req) — call at the very top of every handler
 */

const ALLOWED_ORIGINS = [
  "https://formetoialia.com",
  "https://www.formetoialia.com",
  "https://app.formetoialia.com",
  "https://admin.formetoialia.com",
  "https://genie-ai-mastery.lovable.app",
  "https://genie-ia.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
] as const;

// Lovable preview + sandbox URLs
const PREVIEW_PATTERN =
  /^https:\/\/([a-z0-9-]+\.lovableproject\.com|id-preview--[a-z0-9-]+\.lovable\.app)$/;

// Sub-domains of formetoialia.com
const FORMETOIALIA_SUBDOMAIN = /^https:\/\/[a-z0-9-]+\.formetoialia\.com$/;

const CORS_HEADERS_BASE = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with, " +
    "accept, origin, x-supabase-auth-token, " +
    "x-supabase-client-platform, x-supabase-client-platform-version, " +
    "x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
} as const;

/**
 * Returns CORS headers scoped to the request origin.
 * @param origin  Value of the "origin" request header (or null).
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed =
    origin !== null &&
    (
      (ALLOWED_ORIGINS as readonly string[]).includes(origin) ||
      PREVIEW_PATTERN.test(origin) ||
      FORMETOIALIA_SUBDOMAIN.test(origin)
    );

  if (!isAllowed && origin) {
    console.warn(`[CORS BLOCK] Origin rejetée : ${origin}`);
  }

  return {
    ...CORS_HEADERS_BASE,
    "Access-Control-Allow-Origin": isAllowed ? origin! : ALLOWED_ORIGINS[0],
  };
}

/**
 * Handles OPTIONS preflight. Returns a Response if it IS a preflight,
 * or null if the request should continue to normal handler logic.
 */
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req.headers.get("origin")),
    });
  }
  return null;
}
