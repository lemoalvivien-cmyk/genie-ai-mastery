import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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

/** Fetch ALL skill mastery for the current user — used in dashboards */
export function useAllSkillMastery() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["skill_mastery_all", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as SkillMastery[];
      // Join with skills to get slug/name
      const { data, error } = await supabase
        .from("skill_mastery")
        .select("skill_id, p_mastery, updated_at")
        .eq("user_id", user.id)
        .order("p_mastery", { ascending: false });
      if (error) throw error;
      return data as SkillMastery[];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

/** Returns true if all provided skill_ids have p_mastery >= 0.99 */
export function useAllSkillsMastered(skillIds: string[]) {
  const { data: masteryList } = useSkillMastery(skillIds);
  if (!skillIds.length || !masteryList?.length) return false;
  if (masteryList.length < skillIds.length) return false;
  return masteryList.every((m) => m.p_mastery >= 0.99);
}

/**
 * useConversationalScoring — invisible background scoring hook.
 *
 * Drop this into any chat component. After every (userMessage, assistantReply)
 * pair, fires score-utterance asynchronously so skill mastery is updated
 * without the user ever seeing a "quiz".
 *
 * The query cache is invalidated after a successful scoring so dashboards
 * reflect changes without a page reload.
 */
export function useConversationalScoring() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const pendingRef = useRef(false);

  const scoreExchange = async (params: {
    utterance: string;
    assistantReply: string;
    skillIds?: string[];       // explicit UUID list (optional, uses auto-detect if absent)
    moduleId?: string;
    accessToken: string;
    onAllMastered?: () => void;
  }) => {
    if (!user?.id || pendingRef.current) return;
    const { utterance, assistantReply, skillIds, moduleId, accessToken, onAllMastered } = params;
    if (!utterance.trim()) return;

    pendingRef.current = true;
    const url = edgeFunctionUrl("score-utterance");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          utterance,
          assistant_reply: assistantReply,
          skill_ids: skillIds ?? [],
          auto_detect: !skillIds?.length,
          module_id: moduleId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.updates?.length) {
          // Invalidate skill mastery cache so dashboards update live
          qc.invalidateQueries({ queryKey: ["skill_mastery"] });
          qc.invalidateQueries({ queryKey: ["skill_mastery_all"] });
        }
        if (data?.all_mastered && onAllMastered) {
          onAllMastered();
        }
      }
    } catch (_e) {
      // Silently ignore — never block user experience
    } finally {
      pendingRef.current = false;
    }
  };

  return { scoreExchange };
}

/**
 * useSkillMasteryRealtime — subscribes to Supabase Realtime changes on
 * skill_mastery for the current user. Useful for manager dashboards that
 * need to see employee progress update live.
 */
export function useSkillMasteryRealtime(userId?: string) {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const targetUserId = userId ?? currentUser?.id;

  useEffect(() => {
    if (!targetUserId) return;

    const channel = supabase
      .channel(`skill_mastery:${targetUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "skill_mastery",
          filter: `user_id=eq.${targetUserId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["skill_mastery"] });
          qc.invalidateQueries({ queryKey: ["skill_mastery_all"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, qc]);
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

  const url = edgeFunctionUrl("score-utterance");
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
