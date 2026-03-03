import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

type EventName =
  | "signup"
  | "onboarding_step_done"
  | "access_code_redeemed"
  | "referral_applied"
  | "first_mission_done"
  | "chat_sent"
  | "module_opened"
  | "module_completed"
  | "quiz_started"
  | "quiz_passed"
  | "quiz_failed"
  | "pdf_generated"
  | "lab_run";

export function useAnalytics() {
  const { user, profile } = useAuthStore();

  const track = useCallback(
    async (event: EventName, properties: Record<string, unknown> = {}) => {
      try {
        await supabase.from("analytics_events").insert({
          actor_user_id: user?.id ?? null,
          org_id: profile?.org_id ?? null,
          event_name: event,
          properties: {
            ...properties,
            persona: profile?.persona ?? null,
            ts: new Date().toISOString(),
          },
        });
      } catch {
        // Never fail calling code
      }
    },
    [user?.id, profile?.org_id, profile?.persona],
  );

  return { track };
}
