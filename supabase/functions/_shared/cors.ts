/**
 * _shared/cors.ts — Origin-scoped CORS for all Edge Functions
 *
 * Replaces the wildcard `Access-Control-Allow-Origin: *` pattern.
 * Only requests from ALLOWED_ORIGINS receive their exact origin back.
 * All other origins receive the primary domain as fallback — never a wildcard.
 */

export const ALLOWED_ORIGINS = [
  "https://genie-ia.app",
  "https://genie-ai-mastery.lovable.app",
  "http://localhost:3000",
  "http://localhost:5173", // Vite default dev port
] as const;

/**
 * Returns CORS headers scoped to the request origin.
 *
 * @param req  The incoming Request (needs `origin` header).
 * @returns    Headers object with Access-Control-Allow-Origin set to the
 *             matched origin, or to ALLOWED_ORIGINS[0] as fallback.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = (ALLOWED_ORIGINS as readonly string[]).includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, " +
      "x-supabase-client-platform, x-supabase-client-platform-version, " +
      "x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}
