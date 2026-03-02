import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  last_completed_date: string | null;
}

export interface DailyLogEntry {
  mission_id: string;
  completed_date: string;
  xp_earned: number;
}

export function useStreak() {
  const { session } = useAuth();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [last7Days, setLast7Days] = useState<string[]>([]);

  const userId = session?.user?.id;

  const fetchStreak = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!streakData) {
        const { data: newStreak } = await supabase
          .from("user_streaks")
          .insert({ user_id: userId, current_streak: 0, longest_streak: 0, total_xp: 0 })
          .select()
          .single();
        setStreak(newStreak as StreakData);
      } else {
        setStreak(streakData as StreakData);
      }

      const today = new Date().toISOString().split("T")[0];
      const { data: logData } = await supabase
        .from("user_daily_log")
        .select("mission_id, completed_date, xp_earned")
        .eq("user_id", userId)
        .eq("completed_date", today)
        .maybeSingle();

      setTodayLog(logData as DailyLogEntry | null);

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { data: weekLogs } = await supabase
        .from("user_daily_log")
        .select("completed_date")
        .eq("user_id", userId)
        .gte("completed_date", sevenDaysAgo)
        .order("completed_date", { ascending: true });

      setLast7Days((weekLogs ?? []).map((l) => l.completed_date));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  const completeMission = useCallback(
    async (missionId: string, xpEarned: number, score?: number, timeSpent?: number) => {
      if (!userId) return;
      const today = new Date().toISOString().split("T")[0];

      await supabase.from("user_daily_log").upsert({
        user_id: userId,
        mission_id: missionId,
        completed_date: today,
        score: score ?? null,
        xp_earned: xpEarned,
        time_spent_seconds: timeSpent ?? null,
      });

      const currentStreak = streak?.current_streak ?? 0;
      const lastDate = streak?.last_completed_date ?? null;
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      let newStreak = 1;
      if (lastDate === today) {
        newStreak = currentStreak;
      } else if (lastDate === yesterday) {
        newStreak = currentStreak + 1;
      }

      const newLongest = Math.max(streak?.longest_streak ?? 0, newStreak);
      const newTotalXp = (streak?.total_xp ?? 0) + xpEarned;

      await supabase
        .from("user_streaks")
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          total_xp: newTotalXp,
          last_completed_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      await fetchStreak();
    },
    [userId, streak, fetchStreak]
  );

  return { streak, todayLog, loading, last7Days, completeMission };
}
