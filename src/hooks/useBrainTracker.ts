/**
 * useBrainTracker — stub léger après refonte.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export function useBrainTracker() {
  const user = useAuthStore((s) => s.user);

  const trackBrain = useCallback(
    async (eventType: string, metadata?: Record<string, unknown>) => {
      if (!user?.id) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("brain_events").insert({
          user_id: user.id,
          event_type: eventType,
          metadata: metadata ?? {},
        });
      } catch {
        // non-fatal
      }
    },
    [user?.id]
  );

  return { trackBrain };
}
