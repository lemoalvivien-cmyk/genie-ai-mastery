// ── Adaptive Learning Path hook ───────────────────────────────────────────────
// Calls the adaptive-learning-path edge function (Temporal Mirror + Infinite Branching)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export type StepType = "module" | "exercise" | "sleep_session" | "simulation" | "quiz";
export type Difficulty = "debutant" | "intermediaire" | "expert";
export type Branch = "optimal" | "challenger" | "recovery";

export interface PathStep {
  module_slug: string;
  difficulty: Difficulty;
  estimated_time: number;
  motivation_hook: string;
  step_type: StepType;
  domain: string;
  branch_label: string;
  cve_alert?: string | null;
  branch_divergence?: {
    if_mastered: string;
    if_struggled: string;
  };
}

export interface AdaptivePath {
  persona_snapshot: string;
  temporal_mirror: string;
  active_branch: Branch;
  recommended_weekly_rhythm: string;
  top_cve_focus: string | null;
  steps: PathStep[];
}

async function fetchAdaptivePath(
  branch: Branch = "optimal",
  regenerate = false,
): Promise<AdaptivePath> {
  const { data, error } = await supabase.functions.invoke("adaptive-learning-path", {
    body: { branch, regenerate },
  });
  if (error) throw error;
  return data as AdaptivePath;
}

export function useAdaptivePath(branch: Branch = "optimal") {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const query = useQuery<AdaptivePath>({
    queryKey: ["adaptive_path", user?.id, branch],
    queryFn: () => fetchAdaptivePath(branch, false),
    enabled: !!user?.id,
    staleTime: 24 * 60 * 60 * 1000, // 24h — LLM is expensive
    retry: 1,
  });

  const regenerate = useMutation({
    mutationFn: (b: Branch) => fetchAdaptivePath(b, true),
    onSuccess: (data) => {
      qc.setQueryData(["adaptive_path", user?.id, branch], data);
    },
  });

  return { ...query, regenerate };
}
