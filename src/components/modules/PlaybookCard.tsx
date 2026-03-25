/**
 * PlaybookCard — carte orientée résultat pour les playbooks métier
 * Remplace la logique "module de cours" par une logique "outil de production"
 */
import { Link } from "react-router-dom";
import {
  Clock, ChevronRight, Trophy, Star, ArrowRight,
  FileText, Mail, BarChart2, Layout, Code, BookOpen, Zap,
} from "lucide-react";
import type { Module, Progress } from "@/hooks/useModules";
import type { PlaybookMeta } from "@/data/playbooks";
import { DELIVERABLE_COLORS } from "@/data/playbooks";
import { useAnalytics } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";

const DELIVERABLE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  email: Mail,
  document: FileText,
  script: Code,
  analysis: BarChart2,
  presentation: Layout,
  process: BookOpen,
  brief: FileText,
};

const DIFFICULTY_CONFIG = {
  rapide:      { label: "⚡ Rapide",      cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  guidé:       { label: "🧭 Guidé",       cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  approfondi:  { label: "🔍 Approfondi",  cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

const DOMAIN_ACCENT: Record<string, string> = {
  ia_pro:       "from-indigo-500 to-purple-500",
  ia_perso:     "from-pink-500 to-rose-500",
  cyber:        "from-emerald-500 to-teal-500",
  vibe_coding:  "from-emerald-500 to-green-500",
  communication:"from-blue-500 to-cyan-500",
  vente:        "from-amber-500 to-orange-500",
  rh:           "from-rose-500 to-pink-500",
  productivite: "from-violet-500 to-indigo-500",
  analyse:      "from-cyan-500 to-blue-500",
  presentation: "from-fuchsia-500 to-purple-500",
  direction:    "from-slate-500 to-gray-500",
};

interface Props {
  module: Module;
  progress?: Progress;
  meta?: PlaybookMeta;
  onPrefetch?: () => void;
}

export function PlaybookCard({ module, progress, meta, onPrefetch }: Props) {
  const { track } = useAnalytics();
  const isCompleted = progress?.status === "completed";
  const isInProgress = progress?.status === "in_progress";

  const deliverableCfg = meta ? DELIVERABLE_COLORS[meta.deliverable_type] : null;
  const DeliverableIcon = meta ? (DELIVERABLE_ICONS[meta.deliverable_type] ?? FileText) : FileText;
  const difficultyCfg = meta ? DIFFICULTY_CONFIG[meta.difficulty] : null;
  const accentGradient = DOMAIN_ACCENT[module.domain] ?? DOMAIN_ACCENT.ia_pro;

  return (
    <Link
      to={`/app/modules/${module.slug}`}
      onMouseEnter={onPrefetch}
      onClick={() => track("module_opened", { module_id: module.id, domain: module.domain, slug: module.slug })}
      className="group relative flex flex-col rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm hover:border-primary/40 hover:bg-card/90 transition-all duration-300 shadow-card overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Playbook : ${module.title}`}
    >
      {/* Accent bar */}
      <div className={cn("h-1 w-full bg-gradient-to-r", accentGradient)} />

      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Top row: deliverable type + status */}
        <div className="flex items-center justify-between gap-2">
          {deliverableCfg ? (
            <span className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold",
              deliverableCfg.bg, deliverableCfg.text
            )}>
              <DeliverableIcon className="w-3 h-3" />
              {deliverableCfg.label}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/30 text-xs text-muted-foreground">
              <BookOpen className="w-3 h-3" />
              Playbook
            </span>
          )}
          <div className="flex items-center gap-1.5">
            {module.is_gold && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-amber-400">
                <Star className="w-3 h-3" /> Gold
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400">
                <Trophy className="w-3 h-3" /> Fait
              </span>
            )}
          </div>
        </div>

        {/* Problem framing */}
        {meta?.problem && (
          <p className="text-xs text-muted-foreground italic leading-snug line-clamp-2 border-l-2 border-primary/30 pl-2">
            {meta.problem}
          </p>
        )}

        {/* Title */}
        <div>
          <h3 className="font-bold text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {module.title}
          </h3>
          {meta?.result ? (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1 font-medium">
              → {meta.result}
            </p>
          ) : module.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{module.subtitle}</p>
          )}
        </div>

        {/* Steps preview */}
        {meta?.steps && meta.steps.length > 0 && !isCompleted && (
          <div className="space-y-1">
            {meta.steps.slice(0, 3).map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-[10px] text-primary flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                  {i + 1}
                </span>
                <span className="line-clamp-1">{step}</span>
              </div>
            ))}
            {meta.steps.length > 3 && (
              <p className="text-xs text-muted-foreground pl-6">+{meta.steps.length - 3} étapes…</p>
            )}
          </div>
        )}

        {/* Difficulty + duration */}
        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          {difficultyCfg && (
            <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", difficultyCfg.cls)}>
              {difficultyCfg.label}
            </span>
          )}
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/30 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {meta?.estimated_minutes ?? module.duration_minutes} min
          </span>
        </div>

        {/* Progress bar for in-progress */}
        {isInProgress && (
          <div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 opacity-60"
                style={{ width: `${progress?.score ?? 10}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="px-5 pb-4">
        <div className={cn(
          "flex items-center justify-between text-xs border-t border-border/20 pt-3",
          isCompleted ? "text-emerald-400" : "text-primary"
        )}>
          <span className="font-semibold">
            {isCompleted ? "✓ Livrable généré" : isInProgress ? "Reprendre" : "Lancer le playbook"}
          </span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
