import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Loader2,
  RefreshCw, ServerCrash, Zap, Power, PowerOff, Flame
} from "lucide-react";
import { Link } from "react-router-dom";

type EdgeError = {
  id: string;
  request_id: string | null;
  fn: string;
  user_id: string | null;
  message: string;
  stack_hash: string | null;
  status_code: number | null;
  latency_ms: number | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

type EdgeLog = {
  id: string;
  request_id: string | null;
  fn: string;
  user_id: string | null;
  status_code: number | null;
  latency_ms: number | null;
  created_at: string;
};

const EDGE_FUNCTIONS = [
  "chat-completion",
  "generate-pdf",
  "text-to-speech",
  "create-checkout",
  "check-subscription",
  "redeem-code",
  "fetch-sources",
  "generate-briefs",
  "csp-report",
];

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold">
      <CheckCircle2 className="w-3 h-3" /> OK
    </span>
  ) : (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
      <AlertTriangle className="w-3 h-3" /> Erreurs
    </span>
  );
}

export default function OpsCenter() {
  const [autoRefresh] = useState(true);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Edge errors last 24h
  const { data: errors = [], isLoading: errLoading, refetch: refetchErrors } = useQuery<EdgeError[]>({
    queryKey: ["edge-errors-24h"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edge_errors" as never)
        .select("id, request_id, fn, user_id, message, stack_hash, status_code, latency_ms, meta, created_at")
        .gte("created_at", since24h)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as EdgeError[];
    },
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  // Edge logs last 24h (for latency p95)
  const { data: logs = [], isLoading: logLoading, refetch: refetchLogs } = useQuery<EdgeLog[]>({
    queryKey: ["edge-logs-24h"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edge_logs" as never)
        .select("id, request_id, fn, user_id, status_code, latency_ms, created_at")
        .gte("created_at", since24h)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as EdgeLog[];
    },
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  // Kill switch
  const { data: killData } = useQuery({
    queryKey: ["kill-switch"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "ai_kill_switch").single();
      return data?.value as { disabled: boolean } ?? { disabled: false };
    },
    refetchInterval: 10_000,
  });
  const aiDisabled = killData?.disabled ?? false;

  const refetchAll = () => { refetchErrors(); refetchLogs(); };

  // ── Computed stats ──────────────────────────────────────────────────────────
  const errorsByFn = errors.reduce((acc, e) => {
    acc[e.fn] = (acc[e.fn] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // p95 latency per function
  const latencyByFn: Record<string, { p50: number; p95: number; count: number }> = {};
  const allLatencies: number[] = [];
  logs.forEach((l) => {
    if (l.latency_ms == null) return;
    allLatencies.push(l.latency_ms);
    if (!latencyByFn[l.fn]) latencyByFn[l.fn] = { p50: 0, p95: 0, count: 0 };
    latencyByFn[l.fn].count++;
  });

  // Compute p50/p95 per fn
  Object.keys(latencyByFn).forEach((fn) => {
    const fnLats = logs.filter(l => l.fn === fn && l.latency_ms != null).map(l => l.latency_ms!).sort((a, b) => a - b);
    latencyByFn[fn].p50 = fnLats[Math.floor(fnLats.length * 0.5)] ?? 0;
    latencyByFn[fn].p95 = fnLats[Math.floor(fnLats.length * 0.95)] ?? 0;
  });

  // Global p95
  allLatencies.sort((a, b) => a - b);
  const globalP95 = allLatencies[Math.floor(allLatencies.length * 0.95)] ?? 0;
  const globalP50 = allLatencies[Math.floor(allLatencies.length * 0.5)] ?? 0;

  const totalErrors = errors.length;
  const totalRequests = logs.length;
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(1) : "0";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });

  const latencyColor = (ms: number) =>
    ms > 5000 ? "text-destructive" : ms > 2000 ? "text-amber-500" : "text-green-600";

  const isLoading = errLoading || logLoading;

  return (
    <>
      <Helmet><title>OPS Center – GENIE IA Admin</title></Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">⚙️ OPS Center</h1>
                <Link to="/admin/control-room" className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 transition-colors">
                  ← Control Room
                </Link>
                <Link to="/admin/runbook" className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 transition-colors">
                  📖 Runbook
                </Link>
              </div>
              <p className="text-muted-foreground text-sm">Santé edge functions · Erreurs 24h · Latence p95</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Auto-refresh 30s</span>
              <button
                onClick={refetchAll}
                className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* AI Kill Switch status */}
          <div className={`rounded-2xl border-2 p-4 mb-6 flex items-center gap-3 ${aiDisabled ? "border-destructive/50 bg-destructive/5" : "border-green-500/30 bg-green-500/5"}`}>
            {aiDisabled
              ? <PowerOff className="w-5 h-5 text-destructive shrink-0" />
              : <Power className="w-5 h-5 text-green-600 shrink-0" />}
            <div>
              <span className="font-semibold text-foreground text-sm">
                IA {aiDisabled ? "🔴 DÉSACTIVÉE (kill switch actif)" : "🟢 ACTIVE"}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {aiDisabled
                  ? "Tous les appels chat retournent 503. Allez dans Control Room pour réactiver."
                  : "Les edge functions répondent normalement."}
              </p>
            </div>
            <Link to="/admin/control-room" className="ml-auto text-xs border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-muted transition-colors">
              Gérer →
            </Link>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Activity className="w-4 h-4" /> Requêtes 24h
              </div>
              <div className="text-2xl font-bold text-foreground">{totalRequests.toLocaleString()}</div>
            </div>
            <div className={`rounded-2xl border p-5 bg-card ${totalErrors > 0 ? "border-destructive/40" : "border-border"}`}>
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <ServerCrash className="w-4 h-4" /> Erreurs 24h
              </div>
              <div className={`text-2xl font-bold ${totalErrors > 0 ? "text-destructive" : "text-foreground"}`}>{totalErrors}</div>
              <div className="text-xs text-muted-foreground mt-1">Taux: {errorRate}%</div>
            </div>
            <div className={`rounded-2xl border p-5 bg-card ${globalP50 > 2000 ? "border-amber-500/40" : "border-border"}`}>
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Clock className="w-4 h-4" /> Latence p50
              </div>
              <div className={`text-2xl font-bold ${latencyColor(globalP50)}`}>
                {globalP50 > 0 ? `${globalP50}ms` : "—"}
              </div>
            </div>
            <div className={`rounded-2xl border p-5 bg-card ${globalP95 > 5000 ? "border-destructive/40" : globalP95 > 2000 ? "border-amber-500/40" : "border-border"}`}>
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Zap className="w-4 h-4" /> Latence p95
              </div>
              <div className={`text-2xl font-bold ${latencyColor(globalP95)}`}>
                {globalP95 > 0 ? `${globalP95}ms` : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Seuil alerte: 5000ms</div>
            </div>
          </div>

          {/* Per-function health table */}
          <div className="rounded-2xl border border-border bg-card p-5 mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Santé par fonction (24h)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-4">Fonction</th>
                    <th className="text-center text-xs text-muted-foreground font-medium pb-2 px-4">Statut</th>
                    <th className="text-right text-xs text-muted-foreground font-medium pb-2 px-4">Requêtes</th>
                    <th className="text-right text-xs text-muted-foreground font-medium pb-2 px-4">Erreurs</th>
                    <th className="text-right text-xs text-muted-foreground font-medium pb-2 px-4">p50</th>
                    <th className="text-right text-xs text-muted-foreground font-medium pb-2 pl-4">p95</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {EDGE_FUNCTIONS.map((fn) => {
                    const fnErrors = errorsByFn[fn] ?? 0;
                    const fnLogs = latencyByFn[fn] ?? { p50: 0, p95: 0, count: 0 };
                    const hasData = fnLogs.count > 0 || fnErrors > 0;
                    return (
                      <tr key={fn} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pr-4">
                          <span className="font-mono text-xs text-foreground">{fn}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <StatusBadge ok={fnErrors === 0} />
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs text-muted-foreground">
                          {hasData ? fnLogs.count : <span className="opacity-40">—</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {fnErrors > 0
                            ? <span className="text-xs font-bold text-destructive">{fnErrors}</span>
                            : <span className="text-xs text-muted-foreground opacity-40">0</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {fnLogs.p50 > 0
                            ? <span className={`text-xs font-mono ${latencyColor(fnLogs.p50)}`}>{fnLogs.p50}ms</span>
                            : <span className="text-xs text-muted-foreground opacity-40">—</span>}
                        </td>
                        <td className="py-2.5 pl-4 text-right">
                          {fnLogs.p95 > 0
                            ? <span className={`text-xs font-mono font-semibold ${latencyColor(fnLogs.p95)}`}>{fnLogs.p95}ms</span>
                            : <span className="text-xs text-muted-foreground opacity-40">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalRequests === 0 && !isLoading && (
              <p className="text-center text-xs text-muted-foreground mt-4 py-4">
                Aucune donnée de logs pour les dernières 24h.<br/>
                Les logs apparaîtront après les prochains appels aux edge functions.
              </p>
            )}
          </div>

          {/* Error log */}
          <div className={`rounded-2xl border p-5 mb-6 ${totalErrors > 0 ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Flame className={`w-4 h-4 ${totalErrors > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                Erreurs edge — dernières 24h
                {totalErrors > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold">{totalErrors}</span>
                )}
              </h2>
              <button onClick={() => refetchErrors()} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {totalErrors === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
                <p className="text-sm text-muted-foreground">Aucune erreur edge dans les dernières 24h. ✅</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {totalErrors} erreur{totalErrors > 1 ? "s" : ""} — tri par date desc
                </div>
                <div className="divide-y divide-border max-h-96 overflow-y-auto">
                  {errors.map((e) => (
                    <div key={e.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-destructive/10 text-destructive">
                            {e.fn}
                          </span>
                          {e.status_code && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">
                              HTTP {e.status_code}
                            </span>
                          )}
                          {e.latency_ms != null && (
                            <span className={`text-[10px] font-mono ${latencyColor(e.latency_ms)}`}>
                              {e.latency_ms}ms
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap shrink-0">
                          {formatDate(e.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground font-mono break-all">{e.message}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {e.request_id && (
                          <span className="text-[10px] text-muted-foreground/50 font-mono">req:{e.request_id}</span>
                        )}
                        {e.stack_hash && (
                          <span className="text-[10px] text-muted-foreground/50 font-mono">hash:{e.stack_hash}</span>
                        )}
                        {e.user_id && (
                          <span className="text-[10px] text-muted-foreground/50 font-mono">uid:{e.user_id.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer tip */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
            💡 <strong>Les logs apparaissent en &lt;1 min</strong> après un appel edge. Latence p95 &gt; 5s → investiguer.{" "}
            <Link to="/admin/runbook" className="text-primary hover:underline">Voir le runbook →</Link>
          </div>

        </div>
      </div>
    </>
  );
}
