import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Square, RefreshCw, Bot, CheckCircle2, XCircle, Loader2, Sparkles, Network, Zap, Timer, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type AgentStatus = "idle" | "pending" | "running" | "done" | "error";

interface AgentTask {
  id: number;
  agent: string;
  agent_name: string;
  agent_icon: string;
  task_description: string;
  status: AgentStatus;
  result?: string;
  error?: string;
  started_at?: number;
  duration_ms?: number;
}

interface ParallelGroup {
  group_id: string;
  label: string;
  agents: AgentTask[];
  parallel: boolean;
}

type RuntimePhase = "idle" | "planning" | "executing" | "synthesizing" | "done" | "error";

interface RuntimeState {
  phase: RuntimePhase;
  plan_title: string;
  groups: ParallelGroup[];
  result: string;
  error: string;
  elapsed_ms: number;
}

const PRESET_WORKFLOWS = [
  {
    label: "🏢 Analyse marché SaaS",
    objective: "Analyse le marché des outils SaaS de gestion de projet en 2025 : taille du marché, acteurs clés, opportunités et recommandations stratégiques",
  },
  {
    label: "📧 Campagne d'outreach",
    objective: "Créer une stratégie d'outreach B2B complète pour une startup IA : identifier les prospects cibles, rédiger les emails, définir la séquence de relance",
  },
  {
    label: "💡 Business plan startup",
    objective: "Élaborer un business plan pour une startup IA spécialisée dans l'automatisation RH : étude de marché, modèle économique, roadmap produit",
  },
  {
    label: "🔍 Veille concurrentielle",
    objective: "Effectuer une analyse concurrentielle approfondie de 5 concurrents d'une app de productivité IA : forces, faiblesses, différenciateurs",
  },
];

const AGENT_COLORS: Record<string, string> = {
  research: "text-sky-400 border-sky-400/30 bg-sky-400/5",
  analysis: "text-purple-400 border-purple-400/30 bg-purple-400/5",
  writer: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
  automation: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  code: "text-blue-400 border-blue-400/30 bg-blue-400/5",
};

