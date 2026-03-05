import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActionEngine, ActionMode, ActionTool } from "@/hooks/useActionEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Globe, Users, Mail, Plug, Send, Play, Square, RotateCcw,
  CheckCircle2, XCircle, Loader2, Clock, AlertTriangle, Zap,
  Eye, Shield, ChevronRight, FileText, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TOOLS: { id: ActionTool; label: string; icon: React.ElementType; color: string; description: string; critical?: boolean }[] = [
  { id: "web_scraper", label: "Web Scraper", icon: Globe, color: "text-blue-400", description: "Extraire du contenu web" },
  { id: "lead_finder", label: "Lead Finder", icon: Users, color: "text-emerald-400", description: "Trouver des prospects" },
  { id: "email_generator", label: "Email Generator", icon: Mail, color: "text-purple-400", description: "Générer des emails" },
  { id: "api_connector", label: "API Connector", icon: Plug, color: "text-orange-400", description: "Appeler une API externe", critical: true },
  { id: "form_submit", label: "Form Submit", icon: Send, color: "text-red-400", description: "Soumettre un formulaire", critical: true },
];

const STATUS_CONFIG = {
  pending: { label: "En attente", color: "text-muted-foreground", icon: Clock },
  running: { label: "En cours", color: "text-blue-400", icon: Loader2 },
  completed: { label: "Terminé", color: "text-emerald-400", icon: CheckCircle2 },
  failed: { label: "Échec", color: "text-destructive", icon: XCircle },
  requires_confirmation: { label: "Confirmation requise", color: "text-yellow-400", icon: AlertTriangle },
};

interface ActionLog {
  id: string;
  action_type: string;
  mode: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
}

