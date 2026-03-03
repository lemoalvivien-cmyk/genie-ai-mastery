import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WeeklyReport {
  id: string;
  org_id: string;
  week_start: string;
  completion_rate: number;
  avg_score: number | null;
  at_risk_count: number;
  inactive_count: number;
  top_gaps: { module_id: string; title: string; rate: number }[];
  at_risk_users: { id: string; full_name: string | null; reason: string; last_active: string | null }[];
  total_learners: number;
  created_at: string;
}

export function useWeeklyReport(orgId: string | undefined) {
  return useQuery<WeeklyReport | null>({
    queryKey: ["weekly_report", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("org_weekly_reports")
        .select("*")
        .eq("org_id", orgId)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as WeeklyReport | null;
    },
  });
}
