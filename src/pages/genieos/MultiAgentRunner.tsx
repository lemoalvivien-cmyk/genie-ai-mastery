import { useState } from "react";
import {
  Bot, Play, RotateCcw, CheckCircle2, AlertCircle, Loader2,
  Sparkles, ChevronDown, ChevronRight, BookOpen, Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMultiAgentRuntime, type SubTask, type AgentType } from "@/hooks/useMultiAgentRuntime";
import { cn } from "@/lib/utils";

const AGENT_COLORS: Record<AgentType, string> = {
  research: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  analysis: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  writer: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  automation: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  code: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

function TaskCard({ task }: { task: SubTask }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = AGENT_COLORS[task.agent] ?? "text-muted-foreground bg-muted/20 border-border";

  return (
    <div className={cn("rounded-xl border p-4 transition-all", colorClass)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          {task.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-current opacity-40" />}
          {task.status === "running" && <Loader2 className="w-4 h-4 animate-spin" />}
          {task.status === "done" && <CheckCircle2 className="w-4 h-4" />}
          {task.status === "error" && <AlertCircle className="w-4 h-4 text-destructive" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-xs capitalize border", colorClass)}>
              {task.agent}
            </Badge>
            <span className="text-xs text-muted-foreground">Tâche {task.id}</span>
          </div>
          <p className="text-sm font-medium text-foreground">{task.task}</p>
          {task.status === "done" && task.result && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {expanded ? "Masquer" : "Voir le résultat"}
            </button>
          )}
          {expanded && task.result && (
            <div className="mt-3 p-3 rounded-lg bg-background/50 border border-border/50">
              <p className="text-xs text-foreground/80 whitespace-pre-wrap">{task.result}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MultiAgentRunner() {
  const [objective, setObjective] = useState("");
  const { state, run, reset } = useMultiAgentRuntime();

  const isRunning = state.phase !== "idle" && state.phase !== "done" && state.phase !== "error";
  const canRun = objective.trim().length > 10 && !isRunning;

  const handleRun = () => {
    if (!canRun) return;
    run(objective);
  };

  const phaseLabel = {
    idle: null,
    planning: "Planification en cours...",
    executing: state.currentAgentName ? `${state.currentAgentIcon ?? "⚡"} ${state.currentAgentName} en cours...` : "Exécution des agents...",
    synthesizing: "📋 Synthèse finale...",
    done: "✅ Terminé",
    error: "❌ Erreur",
  }[state.phase];

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Left panel: input + config */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col bg-card/50">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Multi-Agent Runtime</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Agents display */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Agents disponibles</p>
            <div className="space-y-1.5">
              {(["research", "analysis", "writer", "automation", "code"] as AgentType[]).map(agent => {
                const colorClass = AGENT_COLORS[agent];
                const icons = { research: "🔍", analysis: "🧠", writer: "✍️", automation: "⚡", code: "💻" };
                const names = { research: "Research", analysis: "Analysis", writer: "Writer", automation: "Automation", code: "Code" };
                const isActive = state.tasks.some(t => t.agent === agent && t.status === "running");
                const isDone = state.tasks.some(t => t.agent === agent && t.status === "done");
                return (
                  <div key={agent} className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    colorClass,
                    isActive && "ring-1 ring-current",
                  )}>
                    <span>{icons[agent]}</span>
                    <span>{names[agent]} Agent</span>
                    {isDone && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                    {isActive && <Loader2 className="w-3 h-3 ml-auto animate-spin" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Knowledge indicator */}
          {state.knowledgeUsed && (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Base de connaissances utilisée</span>
            </div>
          )}
        </div>

        {/* Status badge */}
        {phaseLabel && (
          <div className="px-4 py-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
              <span className="text-foreground">{phaseLabel}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right panel: execution */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Objective input */}
        <div className="p-4 border-b border-border bg-card/30">
          <Textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Décrivez votre objectif... ex: Analyse le marché des SaaS B2B en France et rédige un rapport avec les 10 principales opportunités"
            className="min-h-20 bg-background border-border resize-none text-sm"
            disabled={isRunning}
          />
          <div className="flex gap-2 mt-3">
            <Button onClick={handleRun} disabled={!canRun} className="flex-1">
              {isRunning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exécution...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" />Lancer les agents</>
              )}
            </Button>
            {state.phase !== "idle" && (
              <Button variant="outline" onClick={reset} disabled={isRunning}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Execution results */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Idle state */}
          {state.phase === "idle" && (
            <div className="max-w-xl mx-auto text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <Network className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-3">Orchestrateur Multi-Agents</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Définissez un objectif complexe. L'orchestrateur décompose automatiquement la tâche
                et assigne les sous-tâches aux agents spécialisés les plus adaptés.
              </p>
            </div>
          )}

          {/* Plan + Tasks */}
          {state.plan && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">{state.plan.title}</h3>
                  <p className="text-xs text-muted-foreground">{state.plan.description}</p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs">
                  {state.tasks.filter(t => t.status === "done").length}/{state.tasks.length} agents
                </Badge>
              </div>
              <div className="space-y-3">
                {state.tasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Final result */}
          {state.finalResult && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Rapport final synthétisé</h3>
              </div>
              <div className="prose prose-sm prose-invert max-w-none text-foreground/90">
                {state.finalResult.split("\n").map((line, i) => {
                  if (line.startsWith("## ")) return <h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-2">{line.slice(3)}</h3>;
                  if (line.startsWith("### ")) return <h4 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">{line.slice(4)}</h4>;
                  if (line.startsWith("- ") || line.startsWith("* ")) return <p key={i} className="flex items-start gap-1.5 text-sm text-foreground/80 ml-3"><span>•</span><span>{line.slice(2)}</span></p>;
                  if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="text-sm font-semibold text-foreground mt-2">{line.slice(2, -2)}</p>;
                  if (line.trim()) return <p key={i} className="text-sm text-foreground/80 leading-relaxed">{line}</p>;
                  return <div key={i} className="h-2" />;
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {state.error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium text-sm">Erreur d'exécution</span>
              </div>
              <p className="text-sm text-muted-foreground">{state.error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Réessayer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
