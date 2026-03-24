/**
 * Revenue Ops Dashboard — /manager/revenue-ops
 * Billing Stripe réel : MRR, ARR, ARPU, liste factures, checkout sièges.
 * Métriques Brain : funnel activation, monitoring swarm, churn, ROI.
 * Multi-tenant RLS strict : manager voit uniquement son org.
 * Realtime sur brain_events + org_invoices.
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
  Cpu, CreditCard, DollarSign, FileText, ExternalLink, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
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

interface BillingMetrics {
  mrr_cents: number;
  arr_cents: number;
  total_revenue_cents: number;
  invoices_this_month: number;
  invoices_paid_total: number;
  invoices_open: number;
  last_invoice_at: string | null;
  mrr_30d_cents: number;
  org_name: string;
  org_plan: string;
  seats_max: number;
}

interface OrgInvoice {
  id: string;
  stripe_invoice_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  description: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  invoice_pdf_url: string | null;
  hosted_invoice_url: string | null;
  seats: number | null;
  created_at: string;
}

interface BillingPoint {
  day: string;
  revenue_cents: number;
  invoice_count: number;
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

interface BrainStat {
  total_users: number;
  avg_risk_score: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
}

interface TimeseriesRow { day: string; event_type: string; cnt: number; }
interface LatencyPoint { ts: string; latency_ms: number; agents_count: number; }

const PIE_COLORS = ["#EF4444", "#F97316", "#10B981"];
// Prix unique fixe : 59€ TTC/mois
const PLAN_PRICE: Record<string, number> = { business: 59, compliance: 59, pro: 59, free: 0 };

// ── Helpers ────────────────────────────────────────────────────────────────────
const euros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const statusBadge = (status: string) => {
  switch (status) {
    case "paid": return <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">✅ Payée</Badge>;
    case "open": return <Badge className="text-[9px] bg-orange-500/10 text-orange-400 border-orange-500/30">⏳ En attente</Badge>;
    case "draft": return <Badge className="text-[9px] bg-muted/30 text-muted-foreground border-border/40">📝 Brouillon</Badge>;
    case "void": return <Badge className="text-[9px] bg-muted/30 text-muted-foreground border-border/40">Annulée</Badge>;
    default: return <Badge className="text-[9px]">{status}</Badge>;
  }
};

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "text-primary", highlight, onClick }: {
  icon: typeof Brain; label: string; value: string | number; sub?: string;
  color?: string; highlight?: boolean; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 flex flex-col gap-1 transition-colors ${highlight ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card/60"} ${onClick ? "cursor-pointer hover:border-primary/40" : ""}`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color} shrink-0`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: string;
}) {
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

// ── Billing Section ────────────────────────────────────────────────────────────
function BillingSection({ orgId }: { orgId: string | null }) {
  const [billing, setBilling] = useState<BillingMetrics | null>(null);
  const [invoices, setInvoices] = useState<OrgInvoice[]>([]);
  const [timeseries, setTimeseries] = useState<BillingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [seatsInput, setSeatsInput] = useState(1);
  const navigate = useNavigate();

  const fetchBilling = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [bilRes, invRes, tsRes] = await Promise.all([
        supabase.rpc("get_org_billing_metrics", { _org_id: orgId }),
        supabase.rpc("get_org_invoices_list", { _org_id: orgId, _limit: 10, _offset: 0 }),
        supabase.rpc("get_billing_timeseries", { _org_id: orgId, _days: 90 }),
      ]);
      if (bilRes.data)  setBilling(bilRes.data as unknown as BillingMetrics);
      if (invRes.data)  setInvoices(invRes.data as OrgInvoice[]);
      if (tsRes.data)   setTimeseries(tsRes.data as BillingPoint[]);
    } catch (e) {
      toast({ title: "Erreur billing", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  // Realtime on org_invoices
  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`billing-${orgId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "org_invoices" },
        () => fetchBilling()
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, fetchBilling]);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { seats: seatsInput },
      });
      if (error || !data?.url) throw new Error(error?.message ?? "Checkout indisponible");
      window.open(data.url, "_blank");
    } catch (e) {
      toast({ title: "Erreur checkout", description: String(e), variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session");
      if (error || !data?.url) throw new Error(error?.message ?? "Portail indisponible");
      window.open(data.url, "_blank");
    } catch (e) {
      toast({ title: "Erreur portail", description: String(e), variant: "destructive" });
    }
  };

  const handleExportInvoicesCSV = () => {
    if (!invoices.length) {
      toast({ title: "Aucune facture", description: "Pas de facture à exporter." });
      return;
    }
    const headers = ["id", "stripe_invoice_id", "amount_eur", "currency", "status", "description", "period_start", "period_end", "paid_at", "seats", "created_at"];
    const rows = invoices.map(i => [
      i.id, i.stripe_invoice_id ?? "", (i.amount_cents / 100).toFixed(2),
      i.currency, i.status, i.description ?? "",
      i.period_start ? new Date(i.period_start).toLocaleDateString("fr-FR") : "",
      i.period_end   ? new Date(i.period_end).toLocaleDateString("fr-FR") : "",
      i.paid_at      ? new Date(i.paid_at).toLocaleDateString("fr-FR") : "",
      String(i.seats ?? 1), new Date(i.created_at).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `factures-formetoialia-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "✅ Export CSV factures", description: `${invoices.length} facture(s) exportée(s).` });
  };

  // Billing chart data
  const chartData = timeseries.map(p => ({
    day: new Date(p.day).toLocaleDateString("fr-FR", { month: "short", day: "numeric" }),
    revenue: p.revenue_cents / 100,
    invoices: p.invoice_count,
  }));

  const planPrice = PLAN_PRICE[billing?.org_plan ?? "free"] ?? 0;
  const seatsMax = billing?.seats_max ?? 1;
  const arpu = billing && billing.invoices_paid_total > 0
    ? (billing.total_revenue_cents / 100 / billing.invoices_paid_total).toFixed(0)
    : "—";

  return (
    <div className="space-y-4">
      {/* Billing KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-muted-foreground">MRR</span>
            <Badge className="ml-auto text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse">LIVE</Badge>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {loading ? "…" : euros(billing?.mrr_cents ?? 0)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            ARR : {euros((billing?.mrr_cents ?? 0) * 12)}
          </div>
        </div>

        <StatCard icon={TrendingUp} label="Revenue total" value={loading ? "…" : euros(billing?.total_revenue_cents ?? 0)} sub={`${billing?.invoices_paid_total ?? 0} factures payées`} color="text-primary" />
        <StatCard icon={Users} label="ARPU" value={loading ? "…" : `${arpu}€`} sub={`${seatsMax} sièges · Plan ${billing?.org_plan ?? "free"}`} color="text-blue-400" />
        <StatCard icon={FileText} label="En attente" value={loading ? "…" : billing?.invoices_open ?? 0} sub={`${billing?.invoices_this_month ?? 0} ce mois`} color={billing?.invoices_open ? "text-orange-400" : "text-emerald-400"} />
      </div>

      {/* Checkout + Portal row */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">Upgrade de plan / Ajouter des sièges</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Plan actuel : <strong className="text-foreground">{billing?.org_plan ?? "free"}</strong> ·
            {planPrice > 0 ? ` 59€ TTC/mois — jusqu'à 25 membres` : " Passez à Pro pour débloquer tout — 59€ TTC/mois"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Checkout Stripe sécurisé · 14j d'essai inclus · Annulation à tout moment
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 border border-border/50 rounded-lg px-2 py-1 bg-background/50">
            <span className="text-xs text-muted-foreground">Sièges :</span>
            <button onClick={() => setSeatsInput(s => Math.max(1, s - 1))} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground">−</button>
            <span className="font-bold text-sm w-5 text-center">{seatsInput}</span>
            <button onClick={() => setSeatsInput(s => Math.min(50, s + 1))} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground">+</button>
          </div>
          <Button
            size="sm"
            className="text-xs gap-1.5 bg-primary text-primary-foreground font-bold"
            onClick={handleUpgrade}
            disabled={checkoutLoading}
          >
            <Zap className="w-3 h-3" />
            {checkoutLoading ? "Ouverture…" : "Upgrade — 59€ TTC/mois"}
            <ChevronRight className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handlePortal}>
            <ExternalLink className="w-3 h-3" />
            Portail
          </Button>
        </div>
      </div>

      {/* Revenue chart + Invoice list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue timeseries */}
        <div className="rounded-xl border border-border/50 bg-card/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm">Revenus sur 90 jours</h3>
              <p className="text-[11px] text-muted-foreground">Factures payées · Courbe de croissance</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleExportInvoicesCSV} className="text-xs h-7 px-2 gap-1">
              <Download className="w-3 h-3" /> CSV
            </Button>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}€`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)}€`, "Revenue"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center">
              <div className="text-center space-y-2">
                <DollarSign className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  {loading ? "Chargement…" : "Aucun paiement encore. Cliquez sur « Upgrade » pour démarrer."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Invoice list */}
        <div className="rounded-xl border border-border/50 bg-card/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Factures récentes</h3>
            <Badge className="text-[9px] text-muted-foreground border-border/40">
              {invoices.length} facture(s)
            </Badge>
          </div>
          {loading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Chargement…</div>
          ) : invoices.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <FileText className="w-7 h-7 text-muted-foreground/20 mx-auto" />
              <p className="text-xs text-muted-foreground">Aucune facture.</p>
              <p className="text-[11px] text-muted-foreground/60">Les factures apparaissent automatiquement après chaque paiement Stripe.</p>
              <Button size="sm" variant="outline" className="text-xs mt-1" onClick={handleUpgrade} disabled={checkoutLoading}>
                <Zap className="w-3 h-3 mr-1" /> Créer un abonnement
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card/80 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{inv.description ?? `Abonnement · ${inv.seats ?? 1} siège(s)`}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("fr-FR") : new Date(inv.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div className="text-sm font-black text-emerald-400 shrink-0">{euros(inv.amount_cents)}</div>
                  {statusBadge(inv.status)}
                  {inv.hosted_invoice_url && (
                    <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {inv.invoice_pdf_url && (
                    <a href={inv.invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
                      <Download className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Monitoring Panel ───────────────────────────────────────────────────────────
function MonitoringPanel({ orgId }: { orgId: string | null }) {
  const [monitoring, setMonitoring] = useState<MonitoringMetrics | null>(null);
  const [latencyData, setLatencyData] = useState<LatencyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonitoring = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [monResult, latResult] = await Promise.all([
        supabase.from("brain_events").select("latency_ms,agents_count,error_type,created_at").eq("org_id", orgId).not("latency_ms", "is", null).order("created_at", { ascending: false }).limit(30),
        supabase.from("brain_events").select("latency_ms,agents_count,error_type,created_at").eq("org_id", orgId).not("latency_ms", "is", null).order("created_at", { ascending: false }).limit(100),
      ]);
      // Build monitoring metrics from raw data
      if (monResult.data && monResult.data.length > 0) {
        const rows = monResult.data as Array<{ latency_ms: number; agents_count: number | null; error_type: string | null; created_at: string }>;
        const latencies = rows.map(r => r.latency_ms).filter(Boolean).sort((a, b) => a - b);
        const errors = rows.filter(r => r.error_type).length;
        const sorted = [...latencies].sort((a, b) => a - b);
        setMonitoring({
          avg_latency_ms: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
          p95_latency_ms: sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : null,
          total_swarms: rows.length,
          error_count: errors,
          error_rate_pct: rows.length ? Math.round((errors / rows.length) * 100) : null,
          avg_agents: rows.length ? Math.round(rows.reduce((a, r) => a + (r.agents_count ?? 0), 0) / rows.length) : null,
          swarms_last_hour: rows.filter(r => new Date(r.created_at) > new Date(Date.now() - 3600000)).length,
          last_latency_ms: rows[0]?.latency_ms ?? null,
        });
      }
      if (latResult.data) {
        const pts = (latResult.data as Array<{ latency_ms: number; agents_count: number | null; created_at: string }>)
          .slice(0, 30).reverse().map(r => ({ ts: r.created_at, latency_ms: r.latency_ms, agents_count: r.agents_count ?? 0 }));
        setLatencyData(pts);
      }
    } catch (_e) { /* silent */ } finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { fetchMonitoring(); }, [fetchMonitoring]);
  useEffect(() => {
    if (!orgId) return;
    const ch = supabase.channel(`monitoring-${orgId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "brain_events", filter: `org_id=eq.${orgId}` },
        () => fetchMonitoring())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, fetchMonitoring]);

  const latencyColor = (ms: number | null) => !ms ? "text-muted-foreground" : ms < 1500 ? "text-emerald-400" : ms < 3000 ? "text-orange-400" : "text-destructive";
  const errorColor  = (pct: number | null) => !pct ? "text-emerald-400" : pct < 5 ? "text-orange-400" : "text-destructive";

  const chartPoints = latencyData.slice(-30).map((p, i) => ({
    i, latency: p.latency_ms, agents: p.agents_count,
    time: new Date(p.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  }));

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Monitoring Swarm — 24h</h3>
          <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse">LIVE</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchMonitoring} disabled={loading} className="h-7 px-2">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Timer, label: "Latence moy.", value: monitoring?.avg_latency_ms != null ? `${monitoring.avg_latency_ms}ms` : "—", sub: `p95: ${monitoring?.p95_latency_ms ?? "—"}ms`, color: latencyColor(monitoring?.avg_latency_ms ?? null) },
          { icon: AlertCircle, label: "Taux d'erreur", value: monitoring?.error_rate_pct != null ? `${monitoring.error_rate_pct}%` : "0%", sub: `${monitoring?.error_count ?? 0} erreur(s)`, color: errorColor(monitoring?.error_rate_pct ?? null) },
          { icon: Cpu, label: "Agents moy.", value: monitoring?.avg_agents ?? "—", sub: `${monitoring?.swarms_last_hour ?? 0} swarms/h`, color: "text-purple-400" },
          { icon: Zap, label: "Dernier swarm", value: monitoring?.last_latency_ms != null ? `${monitoring.last_latency_ms}ms` : "—", sub: monitoring?.avg_latency_ms != null && monitoring.avg_latency_ms < 3000 ? "✅ < 3s" : "⏳ En attente", color: latencyColor(monitoring?.last_latency_ms ?? null) },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="rounded-lg border border-border/40 bg-card/60 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <Icon className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
            <div className={`text-xl font-black ${color}`}>{String(value)}</div>
            <div className="text-[10px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>
      {chartPoints.length > 0 ? (
        <div>
          <p className="text-[11px] text-muted-foreground mb-2">Latence par swarm (30 derniers)</p>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={chartPoints} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} unit="ms" />
              <Tooltip formatter={(v: number) => [`${v}ms`, "Latence"]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              <Line type="monotone" dataKey="latency" stroke="#5257D8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-12 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">{loading ? "Chargement…" : "Activez le Mode Palantir dans le chat pour voir les métriques."}</p>
        </div>
      )}
    </div>
  );
}

// ── Recent events ──────────────────────────────────────────────────────────────
function RecentEventsTable({ orgId, onExport }: { orgId: string | null; onExport: () => void }) {
  const [events, setEvents] = useState<Array<{
    id: string; event_type: string; created_at: string; risk_score: number | null;
    agents_used: string[] | null; session_id: string | null;
    latency_ms?: number | null; error_type?: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    supabase.from("brain_events")
      .select("id,event_type,created_at,risk_score,agents_used,session_id,latency_ms,error_type")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setEvents(data as never); setLoading(false); });
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    const ch = supabase.channel(`ev-table-${orgId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "brain_events", filter: `org_id=eq.${orgId}` },
        (p) => setEvents(prev => [p.new as never, ...prev].slice(0, 20)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId]);

  const EV: Record<string, { label: string; color: string; emoji: string }> = {
    palantir_activated:       { label: "Palantir activé",    color: "text-primary",          emoji: "⚡" },
    brain_message_sent:       { label: "Message Brain",      color: "text-emerald-400",       emoji: "💬" },
    module_accepted:          { label: "Module accepté",     color: "text-purple-400",        emoji: "📦" },
    destroyer_shown:          { label: "Destroyer affiché",  color: "text-orange-400",        emoji: "🏆" },
    dashboard_viewed:         { label: "Dashboard vu",       color: "text-blue-400",          emoji: "📊" },
    swarm_completed:          { label: "Swarm terminé",      color: "text-primary",           emoji: "🤖" },
    payment_invoice_paid:     { label: "Paiement reçu",      color: "text-emerald-400",       emoji: "💳" },
    payment_checkout_completed:{ label: "Checkout Stripe",   color: "text-emerald-400",       emoji: "✅" },
    subscription_cancelled:   { label: "Abonnement annulé",  color: "text-destructive",       emoji: "❌" },
    payment_failed:           { label: "Paiement échoué",    color: "text-destructive",       emoji: "⚠️" },
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-sm">Événements Brain + Billing récents</h3>
          <p className="text-[11px] text-muted-foreground">Live · RLS multi-tenant · 20 derniers événements</p>
        </div>
        <Button variant="outline" size="sm" onClick={onExport} className="text-xs gap-1.5">
          <Download className="w-3 h-3" /> Export CSV
        </Button>
      </div>
      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Chargement…</div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <Brain className="w-8 h-8 text-muted-foreground/20 mx-auto" />
          <p className="text-xs text-muted-foreground">Aucun événement encore.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40">
                {["Événement", "Date", "Score risque", "Latence", "Agents", "Statut"].map(h => (
                  <th key={h} className="text-left py-2 px-2 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const cfg = EV[ev.event_type] ?? { label: ev.event_type, color: "text-foreground", emoji: "•" };
                return (
                  <tr key={ev.id} className="border-b border-border/20 hover:bg-card/40 transition-colors">
                    <td className="py-2 px-2"><span className={`font-medium ${cfg.color}`}>{cfg.emoji} {cfg.label}</span></td>
                    <td className="py-2 px-2 text-muted-foreground tabular-nums">
                      {new Date(ev.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-2 px-2">
                      {ev.risk_score != null ? (
                        <span className={`font-bold ${ev.risk_score >= 70 ? "text-destructive" : ev.risk_score >= 40 ? "text-orange-400" : "text-emerald-400"}`}>{ev.risk_score}</span>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="py-2 px-2 tabular-nums">
                      {ev.latency_ms != null
                        ? <span className={ev.latency_ms < 3000 ? "text-emerald-400 font-medium" : "text-orange-400 font-medium"}>{ev.latency_ms}ms</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{ev.agents_used?.length ? ev.agents_used.join(", ") : "—"}</td>
                    <td className="py-2 px-2">
                      {ev.error_type
                        ? <span className="text-destructive text-[10px]">❌ {ev.error_type.slice(0, 20)}</span>
                        : ev.latency_ms != null
                          ? <span className="text-emerald-400 text-[10px]">✅ OK</span>
                          : <span className="text-muted-foreground/40">—</span>}
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

// ── Main ───────────────────────────────────────────────────────────────────────
export default function RevenueOpsDashboard() {
  const { profile, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const { trackBrain } = useBrainTracker();
  const orgId = profile?.org_id ?? null;

  const [metrics, setMetrics]     = useState<OpsMetrics | null>(null);
  const [brainStats, setBrainStats] = useState<BrainStat | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [opsResult, brainResult, tsResult] = await Promise.all([
        supabase.rpc("get_brain_revenue_ops",    { _org_id: orgId }),
        supabase.rpc("get_org_brain_analytics",  { _org_id: orgId }),
        supabase.rpc("get_brain_events_timeseries", { _org_id: orgId, _days: 30 }),
      ]);
      if (opsResult.data)   setMetrics(opsResult.data   as unknown as OpsMetrics);
      if (brainResult.data) setBrainStats(brainResult.data as unknown as BrainStat);
      if (tsResult.data)    setTimeseries(tsResult.data as TimeseriesRow[]);
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

  // Realtime on brain_events
  useEffect(() => {
    if (!orgId) return;
    const ch = supabase.channel(`brain-rev-${orgId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "brain_events", filter: `org_id=eq.${orgId}` },
        () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, fetchAll]);

  // CSV export (brain_events)
  const handleExportCSV = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data } = await supabase
        .from("brain_events")
        .select("event_type,created_at,risk_score,agents_used,latency_ms,error_type,session_id,metadata")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (!data?.length) { toast({ title: "Aucune donnée" }); return; }
      const headers = ["event_type","created_at","risk_score","agents_used","latency_ms","error_type","session_id","metadata"];
      const rows = data.map(r => [
        r.event_type, r.created_at, r.risk_score ?? "",
        (r.agents_used ?? []).join("|"),
        (r as never as Record<string,unknown>)["latency_ms"] ?? "",
        (r as never as Record<string,unknown>)["error_type"] ?? "",
        r.session_id ?? "", JSON.stringify(r.metadata ?? {}),
      ]);
      const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `brain-events-${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "✅ Export CSV", description: `${data.length} événements exportés.` });
    } catch (e) {
      toast({ title: "Erreur export", description: String(e), variant: "destructive" });
    }
  }, [orgId]);

  // Derived
  const chartData = (() => {
    const byDay: Record<string, Record<string, number>> = {};
    timeseries.forEach(({ day, event_type, cnt }) => {
      if (!byDay[day]) byDay[day] = {};
      byDay[day][event_type] = Number(cnt);
    });
    return Object.entries(byDay).sort(([a],[b]) => a.localeCompare(b)).map(([day, ev]) => ({
      day: day.slice(5),
      activations: ev["palantir_activated"] ?? 0,
      messages:    ev["brain_message_sent"] ?? 0,
      modules:     ev["module_accepted"]    ?? 0,
    }));
  })();

  const funnelData = metrics ? [
    { name: "Sessions Brain", value: metrics.total_messages, fill: "#5257D8" },
    { name: "Mode Palantir", value: metrics.total_activations, fill: "#8B5CF6" },
    { name: "Modules acceptés", value: metrics.modules_accepted, fill: "#10B981" },
  ] : [];

  const riskPie = brainStats ? [
    { name: "Risque élevé (≥70)", value: brainStats.high_risk_count },
    { name: "Risque moyen (40-69)", value: brainStats.medium_risk_count },
    { name: "Risque bas (<40)", value: brainStats.low_risk_count },
  ] : [];

  const totalSessions  = metrics?.total_messages ?? 0;
  const roiSaved       = (totalSessions * (120 - 0.002)).toFixed(0);
  const activationRate = metrics && metrics.total_messages > 0
    ? Math.round((metrics.total_activations / metrics.total_messages) * 100) : 0;
  const palantirRate7d = metrics && metrics.messages_7d > 0
    ? Math.round((metrics.activations_7d / Math.max(1, metrics.messages_7d)) * 100) : activationRate;
  const churnRisk = brainStats
    ? Math.min(100, Math.round((brainStats.high_risk_count / Math.max(1, brainStats.total_users)) * 100)) : 0;

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
      <Helmet><title>Revenue Ops — Formetoialia Brain</title></Helmet>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="border-b border-border/50 bg-card/30 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/manager")} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="font-black text-lg leading-tight">Revenue Ops — Génie Brain</h1>
                <p className="text-xs text-muted-foreground">Billing Stripe réel · Brain funnel · Monitoring swarm · Multi-tenant RLS</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1 inline-block" />REALTIME
              </Badge>
              <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="text-xs gap-1.5">
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" onClick={handleExportCSV} className="text-xs gap-1.5 bg-primary">
                <Download className="w-3 h-3" />CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
          <p className="text-[11px] text-muted-foreground">
            Dernière MAJ : {lastRefresh.toLocaleTimeString("fr-FR")} · Org : {orgId ? orgId.slice(0,8)+"…" : "N/A"}
          </p>

          {/* ── 1. BILLING STRIPE RÉEL ─────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <h2 className="font-black text-base">💳 Billing Stripe — Revenue Réel</h2>
            </div>
            <BillingSection orgId={orgId} />
          </section>

          {/* ── 2. BRAIN KPIS ─────────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <h2 className="font-black text-base">🧠 KPIs Brain & Activation</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatCard icon={Zap}         label="Activations Palantir" value={metrics?.total_activations ?? "—"} sub={`+${metrics?.activations_7d ?? 0}/7j`} color="text-primary" />
              <StatCard icon={Users}       label="Utilisateurs Brain"   value={metrics?.unique_activators ?? "—"} sub={`Taux : ${activationRate}%`}           color="text-blue-400" />
              <StatCard icon={Brain}       label="Messages Brain"       value={metrics?.total_messages ?? "—"}    sub={`+${metrics?.messages_7d ?? 0}/7j`}      color="text-purple-400" />
              <StatCard icon={Award}       label="Modules acceptés"     value={metrics?.modules_accepted ?? "—"} sub="Auto-générés"                             color="text-emerald-400" />
              {/* KPI taux activation 7j */}
              <div className="rounded-xl border-2 p-4 flex flex-col gap-1 relative overflow-hidden" style={{ borderColor: "rgba(82,87,216,0.5)", background: "rgba(82,87,216,0.07)" }}>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">Taux Activation 7j</span>
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">LIVE</span>
                </div>
                <div className="text-2xl font-black text-primary">{palantirRate7d}%</div>
                <div className="text-[11px] text-muted-foreground">{metrics?.activations_7d ?? 0} / {metrics?.messages_7d ?? 0} sessions</div>
                <div className="mt-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${palantirRate7d}%` }} />
                </div>
              </div>
              <StatCard icon={TrendingUp}  label="ROI estimé"   value={`${Number(roiSaved).toLocaleString("fr-FR")}€`} sub="vs formateur humain"                  color="text-yellow-400" />
              <StatCard icon={AlertTriangle} label="Risque churn" value={`${churnRisk}%`} sub={`${brainStats?.high_risk_count ?? 0} critiques`} color={churnRisk > 30 ? "text-destructive" : "text-emerald-400"} />
            </div>
          </section>

          {/* ── 3. MONITORING SWARM ────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="font-black text-base">⚡ Monitoring Swarm Live</h2>
            </div>
            <MonitoringPanel orgId={orgId} />
          </section>

          {/* ── 4. CHARTS ──────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="font-black text-base">📊 Graphiques d'Activation</h2>
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
                        <linearGradient id="cA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5257D8" stopOpacity={0.4} /><stop offset="95%" stopColor="#5257D8" stopOpacity={0} /></linearGradient>
                        <linearGradient id="cM" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.4} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                        <linearGradient id="cMo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} /><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="activations" name="Activations" stroke="#5257D8" fill="url(#cA)" strokeWidth={2} />
                      <Area type="monotone" dataKey="messages"    name="Messages"    stroke="#10B981" fill="url(#cM)" strokeWidth={2} />
                      <Area type="monotone" dataKey="modules"     name="Modules"     stroke="#8B5CF6" fill="url(#cMo)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground">{loading ? "Chargement…" : "Activez le Mode Palantir pour générer des données."}</p>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate("/app/chat")}>Aller au chat →</Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/50 bg-card/60 p-4">
                <div className="mb-4">
                  <h3 className="font-bold text-sm">Distribution des risques</h3>
                  <p className="text-[11px] text-muted-foreground">Score Génie Brain par apprenant</p>
                </div>
                {riskPie.some(r => r.value > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={riskPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {riskPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} apprenants`]} />
                      <Legend iconSize={8} iconType="circle" formatter={(v) => <span className="text-[10px] text-muted-foreground">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">{loading ? "Chargement…" : "Aucune donnée."}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/50 bg-card/60 p-4">
                <div className="mb-4">
                  <h3 className="font-bold text-sm">Funnel activation Brain</h3>
                  <p className="text-[11px] text-muted-foreground">Messages → Palantir → Modules</p>
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

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-emerald-400">ROI vs Formateur Humain</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Temps réponse", jarvis: "~800ms",   human: "47s",          ratio: "58×" },
                    { label: "Taux d'erreur",  jarvis: "0%",       human: "62%",          ratio: "∞" },
                    { label: "Disponibilité",  jarvis: "24/7/365", human: "8h-18h lun-v", ratio: "3×" },
                    { label: "Coût/session",   jarvis: "0.002€",   human: "120€",         ratio: "60k×" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-28 shrink-0">{row.label}</span>
                      <span className="text-emerald-400 font-bold w-16">{row.jarvis}</span>
                      <span className="text-muted-foreground/50 line-through w-20 text-[10px]">{row.human}</span>
                      <Badge className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{row.ratio}</Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs text-emerald-400 font-bold">
                    💰 Économie estimée : <span className="text-base">{Number(roiSaved).toLocaleString("fr-FR")}€</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{totalSessions} sessions · 120€/h humain</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 5. EVENTS LOG ──────────────────────────────────────────────── */}
          <RecentEventsTable orgId={orgId} onExport={handleExportCSV} />
        </div>
      </div>
    </>
  );
}
