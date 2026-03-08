import { type KITTMode, KITT_MODES, type KITTUserContext } from "@/hooks/useKITTContext";
import { Brain, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  mode: KITTMode;
  onModeChange: (m: KITTMode) => void;
  context: KITTUserContext | null;
  isPro: boolean;
}

export function KITTModePanel({ mode, onModeChange, context, isPro }: Props) {
  // Highlight remediation if a gap is detected
  const hasGap = context?.top_gap && context.top_gap.score < 50;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Mode KITT</span>
        </div>
        {context && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>🔥 {context.streak}j</span>
            <span>·</span>
            <span>{context.completed_modules}/{context.total_modules} modules</span>
          </div>
        )}
      </div>

      {/* Mode pills */}
      <div className="flex flex-wrap gap-1.5">
        {KITT_MODES.map((m) => {
          const isActive = mode === m.id;
          const isGapMode = m.id === "remediation" && hasGap;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              title={m.desc}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                isActive
                  ? "border-primary bg-primary/15 text-primary shadow-sm"
                  : isGapMode
                  ? "border-warning/50 bg-warning/10 text-warning hover:border-warning/80 animate-pulse"
                  : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40 bg-transparent"
              )}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
              {isGapMode && <AlertCircle className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Contextual HUD */}
      {context && (
        <div className="mt-1 pt-2 border-t border-border/30">
          {mode === "diagnostic" && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              KITT va évaluer ton niveau réel sur les 4 domaines et construire ton plan personnalisé.
            </p>
          )}
          {mode === "coaching" && context.last_module && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Dernier module : <span className="text-foreground font-medium">{context.last_module.title}</span>
              </p>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
          {mode === "quiz" && context.last_quiz_score != null && (
            <p className="text-[11px] text-muted-foreground">
              Dernier score : <span className={cn("font-semibold", context.last_quiz_score >= 70 ? "text-emerald-400" : "text-amber-400")}>{context.last_quiz_score}%</span>
            </p>
          )}
          {mode === "remediation" && context.top_gap && (
            <p className="text-[11px] text-amber-400 font-medium">
              ⚠️ Lacune détectée : {context.top_gap.name} ({context.top_gap.score}%)
            </p>
          )}
          {mode === "synthesis" && (
            <p className="text-[11px] text-muted-foreground">
              Génère un résumé de progression — partageable avec ton manager.
            </p>
          )}
          {mode === "lab" && (
            <p className="text-[11px] text-muted-foreground">
              Lance une mission pratique dans le lab correspondant à ton parcours.
            </p>
          )}
          {mode === "correction" && (
            <p className="text-[11px] text-muted-foreground">
              Colle ta réponse et KITT l'évalue avec une rubrique précise.
            </p>
          )}
        </div>
      )}

      {/* Upsell for locked modes */}
      {!isPro && (mode === "synthesis" || mode === "remediation") && (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-400/80 border border-amber-500/20 rounded-lg px-2 py-1 bg-amber-500/5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Mode Pro requis — <a href="/pricing" className="underline hover:text-amber-300 transition-colors">voir les offres</a></span>
        </div>
      )}
    </div>
  );
}
