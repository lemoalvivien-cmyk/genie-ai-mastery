import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import {
  Plane, Play, Pause, RefreshCw, Loader2, Sparkles,
  Eye, TrendingUp, Zap, Bell, CheckCircle2, Clock, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AutopilotTask = {
  id: string;
  name: string;
  description: string;
  icon: typeof Eye;
  color: string;
  bg: string;
  frequency: string;
  status: "idle" | "running" | "done" | "error";
  lastRun?: string;
  result?: string;
  enabled: boolean;
};

const DEFAULT_TASKS: AutopilotTask[] = [
  {
    id: "ai_watch",
    name: "Veille IA",
    description: "Surveille les nouveaux modèles, outils et frameworks IA",
    icon: Eye,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    frequency: "Quotidien",
    status: "idle",
    enabled: true,
  },
  {
    id: "competitive_watch",
    name: "Veille Concurrentielle",
    description: "Analyse les mouvements de tes concurrents",
    icon: TrendingUp,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    frequency: "Hebdomadaire",
    status: "idle",
    enabled: false,
  },
  {
    id: "opportunities",
    name: "Détection Opportunités",
    description: "Identifie de nouvelles opportunités business IA",
    icon: Sparkles,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    frequency: "Quotidien",
    status: "idle",
    enabled: true,
  },
  {
    id: "market_signals",
    name: "Signaux Marché",
    description: "Surveille les tendances marché et signaux faibles",
    icon: Zap,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    frequency: "Temps réel",
    status: "idle",
    enabled: false,
  },
];

export default function Autopilot() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<AutopilotTask[]>(DEFAULT_TASKS);
  const [autopilotOn, setAutopilotOn] = useState(false);
  const [runningTask, setRunningTask] = useState<string | null>(null);

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t));
  }

  async function runTask(taskId: string) {
    if (!user) return;
    setRunningTask(taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "running" } : t));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/genieos-data-engine`;

      const modeMap: Record<string, string> = {
        ai_watch: "ai_watch",
        competitive_watch: "opportunities",
        opportunities: "opportunities",
        market_signals: "ai_watch",
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ mode: modeMap[taskId] ?? "ai_watch", user_id: user.id }),
      });

      if (!resp.ok) throw new Error("Task failed");

      // Simulate streaming results
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
          for (const line of lines) {
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === "done" || evt.result) result = evt.result ?? evt.summary ?? "Analyse terminée";
            } catch {}
          }
        }
      }

      const now = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      setTasks((prev) => prev.map((t) =>
        t.id === taskId ? { ...t, status: "done", lastRun: now, result: result || "Analyse complétée avec succès" } : t
      ));

      // Log to memory timeline
      await supabase.from("memory_timeline").insert({
        user_id: user.id,
        event_type: "agent_run",
        title: `Autopilot: ${tasks.find((t) => t.id === taskId)?.name}`,
        summary: result || "Tâche exécutée",
        importance: "normal",
      });

      toast({ title: "Tâche terminée !", description: tasks.find((t) => t.id === taskId)?.name });
    } catch (e) {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "error" } : t));
      toast({ title: "Erreur", description: "La tâche a échoué", variant: "destructive" });
    } finally {
      setRunningTask(null);
    }
  }

  async function runAll() {
    const enabled = tasks.filter((t) => t.enabled);
    for (const task of enabled) {
      await runTask(task.id);
    }
  }

  const enabledCount = tasks.filter((t) => t.enabled).length;

  return (
    <div className="h-full overflow-y-auto bg-background p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Plane className="w-6 h-6 text-sky-400" />
              AI Autopilot
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Agents récurrents — veille & détection automatique
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Autopilot</span>
              <Switch checked={autopilotOn} onCheckedChange={setAutopilotOn} />
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-xl border",
          autopilotOn
            ? "bg-green-500/10 border-green-500/20"
            : "bg-muted/30 border-border"
        )}>
          {autopilotOn
            ? <><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-sm text-green-400 font-medium">Autopilot actif — {enabledCount} agent(s) surveillent en continu</span></>
            : <><Pause className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Autopilot désactivé — active-le pour lancer la surveillance continue</span></>
          }
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={runAll}
              disabled={!!runningTask}>
              {runningTask ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Tout lancer
            </Button>
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-3">
          {tasks.map((task) => {
            const Icon = task.icon;
            const isRunning = runningTask === task.id;

            return (
              <div key={task.id}
                className={cn(
                  "p-4 rounded-xl border bg-card transition-all",
                  task.enabled ? "border-border" : "border-border/50 opacity-60",
                  task.status === "running" && "border-primary/30 bg-primary/5"
                )}>
                <div className="flex items-start gap-3">
                  <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5", task.bg)}>
                    {isRunning
                      ? <Loader2 className={cn("w-4 h-4 animate-spin", task.color)} />
                      : <Icon className={cn("w-4 h-4", task.color)} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{task.name}</span>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-2.5 h-2.5 mr-1" />{task.frequency}
                      </Badge>
                      {task.status === "done" && (
                        <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" />Terminé · {task.lastRun}
                        </Badge>
                      )}
                      {task.status === "error" && (
                        <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">
                          <AlertCircle className="w-2.5 h-2.5 mr-1" />Erreur
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    {task.result && task.status === "done" && (
                      <p className="text-xs text-foreground/70 mt-1.5 p-2 rounded-lg bg-muted/40 line-clamp-2">
                        {task.result}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={task.enabled} onCheckedChange={() => toggleTask(task.id)} />
                    <Button
                      size="sm" variant="ghost"
                      className={cn("h-7 w-7 p-0", task.color)}
                      disabled={isRunning || !task.enabled}
                      onClick={() => runTask(task.id)}
                    >
                      {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Notifications info */}
        <div className="p-3 rounded-xl border border-border bg-card/50 flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Les résultats des agents sont enregistrés dans ta <strong className="text-foreground">Memory Timeline</strong> et la section <strong className="text-foreground">AI Watch</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
