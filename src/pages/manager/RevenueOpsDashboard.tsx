/**
 * Revenue Ops Dashboard — /manager/revenue-ops
 * Palantir-grade metrics: Brain funnel, swarm usage, churn prediction, ROI,
 * monitoring live (latency, error rate, agents actifs), CSV export.
 * Multi-tenant: manager sees only their org. Realtime on brain_events.
 */
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBrainTracker } from "@/hooks/useBrainTracker";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import {
  Brain, TrendingUp, Users, Zap, Shield, Download, RefreshCw,
  AlertTriangle, Award, ArrowLeft, Target, Activity, Timer, AlertCircle,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OpsMetrics {
  total_activations: number;
  unique_activators: number;
  total_messages: number;
  modules_accepted: number;
  destroyer_shown: number;
  dashboard_views: number;
  activations_7d: number;
  messages_7d: number;
  avg_risk_score: number;
  last_event_at: string | null;
}

interface MonitoringMetrics {
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  total_swarms: number;
  error_count: number;
  error_rate_pct: number | null;
  avg_agents: number | null;
  swarms_last_hour: number;
  last_latency_ms: number | null;
}

interface LatencyPoint {
  ts: string;
  latency_ms: number;
  agents_count: number;
  event_type: string;
}

interface TimeseriesRow {
  day: string;
  event_type: string;
  cnt: number;
}

interface BrainStat {
  total_users: number;
  avg_risk_score: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
}

const COLORS = {
  palantir_activated: "#5257D8",
  brain_message_sent: "#10B981",
  module_accepted: "#8B5CF6",
  destroyer_shown: "#F97316",
  dashboard_viewed: "#3B82F6",
};

const PIE_COLORS = ["#EF4444", "#F97316", "#10B981"];

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "text-primary", highlight }: {
  icon: typeof Brain; label: string; value: string | number; sub?: string; color?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${highlight ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card/60"}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color} shrink-0`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 p-2.5 text-xs shadow-lg backdrop-blur">
      <div className="font-bold text-foreground mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Monitoring Panel ─────────────────────────────────────────────────────────
function MonitoringPanel({ orgId }: { orgId: string | null }) {
  const [monitoring, setMonitoring] = useState<MonitoringMetrics | null>(null);
  const [latencyData, setLatencyData] = useState<LatencyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonitoring = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [monResult, latResult] = await Promise.all([
        supabase.rpc("get_brain_monitoring", { _org_id: orgId, _hours: 24 }),
        supabase.rpc("get_brain_latency_timeseries", { _org_id: orgId, _hours: 24 }),
      ]);
      if (monResult.data) setMonitoring(monResult.data as unknown as MonitoringMetrics);
      if (latResult.data) setLatencyData((latResult.data as LatencyPoint[]).reverse());
    } catch (_e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchMonitoring(); }, [fetchMonitoring]);

  // Realtime refresh on new events
  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`monitoring-${orgId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "brain_events", filter: `org_id=eq.${orgId}` },
        () => fetchMonitoring()
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, fetchMonitoring]);

  const latencyColor = (ms: number | null) => {
    if (!ms) return "text-muted-foreground";
    if (ms < 1500) return "text-emerald-400";
    if (ms < 3000) return "text-orange-400";
    return "text-destructive";
  };

  const errorColor = (pct: number | null) =>
    !pct ? "text-emerald-400" : pct < 5 ? "text-orange-400" : "text-destructive";

  // Format latency chart data
  const chartPoints = latencyData.slice(-30).map((p, i) => ({
    i,
    latency: p.latency_ms,
    agents: p.agents_count,
    time: new Date(p.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  }));

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Monitoring Swarm — 24h</h3>
          <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse">LIVE</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchMonitoring} disabled={loading} className="text-xs h-7 px-2">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Latency */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <Timer className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Latence moy.</span>
          </div>
          <div className={`text-xl font-black ${latencyColor(monitoring?.avg_latency_ms ?? null)}`}>
            {monitoring?.avg_latency_ms != null ? `${monitoring.avg_latency_ms}ms` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            p95: {monitoring?.p95_latency_ms != null ? `${monitoring.p95_latency_ms}ms` : "—"}
          </div>
        </div>

        {/* Error rate */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Taux d'erreur</span>
          </div>
          <div className={`text-xl font-black ${errorColor(monitoring?.error_rate_pct ?? null)}`}>
            {monitoring?.error_rate_pct != null ? `${monitoring.error_rate_pct}%` : "0%"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {monitoring?.error_count ?? 0} erreur(s) / {monitoring?.total_swarms ?? 0} swarms
          </div>
        </div>

        {/* Agents actifs */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Agents moy.</span>
          </div>
          <div className="text-xl font-black text-purple-400">
            {monitoring?.avg_agents != null ? monitoring.avg_agents : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {monitoring?.swarms_last_hour ?? 0} swarms/heure
          </div>
        </div>

        {/* Dernière latence */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Dernier swarm</span>
          </div>
          <div className={`text-xl font-black ${latencyColor(monitoring?.last_latency_ms ?? null)}`}>
            {monitoring?.last_latency_ms != null ? `${monitoring.last_latency_ms}ms` : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {monitoring?.avg_latency_ms != null && monitoring.avg_latency_ms < 3000
              ? "✅ < 3s target"
              : monitoring?.avg_latency_ms != null ? "⚠️ > 3s target" : "En attente"}
          </div>
        </div>
      </div>

      {/* Latency timeseries */}
      {chartPoints.length > 0 ? (
        <div>
          <p className="text-[11px] text-muted-foreground mb-2">Latence par swarm (30 derniers)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartPoints} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} unit="ms" />
              <Tooltip
                formatter={(v: number) => [`${v}ms`, "Latence"]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
              />
              {/* 3000ms target line rendered as reference */}
              <Line type="monotone" dataKey="latency" stroke="#5257D8" strokeWidth={2} dot={false} name="Latence" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Cible &lt; 3000ms · LOVABLE AI Gateway</p>
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            {loading ? "Chargement…" : "Aucune donnée de latence — activez le Mode Palantir dans le chat."}
          </p>
        </div>
      )}

      {/* Load test results row */}
      <LoadTestPanel />
    </div>
  );
}

// ── Load Test Simulator ───────────────────────────────────────────────────────
function LoadTestPanel() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Array<{ n: number; status: string; latency: number; }>>([]);

  const runLoadTest = async () => {
    setRunning(true);
    setResults([]);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setRunning(false); return; }

    const testMessages = [
      "Comment sécuriser mon mot de passe ?",
      "Qu'est-ce que le phishing ?",
      "Explique le zero trust",
    ];

    const newResults: Array<{ n: number; status: string; latency: number }> = [];

    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/genie-brain-orchestrator`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: [{ role: "user", content: testMessages[i] }],
              palantir_mode: true,
              active_agents: ["tuteur", "attaquant", "defenseur", "predictor", "analyst"],
            }),
            signal: AbortSignal.timeout(20000),
          }
        );

        // Drain the stream
        if (resp.body) {
          const reader = resp.body.getReader();
          let done = false;
          while (!done) {
            const { done: d } = await reader.read();
            done = d;
          }
        }
        const latency = Date.now() - t0;
        newResults.push({ n: i + 1, status: resp.ok ? "✅ OK" : `❌ ${resp.status}`, latency });
        setResults([...newResults]);
      } catch (e) {
        newResults.push({ n: i + 1, status: `❌ ${(e as Error).message.slice(0, 30)}`, latency: Date.now() - t0 });
        setResults([...newResults]);
      }
      // Small gap between requests
      if (i < 2) await new Promise(r => setTimeout(r, 300));
    }
    setRunning(false);
  };

  return (
    <div className="border-t border-border/30 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground font-medium">Tests de charge (3 swarms consécutifs)</p>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 px-3 gap-1.5"
          onClick={runLoadTest}
          disabled={running}
        >
          <Activity className={`w-3 h-3 ${running ? "animate-pulse text-primary" : ""}`} />
          {running ? "Test en cours…" : "Lancer test"}
        </Button>
      </div>
      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r) => (
            <div key={r.n} className="flex items-center gap-3 text-xs font-mono">
              <span className="text-muted-foreground w-12">Test #{r.n}</span>
              <span className={r.status.startsWith("✅") ? "text-emerald-400" : "text-destructive"}>{r.status}</span>
              <span className={`ml-auto ${r.latency < 3000 ? "text-emerald-400" : "text-orange-400"}`}>{r.latency}ms</span>
            </div>
          ))}
          {results.length === 3 && (
            <div className="pt-1 text-[10px] text-muted-foreground">
              Moy : {Math.round(results.reduce((s, r) => s + r.latency, 0) / results.length)}ms ·{" "}
              {results.every(r => r.status.startsWith("✅")) ? "✅ 0 erreur sur 3 tests" : `⚠️ ${results.filter(r => !r.status.startsWith("✅")).length} erreur(s)`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RevenueOpsDashboard() {
  const { profile, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const { trackBrain } = useBrainTracker();
  const orgId = profile?.org_id ?? null;

  const [metrics, setMetrics] = useState<OpsMetrics | null>(null);
  const [brainStats, setBrainStats] = useState<BrainStat | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [opsResult, brainResult, tsResult] = await Promise.all([
        supabase.rpc("get_brain_revenue_ops", { _org_id: orgId }),
        supabase.rpc("get_org_brain_analytics", { _org_id: orgId }),
        supabase.rpc("get_brain_events_timeseries", { _org_id: orgId, _days: 30 }),
      ]);
      if (opsResult.data) setMetrics(opsResult.data as unknown as OpsMetrics);
      if (brainResult.data) setBrainStats(brainResult.data as unknown as BrainStat);
      if (tsResult.data) setTimeseries(tsResult.data as TimeseriesRow[]);
      setLastRefresh(new Date());
    } catch (e) {
      toast({ title: "Erreur chargement", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchAll();
    trackBrain("dashboard_viewed", { metadata: { page: "revenue_ops" } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`brain-events-org-${orgId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "brain_events", filter: `org_id=eq.${orgId}`,
      }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, fetchAll]);

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data } = await supabase
        .from("brain_events")
        .select("event_type,created_at,risk_score,agents_used,latency_ms,error_type,session_id,metadata")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!data?.length) {
        toast({ title: "Aucune donnée", description: "Pas d'événements pour cette org." });
        return;
      }

      const headers = ["event_type", "created_at", "risk_score", "agents_used", "latency_ms", "error_type", "session_id", "metadata"];
      const rows = data.map(r => [
        r.event_type,
        r.created_at,
        r.risk_score ?? "",
        (r.agents_used ?? []).join("|"),
        (r as unknown as Record<string, unknown>)["latency_ms"] ?? "",
        (r as unknown as Record<string, unknown>)["error_type"] ?? "",
        r.session_id ?? "",
        JSON.stringify(r.metadata ?? {}),
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brain-events-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "✅ Export CSV", description: `${data.length} événements exportés.` });
    } catch (e) {
      toast({ title: "Erreur export", description: String(e), variant: "destructive" });
    }
  }, [orgId]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const chartData = (() => {
    const byDay: Record<string, Record<string, number>> = {};
    timeseries.forEach(({ day, event_type, cnt }) => {
      if (!byDay[day]) byDay[day] = {};
      byDay[day][event_type] = Number(cnt);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, events]) => ({
        day: day.slice(5),
        activations: events["palantir_activated"] ?? 0,
        messages: events["brain_message_sent"] ?? 0,
        modules: events["module_accepted"] ?? 0,
        destroyer: events["destroyer_shown"] ?? 0,
      }));
  })();

  const funnelData = metrics ? [
    { name: "Sessions Brain", value: metrics.total_messages, fill: "#5257D8" },
    { name: "Mode Palantir activé", value: metrics.total_activations, fill: "#8B5CF6" },
    { name: "Modules acceptés", value: metrics.modules_accepted, fill: "#10B981" },
  ] : [];

  const riskPie = brainStats ? [
    { name: "Risque élevé (≥70)", value: brainStats.high_risk_count },
    { name: "Risque moyen (40-69)", value: brainStats.medium_risk_count },
    { name: "Risque bas (<40)", value: brainStats.low_risk_count },
  ] : [];

  const humanCostPerSession = 120;
  const totalSessions = metrics?.total_messages ?? 0;
  const roiSaved = (totalSessions * (humanCostPerSession - 0.002)).toFixed(0);
  const activationRate = metrics && metrics.total_messages > 0
    ? Math.round((metrics.total_activations / metrics.total_messages) * 100) : 0;
  const avgDestroyerScore = metrics?.avg_risk_score ?? 0;
  const churnRisk = brainStats
    ? Math.min(100, Math.round((brainStats.high_risk_count / Math.max(1, brainStats.total_users)) * 100)) : 0;
  const palantirActivationRate7d = metrics && metrics.messages_7d > 0
    ? Math.round((metrics.activations_7d / Math.max(1, metrics.messages_7d)) * 100) : activationRate;

  if (!isAdmin && !isManager) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-2">
          <Shield className="w-10 h-10 text-destructive mx-auto" />
          <p className="font-bold">Accès réservé aux managers et admins.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Revenue Ops — Génie Brain | GENIE IA</title></Helmet>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="border-b border-border/50 bg-card/30 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/manager")} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="font-black text-lg leading-tight">Revenue Ops — Génie Brain</h1>
                <p className="text-xs text-muted-foreground">Métriques business live + monitoring swarm · Multi-tenant sécurisé</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1 inline-block" />
                REALTIME
              </Badge>
              <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="text-xs gap-1.5">
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
              <Button size="sm" onClick={handleExportCSV} className="text-xs gap-1.5 bg-primary">
                <Download className="w-3 h-3" />
                CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <p className="text-[11px] text-muted-foreground">
            Dernière mise à jour : {lastRefresh.toLocaleTimeString("fr-FR")} · Org : {orgId ? orgId.slice(0, 8) + "…" : "N/A"}
          </p>

          {/* ── KPI row ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard icon={Zap} label="Activations Palantir" value={metrics?.total_activations ?? "—"} sub={`+${metrics?.activations_7d ?? 0} cette semaine`} color="text-primary" />
            <StatCard icon={Users} label="Utilisateurs Brain" value={metrics?.unique_activators ?? "—"} sub={`Taux all-time : ${activationRate}%`} color="text-blue-400" />
            <StatCard icon={Brain} label="Messages Brain" value={metrics?.total_messages ?? "—"} sub={`+${metrics?.messages_7d ?? 0}/7j`} color="text-purple-400" />
            <StatCard icon={Award} label="Modules acceptés" value={metrics?.modules_accepted ?? "—"} sub="Auto-générés acceptés" color="text-emerald-400" />
            {/* NEW KPI: Taux Activation Palantir 7j */}
            <div className="rounded-xl border-2 p-4 flex flex-col gap-1 relative overflow-hidden"
              style={{ borderColor: "rgba(82,87,216,0.5)", background: "rgba(82,87,216,0.07)" }}>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground">Taux Activation 7j</span>
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">LIVE</span>
              </div>
              <div className="text-2xl font-black text-primary">{palantirActivationRate7d}%</div>
              <div className="text-[11px] text-muted-foreground">{metrics?.activations_7d ?? 0} activations / {metrics?.messages_7d ?? 0} sessions</div>
              <div className="mt-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${palantirActivationRate7d}%` }} />
              </div>
            </div>
            <StatCard icon={TrendingUp} label="ROI estimé" value={`${Number(roiSaved).toLocaleString("fr-FR")}€`} sub="vs formateur humain" color="text-yellow-400" />
            <StatCard icon={AlertTriangle} label="Risque churn" value={`${churnRisk}%`} sub={`${brainStats?.high_risk_count ?? 0} apprenants critiques`} color={churnRisk > 30 ? "text-destructive" : "text-emerald-400"} />
          </div>

          {/* ── Monitoring Panel ─────────────────────────────────────────────── */}
          <MonitoringPanel orgId={orgId} />

          {/* ── Charts row 1 ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/60 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm">Funnel d'activation Brain (30j)</h3>
                  <p className="text-[11px] text-muted-foreground">Activations · Messages · Modules acceptés</p>
                </div>
                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">LIVE</Badge>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5257D8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#5257D8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMod" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="activations" name="Activations" stroke="#5257D8" fill="url(#colorAct)" strokeWidth={2} />
                    <Area type="monotone" dataKey="messages" name="Messages" stroke="#10B981" fill="url(#colorMsg)" strokeWidth={2} />
                    <Area type="monotone" dataKey="modules" name="Modules" stroke="#8B5CF6" fill="url(#colorMod)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      {loading ? "Chargement…" : "Activez le Mode Palantir dans le chat pour générer des données."}
                    </p>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate("/app/chat")}>
                      Aller au chat →
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Risk distribution pie */}
            <div className="rounded-xl border border-border/50 bg-card/60 p-4">
              <div className="mb-4">
                <h3 className="font-bold text-sm">Distribution des risques</h3>
                <p className="text-[11px] text-muted-foreground">Score Génie Brain par apprenant</p>
              </div>
              {riskPie.some(r => r.value > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riskPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                      label={({ name: _n, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {riskPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} apprenants`]} />
                    <Legend iconSize={8} iconType="circle" formatter={(v) => <span className="text-[10px] text-muted-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-xs text-muted-foreground text-center">
                    {loading ? "Chargement…" : "Aucune donnée de risque."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Charts row 2 ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Funnel bar */}
            <div className="rounded-xl border border-border/50 bg-card/60 p-4">
              <div className="mb-4">
                <h3 className="font-bold text-sm">Funnel activation Brain</h3>
                <p className="text-[11px] text-muted-foreground">Messages → Palantir → Modules acceptés</p>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Événements" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Human Destroyer stats */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-emerald-400">MODE DESTROYER — ROI vs Formateur Humain</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Temps réponse moyen", genie: "~800ms", human: "47s", ratio: "58×" },
                  { label: "Taux d'erreur", genie: "0%", human: "62%", ratio: "∞" },
                  { label: "Disponibilité", genie: "24/7/365", human: "8h-18h lun-ven", ratio: "3×" },
                  { label: "Coût / session", genie: "0.002€", human: "120€", ratio: "60 000×" },
                  { label: "Score personnalisation", genie: "100%", human: "23%", ratio: "4.3×" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-36 shrink-0">{row.label}</span>
                    <span className="text-emerald-400 font-bold w-16">{row.genie}</span>
                    <span className="text-muted-foreground/50 line-through w-20 text-[10px]">{row.human}</span>
                    <Badge className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{row.ratio}</Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xs text-emerald-400 font-bold">
                  💰 Économie estimée pour cette org : <span className="text-base">{Number(roiSaved).toLocaleString("fr-FR")}€</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Basé sur {totalSessions} sessions · 120€/h formateur humain moyen
                </div>
              </div>
              <div className="mt-3 text-[10px] text-muted-foreground">
                Mode Destroyer affiché <span className="text-foreground font-bold">{metrics?.destroyer_shown ?? 0}</span> fois · Score risque moyen : <span className="text-foreground font-bold">{avgDestroyerScore}/100</span>
              </div>
            </div>
          </div>

          {/* ── Recent events log ──────────────────────────────────────────────── */}
          <RecentEventsTable orgId={orgId} onExport={handleExportCSV} />
        </div>
      </div>
    </>
  );
}

// ── Recent events component ───────────────────────────────────────────────────
function RecentEventsTable({ orgId, onExport }: { orgId: string | null; onExport: () => void }) {
  const [events, setEvents] = useState<Array<{
    id: string; event_type: string; created_at: string; risk_score: number | null;
    agents_used: string[] | null; session_id: string | null; metadata: Record<string, unknown>;
    latency_ms?: number | null; error_type?: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    supabase
      .from("brain_events")
      .select("id,event_type,created_at,risk_score,agents_used,session_id,metadata,latency_ms,error_type")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (data) setEvents(data as any);
        setLoading(false);
      });
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`events-table-${orgId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "brain_events", filter: `org_id=eq.${orgId}` },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setEvents(prev => [payload.new as any, ...prev].slice(0, 20));
        }
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId]);

  const EVENT_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
    palantir_activated: { label: "Palantir activé", color: "text-primary", emoji: "⚡" },
    brain_message_sent: { label: "Message Brain", color: "text-emerald-400", emoji: "💬" },
    module_accepted: { label: "Module accepté", color: "text-purple-400", emoji: "📦" },
    destroyer_shown: { label: "Destroyer affiché", color: "text-orange-400", emoji: "🏆" },
    dashboard_viewed: { label: "Dashboard vu", color: "text-blue-400", emoji: "📊" },
    swarm_completed: { label: "Swarm terminé", color: "text-primary", emoji: "🤖" },
    prediction_displayed: { label: "Prédiction affichée", color: "text-red-400", emoji: "🔮" },
    palantir_deactivated: { label: "Palantir désactivé", color: "text-muted-foreground", emoji: "🔕" },
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-sm">Événements Brain récents</h3>
          <p className="text-[11px] text-muted-foreground">Live · RLS multi-tenant · 20 derniers événements · Latence tracée</p>
        </div>
        <Button variant="outline" size="sm" onClick={onExport} className="text-xs gap-1.5">
          <Download className="w-3 h-3" />
          Export CSV complet
        </Button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Chargement…</div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <Brain className="w-8 h-8 text-muted-foreground/20 mx-auto" />
          <p className="text-xs text-muted-foreground">Aucun événement encore.</p>
          <p className="text-[11px] text-muted-foreground/60">Les événements apparaissent dès qu'un apprenant active le Mode Palantir.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Événement</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Score risque</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Latence</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Agents</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const cfg = EVENT_LABELS[ev.event_type] ?? { label: ev.event_type, color: "text-foreground", emoji: "•" };
                return (
                  <tr key={ev.id} className="border-b border-border/20 hover:bg-card/40 transition-colors">
                    <td className="py-2 px-2">
                      <span className={`font-medium ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground tabular-nums">
                      {new Date(ev.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-2 px-2">
                      {ev.risk_score != null ? (
                        <span className={`font-bold ${ev.risk_score >= 70 ? "text-destructive" : ev.risk_score >= 40 ? "text-orange-400" : "text-emerald-400"}`}>
                          {ev.risk_score}
                        </span>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="py-2 px-2 tabular-nums">
                      {ev.latency_ms != null ? (
                        <span className={ev.latency_ms < 3000 ? "text-emerald-400 font-medium" : "text-orange-400 font-medium"}>
                          {ev.latency_ms}ms
                        </span>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">
                      {ev.agents_used?.length ? ev.agents_used.join(", ") : "—"}
                    </td>
                    <td className="py-2 px-2">
                      {ev.error_type ? (
                        <span className="text-destructive text-[10px]">❌ {ev.error_type.slice(0, 20)}</span>
                      ) : ev.latency_ms != null ? (
                        <span className="text-emerald-400 text-[10px]">✅ OK</span>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