function AgentCard({ task, expanded, onToggle }: { task: AgentTask; expanded: boolean; onToggle: () => void }) {
  const color = AGENT_COLORS[task.agent] ?? "text-muted-foreground border-border bg-muted/20";

  return (
    <div className={cn("rounded-lg border overflow-hidden transition-all", color)}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-xl flex-shrink-0">{task.agent_icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{task.agent_name}</span>
            {task.status === "running" && <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />}
            {task.status === "done" && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
            {task.status === "error" && <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />}
            {task.status === "pending" && <div className="w-3 h-3 rounded-full border border-muted-foreground/50 flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{task.task_description}</p>
        </div>
        {task.duration_ms && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Timer className="w-3 h-3" />
            {(task.duration_ms / 1000).toFixed(1)}s
          </div>
        )}
        {task.result && (
          expanded ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />
        )}
      </button>
      {expanded && task.result && (
        <div className="px-4 pb-4 border-t border-current/10">
          <div className="mt-3 p-3 rounded-lg bg-background/50 border border-border">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{task.result.slice(0, 600)}{task.result.length > 600 ? "..." : ""}</p>
          </div>
        </div>
      )}
      {expanded && task.error && (
        <div className="px-4 pb-4 border-t border-current/10">
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{task.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentsRuntime() {
  const [objective, setObjective] = useState("");
  const [state, setState] = useState<RuntimeState>({
    phase: "idle", plan_title: "", groups: [], result: "", error: "", elapsed_ms: 0,
  });
  const [expandedAgents, setExpandedAgents] = useState<Set<number>>(new Set());
  const [parallelMode, setParallelMode] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isRunning = state.phase !== "idle" && state.phase !== "done" && state.phase !== "error";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.groups, state.result]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const run = useCallback(async () => {
    if (!objective.trim() || isRunning) return;

    abortRef.current = new AbortController();
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setState(s => ({ ...s, elapsed_ms: Date.now() - startTimeRef.current }));
    }, 500);

    setState({ phase: "planning", plan_title: "", groups: [], result: "", error: "", elapsed_ms: 0 });
    setExpandedAgents(new Set());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/genieos-multi-agent-runtime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ objective, parallel: parallelMode }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Track agent timers
      const agentStartTimes: Record<number, number> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;

          try {
            const ev = JSON.parse(raw);

            if (ev.type === "phase") {
              setState(s => ({ ...s, phase: ev.phase === "planning" ? "planning" : ev.phase === "synthesizing" ? "synthesizing" : "executing" }));
            }

            if (ev.type === "plan") {
              const plan = ev.plan;
              // Build groups — for parallel mode, group research+analysis in parallel, then writer
              const groups: ParallelGroup[] = [];
              if (parallelMode && plan.tasks.length >= 3) {
                // Split into parallel group + sequential final
                const parallelTasks = plan.tasks.slice(0, Math.ceil(plan.tasks.length * 0.6));
                const sequentialTasks = plan.tasks.slice(Math.ceil(plan.tasks.length * 0.6));
                if (parallelTasks.length > 0) {
                  groups.push({
                    group_id: "g1",
                    label: "⚡ Agents parallèles",
                    parallel: true,
                    agents: parallelTasks.map((t: { id: number; agent: string; task: string }) => ({
                      id: t.id, agent: t.agent,
                      agent_name: t.agent.charAt(0).toUpperCase() + t.agent.slice(1) + " Agent",
                      agent_icon: { research: "🔍", analysis: "🧠", writer: "✍️", automation: "⚡", code: "💻" }[t.agent as string] ?? "🤖",
                      task_description: t.task,
                      status: "pending" as AgentStatus,
                    })),
                  });
                }
                if (sequentialTasks.length > 0) {
                  groups.push({
                    group_id: "g2",
                    label: "📋 Agents séquentiels",
                    parallel: false,
                    agents: sequentialTasks.map((t: { id: number; agent: string; task: string }) => ({
                      id: t.id, agent: t.agent,
                      agent_name: t.agent.charAt(0).toUpperCase() + t.agent.slice(1) + " Agent",
                      agent_icon: { research: "🔍", analysis: "🧠", writer: "✍️", automation: "⚡", code: "💻" }[t.agent as string] ?? "🤖",
                      task_description: t.task,
                      status: "pending" as AgentStatus,
                    })),
                  });
                }
              } else {
                groups.push({
                  group_id: "g1",
                  label: "🔁 Agents séquentiels",
                  parallel: false,
                  agents: plan.tasks.map((t: { id: number; agent: string; task: string }) => ({
                    id: t.id, agent: t.agent,
                    agent_name: t.agent.charAt(0).toUpperCase() + t.agent.slice(1) + " Agent",
                    agent_icon: { research: "🔍", analysis: "🧠", writer: "✍️", automation: "⚡", code: "💻" }[t.agent as string] ?? "🤖",
                    task_description: t.task,
                    status: "pending" as AgentStatus,
                  })),
                });
              }
              setState(s => ({ ...s, plan_title: plan.title, groups, phase: "executing" }));
            }

            if (ev.type === "agent_start") {
              agentStartTimes[ev.task_id] = Date.now();
              setState(s => ({
                ...s,
                groups: s.groups.map(g => ({
                  ...g,
                  agents: g.agents.map(a => a.id === ev.task_id ? { ...a, status: "running" as AgentStatus, agent_name: ev.agent_name, agent_icon: ev.agent_icon } : a),
                })),
              }));
            }

            if (ev.type === "agent_done") {
              const dur = agentStartTimes[ev.task_id] ? Date.now() - agentStartTimes[ev.task_id] : undefined;
              setState(s => ({
                ...s,
                groups: s.groups.map(g => ({
                  ...g,
                  agents: g.agents.map(a => a.id === ev.task_id ? { ...a, status: "done" as AgentStatus, result: ev.result, duration_ms: dur } : a),
                })),
              }));
              setExpandedAgents(prev => new Set([...prev, ev.task_id]));
            }

            if (ev.type === "agent_error") {
              setState(s => ({
                ...s,
                groups: s.groups.map(g => ({
                  ...g,
                  agents: g.agents.map(a => a.id === ev.task_id ? { ...a, status: "error" as AgentStatus, error: ev.error } : a),
                })),
              }));
            }

            if (ev.type === "completed") {
              stopTimer();
              setState(s => ({ ...s, phase: "done", result: ev.result }));
            }

            if (ev.type === "error") {
              stopTimer();
              setState(s => ({ ...s, phase: "error", error: ev.error }));
            }
          } catch (_) { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      stopTimer();
      setState(s => ({ ...s, phase: "error", error: String(err) }));
      toast({ title: "Erreur d'exécution", description: String(err), variant: "destructive" });
    }
  }, [objective, parallelMode, isRunning, stopTimer]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    stopTimer();
    setState(s => ({ ...s, phase: "idle" }));
  }, [stopTimer]);

  const reset = useCallback(() => {
    stop();
    setState({ phase: "idle", plan_title: "", groups: [], result: "", error: "", elapsed_ms: 0 });
    setExpandedAgents(new Set());
  }, [stop]);

  const totalAgents = state.groups.reduce((acc, g) => acc + g.agents.length, 0);
  const doneAgents = state.groups.reduce((acc, g) => acc + g.agents.filter(a => a.status === "done").length, 0);
  const progress = totalAgents > 0 ? Math.round((doneAgents / totalAgents) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow-sm">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">Agents Runtime</h1>
              <p className="text-xs text-muted-foreground">Orchestration multi-agents en temps réel</p>
            </div>
          </div>
          {isRunning && (
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground font-mono">
                {(state.elapsed_ms / 1000).toFixed(1)}s
              </div>
              {totalAgents > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground">{doneAgents}/{totalAgents}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Input */}
        <div className="space-y-3">
          <Textarea
            value={objective}
            onChange={e => setObjective(e.target.value)}
            placeholder="Décrivez l'objectif à accomplir par les agents..."
            className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[80px]"
            disabled={isRunning}
          />

          {/* Presets */}
          {!isRunning && state.phase === "idle" && (
            <div className="flex flex-wrap gap-2">
              {PRESET_WORKFLOWS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setObjective(p.objective)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Mode + action row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => !isRunning && setParallelMode(m => !m)}
                  className={cn(
                    "relative w-9 h-5 rounded-full transition-colors border",
                    parallelMode ? "bg-primary/20 border-primary/30" : "bg-muted border-border"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full transition-all",
                    parallelMode ? "left-4 bg-primary" : "left-0.5 bg-muted-foreground/50"
                  )} />
                </div>
                <span className="text-xs text-muted-foreground">
                  <Zap className="w-3 h-3 inline mr-1 text-yellow-400" />
                  Mode parallèle
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              {state.phase !== "idle" && (
                <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 text-xs">
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </Button>
              )}
              {isRunning ? (
                <Button variant="outline" size="sm" onClick={stop} className="gap-1.5 text-xs border-destructive/50 text-destructive hover:bg-destructive/10">
                  <Square className="w-3 h-3" />
                  Arrêter
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={run}
                  disabled={!objective.trim()}
                  className="gap-1.5 text-xs gradient-primary border-0 shadow-glow-sm"
                >
                  <Play className="w-3 h-3" />
                  Lancer les agents
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Phase indicator */}
        {state.phase !== "idle" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card/50">
            {state.phase === "planning" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            {state.phase === "executing" && <Network className="w-4 h-4 text-cyan-400 animate-pulse" />}
            {state.phase === "synthesizing" && <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />}
            {state.phase === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {state.phase === "error" && <XCircle className="w-4 h-4 text-destructive" />}
            <span className="text-xs text-muted-foreground">
              {state.phase === "planning" && "🧠 Génération du plan d'orchestration..."}
              {state.phase === "executing" && `⚡ Exécution en cours${state.plan_title ? ` — ${state.plan_title}` : ""}${parallelMode ? " (mode parallèle)" : ""}`}
              {state.phase === "synthesizing" && "📋 Synthèse finale en cours..."}
              {state.phase === "done" && `✅ Terminé en ${(state.elapsed_ms / 1000).toFixed(1)}s`}
              {state.phase === "error" && `❌ Erreur : ${state.error}`}
            </span>
          </div>
        )}

        {/* Agent groups */}
        {state.groups.map(group => (
          <div key={group.group_id} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</h3>
              {group.parallel && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  parallèle
                </span>
              )}
            </div>
            {group.parallel ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.agents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    task={agent}
                    expanded={expandedAgents.has(agent.id)}
                    onToggle={() => setExpandedAgents(prev => {
                      const next = new Set(prev);
                      next.has(agent.id) ? next.delete(agent.id) : next.add(agent.id);
                      return next;
                    })}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {group.agents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    task={agent}
                    expanded={expandedAgents.has(agent.id)}
                    onToggle={() => setExpandedAgents(prev => {
                      const next = new Set(prev);
                      next.has(agent.id) ? next.delete(agent.id) : next.add(agent.id);
                      return next;
                    })}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Final result */}
        {state.result && (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-foreground">Rapport final</h3>
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{state.result}</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
