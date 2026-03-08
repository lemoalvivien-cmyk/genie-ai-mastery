/**
 * _shared/rate-limit.ts
 *
 * Centralized per-user daily rate limiter for edge functions.
 * Uses the `function_calls_daily` table + `increment_ai_usage` RPC.
 *
 * Plan hierarchy:
 *   - "admin"  → high limits (admin panel use)
 *   - "pro"    → paid plan limits
 *   - "free"   → free tier limits
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Per-function daily limits per plan ────────────────────────────────────────
const LIMITS: Record<string, Record<string, number>> = {
  "chat-completion":  { free: 2,   pro: 500,  admin: 9999 },
  "generate-pdf":     { free: 1,   pro: 50,   admin: 9999 },
  "text-to-speech":   { free: 5,   pro: 200,  admin: 9999 },
  "score-utterance":  { free: 10,  pro: 500,  admin: 9999 },
  "admin-operations": { free: 0,   pro: 0,    admin: 30   },
};

/**
 * Check if the user has exceeded their daily limit for a function,
 * then atomically increment the counter.
 *
 * Throws a `Response` (429) if the limit is exceeded.
 * No-ops gracefully if the function is not in LIMITS (fail-open).
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  functionName: string,
  plan: string,
  corsHeaders: Record<string, string>,
): Promise<void> {
  const planKey = plan === "admin" ? "admin" : plan === "pro" ? "pro" : "free";
  const limits = LIMITS[functionName];

  // Unknown function → fail-open (don't block)
  if (!limits) return;

  const limit = limits[planKey] ?? 0;
  const today = new Date().toISOString().slice(0, 10);

  // Hard block for plan without access (limit = 0)
  if (limit === 0) {
    throw new Response(
      JSON.stringify({
        error: "rate_limit_exceeded",
        message: "Cette fonctionnalité n'est pas disponible pour votre plan.",
        limit: 0,
        current: 0,
        resets: `${today}T23:59:59Z`,
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Read current count
  const { data } = await supabase
    .from("function_calls_daily")
    .select("call_count")
    .eq("user_id", userId)
    .eq("fn", functionName)
    .eq("date", today)
    .maybeSingle();

  const current = (data?.call_count as number) ?? 0;

  if (current >= limit) {
    throw new Response(
      JSON.stringify({
        error: "rate_limit_exceeded",
        message: `Limite quotidienne atteinte (${current}/${limit}). Réessayez demain.`,
        limit,
        current,
        resets: `${today}T23:59:59Z`,
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Atomically increment (fire-and-forget — never block the main flow)
  supabase
    .rpc("increment_ai_usage", {
      p_user_id: userId,
      p_function: functionName,
      p_date: today,
    })
    .then(() => {})
    .catch(() => {});
}
