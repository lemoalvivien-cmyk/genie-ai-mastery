import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "cancelling"      // active but cancel_at_period_end
  | "past_due"        // payment failing but grace period
  | "action_required" // 3DS pending
  | "expired"         // subscription ended
  | "free";           // no subscription

export interface SubscriptionInfo {
  plan: "free" | "pro";
  isActive: boolean;
  status: SubscriptionStatus;
  source: "none" | "stripe" | "stripe_cancelling" | "stripe_past_due" | "access_code";
  canUseVoice: boolean;
  maxMessagesPerDay: number;
  canAccessVibeCoding: boolean;
  canAccessManager: boolean;
  canGetAttestation: boolean;
  canUseDailyMissions: boolean;
  isLaunchPrice: boolean;
  renewalDate: string | null;
  isTrialing: boolean;
  trialEndsAt: string | null;
  seatsMax: number;
  seatsUsed: number;
  /** Human-readable warning to show in the UI when billing needs attention */
  billingWarning: string | null;
}

const FREE_PLAN: SubscriptionInfo = {
  plan: "free",
  isActive: false,
  status: "free",
  source: "none",
  canUseVoice: false,
  maxMessagesPerDay: 2,
  canAccessVibeCoding: false,
  canAccessManager: false,
  canGetAttestation: false,
  canUseDailyMissions: true,  // gratuit = 1 mission/jour — découverte autorisée
  isLaunchPrice: false,
  renewalDate: null,
  isTrialing: false,
  trialEndsAt: null,
  seatsMax: 1,
  seatsUsed: 0,
  billingWarning: null,
};

function mapStatus(source: string, isTrialing: boolean, isPro: boolean): SubscriptionStatus {
  if (!isPro) return "free";
  if (isTrialing) return "trialing";
  if (source === "stripe_cancelling") return "cancelling";
  if (source === "stripe_past_due")   return "past_due";
  if (source === "access_code")       return "active";
  if (source === "stripe")            return "active";
  return "expired";
}

function getBillingWarning(status: SubscriptionStatus, renewalDate: string | null): string | null {
  switch (status) {
    case "trialing":
      if (renewalDate) {
        const d = new Date(renewalDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
        return `Votre essai gratuit se termine le ${d}. Pour continuer, ajoutez un moyen de paiement — sinon l'accès Pro expirera automatiquement sans frais.`;
      }
      return "Votre essai gratuit est en cours. Aucun prélèvement sans ajout d'un moyen de paiement.";
    case "cancelling":
      if (renewalDate) {
        const d = new Date(renewalDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
        return `Votre abonnement est actif jusqu'au ${d}, puis sera résilié. Vous conservez votre accès jusqu'à cette date.`;
      }
      return "Votre abonnement est en cours de résiliation. Vous gardez votre accès jusqu'à la fin de la période.";
    case "past_due":
      return "⚠️ Un paiement a échoué. Mettez à jour votre moyen de paiement pour éviter la suspension de votre accès.";
    case "action_required":
      return "⚠️ Une authentification est requise pour valider votre paiement. Vérifiez votre email ou contactez votre banque.";
    case "expired":
      return "Votre abonnement a expiré. Renouvelez-le pour retrouver votre accès Pro.";
    default:
      return null;
  }
}

export function useSubscription() {
  const { session, isAuthenticated } = useAuth();

  return useQuery<SubscriptionInfo>({
    queryKey: ["subscription", session?.user?.id],
    enabled: isAuthenticated && !!session,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SubscriptionInfo> => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error || !data) return FREE_PLAN;

      const isPro = data.subscribed === true;
      const source = (data.source ?? "none") as SubscriptionInfo["source"];
      const isTrialing = data.is_trialing ?? false;
      const renewalDate = data.renewal_date ?? null;

      // Reconcile post-payment: clear pending flag if sub is now active
      if (isPro && sessionStorage.getItem("formetoialia_payment_pending")) {
        sessionStorage.removeItem("formetoialia_payment_pending");
      }

      const status = mapStatus(source, isTrialing, isPro);
      const billingWarning = getBillingWarning(status, renewalDate);

      return {
        plan: isPro ? "pro" : "free",
        isActive: isPro,
        status,
        source,
        canUseVoice: isPro,
        maxMessagesPerDay: isPro ? 500 : 2,
        canAccessVibeCoding: isPro,
        canAccessManager: isPro,
        canGetAttestation: isPro,
        canUseDailyMissions: true,  // 1 mission/jour pour tous — paywall = intensité, pas découverte
        isLaunchPrice: false,
        renewalDate,
        isTrialing,
        trialEndsAt: data.trial_ends_at ?? null,
        seatsMax: data.seats_max ?? 1,
        seatsUsed: data.seats_used ?? 0,
        billingWarning,
      };
    },
  });
}
