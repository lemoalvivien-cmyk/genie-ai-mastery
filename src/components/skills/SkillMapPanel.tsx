import { useRadarData, useUserSkills } from "@/hooks/useSkills";
import { SkillRadar } from "@/components/skills/SkillRadar";
import { Brain } from "lucide-react";

const DOMAIN_COLORS: Record<string, string> = {
  ia_pro: "text-primary bg-primary/10 border-primary/30",
  ia_perso: "text-secondary bg-secondary/10 border-secondary/30",
  cyber: "text-accent bg-accent/10 border-accent/30",
  vibe_coding: "text-muted-foreground bg-muted/30 border-border/40",
};

const DOMAIN_LABELS: Record<string, string> = {
  ia_pro: "IA Pro",
  ia_perso: "IA Perso",
  cyber: "Cyber",
  vibe_coding: "Vibe Coding",
};

export function SkillMapPanel() {
  const radarData = useRadarData();
  const { data: userSkills, isLoading } = useUserSkills();

  const hasData = userSkills && userSkills.length > 0;

  // Top 5 skills by score
  const topSkills = (userSkills ?? [])
    .filter((us) => us.skill && us.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow shrink-0">
          <Brain className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Carte Palantir</h3>
          <p className="text-xs text-muted-foreground">Ton radar de compétences IA/Cyber</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Radar */}
        {isLoading ? (
          <div className="h-[260px] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-medium">Carte vide pour l'instant</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Complète un quiz pour voir ton radar se remplir ✨
            </p>
          </div>
        ) : (
          <SkillRadar data={radarData} size={240} />
        )}

        {/* Domain averages */}
        {hasData && (
          <div className="grid grid-cols-2 gap-2">
            {radarData.map((d) => (
              <div key={d.domain} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium ${DOMAIN_COLORS[d.domain] ?? "text-muted-foreground bg-muted/20 border-border/30"}`}>
                <span>{DOMAIN_LABELS[d.domain] ?? d.domain}</span>
                <span className="font-bold tabular-nums">{d.score}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Top skills */}
        {topSkills.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              Top compétences
            </p>
            <div className="space-y-2">
              {topSkills.map((us) => (
                <div key={us.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs text-foreground truncate">{us.skill?.name}</span>
                      <span className="text-xs font-semibold tabular-nums ml-2 shrink-0">{us.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all duration-700"
                        style={{ width: `${us.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