export default function ActionsPage() {
  const { user } = useAuth();
  const { state, run, stop, reset } = useActionEngine();
  const [objective, setObjective] = useState("");
  const [mode, setMode] = useState<ActionMode>("simulation");
  const [autonomous, setAutonomous] = useState(false);
  const [selectedTools, setSelectedTools] = useState<ActionTool[]>(["web_scraper", "lead_finder", "email_generator"]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const isRunning = ["planning", "running", "evaluating", "synthesizing"].includes(state.status);

  useEffect(() => {
    if (user) fetchLogs();
  }, [user, state.status]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("action_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setLogs(data as ActionLog[]);
    setLoadingLogs(false);
  };

  const toggleTool = (toolId: ActionTool) => {
    setSelectedTools(prev =>
      prev.includes(toolId) ? prev.filter(t => t !== toolId) : [...prev, toolId]
    );
  };

  const handleRun = async () => {
    if (!objective.trim()) return;
    await run(objective, mode, { tools: selectedTools, autonomous });
  };

  const getToolIcon = (toolId: string) => {
    return TOOLS.find(t => t.id === toolId)?.icon ?? Activity;
  };

  const getToolColor = (toolId: string) => {
    return TOOLS.find(t => t.id === toolId)?.color ?? "text-muted-foreground";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-sm">Action Engine</h1>
              <p className="text-xs text-muted-foreground">Agents capables d'agir sur Internet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={mode === "real" ? "destructive" : "secondary"} className="text-xs">
              {mode === "simulation" ? (
                <><Eye className="w-3 h-3 mr-1" />Simulation</>
              ) : (
                <><Zap className="w-3 h-3 mr-1" />Exécution réelle</>
              )}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="runner" className="h-full flex flex-col">
          <div className="px-6 pt-4 border-b border-border flex-shrink-0">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="runner" className="text-xs gap-1.5">
                <Play className="w-3 h-3" />Runner
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs gap-1.5">
                <FileText className="w-3 h-3" />
                Logs
                {logs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1 py-0 h-4">{logs.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── RUNNER TAB ── */}
          <TabsContent value="runner" className="flex-1 overflow-auto p-6 space-y-5">
            {/* Config */}
            <div className="space-y-4 p-4 rounded-xl border border-border bg-card/50">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Objectif de l'agent</Label>
                <div className="flex gap-2">
                  <Input
                    value={objective}
                    onChange={e => setObjective(e.target.value)}
                    placeholder="Ex: Trouve 10 prospects SaaS B2B en France..."
                    className="flex-1 text-sm"
                    onKeyDown={e => e.key === "Enter" && !isRunning && handleRun()}
                    disabled={isRunning}
                  />
                  {isRunning ? (
                    <Button size="sm" variant="destructive" onClick={stop} className="gap-1.5">
                      <Square className="w-3.5 h-3.5" />Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleRun} disabled={!objective.trim()} className="gap-1.5">
                      <Play className="w-3.5 h-3.5" />Lancer
                    </Button>
                  )}
                  {state.status !== "idle" && !isRunning && (
                    <Button size="sm" variant="outline" onClick={reset} className="gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" />Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Mode + Options */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Simulation / Real toggle */}
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Simulation</span>
                  <Switch
                    checked={mode === "real"}
                    onCheckedChange={v => setMode(v ? "real" : "simulation")}
                    disabled={isRunning}
                  />
                  <span className={cn("text-xs font-medium", mode === "real" ? "text-destructive" : "text-muted-foreground")}>
                    Réel
                  </span>
                  {mode === "real" && (
                    <Badge variant="destructive" className="text-xs">⚠ Actions réelles</Badge>
                  )}
                </div>

                {/* Autonomous toggle */}
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Autonome</span>
                  <Switch
                    checked={autonomous}
                    onCheckedChange={setAutonomous}
                    disabled={isRunning}
                  />
                </div>
              </div>

              {/* Tools selector */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Outils disponibles</Label>
                <div className="flex flex-wrap gap-2">
                  {TOOLS.map(tool => {
                    const selected = selectedTools.includes(tool.id);
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => !isRunning && toggleTool(tool.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all",
                          selected
                            ? "border-primary/40 bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground hover:border-border/80",
                          isRunning && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Icon className={cn("w-3 h-3", selected ? tool.color : "")} />
                        {tool.label}
                        {tool.critical && (
                          <AlertTriangle className="w-2.5 h-2.5 text-yellow-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pending confirmation banner */}
            {state.pendingConfirmation && (
              <div className="p-4 rounded-xl border border-yellow-400/30 bg-yellow-400/5 space-y-3">
                <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Confirmation requise
                </div>
                <p className="text-xs text-muted-foreground">{state.pendingConfirmation.message}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    onClick={() => run(objective, "real", { tools: selectedTools, autonomous, confirmedCritical: true })}
                  >
                    Confirmer l'exécution réelle
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setState(s => ({ ...s, pendingConfirmation: null }))}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {/* Execution steps */}
            {state.steps.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Plan d'exécution {state.iteration > 1 && `— Itération ${state.iteration}`}
                  </span>
                  {isRunning && (
                    <div className="flex items-center gap-1.5 text-xs text-primary">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="capitalize">{state.status}...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {state.steps.map(step => {
                    const config = STATUS_CONFIG[step.status] ?? STATUS_CONFIG.pending;
                    const StatusIcon = config.icon;
                    const ToolIcon = getToolIcon(step.tool);
                    const toolColor = getToolColor(step.tool);

                    return (
                      <div
                        key={step.id}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          step.status === "running" ? "border-primary/30 bg-primary/5" : "border-border bg-card/30"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full",
                            step.status === "completed" ? "bg-emerald-400/10" : "bg-muted/50"
                          )}>
                            <StatusIcon className={cn("w-3 h-3", config.color, step.status === "running" && "animate-spin")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-foreground">{step.name}</span>
                              <div className="flex items-center gap-1">
                                <ToolIcon className={cn("w-3 h-3", toolColor)} />
                                <span className={cn("text-xs", toolColor)}>{step.tool}</span>
                              </div>
                              <Badge variant="secondary" className={cn("text-xs px-1 py-0 h-4", config.color)}>
                                {config.label}
                              </Badge>
                              {step.duration_ms && (
                                <span className="text-xs text-muted-foreground">{step.duration_ms}ms</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>

                            {step.result && step.status === "completed" && (
                              <div className="mt-2 p-2 rounded-md bg-muted/30 text-xs text-foreground/80 max-h-24 overflow-auto">
                                {typeof step.result === "string"
                                  ? step.result
                                  : JSON.stringify(step.result, null, 2).slice(0, 400)}
                              </div>
                            )}
                            {step.error && (
                              <p className="mt-1 text-xs text-destructive">{step.error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Final report */}
            {state.report && (
              <div className="p-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Rapport final
                  <Badge variant="secondary" className="text-xs">{mode === "simulation" ? "Simulation" : "Réel"}</Badge>
                </div>
                <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {state.report}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── LOGS TAB ── */}
          <TabsContent value="logs" className="flex-1 overflow-auto p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{logs.length} actions enregistrées</span>
              <Button size="sm" variant="ghost" onClick={fetchLogs} className="text-xs gap-1">
                <RotateCcw className={cn("w-3 h-3", loadingLogs && "animate-spin")} />
                Actualiser
              </Button>
            </div>

            {loadingLogs && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loadingLogs && logs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <Activity className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucune action enregistrée</p>
                <p className="text-xs text-muted-foreground/60">Lancez votre premier agent pour voir les logs ici</p>
              </div>
            )}

            {logs.map(log => {
              const ToolIcon = getToolIcon(log.action_type);
              const toolColor = getToolColor(log.action_type);
              const isExpanded = expandedLog === log.id;
              const statusConfig = STATUS_CONFIG[log.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={log.id}
                  className="border border-border rounded-lg overflow-hidden hover:border-border/80 transition-colors"
                >
                  <button
                    className="w-full flex items-center gap-3 p-3 text-left"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <ToolIcon className={cn("w-4 h-4 flex-shrink-0", toolColor)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-foreground">{log.action_type}</span>
                        <Badge variant={log.mode === "real" ? "destructive" : "secondary"} className="text-xs px-1 py-0 h-4">
                          {log.mode}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <StatusIcon className={cn("w-3 h-3", statusConfig.color)} />
                          <span className={cn("text-xs", statusConfig.color)}>{statusConfig.label}</span>
                        </div>
                        {log.duration_ms && (
                          <span className="text-xs text-muted-foreground">{log.duration_ms}ms</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-3 space-y-3 bg-muted/10">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
                        <pre className="text-xs text-foreground/80 bg-background rounded p-2 overflow-auto max-h-32">
                          {JSON.stringify(log.input, null, 2)}
                        </pre>
                      </div>
                      {log.output && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                          <pre className="text-xs text-foreground/80 bg-background rounded p-2 overflow-auto max-h-32">
                            {JSON.stringify(log.output, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.error && (
                        <div>
                          <p className="text-xs font-medium text-destructive mb-1">Erreur</p>
                          <p className="text-xs text-destructive/80">{log.error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
