import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, Users, TrendingDown } from "lucide-react";

interface PhishingRiskWidgetProps {
  orgId: string;
}

export function PhishingRiskWidget({ orgId }: PhishingRiskWidgetProps) {
  const [riskPct, setRiskPct] = useState<number | null>(null);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [totalTested, setTotalTested] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Get all users in org
        const { data: members } = await supabase
          .from("profiles")
          .select("id")
          .eq("org_id", orgId);

        if (!members || members.length === 0) {
          setLoading(false);
          return;
        }

        const memberIds = members.map((m) => m.id);

        // Get latest phishing result per user (avg score)
        const { data: results } = await supabase
          .from("phishing_results")
          .select("user_id, score")
          .in("user_id", memberIds);

        if (!results || results.length === 0) {
          setLoading(false);
          return;
        }

        // Compute avg score per user
        const scoresByUser = new Map<string, number[]>();
        for (const r of results) {
          const existing = scoresByUser.get(r.user_id) ?? [];
          existing.push(r.score);
          scoresByUser.set(r.user_id, existing);
        }

        const avgScores = Array.from(scoresByUser.entries()).map(([, scores]) => {
          return scores.reduce((a, b) => a + b, 0) / scores.length;
        });

        const atRisk = avgScores.filter((s) => s < 70).length;
        const tested = avgScores.length;
        const pct = tested > 0 ? Math.round((atRisk / tested) * 100) : 0;

        setAtRiskCount(atRisk);
        setTotalTested(tested);
        setRiskPct(pct);
      } catch {
        // PhishingRiskWidget load failure — non-critical
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orgId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-4 animate-pulse h-28" />
    );
  }

  const riskLevel =
    riskPct === null ? "none"
    : riskPct >= 60 ? "high"
    : riskPct >= 30 ? "medium"
    : "low";

  const riskConfig = {
    none:   { color: "text-muted-foreground", bg: "bg-muted/20 border-border/30", label: "Non testé", icon: "🔵" },
    low:    { color: "text-emerald-400",       bg: "bg-emerald-500/10 border-emerald-500/30", label: "Risque faible", icon: "🟢" },
    medium: { color: "text-yellow-400",        bg: "bg-yellow-500/10 border-yellow-500/30",  label: "Risque modéré", icon: "🟡" },
    high:   { color: "text-destructive",       bg: "bg-destructive/10 border-destructive/30", label: "Risque élevé", icon: "🔴" },
  }[riskLevel];

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${riskConfig.bg}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Risque Phishing Équipe</p>
          <p className="text-[10px] text-muted-foreground">Score &lt; 70% = à risque</p>
        </div>
        <span className="ml-auto text-lg">{riskConfig.icon}</span>
      </div>

      {riskPct === null ? (
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground">Aucun test effectué par l'équipe</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Partagez /app/labs/phishing avec vos collaborateurs
          </p>
        </div>
      ) : (
        <>
          {/* Risk percentage */}
          <div className="flex items-end gap-3">
            <div>
              <p className={`text-3xl font-black ${riskConfig.color}`}>{riskPct}%</p>
              <p className={`text-xs font-semibold ${riskConfig.color}`}>{riskConfig.label}</p>
            </div>
            <div className="flex-1 pb-1">
              {/* Bar */}
              <div className="h-2 rounded-full bg-border/40 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    riskLevel === "high" ? "bg-destructive" : riskLevel === "medium" ? "bg-yellow-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${riskPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 pt-1 border-t border-current/10">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3 h-3 text-destructive shrink-0" />
              <span className="text-[11px] text-foreground/80">
                <strong>{atRiskCount}</strong> employé(s) à risque
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground">
                {totalTested} testé(s)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
