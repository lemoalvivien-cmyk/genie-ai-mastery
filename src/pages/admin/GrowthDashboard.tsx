import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  TrendingUp, Users, DollarSign, Percent, Zap, Share2,
  RefreshCw, Loader2, ArrowUp, ArrowDown, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PCT = (n: number) => `${n.toFixed(1)}%`;
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

const TOOLTIP_STYLE = {
  background: "hsl(229 22% 10%)",
  border: "1px solid hsl(229 14% 20%)",
  borderRadius: 8,
  fontSize: 12,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface AarrRow {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;  // accent hex/hsl for glow
  trendUp?: boolean;
  trend?: string;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, trendUp, trend }: AarrRow) {
  return (
    <div
      className="relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden"
      style={{
        background: "hsl(229 22% 10% / 0.7)",
        border: `1px solid ${color}40`,
        backdropFilter: "blur(12px)",
        boxShadow: `0 0 24px ${color}20`,
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ background: color }}
      />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}25` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: `${color}cc` }}>{label}</span>
      </div>
      <p className="text-3xl font-black text-foreground leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
          {trendUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
  );
}

// ─── Query helper ─────────────────────────────────────────────────────────────
async function countSince(eventName: string, days = 7): Promise<number> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { count } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", eventName)
    .gte("created_at", since);
  return count ?? 0;
}

async function fetchRows(eventName: string, days = 7, limit = 500) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await supabase
    .from("analytics_events")
    .select("actor_user_id, created_at")
    .eq("event_name", eventName)
    .gte("created_at", since)
    .limit(limit);
  return data ?? [];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GrowthDashboard() {
  const [key, setKey] = useState(0);

  // ── AARRR KPIs ─────────────────────────────────────────────────────────────
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["aarrr-kpis", key],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const [
        acq,
        signupStarted,
        signupCompleted,
        paywallShown,
        paywallClicked,
        checkoutStarted,
        referralShared,
      ] = await Promise.all([
        countSince("signup_completed", 7),
        countSince("signup_started", 7),
        countSince("signup_completed", 7),
        countSince("paywall_shown", 7),
        countSince("paywall_clicked", 7),
        countSince("checkout_started", 7),
        countSince("referral_shared", 7),
      ]);

      // Rétention: users with page_view in last 7d who signed up >7d ago
      const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data: oldUsers } = await supabase
        .from("analytics_events")
        .select("actor_user_id")
        .eq("event_name", "signup_completed")
        .lt("created_at", sevenDaysAgo)
        .limit(1000);
      const oldUserIds = [...new Set((oldUsers ?? []).map((r) => r.actor_user_id).filter(Boolean))];

      let retentionCount = 0;
      if (oldUserIds.length > 0) {
        const { data: activeOld } = await supabase
          .from("analytics_events")
          .select("actor_user_id")
          .eq("event_name", "page_view")
          .gte("created_at", sevenDaysAgo)
          .in("actor_user_id", oldUserIds.slice(0, 200));
        retentionCount = new Set((activeOld ?? []).map((r) => r.actor_user_id)).size;
      }
      const retentionPct = oldUserIds.length > 0 ? (retentionCount / oldUserIds.length) * 100 : 0;
      const activationPct = signupStarted > 0 ? (signupCompleted / signupStarted) * 100 : 0;
      const paywallConv = paywallShown > 0 ? (paywallClicked / paywallShown) * 100 : 0;

      return {
        acq,
        activationPct,
        retentionPct,
        retentionBase: oldUserIds.length,
        paywallConv,
        checkoutStarted,
        referralShared,
      };
    },
  });

  // ── 30-day line chart ───────────────────────────────────────────────────────
  const { data: trend = [] } = useQuery({
    queryKey: ["aarrr-trend", key],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data } = await supabase
        .from("analytics_events")
        .select("event_name, created_at")
        .in("event_name", ["page_view", "signup_completed", "pricing_viewed", "checkout_started", "quota_hit"])
        .gte("created_at", since)
        .limit(5000);

      const byDay: Record<string, Record<string, number>> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
        byDay[d] = { page_view: 0, signup_completed: 0, pricing_viewed: 0, checkout_started: 0, quota_hit: 0 };
      }
      for (const row of data ?? []) {
        const d = row.created_at.slice(0, 10);
        if (byDay[d] && row.event_name in byDay[d]) byDay[d][row.event_name]++;
      }
      return Object.entries(byDay).map(([date, counts]) => ({
        date: date.slice(5),
        "Visites": counts.page_view,
        "Signups": counts.signup_completed,
        "Pricing": counts.pricing_viewed,
        "Checkout": counts.checkout_started,
        "Quota hit": counts.quota_hit,
      }));
    },
  });

  // ── Funnel ─────────────────────────────────────────────────────────────────
  const { data: funnel = [] } = useQuery({
    queryKey: ["aarrr-funnel", key],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [pv, ss, sc, prv, cs] = await Promise.all([
        countSince("page_view", 30),
        countSince("signup_started", 30),
        countSince("signup_completed", 30),
        countSince("pricing_viewed", 30),
        countSince("checkout_started", 30),
      ]);
      return [
        { name: "Page View", value: pv, color: "#5257D8" },
        { name: "Signup Started", value: ss, color: "#6C68E0" },
        { name: "Signup Completed", value: sc, color: "#8878E8" },
        { name: "Pricing Viewed", value: prv, color: "#C45CB0" },
        { name: "Checkout Started", value: cs, color: "#FE2C40" },
      ];
    },
  });

  // ── Last 20 events ─────────────────────────────────────────────────────────
  const { data: recentEvents = [] } = useQuery({
    queryKey: ["aarrr-recent", key],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("analytics_events")
        .select("id, event_name, actor_user_id, properties, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const EVENT_BADGE: Record<string, string> = {
    page_view: "#5257D8",
    signup_started: "#22C55E",
    signup_completed: "#10B981",
    pricing_viewed: "#F59E0B",
    checkout_started: "#FE2C40",
    paywall_shown: "#8B5CF6",
    paywall_clicked: "#EC4899",
    quota_hit: "#EF4444",
    mission_completed: "#06B6D4",
    referral_shared: "#14B8A6",
  };

  return (
    <>
      <Helmet><title>Growth AARRR – Admin</title></Helmet>

      <div className="min-h-screen text-foreground" style={{ background: "#13151E" }}>
        {/* Header */}
        <header
          className="border-b px-6 py-4 flex items-center justify-between backdrop-blur-md"
          style={{ borderColor: "hsl(229 14% 18%)", background: "hsl(229 22% 10% / 0.8)" }}
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5" style={{ color: "#5257D8" }} />
            <h1 className="text-lg font-black text-foreground">Growth AARRR</h1>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">Admin</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => setKey(k => k + 1)} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Link to="/admin/control-room" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Control Room →</Link>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {kpisLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* ── AARRR KPI Cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard
                  label="Acquisition"
                  value={fmt(kpis?.acq ?? 0)}
                  sub="signups 7 derniers jours"
                  icon={Users}
                  color="#5257D8"
                  trendUp={(kpis?.acq ?? 0) > 0}
                  trend={`${kpis?.acq ?? 0} nouveaux`}
                />
                <KpiCard
                  label="Activation"
                  value={PCT(kpis?.activationPct ?? 0)}
                  sub="signup_completed / started (7j)"
                  icon={Zap}
                  color="#22C55E"
                  trendUp={(kpis?.activationPct ?? 0) > 50}
                />
                <KpiCard
                  label="Rétention"
                  value={PCT(kpis?.retentionPct ?? 0)}
                  sub={`${kpis?.retentionBase ?? 0} users anciens actifs`}
                  icon={Percent}
                  color="#06B6D4"
                  trendUp={(kpis?.retentionPct ?? 0) > 30}
                />
                <KpiCard
                  label="Revenu"
                  value={fmt(kpis?.checkoutStarted ?? 0)}
                  sub={`paywall conv. ${PCT(kpis?.paywallConv ?? 0)}`}
                  icon={DollarSign}
                  color="#FE2C40"
                  trendUp={(kpis?.checkoutStarted ?? 0) > 0}
                  trend={`${kpis?.checkoutStarted ?? 0} checkouts`}
                />
                <KpiCard
                  label="Referral"
                  value={fmt(kpis?.referralShared ?? 0)}
                  sub="liens partagés 7j"
                  icon={Share2}
                  color="#F59E0B"
                  trendUp={(kpis?.referralShared ?? 0) > 0}
                />
              </div>

              {/* ── 30-day line chart ── */}
              <div
                className="rounded-2xl p-6"
                style={{ background: "hsl(229 22% 10% / 0.7)", border: "1px solid hsl(229 14% 18%)" }}
              >
                <h2 className="text-sm font-bold text-foreground mb-5">Événements clés — 30 derniers jours</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trend} margin={{ left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(229 14% 18%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(229 14% 45%)" }} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(229 14% 45%)" }} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line dataKey="Visites" stroke="#5257D8" strokeWidth={2} dot={false} />
                    <Line dataKey="Signups" stroke="#22C55E" strokeWidth={2} dot={false} />
                    <Line dataKey="Pricing" stroke="#F59E0B" strokeWidth={2} dot={false} />
                    <Line dataKey="Checkout" stroke="#FE2C40" strokeWidth={2} dot={false} />
                    <Line dataKey="Quota hit" stroke="#EF4444" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* ── Funnel visual ── */}
              <div
                className="rounded-2xl p-6"
                style={{ background: "hsl(229 22% 10% / 0.7)", border: "1px solid hsl(229 14% 18%)" }}
              >
                <h2 className="text-sm font-bold text-foreground mb-5">Funnel d'acquisition — 30 jours</h2>
                <div className="space-y-3">
                  {funnel.map((step, i) => {
                    const pctOfFirst = funnel[0]?.value > 0 ? (step.value / funnel[0].value) * 100 : 0;
                    const convNext = i < funnel.length - 1 && step.value > 0
                      ? (funnel[i + 1].value / step.value) * 100
                      : null;
                    return (
                      <div key={step.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: step.color }}
                            />
                            <span className="text-sm font-medium text-foreground">{step.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-black text-foreground text-base">{fmt(step.value)}</span>
                            <span style={{ color: step.color }} className="font-semibold w-12 text-right">
                              {PCT(pctOfFirst)}
                            </span>
                            {convNext !== null && (
                              <div className="flex items-center gap-0.5 text-muted-foreground w-24 justify-end">
                                <ChevronRight className="w-3 h-3" />
                                <span className={convNext > 50 ? "text-emerald-400" : convNext > 20 ? "text-amber-400" : "text-red-400"}>
                                  {PCT(convNext)} next
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className="h-7 rounded-lg overflow-hidden relative"
                          style={{ background: "hsl(229 14% 16%)" }}
                        >
                          <div
                            className="h-full rounded-lg transition-all duration-700"
                            style={{
                              width: `${Math.max(pctOfFirst, 0.5)}%`,
                              background: `linear-gradient(90deg, ${step.color}cc, ${step.color}66)`,
                              boxShadow: `0 0 12px ${step.color}40`,
                            }}
                          />
                          <span
                            className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold"
                            style={{ color: "#E8E9F0" }}
                          >
                            {fmt(step.value)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Recent events table ── */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid hsl(229 14% 18%)" }}
              >
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{ background: "hsl(229 22% 10% / 0.9)", borderBottom: "1px solid hsl(229 14% 18%)" }}
                >
                  <h2 className="text-sm font-bold text-foreground">20 derniers événements</h2>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "hsl(229 22% 9%)", borderBottom: "1px solid hsl(229 14% 16%)" }}>
                        {["Événement", "User ID", "Page / URL", "Date"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground tracking-wide uppercase text-[10px]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentEvents.map((ev, i) => {
                        const pageUrl = (ev.properties as Record<string, unknown>)?.url as string ?? "—";
                        const path = (ev.properties as Record<string, unknown>)?.path as string ?? pageUrl ?? "—";
                        const color = EVENT_BADGE[ev.event_name] ?? "#888";
                        return (
                          <tr
                            key={ev.id}
                            style={{
                              background: i % 2 === 0 ? "hsl(229 22% 10% / 0.5)" : "hsl(229 22% 8% / 0.5)",
                              borderBottom: "1px solid hsl(229 14% 15%)",
                            }}
                          >
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                              >
                                {ev.event_name}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-muted-foreground">
                              {ev.actor_user_id ? ev.actor_user_id.slice(0, 8) + "…" : "anon"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{path}</td>
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">
                              {new Date(ev.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                            </td>
                          </tr>
                        );
                      })}
                      {recentEvents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                            Aucun événement trouvé.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
