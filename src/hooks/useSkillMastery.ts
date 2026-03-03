import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export interface SkillMastery {
  skill_id: string;
  p_mastery: number;
  updated_at: string;
}

/** Fetch p_mastery for a list of skill_ids */
export function useSkillMastery(skillIds: string[]) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["skill_mastery", user?.id, skillIds.sort().join(",")],
    queryFn: async () => {
      if (!user?.id || !skillIds.length) return [] as SkillMastery[];
      const { data, error } = await supabase
        .from("skill_mastery")
        .select("skill_id, p_mastery, updated_at")
        .eq("user_id", user.id)
        .in("skill_id", skillIds);
      if (error) throw error;
      return data as SkillMastery[];
    },
    enabled: !!user?.id && skillIds.length > 0,
    staleTime: 10 * 1000,
  });
}

/** Returns true if all provided skill_ids have p_mastery >= 0.99 */
export function useAllSkillsMastered(skillIds: string[]) {
  const { data: masteryList } = useSkillMastery(skillIds);
  if (!skillIds.length || !masteryList?.length) return false;
  if (masteryList.length < skillIds.length) return false;
  return masteryList.every((m) => m.p_mastery >= 0.99);
}

/** Fire-and-forget: call score-utterance edge function asynchronously */
export function fireScoreUtterance(params: {
  utterance: string;
  assistantReply: string;
  skillIds: string[];
  moduleId?: string;
  accessToken: string;
  onAllMastered?: () => void;
}) {
  const { utterance, assistantReply, skillIds, moduleId, accessToken, onAllMastered } = params;
  if (!skillIds.length) return;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-utterance`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      utterance,
      assistant_reply: assistantReply,
      skill_ids: skillIds,
      module_id: moduleId,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data?.all_mastered && onAllMastered) {
        onAllMastered();
      }
    })
    .catch((_e) => {
      // Silently ignore – never block user
    });
}
