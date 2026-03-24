/**
 * cost-guard — Budget Kill-Switch Middleware
 *
 * Deux modes :
 *  1. PRE-CHECK  (GET ou POST { action: "check" })
 *     → Retourne { allowed, used_today, daily_limit, remaining }
 *     → Appeler AVANT d'envoyer une requête LLM.
 *     → Retourne HTTP 429 si le budget est dépassé.
 *
 *  2. ACCOUNTING (POST { action: "record", cost_eur })
 *     → Incrémente used_today pour l'org.
 *     → Appeler APRÈS avoir reçu la réponse LLM.
 *
 * PASSE A — Fix : getClaims() → getUser() (source de vérité serveur)
 * PASSE A — Fix : userId extrait de user.id (pas claims.sub)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://formetoialia.com",
  "https://www.formetoialia.com",
  "https://genie-ai-mastery.lovable.app", // legacy — backward compat
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".lovable.app") ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    // PASSE A — getUser() vérifie côté serveur (vs getClaims qui lisait le JWT en local)
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const userId = user.id;

    // ── Admin client pour les opérations DB ──────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("org_id")
      .eq("id", userId)
      .single();

    const orgId: string | null = profile?.org_id ?? null;

    // ── Parse body ───────────────────────────────────────────────────────────
    let action = "check";
    let costDelta = 0;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        action = body.action ?? "check";
        costDelta = Number(body.cost_eur ?? 0);
      } catch (_e) {
        // garder les valeurs par défaut
      }
    }

    // ── Kill-switch global (priorité maximale) ───────────────────────────────
    if (Deno.env.get("AI_DISABLED") === "true") {
      return json({
        allowed: false,
        reason: "ai_disabled",
        message: "L'IA est temporairement désactivée.",
      }, 503);
    }

    // ── Kill-switch DB ────────────────────────────────────────────────────────
    const { data: killSwitch } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "ai_kill_switch")
      .single();

    if ((killSwitch?.value as { disabled?: boolean } | null)?.disabled === true) {
      return json({
        allowed: false,
        reason: "ai_disabled",
        message: "L'IA est temporairement désactivée pour maintenance.",
      }, 503);
    }

    // ── Pas d'org → user individuel, skip vérif budget org ───────────────────
    if (!orgId) {
      return json({ allowed: true, reason: "no_org", used_today: 0, daily_limit: null, remaining: null });
    }

    // ── Vérif + incrémentation budget ────────────────────────────────────────
    const { data: budgetResult, error: budgetError } = await supabaseAdmin.rpc(
      "check_and_increment_ai_budget",
      { _org_id: orgId, _cost_delta: action === "record" ? costDelta : 0 },
    );

    if (budgetError) {
      // Fail open — ne jamais bloquer à cause d'une erreur DB
      console.error("[cost-guard] budget RPC error:", budgetError.message);
      return json({ allowed: true, reason: "db_error", error: budgetError.message });
    }

    const budget = budgetResult as {
      allowed: boolean;
      reason?: string;
      used_today: number;
      daily_limit: number;
      remaining: number;
    };

    if (!budget.allowed) {
      // Calcul du Retry-After jusqu'à minuit UTC
      const now = new Date();
      const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const retryAfterSeconds = Math.ceil((midnight.getTime() - now.getTime()) / 1000);

      return json({
        allowed: false,
        reason: budget.reason ?? "budget_exceeded",
        used_today: budget.used_today,
        daily_limit: budget.daily_limit,
        remaining: 0,
        message: `Limite journalière atteinte (${budget.used_today.toFixed(4)} € / ${budget.daily_limit} €). Les appels IA reprennent à minuit UTC.`,
        retry_after_seconds: retryAfterSeconds,
      }, 429);
    }

    return json({
      allowed: true,
      used_today: budget.used_today,
      daily_limit: budget.daily_limit,
      remaining: budget.remaining,
    });

  } catch (err) {
    console.error("[cost-guard] unexpected error:", err);
    // Fail open
    return json({ allowed: true, error: String(err) });
  }
});
