import { useOrgSkillGaps } from "@/hooks/useSkills";
import { AlertTriangle } from "lucide-react";

const DOMAIN_LABELS: Record<string, string> = {
  ia_pro: "IA Pro",
  ia_perso: "IA Perso",
  cyber: "Cyber",
  vibe_coding: "Vibe Coding",
};

interface Props {
  orgId: string;
}

export function OrgGapsWidget({ orgId }: Props) {
  const { data: gaps, isLoading } = useOrgSkillGaps(orgId, 60);

  if (isLoading) return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-3">
      <div className="h-4 w-36 rounded bg-secondary/60 animate-pulse" />
      <div className="space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl bg-secondary/40 animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Gaps équipe</h3>
          <p className="text-xs text-muted-foreground">Compétences sous les 60% · Top 5</p>
        </div>
      </div>

      <div className="p-5">
        {!gaps?.length ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            🎉 Aucun gap critique détecté (ou pas encore de données quiz)
          </div>
        ) : (
          <div className="space-y-3">
            {gaps.map((g, i) => {
              const color = g.avg < 30 ? "text-destructive" : g.avg < 50 ? "text-orange-400" : "text-yellow-400";
              const barColor = g.avg < 30 ? "bg-destructive" : g.avg < 50 ? "bg-orange-400" : "bg-yellow-400";
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-muted-foreground shrink-0">
                        {DOMAIN_LABELS[g.domain] ?? g.domain}
                      </span>
                      <span className="font-medium truncate">{g.name}</span>
                    </div>
                    <span className={`font-bold tabular-nums shrink-0 ml-2 ${color}`}>{g.avg}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-700`}
                      style={{ width: `${g.avg}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Moyenne sur {g.count} membre{g.count > 1 ? "s" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
