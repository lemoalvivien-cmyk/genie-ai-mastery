import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SubscriptionInfo {
  plan: "free" | "pro";
  isActive: boolean;
  source: "none" | "stripe" | "access_code";
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
}

const FREE_PLAN: SubscriptionInfo = {
  plan: "free",
  isActive: false,
  source: "none",
  canUseVoice: false,
  maxMessagesPerDay: 5,
  canAccessVibeCoding: false,
  canAccessManager: false,
  canGetAttestation: false,
  canUseDailyMissions: false,
  isLaunchPrice: false,
  renewalDate: null,
  isTrialing: false,
  trialEndsAt: null,
  seatsMax: 1,
  seatsUsed: 0,
};

export function useSubscription() {
  const { session, isAuthenticated } = useAuth();

  return useQuery<SubscriptionInfo>({
    queryKey: ["subscription", session?.user?.id],
    enabled: isAuthenticated && !!session,
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async (): Promise<SubscriptionInfo> => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error || !data) return FREE_PLAN;

      const isPro = data.subscribed === true;
      const source = (data.source ?? "none") as SubscriptionInfo["source"];

      return {
        plan: isPro ? "pro" : "free",
        isActive: isPro,
        source,
        canUseVoice: isPro,
        maxMessagesPerDay: isPro ? 500 : 5,
        canAccessVibeCoding: isPro,
        canAccessManager: isPro,
        canGetAttestation: isPro,
        canUseDailyMissions: isPro,
        isLaunchPrice: false,
        renewalDate: data.renewal_date ?? null,
        isTrialing: data.is_trialing ?? false,
        trialEndsAt: data.trial_ends_at ?? null,
        seatsMax: data.seats_max ?? 1,
        seatsUsed: data.seats_used ?? 0,
      };
    },
  });
}
