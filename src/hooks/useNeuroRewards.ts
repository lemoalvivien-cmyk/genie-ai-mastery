/**
 * useNeuroRewards — Dopamine Loop Engine
 *
 * Chaîne de pensée:
 *  1. Psychologie apprenant : variable reward schedule (Skinner) → pics dopamine imprévisibles
 *  2. Gamification éthique : jamais dark patterns (pas de pression anxiogène), rewards positifs
 *  3. Swarm effect : hive_feedback contribue au score collectif RAG
 *
 * Format JSON rewards:
 * {
 *   id, event_type, xp_delta, badge_id, multiplier, is_surprise, context, created_at
 * }
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type BadgeCategory = "learning" | "streak" | "social" | "hive" | "elite";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  xp_reward: number;
  condition_type: string;
  condition_value: number;
  is_secret: boolean;
  sort_order: number;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  xp_at_earn?: number;
  streak_at_earn?: number;
  badge?: BadgeDefinition;
}

export interface RewardEvent {
  id: string;
  event_type: string;
  xp_delta: number;
  badge_id?: string;
  multiplier: number;
  is_surprise: boolean;
  context?: Record<string, unknown>;
  created_at: string;
}

// ─── Variable reward multiplier (dopamine loop) ────────────────────────────
// Skinner schedule: most rewards are 1x, but ~20% trigger a surprise bonus
// This creates the "slot machine" effect that drives engagement ethically.
export function computeVariableMultiplier(
  streak: number,
  score: number,
  hourOfDay: number
): number {
  const seed = Math.random();

  // Night owl bonus (2h-5h): rare, surprise factor
  if (hourOfDay >= 2 && hourOfDay <= 5 && seed < 0.3) return 2.0;
  // Perfect score bonus
  if (score >= 100 && seed < 0.4) return 1.5 + Math.random() * 0.5;
  // Streak milestone bonus
  if ([7, 14, 21, 30, 60, 90].includes(streak) && seed < 0.8) return 2.0 + Math.random();
  // Random surprise (20% chance): variable reward core mechanic
  if (seed < 0.2) return 1.2 + Math.random() * 0.8;
  return 1.0;
}

// ─── RARITY CONFIG ────────────────────────────────────────────────────────────
export const RARITY_CONFIG: Record<BadgeRarity, {
  label: string; color: string; glow: string; bg: string; border: string;
}> = {
  common:    { label: "Commun",    color: "text-slate-300",  glow: "shadow-none",                         bg: "bg-slate-500/10",    border: "border-slate-500/30" },
  uncommon:  { label: "Peu commun",color: "text-emerald-400",glow: "shadow-[0_0_8px_#34d399]",            bg: "bg-emerald-500/10",  border: "border-emerald-500/30" },
  rare:      { label: "Rare",      color: "text-blue-400",   glow: "shadow-[0_0_12px_#60a5fa]",           bg: "bg-blue-500/10",     border: "border-blue-500/30" },
  epic:      { label: "Épique",    color: "text-violet-400", glow: "shadow-[0_0_16px_#a78bfa]",           bg: "bg-violet-500/10",   border: "border-violet-500/30" },
  legendary: { label: "Légendaire",color: "text-amber-400",  glow: "shadow-[0_0_24px_rgba(251,191,36,0.6)]", bg: "bg-amber-500/10", border: "border-amber-500/30" },
};

// ─── Main hook ───────────────────────────────────────────────────────────────

export function useNeuroRewards() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [userBadges, setUserBadges]   = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges]     = useState<BadgeDefinition[]>([]);
  const [recentRewards, setRecentRewards] = useState<RewardEvent[]>([]);
  const [totalXP, setTotalXP]         = useState(0);
  const [isLoading, setIsLoading]     = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch badge catalogue + user earned badges ──────────────────────────
  const fetchBadges = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [{ data: defs }, { data: earned }] = await Promise.all([
        supabase.from("badge_definitions").select("*").order("sort_order"),
        supabase.from("user_badges").select("*, badge:badge_definitions(*)").eq("user_id", userId).order("earned_at", { ascending: false }),
      ]);
      setAllBadges((defs as BadgeDefinition[]) ?? []);
      setUserBadges((earned as UserBadge[]) ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // ── Poll for unnotified reward events (push notifications) ──────────────
  const pollRewards = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase.rpc("get_unnotified_rewards", { p_user_id: userId });
      if (!data || data.length === 0) return;

      const events = data as RewardEvent[];
      setRecentRewards(prev => [...events, ...prev].slice(0, 20));

      // Fire dopamine notifications
      for (const ev of events) {
        fireRewardNotification(ev, allBadges);
      }

      // Mark as notified
      await supabase.rpc("mark_rewards_notified", {
        p_user_id: userId,
        p_ids: events.map(e => e.id),
      });

      // Refresh badges if any earned
      if (events.some(e => e.event_type === "badge_earned")) {
        await fetchBadges();
      }
    } catch { /* silent */ }
  }, [userId, allBadges, fetchBadges]);

  // ── Check and award badges after any progress event ─────────────────────
  const checkBadges = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase.rpc("check_and_award_badges", { p_user_id: userId });
      const result = data as { new_badges: string[]; count: number } | null;
      if (result?.count && result.count > 0) {
        await fetchBadges();
        await pollRewards();
      }
    } catch { /* silent */ }
  }, [userId, fetchBadges, pollRewards]);

  // ── Award XP with variable reward multiplier ─────────────────────────────
  const awardXP = useCallback(async (params: {
    xpDelta: number;
    source: string;
    score?: number;
    streak?: number;
    context?: Record<string, unknown>;
  }) => {
    if (!userId) return;
    const hour = new Date().getHours();
    const multiplier = computeVariableMultiplier(
      params.streak ?? 0,
      params.score  ?? 0,
      hour
    );

    const finalXP = Math.round(params.xpDelta * multiplier);
    setTotalXP(prev => prev + finalXP);

    // Insert into reward_events directly (client-side for speed)
    await supabase.from("reward_events").insert({
      user_id:    userId,
      event_type: "xp_gain",
      xp_delta:   finalXP,
      multiplier,
      context:    { ...params.context, source: params.source, score: params.score },
      is_surprise: multiplier > 1.4,
    });

    // Trigger badge check after XP award
    setTimeout(checkBadges, 500);
  }, [userId, checkBadges]);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetchBadges();
    // Poll every 15 seconds for reward notifications
    pollRef.current = setInterval(pollRewards, 15_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [userId, fetchBadges, pollRewards]);

  const earnedBadgeIds = new Set(userBadges.map(b => b.badge_id));
  const badgesWithStatus = allBadges.map(b => ({
    ...b,
    earned: earnedBadgeIds.has(b.id),
    earnedAt: userBadges.find(ub => ub.badge_id === b.id)?.earned_at,
  }));

  return {
    userBadges,
    allBadges,
    badgesWithStatus,
    recentRewards,
    totalXP,
    isLoading,
    awardXP,
    checkBadges,
    fetchBadges,
    pollRewards,
  };
}

