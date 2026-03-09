/**
 * BLOC 2 — Next Best Action Card
 * Affiche la recommandation déterministe du moteur NBA
 */
import { Link } from "react-router-dom";
import { ChevronRight, Zap, AlertTriangle, BookOpen, Target } from "lucide-react";
import { useNextBestAction, type ActionType } from "@/hooks/useNextBestAction";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_ICONS: Record<ActionType, React.FC<{ className?: string }>> = {
  placement_quiz: Target,
  module: BookOpen,
  quiz: Zap,
  synthesis: Zap,
  mission: Target,
};

const URGENCY_STYLES = {
  high:   { border: "border-destructive/30",  bg: "bg-destructive/5",  badge: "bg-destructive/15 text-destructive border-destructive/30",  label: "Prioritaire" },
  medium: { border: "border-primary/30",       bg: "bg-primary/5",      badge: "bg-primary/15 text-primary border-primary/30",              label: "Recommandé" },
  low:    { border: "border-emerald-500/30",   bg: "bg-emerald-500/5",  badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",  label: "Bravo !" },
};

const DOMAIN_COLORS: Record<string, string> = {
  ia_pro:      "text-indigo-400",
  ia_perso:    "text-cyan-400",
  cyber:       "text-amber-400",
  vibe_coding: "text-emerald-400",
};

export function NextBestActionCard() {
  const { data: nba, isLoading } = useNextBestAction();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (!nba) return null;

  const urgency = URGENCY_STYLES[nba.urgency];
  const Icon = ACTION_ICONS[nba.action_type] ?? BookOpen;

  return (
    <Link
      to={nba.path}
      className={`block rounded-2xl border ${urgency.border} ${urgency.bg} p-5 transition-all hover:scale-[1.01] hover:shadow-md group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${urgency.badge}`}>
              {urgency.label}
            </span>
            {nba.domain && (
              <span className={`text-xs font-medium ${DOMAIN_COLORS[nba.domain] ?? "text-muted-foreground"}`}>
                {nba.domain.replace("_", " ").toUpperCase()}
              </span>
            )}
          </div>

          <h3 className="font-bold text-sm leading-snug group-hover:text-primary transition-colors">
            {nba.title}
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {nba.reason}
          </p>

          {nba.top_gap && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              <span>Lacune : {nba.top_gap.name} — {nba.top_gap.score}%</span>
            </div>
          )}
        </div>

        <div className="shrink-0 w-10 h-10 rounded-xl bg-card/80 border border-border/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <ChevronRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all absolute" style={{ marginLeft: "14px" }} />
        </div>
      </div>
    </Link>
  );
}
