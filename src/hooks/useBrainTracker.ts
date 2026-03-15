/**
 * useBrainTracker — stub léger après suppression de GenieOS.
 * Le tracking Brain n'est plus actif mais les composants qui l'utilisent
 * continuent de compiler sans modification.
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
        await supabase.from("brain_events").insert({
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
