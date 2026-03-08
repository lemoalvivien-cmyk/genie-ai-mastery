import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, ChevronRight, CheckCircle2, Circle, Zap,
  Award, FileText, Star, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CopilotPlanStep,
  CopilotImmediateAction,
} from "@/hooks/useCopilot";

interface CopilotDockProps {
  plan: CopilotPlanStep[];
  immediateAction: CopilotImmediateAction | null;
  proofType: "badge" | "pdf" | "score" | "none";
  completedSteps: Set<number>;
  onMarkDone: (i: number) => void;
  onDismiss: () => void;
  actionPath: (action: CopilotImmediateAction | CopilotPlanStep) => string;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  quiz: "Quiz",
  lab: "Lab",
  module: "Module",
  external: "Lien",
  chat: "Chat",
  download: "PDF",
};

function ProofBadge({ type }: { type: CopilotDockProps["proofType"] }) {
  if (type === "none") return null;
  const map = {
    badge: { icon: Award, label: "Badge à obtenir", cls: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
    pdf:   { icon: FileText, label: "PDF généré", cls: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
    score: { icon: Star, label: "Score calculé", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  } as const;
  const { icon: Icon, label, cls } = map[type];
  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", cls)}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}

export function CopilotDock({
  plan,
  immediateAction,
  proofType,
  completedSteps,
  onMarkDone,
  onDismiss,
  actionPath,
}: CopilotDockProps) {
  const navigate = useNavigate();
  const progress = plan.length ? Math.round((completedSteps.size / plan.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/40 bg-primary/5">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">Plan d'action</span>
          {plan.length > 0 && (
            <Badge className="h-4 text-[10px] px-1.5 bg-primary/20 text-primary border-primary/30">
              {completedSteps.size}/{plan.length}
            </Badge>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {plan.length > 0 && (
        <div className="shrink-0 h-1 bg-muted/40">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Immediate action CTA */}
        {immediateAction && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">
              Action immédiate
            </p>
            <p className="text-sm font-semibold text-foreground">{immediateAction.label}</p>
            <Button
              size="sm"
              className="w-full gap-2 h-8 text-xs gradient-primary shadow-glow"
              onClick={() => navigate(actionPath(immediateAction))}
            >
              Commencer
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Plan steps */}
        {plan.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Étapes ({plan.length})
            </p>
            {plan.slice(0, 3).map((step, i) => {
              const done = completedSteps.has(i);
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-default",
                    done
                      ? "border-emerald-500/30 bg-emerald-500/5 opacity-60"
                      : "border-border/50 bg-card/50 hover:border-border"
                  )}
                >
                  <button
                    onClick={() => onMarkDone(i)}
                    className="shrink-0 mt-0.5 text-muted-foreground hover:text-emerald-400 transition-colors"
                    aria-label={done ? "Fait" : "Marquer comme fait"}
                  >
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <Circle className="w-4 h-4" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-semibold", done && "line-through text-muted-foreground")}>
                      {step.step}
                    </p>
                    <span className={cn(
                      "inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                      "bg-muted/50 text-muted-foreground border-border/50"
                    )}>
                      {ACTION_TYPE_LABELS[step.action_type] ?? step.action_type}
                    </span>
                  </div>
                  {!done && (
                    <button
                      onClick={() => navigate(actionPath(step))}
                      className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      aria-label={step.cta_label}
                      title={step.cta_label}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Proof badge */}
        {proofType !== "none" && (
          <div className="pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Preuve à générer
            </p>
            <ProofBadge type={proofType} />
          </div>
        )}

        {/* Empty state */}
        {plan.length === 0 && !immediateAction && (
          <div className="py-8 text-center space-y-2">
            <Zap className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground">
              Pose une question à KITT IA pour générer un plan d'action personnalisé.
            </p>
          </div>
        )}
      </div>

      {/* Footer: all steps done */}
      {plan.length > 0 && completedSteps.size === plan.length && (
        <div className="shrink-0 px-4 py-3 border-t border-border/40 bg-emerald-500/5 text-center">
          <p className="text-xs font-semibold text-emerald-400">🎉 Plan complété !</p>
        </div>
      )}
    </div>
  );
}
