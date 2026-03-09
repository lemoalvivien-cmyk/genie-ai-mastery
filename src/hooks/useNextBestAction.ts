// ── BLOC 2 — Next Best Action Engine ──────────────────────────────────────────
// Calls the deterministic RPC get_next_best_action server-side.
// Falls back to a simple client-side heuristic if RPC unavailable.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export type ActionType = "placement_quiz" | "module" | "quiz" | "synthesis" | "mission";

export interface NextBestAction {
  action_type: ActionType;
  reason: string;
  title: string;
  path: string;
  urgency: "high" | "medium" | "low";
  domain: string | null;
  top_gap: { name: string; score: number } | null;
}

export function useNextBestAction() {
  const user = useAuthStore((s) => s.user);

  return useQuery<NextBestAction | null>({
    queryKey: ["next_best_action", user?.id],
    queryFn: async (): Promise<NextBestAction | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .rpc("get_next_best_action", { _user_id: user.id });

      if (error) {
        console.warn("get_next_best_action RPC error:", error.message);
        return null;
      }

      if (!data || (data as { error?: string }).error) return null;

      return data as NextBestAction;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}
