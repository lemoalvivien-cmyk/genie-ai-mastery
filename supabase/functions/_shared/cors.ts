/**
 * _shared/cors.ts — Palantir-grade CORS middleware
 *
 * Single source of truth for ALL edge functions.
 * Supports formetoialia.com + all Lovable preview/sandbox URLs.
 *
 * BACKWARD COMPATIBLE:
 *   getCorsHeaders(req)              — legacy: pass the full Request object
 *   getCorsHeaders(origin)           — new: pass req.headers.get("origin")
 *   handleCorsPreflight(req)         — returns 204 Response or null
 */

const ALLOWED_ORIGINS = [
  "https://formetoialia.com",
  "https://www.formetoialia.com",
  "https://app.formetoialia.com",
  "https://admin.formetoialia.com",
  "https://genie-ai-mastery.lovable.app", // legacy Lovable URL — conservé pour rétrocompatibilité
  "https://genie-ia.app",               // ancien domaine — conservé pour rétrocompatibilité
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
    "accept, origin, x-supabase-auth-token, x-cron-secret, " +
    "x-supabase-client-platform, x-supabase-client-platform-version, " +
    "x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
} as const;

function resolveOrigin(originOrReq: string | null | Request): string | null {
  if (originOrReq === null) return null;
  if (typeof originOrReq === "string") return originOrReq;
  // It's a Request object (legacy usage)
  return (originOrReq as Request).headers.get("origin");
}

/**
 * Returns CORS headers scoped to the request origin.
 * Accepts either a Request object (legacy) or a plain origin string.
 */
export function getCorsHeaders(
  originOrReq: string | null | Request
): Record<string, string> {
  const origin = resolveOrigin(originOrReq);

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
