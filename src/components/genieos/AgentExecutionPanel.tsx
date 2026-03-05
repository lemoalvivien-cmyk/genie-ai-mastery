import { CheckCircle2, Circle, Loader2, XCircle, ChevronDown, ChevronUp, Zap, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AgentExecutionState, AgentStep } from "@/hooks/useAgentRuntime";
import { Button } from "@/components/ui/button";

interface Props {
  state: AgentExecutionState;
  onClose?: () => void;
}

function StepIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "running") return <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />;
  if (status === "done") return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (status === "error") return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
  return <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />;
}

function StepRow({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false);
  const hasResult = !!step.result;

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      step.status === "running" ? "border-primary/30 bg-primary/5" :
      step.status === "done" ? "border-emerald-400/20 bg-emerald-400/5" :
      step.status === "error" ? "border-destructive/20 bg-destructive/5" :
      "border-border bg-card/50"
    )}>
      <button
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => hasResult && setExpanded(e => !e)}
        disabled={!hasResult}
      >
        <StepIcon status={step.status} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            step.status === "running" ? "text-primary" :
            step.status === "done" ? "text-foreground" :
            step.status === "pending" ? "text-muted-foreground" :
            "text-foreground"
          )}>
            {step.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{step.description}</p>
        </div>
        {step.tool && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono flex-shrink-0">
            {step.tool}
          </span>
        )}
        {hasResult && (
          expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                   : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {expanded && step.result && (
        <div className="px-3 pb-3 border-t border-border/50 pt-2">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{step.result}</p>
        </div>
      )}
    </div>
  );
}

export function AgentExecutionPanel({ state, onClose }: Props) {
  const [showResult, setShowResult] = useState(false);

  const phaseLabel = {
    idle: "En attente",
    planning: "Planification...",
    executing: "Exécution en cours",
    synthesizing: "Synthèse en cours...",
    completed: "Terminé ✓",
    error: "Erreur",
  }[state.phase];

  const phaseColor = {
    idle: "text-muted-foreground",
    planning: "text-primary",
    executing: "text-primary",
    synthesizing: "text-yellow-400",
    completed: "text-emerald-400",
    error: "text-destructive",
  }[state.phase];

  if (state.phase === "idle") return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Agent Runtime</span>
          <span className={cn("text-xs font-medium", phaseColor)}>{phaseLabel}</span>
        </div>
        {onClose && state.phase !== "executing" && state.phase !== "planning" && state.phase !== "synthesizing" && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2 text-xs text-muted-foreground">
            Fermer
          </Button>
        )}
      </div>

      {/* Phase message */}
      {state.phaseMessage && (
        <div className="px-4 py-2 border-b border-border/50 bg-muted/10">
          <p className="text-xs text-muted-foreground">{state.phaseMessage}</p>
        </div>
      )}

      {/* Steps */}
      {state.steps.length > 0 && (
        <div className="p-3 space-y-2">
          {state.steps.map(step => (
            <StepRow key={step.id} step={step} />
          ))}
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && state.error && (
        <div className="p-3 border-t border-border">
          <p className="text-xs text-destructive">{state.error}</p>
        </div>
      )}

      {/* Final result */}
      {state.phase === "completed" && state.result && (
        <div className="border-t border-border">
          <button
            onClick={() => setShowResult(e => !e)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-foreground">Rapport final</span>
            </div>
            {showResult ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showResult && (
            <div className="px-4 pb-4">
              <div className="rounded-lg bg-background border border-border p-3">
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{state.result}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
