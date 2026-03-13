/**
 * useBrainTracker — fire-and-forget brain event tracking
 * Inserts rows into brain_events with org_id + user_id.
 * Never throws, never blocks UI.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export type BrainEventType =
  | "palantir_activated"
  | "palantir_deactivated"
  | "brain_message_sent"
  | "module_accepted"
  | "destroyer_shown"
  | "dashboard_viewed"
  | "prediction_displayed"
  | "swarm_completed";

interface TrackBrainParams {
  session_id?: string;
  risk_score?: number;
  agents_used?: string[];
  metadata?: Record<string, unknown>;
}

export function useBrainTracker() {
  const { user, profile } = useAuthStore();

  const trackBrain = useCallback(
    (event_type: BrainEventType, params: TrackBrainParams = {}) => {
      if (!user?.id) return;

      (async () => {
        try {
          await supabase.from("brain_events").insert({
            user_id: user.id,
            org_id: profile?.org_id ?? null,
            event_type,
            session_id: params.session_id ?? null,
            risk_score: params.risk_score ?? null,
            agents_used: params.agents_used ?? null,
            metadata: params.metadata ?? {},
          } as never);
        } catch (_e) {
          // silent — never block UI
        }
      })();
    },
    [user?.id, profile?.org_id]
  );

  return { trackBrain };
}
