import { useEffect, useState, useCallback } from "react";
import { FileText, AlertTriangle, Bug, Info, AlertCircle, RefreshCw, Filter, Search, Bot, Cpu, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal" | "all";
type LogSource = "system" | "agent" | "error" | "all";

interface LogEntry {
  id: string;
  level: string;
  module?: string;
  event?: string;
  message: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  source: "system" | "agent" | "error";
  agent_id?: string;
  step?: string;
  error_type?: string;
}

const LEVEL_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  debug: { icon: Bug,          color: "text-muted-foreground", bg: "bg-muted/30" },
  info:  { icon: Info,         color: "text-blue-400",         bg: "bg-blue-400/10" },
  warn:  { icon: AlertTriangle,color: "text-amber-400",        bg: "bg-amber-400/10" },
  error: { icon: AlertCircle,  color: "text-rose-400",         bg: "bg-rose-400/10" },
  fatal: { icon: AlertCircle,  color: "text-rose-600",         bg: "bg-rose-600/10" },
};

const PAGE_SIZE = 50;

export default function LogsViewer() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all");
  const [sourceFilter, setSourceFilter] = useState<LogSource>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = useCallback(async (reset = true) => {
    if (!user) return;
    setLoading(true);

    const currentPage = reset ? 0 : page;
    if (reset) setPage(0);

    const allLogs: LogEntry[] = [];

    // System logs
    if (sourceFilter === "all" || sourceFilter === "system") {
      let q = supabase
        .from("system_logs")
        .select("id, level, module, event, message, metadata, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE - 1);

      if (levelFilter !== "all") q = q.eq("level", levelFilter);
      if (search) q = q.ilike("message", `%${search}%`);

      const { data } = await q;
      if (data) allLogs.push(...data.map((d) => ({ ...d, source: "system" as const })));
    }

    // Agent logs
    if (sourceFilter === "all" || sourceFilter === "agent") {
      let q = supabase
        .from("agent_logs")
        .select("id, level, agent_id, step, message, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE - 1);

      if (levelFilter !== "all" && levelFilter !== "fatal") q = q.eq("level", levelFilter);
      if (search) q = q.ilike("message", `%${search}%`);

      const { data } = await q;
      if (data) allLogs.push(...data.map((d) => ({ ...d, source: "agent" as const })));
    }

    // Error logs
    if (sourceFilter === "all" || sourceFilter === "error") {
      let q = supabase
        .from("error_logs")
        .select("id, error_type, message, metadata, created_at, resolved")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE - 1);

      if (search) q = q.ilike("message", `%${search}%`);

      const { data } = await q;
      if (data) allLogs.push(...data.map((d) => ({ ...d, level: "error", source: "error" as const })));
    }

    // Sort merged by date
    allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const slice = allLogs.slice(0, PAGE_SIZE);
    setLogs(reset ? slice : (prev) => [...prev, ...slice]);
    setHasMore(allLogs.length > PAGE_SIZE);
    setLoading(false);
  }, [user, levelFilter, sourceFilter, search, page]);

  useEffect(() => { fetchLogs(true); }, [levelFilter, sourceFilter, search]);

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  const SOURCE_ICONS: Record<string, React.ElementType> = {
    system: Cpu,
    agent: Bot,
    error: AlertCircle,
  };

  const total = logs.length;
  const errorCount = logs.filter((l) => l.level === "error" || l.level === "fatal").length;
  const warnCount  = logs.filter((l) => l.level === "warn").length;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Logs Central</h1>
              <p className="text-sm text-muted-foreground">
                {total} entrées · {errorCount} erreurs · {warnCount} avertissements
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchLogs(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Actualiser
          </button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/20 flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans les logs…"
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Level filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-muted-foreground" />
            {(["all", "info", "warn", "error", "debug"] as LogLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase transition-all",
                  levelFilter === l
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Source filter */}
          <div className="flex items-center gap-1">
            {(["all", "system", "agent", "error"] as LogSource[]).map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-semibold capitalize transition-all",
                  sourceFilter === s
                    ? "bg-card border border-primary/40 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Logs table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_auto_auto_1fr_auto] gap-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-4 py-2 border-b border-border bg-muted/20">
            <span className="pr-4">Heure</span>
            <span className="pr-4">Niveau</span>
            <span className="pr-4">Source</span>
            <span>Message</span>
            <span className="pl-4">Module</span>
          </div>

          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Chargement des logs…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <FileText className="w-8 h-8 opacity-30" />
              <p className="text-sm">Aucun log trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
              {logs.map((log) => {
                const Cfg = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.info;
                const LevelIcon = Cfg.icon;
                const SourceIcon = SOURCE_ICONS[log.source] ?? Cpu;
                return (
                  <div
                    key={`${log.source}-${log.id}`}
                    className={cn(
                      "grid grid-cols-[auto_auto_auto_1fr_auto] gap-0 px-4 py-2.5 hover:bg-muted/20 transition-colors items-center",
                      log.level === "error" || log.level === "fatal" ? "bg-rose-400/5" : ""
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground font-mono pr-4 whitespace-nowrap">
                      {formatTime(log.created_at)}
                    </span>
                    <div className={cn("flex items-center gap-1 pr-4", Cfg.color)}>
                      <LevelIcon className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase">{log.level}</span>
                    </div>
                    <div className="flex items-center gap-1 pr-4 text-muted-foreground">
                      <SourceIcon className="w-3 h-3" />
                      <span className="text-[10px]">{log.source}</span>
                    </div>
                    <p className="text-xs text-foreground truncate">{log.message}</p>
                    <span className="text-[10px] text-muted-foreground pl-4 font-mono truncate max-w-[120px]">
                      {log.module ?? log.step ?? log.error_type ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="p-3 border-t border-border">
              <button
                onClick={() => { setPage((p) => p + 1); fetchLogs(false); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-3 h-3" />
                Charger plus
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
