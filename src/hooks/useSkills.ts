import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export interface Skill {
  id: string;
  domain: "ia_pro" | "ia_perso" | "cyber" | "vibe_coding";
  name: string;
  slug: string;
  level: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  score: number;
  updated_at: string;
  skill?: Skill;
}

export interface RadarPoint {
  domain: string;
  label: string;
  score: number;
  fullMark: number;
}

const DOMAIN_LABELS: Record<string, string> = {
  ia_pro: "IA Pro",
  ia_perso: "IA Perso",
  cyber: "Cyber",
  vibe_coding: "Vibe Coding",
};

export function useUserSkills() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["user_skills", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_skills")
        .select("*, skill:skills(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as unknown as UserSkill[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}

export function useRadarData() {
  const { data: userSkills } = useUserSkills();
  if (!userSkills) return [];

  const domainScores: Record<string, { total: number; count: number }> = {};
  userSkills.forEach((us) => {
    const domain = us.skill?.domain;
    if (!domain) return;
    if (!domainScores[domain]) domainScores[domain] = { total: 0, count: 0 };
    domainScores[domain].total += us.score;
    domainScores[domain].count += 1;
  });

  return Object.entries(DOMAIN_LABELS).map(([domain, label]): RadarPoint => ({
    domain,
    label,
    score: domainScores[domain]
      ? Math.round(domainScores[domain].total / domainScores[domain].count)
      : 0,
    fullMark: 100,
  }));
}

export function useUpsertUserSkills() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (skills: Array<{ skill_id: string; score: number }>) => {
      if (!user?.id) throw new Error("Not authenticated");
      const rows = skills.map((s) => ({
        user_id: user.id,
        skill_id: s.skill_id,
        score: Math.min(100, Math.max(0, s.score)),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("user_skills")
        .upsert(rows, { onConflict: "user_id,skill_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_skills"] });
    },
  });
}

// For managers: org gaps per skill (avg score < threshold)
export function useOrgSkillGaps(orgId: string | null, threshold = 60) {
  return useQuery({
    queryKey: ["org_skill_gaps", orgId, threshold],
    queryFn: async () => {
      if (!orgId) return [];
      // Join user_skills → profiles filtered by org_id
      const { data: members } = await supabase
        .from("profiles")
        .select("id")
        .eq("org_id", orgId);
      if (!members?.length) return [];

      const memberIds = members.map((m) => m.id);
      const { data, error } = await supabase
        .from("user_skills")
        .select("skill_id, score, skill:skills(id, domain, name, slug)")
        .in("user_id", memberIds);
      if (error) throw error;

      // Aggregate by skill
      const agg: Record<string, { name: string; domain: string; total: number; count: number }> = {};
      (data as unknown as UserSkill[]).forEach((us) => {
        if (!us.skill) return;
        const key = us.skill_id;
        if (!agg[key]) agg[key] = { name: us.skill.name, domain: us.skill.domain, total: 0, count: 0 };
        agg[key].total += us.score;
        agg[key].count += 1;
      });

      return Object.entries(agg)
        .map(([, v]) => ({ ...v, avg: Math.round(v.total / v.count) }))
        .filter((s) => s.avg < threshold)
        .sort((a, b) => a.avg - b.avg)
        .slice(0, 5);
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}
