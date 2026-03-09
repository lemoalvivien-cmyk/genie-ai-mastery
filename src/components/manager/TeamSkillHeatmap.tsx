/**
 * BLOC 6 — Manager Moat Minimal
 * Heatmap des compétences équipe par domaine
 * Réutilise skill_mastery + profiles (org_id)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brain } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  orgId: string;
}

interface DomainStat {
  domain: string;
  avg: number;
  count: number;
  label: string;
  icon: string;
}

const DOMAIN_CONFIG: Record<string, { label: string; icon: string }> = {
  ia_pro:      { label: "IA Pro",       icon: "🤖" },
  ia_perso:    { label: "IA Perso",     icon: "💡" },
  cyber:       { label: "Cyber",        icon: "🛡️" },
  vibe_coding: { label: "Vibe Coding",  icon: "⚡" },
};

function getRiskColor(avg: number) {
  if (avg < 30) return { bar: "bg-destructive",   text: "text-destructive",    label: "Critique" };
  if (avg < 50) return { bar: "bg-orange-400",    text: "text-orange-400",     label: "Faible" };
  if (avg < 70) return { bar: "bg-yellow-400",    text: "text-yellow-400",     label: "Moyen" };
  return           { bar: "bg-emerald-400",    text: "text-emerald-400",    label: "Bon" };
}

export function TeamSkillHeatmap({ orgId }: Props) {
  const { data: domainStats, isLoading } = useQuery<DomainStat[]>({
    queryKey: ["team_skill_heatmap", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      // Get all member IDs
      const { data: members } = await supabase
        .from("profiles")
        .select("id")
        .eq("org_id", orgId);

      if (!members?.length) return [];
      const memberIds = members.map((m) => m.id);

      // Get skill_mastery + skill domain for all members
      const { data, error } = await supabase
        .from("skill_mastery")
        .select("p_mastery, skill_id, skills(domain)")
        .in("user_id", memberIds);

      if (error || !data?.length) {
        // Fallback: try user_skills table
        const { data: userSkills } = await supabase
          .from("user_skills")
          .select("score, skill:skills(domain)")
          .in("user_id", memberIds);

        if (!userSkills?.length) return [];

        const agg: Record<string, { total: number; count: number }> = {};
        userSkills.forEach((us: { score: number; skill?: { domain?: string } | null }) => {
          const d = (us.skill as { domain?: string } | null)?.domain;
          if (!d) return;
          if (!agg[d]) agg[d] = { total: 0, count: 0 };
          agg[d].total += us.score;
          agg[d].count += 1;
        });

        return Object.entries(agg).map(([domain, { total, count }]) => ({
          domain,
          avg: Math.round(total / count),
          count,
          label: DOMAIN_CONFIG[domain]?.label ?? domain,
          icon: DOMAIN_CONFIG[domain]?.icon ?? "📊",
        })).sort((a, b) => a.avg - b.avg);
      }

      // Aggregate by domain from skill_mastery
      const agg: Record<string, { total: number; count: number }> = {};
      (data as Array<{ p_mastery: number; skill_id: string; skills: { domain: string } | null }>).forEach((row) => {
        const d = row.skills?.domain;
        if (!d) return;
        if (!agg[d]) agg[d] = { total: 0, count: 0 };
        agg[d].total += row.p_mastery * 100;
        agg[d].count += 1;
      });

      return Object.entries(agg).map(([domain, { total, count }]) => ({
        domain,
        avg: Math.round(total / count),
        count,
        label: DOMAIN_CONFIG[domain]?.label ?? domain,
        icon: DOMAIN_CONFIG[domain]?.icon ?? "📊",
      })).sort((a, b) => a.avg - b.avg);
    },
    enabled: !!orgId,
    staleTime: 3 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!domainStats?.length) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-bold text-sm">Maîtrise équipe par domaine</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Données disponibles après les premiers quiz d'équipe.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Maîtrise équipe par domaine</h3>
          <p className="text-xs text-muted-foreground">Score moyen des compétences</p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-2 gap-3">
        {domainStats.map((stat) => {
          const risk = getRiskColor(stat.avg);
          return (
            <div
              key={stat.domain}
              className="p-4 rounded-xl border border-border/40 bg-card/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span>{stat.icon}</span>
                  <span>{stat.label}</span>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full bg-card/80 ${risk.text}`}>
                  {risk.label}
                </span>
              </div>
              <div className={`text-2xl font-black ${risk.text}`}>{stat.avg}%</div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${risk.bar}`}
                  style={{ width: `${stat.avg}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