// ─── Dopamine notification renderer ──────────────────────────────────────────

function fireRewardNotification(ev: RewardEvent, badges: BadgeDefinition[]) {
  if (ev.event_type === "badge_earned" && ev.badge_id) {
    const badge = badges.find(b => b.id === ev.badge_id);
    const rarity = RARITY_CONFIG[(badge?.rarity ?? "common") as BadgeRarity];

    if (ev.is_surprise) {
      // LEGENDARY / EPIC — full celebration toast
      toast.success(
        `${badge?.emoji ?? "🏆"} ${badge?.name ?? "Badge"} débloqué !`,
        {
          description: `${badge?.description} · +${ev.xp_delta} XP ✨`,
          duration: 6000,
          style: { border: `1px solid ${rarity.border}` },
        }
      );
    } else {
      toast(
        `${badge?.emoji ?? "🏆"} ${badge?.name ?? "Badge"} !`,
        { description: `+${ev.xp_delta} XP`, duration: 4000 }
      );
    }
    return;
  }

  if (ev.event_type === "xp_gain" && ev.is_surprise && ev.multiplier > 1.4) {
    toast.success(
      `⚡ Bonus surprise × ${ev.multiplier.toFixed(1)} !`,
      {
        description: `+${ev.xp_delta} XP — variable reward activé`,
        duration: 4000,
      }
    );
  }
}
