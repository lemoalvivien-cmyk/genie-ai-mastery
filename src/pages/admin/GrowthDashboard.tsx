import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, FunnelChart, Funnel, LabelList,
} from "recharts";
import {
  TrendingUp, Users, DollarSign, Percent, Zap, AlertTriangle,
  RefreshCw, Loader2, ArrowUp, ArrowDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const EUR = (n: number) => `${n.toFixed(2)} €`;
const PCT = (n: number) => `${n.toFixed(1)}%`;
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function KpiCard({
  title, value, sub, icon: Icon, trend, trendUp,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; trend?: string; trendUp?: boolean;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        </div>
        <p className="text-3xl font-extrabold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendUp ? "text-green-500" : "text-red-500"}`}>
            {trendUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Query helpers ────────────────────────────────────────────────────────────
async function countEvents(eventName: string): Promise<number> {
  const { count } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", eventName);
  return count ?? 0;
}

async function countEventsSince(eventName: string, days: number): Promise<number> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { count } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", eventName)
    .gte("created_at", since);
  return count ?? 0;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function GrowthDashboard() {
  const [refetchKey, setRefetchKey] = useState(0);

  // ── Global counts ─────────────────────────────────────────────────────────
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["growth-kpis", refetchKey],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [
        signups, checkoutStarted, checkoutSuccess, churns, invoiceFailed,
        signups7d, checkoutSuccess7d,
        activeOrgs, totalUsers, paidOrgs,
      ] = await Promise.all([
        countEvents("signup"),
        countEvents("checkout_started"),
        countEvents("checkout_success"),
        countEvents("churn"),
        countEvents("invoice_failed"),
        countEventsSince("signup", 7),
        countEventsSince("checkout_success", 7),
        supabase.from("organizations").select("*", { count: "exact", head: true }).neq("plan", "free").then(r => r.count ?? 0),
        supabase.from("profiles").select("*", { count: "exact", head: true }).then(r => r.count ?? 0),
        supabase.from("organizations").select("*", { count: "exact", head: true }).eq("plan_source", "stripe").then(r => r.count ?? 0),
      ]);

      const convRate = signups > 0 ? (checkoutSuccess / signups) * 100 : 0;
      const mrr = paidOrgs * 59;
      const churnRate = (activeOrgs > 0 ? (churns / activeOrgs) * 100 : 0);

      return {
        signups, checkoutStarted, checkoutSuccess, churns, invoiceFailed,
        signups7d, checkoutSuccess7d,
        totalUsers, paidOrgs, mrr, convRate, churnRate,
      };
    },
  });

  // ── Daily signups (last 14 days) ─────────────────────────────────────────
  const { data: signupTrend = [] } = useQuery({
    queryKey: ["growth-signup-trend", refetchKey],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400_000).toISOString();
      const { data } = await supabase
        .from("analytics_events")
        .select("created_at")
        .eq("event_name", "signup")
        .gte("created_at", since)
        .order("created_at");

      const byDay: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
        byDay[d] = 0;
      }
      for (const row of data ?? []) {
        const d = row.created_at.slice(0, 10);
        if (d in byDay) byDay[d]++;
      }
      return Object.entries(byDay).map(([date, count]) => ({ date: date.slice(5), signups: count }));
    },
  });

  // ── Funnel data ───────────────────────────────────────────────────────────
  const { data: funnel = [] } = useQuery({
    queryKey: ["growth-funnel", refetchKey],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [signups, onboarding, moduleOpened, quizPassed, checkoutStarted, checkoutSuccess] = await Promise.all([
        countEvents("signup"),
        countEvents("onboarding_done"),
        countEvents("module_opened"),
        countEvents("quiz_passed"),
        countEvents("checkout_started"),
        countEvents("checkout_success"),
      ]);
      return [
        { name: "Signups", value: signups, fill: "hsl(var(--primary))" },
        { name: "Onboarding", value: onboarding, fill: "hsl(var(--primary) / 0.85)" },
        { name: "Module ouvert", value: moduleOpened, fill: "hsl(var(--primary) / 0.7)" },
        { name: "Quiz réussi", value: quizPassed, fill: "hsl(var(--primary) / 0.55)" },
        { name: "Checkout", value: checkoutStarted, fill: "hsl(var(--primary) / 0.4)" },
        { name: "Payant", value: checkoutSuccess, fill: "hsl(var(--primary) / 0.25)" },
      ];
    },
  });

  // ── AI cost vs MRR (daily, last 14 days) ─────────────────────────────────
  const { data: costVsMrr = [] } = useQuery({
    queryKey: ["growth-cost-mrr", refetchKey],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("ai_usage_daily")
        .select("date, cost_estimate")
        .gte("date", since)
        .order("date");

      const byDay: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
        byDay[d] = 0;
      }
      for (const row of data ?? []) {
        if (row.date in byDay) byDay[row.date] += row.cost_estimate;
      }

      // Fetch current MRR from orgs
      const { count: paidOrgs } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true })
        .eq("plan_source", "stripe");
      const mrr = (paidOrgs ?? 0) * 59;
      const dailyMrr = mrr / 30;

      return Object.entries(byDay).map(([date, cost]) => ({
        date: date.slice(5),
        coût_IA: parseFloat(cost.toFixed(3)),
        MRR_jour: parseFloat(dailyMrr.toFixed(2)),
        marge: parseFloat((dailyMrr - cost).toFixed(3)),
      }));
    },
  });

  // ── Top events (last 7 days) ─────────────────────────────────────────────
  const { data: topEvents = [] } = useQuery({
    queryKey: ["growth-top-events", refetchKey],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data } = await supabase
        .from("analytics_events")
        .select("event_name")
        .gte("created_at", since);

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.event_name] = (counts[row.event_name] ?? 0) + 1;
      }
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([event, count]) => ({ event, count }));
    },
  });

  // ── Usage counters (quota pressure) ─────────────────────────────────────
  const { data: quotaStats } = useQuery({
    queryKey: ["growth-quota", refetchKey],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("usage_counters")
        .select("pdf_generated, labs_runs, tts_seconds, ai_tokens_out")
        .order("period_start", { ascending: false })
        .limit(100);
      const totals = (data ?? []).reduce(
        (acc, row) => ({
          pdf: acc.pdf + (row.pdf_generated ?? 0),
          labs: acc.labs + (row.labs_runs ?? 0),
          tts: acc.tts + (row.tts_seconds ?? 0),
          tokens: acc.tokens + (row.ai_tokens_out ?? 0),
        }),
        { pdf: 0, labs: 0, tts: 0, tokens: 0 },
      );
      return totals;
    },
  });

  const isLoading = kpisLoading;

  return (
    <>
      <Helmet><title>Growth Dashboard – Admin</title></Helmet>

      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between bg-card/50">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Growth Dashboard</h1>
            <Badge variant="outline" className="text-xs">Admin</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => setRefetchKey(k => k + 1)} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Rafraîchir
            </Button>
            <Link to="/admin/control-room" className="text-xs text-muted-foreground hover:text-foreground">Control Room →</Link>
            <Link to="/admin/ops" className="text-xs text-muted-foreground hover:text-foreground">Ops →</Link>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard title="Utilisateurs" value={fmt(kpis?.totalUsers ?? 0)} icon={Users}
                  trend={`+${kpis?.signups7d ?? 0} cette semaine`} trendUp={(kpis?.signups7d ?? 0) > 0} />
                <KpiCard title="MRR" value={EUR(kpis?.mrr ?? 0)} icon={DollarSign}
                  sub={`${kpis?.paidOrgs ?? 0} orgs actives`} />
                <KpiCard title="Conv. %" value={PCT(kpis?.convRate ?? 0)} icon={Percent}
                  sub="signup → payant" trendUp={(kpis?.convRate ?? 0) > 3} />
                <KpiCard title="Churn" value={PCT(kpis?.churnRate ?? 0)} icon={TrendingUp}
                  trendUp={(kpis?.churnRate ?? 0) < 5} />
                <KpiCard title="Checkouts 7j" value={fmt(kpis?.checkoutSuccess7d ?? 0)} icon={Zap}
                  sub={`${kpis?.checkoutStarted ?? 0} initiés`} />
                <KpiCard title="Factures échouées" value={fmt(kpis?.invoiceFailed ?? 0)} icon={AlertTriangle}
                  trendUp={(kpis?.invoiceFailed ?? 0) === 0} />
              </div>

              <Tabs defaultValue="funnel">
                <TabsList className="bg-muted">
                  <TabsTrigger value="funnel">Funnel</TabsTrigger>
                  <TabsTrigger value="trend">Signups</TabsTrigger>
                  <TabsTrigger value="cost">Coût IA</TabsTrigger>
                  <TabsTrigger value="events">Événements</TabsTrigger>
                  <TabsTrigger value="usage">Quotas</TabsTrigger>
                </TabsList>

                {/* Funnel */}
                <TabsContent value="funnel" className="mt-4">
                  <Card className="bg-card border-border">
                    <CardHeader><CardTitle className="text-base">Funnel d'activation</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {funnel.map((step, i) => {
                          const pct = funnel[0]?.value > 0 ? (step.value / funnel[0].value) * 100 : 0;
                          const dropPct = i > 0 && funnel[i - 1]?.value > 0
                            ? ((funnel[i - 1].value - step.value) / funnel[i - 1].value) * 100
                            : null;
                          return (
                            <div key={step.name}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-foreground">{step.name}</span>
                                <div className="flex items-center gap-3">
                                  {dropPct !== null && dropPct > 0 && (
                                    <span className="text-xs text-red-500">-{dropPct.toFixed(0)}%</span>
                                  )}
                                  <span className="text-sm font-bold text-foreground">{fmt(step.value)}</span>
                                  <span className="text-xs text-muted-foreground w-12 text-right">{PCT(pct)}</span>
                                </div>
                              </div>
                              <div className="h-6 bg-muted rounded overflow-hidden">
                                <div
                                  className="h-full rounded transition-all"
                                  style={{ width: `${pct}%`, background: "hsl(var(--primary))", opacity: 0.7 + 0.05 * (5 - i) }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Signup trend */}
                <TabsContent value="trend" className="mt-4">
                  <Card className="bg-card border-border">
                    <CardHeader><CardTitle className="text-base">Signups – 14 derniers jours</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={signupTrend} margin={{ left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                          <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* AI cost vs MRR */}
                <TabsContent value="cost" className="mt-4">
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-base">Coût IA estimé vs MRR / jour</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={costVsMrr} margin={{ left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                          <Legend />
                          <Line dataKey="coût_IA" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                          <Line dataKey="MRR_jour" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          <Line dataKey="marge" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                        </LineChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-muted-foreground mt-2 text-center">La marge (ligne verte) = MRR/jour − Coût IA/jour</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Top events */}
                <TabsContent value="events" className="mt-4">
                  <Card className="bg-card border-border">
                    <CardHeader><CardTitle className="text-base">Top événements – 7 jours</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={topEvents} layout="vertical" margin={{ left: 60, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis dataKey="event" type="category" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} width={100} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Quota usage */}
                <TabsContent value="usage" className="mt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "PDFs générés", value: fmt(quotaStats?.pdf ?? 0), icon: "📄" },
                      { label: "Labs runs", value: fmt(quotaStats?.labs ?? 0), icon: "🧪" },
                      { label: "TTS secondes", value: fmt(quotaStats?.tts ?? 0), icon: "🎙️" },
                      { label: "Tokens IA out", value: fmt(quotaStats?.tokens ?? 0), icon: "🤖" },
                    ].map(item => (
                      <Card key={item.label} className="bg-card border-border">
                        <CardContent className="p-5 text-center">
                          <div className="text-3xl mb-2">{item.icon}</div>
                          <p className="text-2xl font-extrabold text-foreground">{item.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>
    </>
  );
}
