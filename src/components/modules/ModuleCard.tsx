import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import type { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import {
  Shield, Sparkles, Bot, Zap, Lock, MessageSquare, Building2,
  BookOpen, Star, Clock, ChevronRight, Trophy
} from "lucide-react";
import type { Module, Progress } from "@/hooks/useModules";

// Fallback icons map
const FALLBACK_ICONS: Record<string, React.FC<LucideProps>> = {
  Shield, Sparkles, Bot, Zap, Lock, MessageSquare, Building2, BookOpen, Star,
};

function DynamicIcon({ name, ...props }: { name: string } & Omit<LucideProps, 'ref'>) {
  const lower = name.toLowerCase().replace(/\s/g, "-") as keyof typeof dynamicIconImports;
  if (dynamicIconImports[lower]) {
    const LucideIcon = lazy(dynamicIconImports[lower]);
    return (
      <Suspense fallback={<div className="w-5 h-5 bg-muted rounded animate-pulse" />}>
        <LucideIcon {...props} />
      </Suspense>
    );
  }
  const Fallback = FALLBACK_ICONS[name] ?? BookOpen;
  return <Fallback {...props} />;
}

const DOMAIN_CONFIG = {
  ia_pro: { label: "IA Pro", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  ia_perso: { label: "IA Perso", color: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
  cyber: { label: "Cyber", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

const LEVEL_CONFIG = {
  debutant: { label: "Débutant", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  intermediaire: { label: "Intermédiaire", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  avance: { label: "Avancé", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

interface Props {
  module: Module;
  progress?: Progress;
  onPrefetch?: () => void;
}

export function ModuleCard({ module, progress, onPrefetch }: Props) {
  const domain = DOMAIN_CONFIG[module.domain];
  const level = LEVEL_CONFIG[module.level];
  const pct = progress?.status === "completed" ? 100
    : progress?.status === "in_progress" ? 50
    : 0;
  const isCompleted = progress?.status === "completed";
  const isInProgress = progress?.status === "in_progress";

  return (
    <Link
      to={`/app/modules/${module.slug}`}
      onMouseEnter={onPrefetch}
      className="group relative flex flex-col rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:bg-card/80 hover:scale-[1.02] hover:shadow-glow transition-all duration-300 shadow-card overflow-hidden focus-ring"
      aria-label={`Module : ${module.title}`}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${module.domain === "ia_pro" ? "bg-gradient-to-r from-indigo-500 to-purple-500" : module.domain === "ia_perso" ? "bg-gradient-to-r from-pink-500 to-rose-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`} />

      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="w-11 h-11 rounded-xl bg-secondary/80 flex items-center justify-center flex-shrink-0 group-hover:gradient-primary group-hover:shadow-glow transition-all duration-300">
            <DynamicIcon
              name={module.icon_name || "BookOpen"}
              className="w-5 h-5 text-foreground group-hover:text-primary-foreground transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {module.is_gold && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-amber-400" title="Contenu Gold">
                <Star className="w-3 h-3" aria-hidden="true" /> Gold
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald/10 border border-emerald/30 text-xs text-emerald">
                <Trophy className="w-3 h-3" aria-hidden="true" />
                {progress?.score !== null ? `${progress.score}%` : "✓"}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {module.title}
          </h3>
          {module.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{module.subtitle}</p>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${domain.color}`}>
            {domain.label}
          </span>
          <span className={`px-2 py-0.5 rounded-full border text-xs ${level.color}`}>
            {level.label}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/50 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {module.duration_minutes} min
          </span>
        </div>

        {/* Progress bar */}
        {(isCompleted || isInProgress) && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{isCompleted ? "Terminé" : "En cours"}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-emerald" : "gradient-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-3">
          <span className="font-mono">v{1} · {Math.round(module.confidence_score * 100)}% fiable</span>
          <ChevronRight className="w-4 h-4 group-hover:text-primary group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
