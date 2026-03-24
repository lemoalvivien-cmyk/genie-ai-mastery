/**
 * _shared/subscription.ts — Backend Plan Enforcement
 *
 * Usage (dans chaque Edge Function après auth) :
 *
 *   import { requireProPlan, checkFreeUserDailyLimit } from "../_shared/subscription.ts";
 *
 *   // Bloque les FREE si non éligibles — lance une Response 403 sinon
 *   const planData = await requireProPlan(supabaseAdmin, userId, corsHeaders);
 *
 *   // Pour chat-completion uniquement : vérifie la limite 2 msg/jour FREE
 *   await checkFreeUserDailyLimit(supabaseAdmin, userId, todayCount, corsHeaders);
 *
 * Plans autorisés : pro | business | enterprise | partner | launch
 * Rôles autorisés : manager | admin (via user_roles)
 *
 * Stratégie fail-open : si la DB est indisponible, l'accès est accordé
 * pour ne pas bloquer les utilisateurs légitimes.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const PRO_PLANS = ["pro", "business", "enterprise", "partner", "launch"] as const;
export const PRO_ROLES = ["manager", "admin"] as const;

export const FREE_DAILY_LIMIT = 2;

// ── Response factory ──────────────────────────────────────────────────────────
function upgradeRequired(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: "upgrade_required",
      message: "Cette fonctionnalité nécessite un abonnement Pro.",
      upgrade_url: "https://formetoialia.com/pricing",
    }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

function freeLimitExceeded(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
        content:
          "J'étais en train de préparer une réponse détaillée pour vous... mais votre plan gratuit est limité à 2 échanges par jour. Avec le plan Pro, je peux aller beaucoup plus loin. 🚀",
        quota_exceeded: true,
        budget_exceeded: true,
        model_used: "fti-upsell",
        upgrade_url: "https://formetoialia.com/pricing",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── Plan resolution ───────────────────────────────────────────────────────────
interface PlanCheckResult {
  isPro: boolean;
  plan: string;
  orgId: string | null;
  isManager: boolean;
}

async function resolvePlan(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanCheckResult> {
  // Fetch profile (org_id) + server-side role check in parallel
  const [profileRes, roleRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("org_id, role")
      .eq("id", userId)
      .single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["manager", "admin"]),
  ]);

  const profile = profileRes.data;
  const orgId: string | null = profile?.org_id ?? null;

  // Role-based access (manager / admin always get PRO)
  const serverRoles = (roleRes.data ?? []).map((r: { role: string }) => r.role);
  const isManager = serverRoles.some((r) => (PRO_ROLES as readonly string[]).includes(r));
  if (isManager) {
    return { isPro: true, plan: profile?.role ?? "manager", orgId, isManager: true };
  }

  // Org-based plan check
  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("plan, plan_source, is_read_only")
      .eq("id", orgId)
      .single();

    if (org && !org.is_read_only) {
      const plan: string = org.plan ?? "free";
      const isPro =
        (PRO_PLANS as readonly string[]).includes(plan) &&
        (org.plan_source === "stripe" ||
          org.plan_source === "access_code" ||
          org.plan_source === "manual");
      return { isPro, plan, orgId, isManager: false };
    }
  }

  return { isPro: false, plan: "free", orgId, isManager: false };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Vérifie que l'utilisateur a un plan Pro (ou rôle manager/admin).
 * Lance une Response HTTP 403 si le plan est insuffisant.
 * Retourne les données du plan si l'accès est autorisé.
 *
 * Fail-open : en cas d'erreur DB inattendue, l'accès est accordé.
 */
export async function requireProPlan(
  supabase: SupabaseClient,
  userId: string,
  corsHeaders: Record<string, string>
): Promise<PlanCheckResult> {
  try {
    const result = await resolvePlan(supabase, userId);
    if (!result.isPro) {
      throw upgradeRequired(corsHeaders);
    }
    return result;
  } catch (e) {
    // Re-throw Response objects (our 403 error)
    if (e instanceof Response) throw e;
    // Fail-open on unexpected DB errors
    console.error("[subscription] resolvePlan error (fail-open):", e);
    return { isPro: true, plan: "unknown", orgId: null, isManager: false };
  }
}

/**
 * Pour chat-completion uniquement.
 * Vérifie si un utilisateur FREE a dépassé sa limite quotidienne (2 msg/jour).
 * Retourne { isPro, orgId } pour la suite du traitement.
 * Lance une Response HTTP 200 (upsell) si la limite est atteinte.
 */
export async function checkFreeUserDailyLimit(
  supabase: SupabaseClient,
  userId: string,
  todayMessageCount: number,
  corsHeaders: Record<string, string>
): Promise<PlanCheckResult> {
  try {
    const result = await resolvePlan(supabase, userId);
    const dailyLimit = result.isPro ? 500 : FREE_DAILY_LIMIT;

    if (todayMessageCount >= dailyLimit) {
      if (result.isPro) {
        throw new Response(
          JSON.stringify({
            error: "Limite quotidienne de 500 messages atteinte. Revenez demain !",
            budget_exceeded: true,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw freeLimitExceeded(corsHeaders);
    }

    return result;
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error("[subscription] checkFreeUserDailyLimit error (fail-open):", e);
    return { isPro: true, plan: "unknown", orgId: null, isManager: false };
  }
}
