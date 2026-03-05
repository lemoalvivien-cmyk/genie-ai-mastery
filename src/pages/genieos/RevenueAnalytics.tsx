import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Bot, Zap, Star, ArrowUpRight, BarChart2, CreditCard, ShoppingBag, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface RevenueStats {
  totalRevenue: number;
  totalLeads: number;
  totalOpportunities: number;
  agentSales: number;
  creditsBalance: number;
  creditTransactions: number;
}

const MOCK_TOP_AGENTS = [
  { name: "Revenue Scout", executions: 284, revenue: "€3 420", roi: "+124%", trend: "up" },
  { name: "Lead Generator", executions: 156, revenue: "€1 870", roi: "+89%", trend: "up" },
  { name: "Market Analyzer", executions: 98, revenue: "€1 140", roi: "+67%", trend: "up" },
  { name: "Opportunity Finder", executions: 74, revenue: "€820", roi: "+45%", trend: "up" },
  { name: "Content Forge", executions: 42, revenue: "€490", roi: "+23%", trend: "stable" },
];

const MOCK_TOP_ACTIONS = [
  { action: "Lead Generation", count: 847, credits: 2541, icon: TrendingUp, color: "text-emerald-400" },
  { action: "Market Analysis", count: 412, credits: 1648, icon: BarChart2, color: "text-blue-400" },
  { action: "Business Report", count: 234, credits: 1170, icon: DollarSign, color: "text-amber-400" },
  { action: "Agent Execution", count: 1248, credits: 0, icon: Bot, color: "text-purple-400" },
  { action: "AI Watch", count: 389, credits: 0, icon: Activity, color: "text-pink-400" },
];

const REVENUE_BY_MONTH = [
  { month: "Sep", value: 1200 },
  { month: "Oct", value: 2100 },
  { month: "Nov", value: 1800 },
  { month: "Déc", value: 3400 },
  { month: "Jan", value: 4200 },
  { month: "Fév", value: 5100 },
  { month: "Mar", value: 6800 },
];

const maxRevenue = Math.max(...REVENUE_BY_MONTH.map((r) => r.value));

export default function RevenueAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    totalLeads: 0,
    totalOpportunities: 0,
    agentSales: 0,
    creditsBalance: 0,
    creditTransactions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  async function loadStats() {
    setLoading(true);
    try {
      const [leadsRes, oppsRes, salesRes, creditsRes, txRes] = await Promise.allSettled([
        supabase.from("revenue_leads").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("revenue_opportunities").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("agent_sales").select("amount_eur").eq("seller_id", user!.id),
        supabase.from("credit_balance").select("balance").eq("user_id", user!.id).single(),
        supabase.from("credit_transactions").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);

      const totalLeads = leadsRes.status === "fulfilled" ? (leadsRes.value.count ?? 0) : 0;
      const totalOpportunities = oppsRes.status === "fulfilled" ? (oppsRes.value.count ?? 0) : 0;
      const agentSalesData = salesRes.status === "fulfilled" ? (salesRes.value.data ?? []) : [];
      const agentSalesTotal = agentSalesData.reduce((s: number, r: { amount_eur: number | null }) => s + (r.amount_eur ?? 0), 0);
      const creditsBalance = creditsRes.status === "fulfilled" && creditsRes.value.data ? creditsRes.value.data.balance : 0;
      const creditTransactions = txRes.status === "fulfilled" ? (txRes.value.count ?? 0) : 0;

      setStats({
        totalRevenue: agentSalesTotal,
        totalLeads,
        totalOpportunities,
        agentSales: agentSalesData.length,
        creditsBalance,
        creditTransactions,
      });
    } catch {
      // silently fail, use defaults
    } finally {
      setLoading(false);
    }
  }

  const kpis = [
    { label: "Revenu total", value: `€${stats.totalRevenue.toFixed(2)}`, delta: "+28%", icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Leads générés", value: String(stats.totalLeads), delta: "+47%", icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Opportunités", value: String(stats.totalOpportunities), delta: "+34%", icon: Star, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Crédits restants", value: String(stats.creditsBalance), delta: "", icon: CreditCard, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Ventes agents", value: String(stats.agentSales), delta: "+12%", icon: ShoppingBag, color: "text-rose-400", bg: "bg-rose-400/10" },
    { label: "Transactions", value: String(stats.creditTransactions), delta: "+8%", icon: Zap, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400/20 to-green-500/20 border border-emerald-400/30 flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Revenue Analytics</h1>
              <p className="text-sm text-muted-foreground">Performance économique de vos agents et automatisations</p>
            </div>
          </div>
          <button
            onClick={loadStats}
            className="text-xs text-primary hover:text-primary/80 transition-colors border border-primary/20 rounded-lg px-3 py-1.5 hover:border-primary/40"
          >
            Actualiser
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className={cn("bg-card border border-border rounded-xl p-4 space-y-2", loading && "animate-pulse")}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", k.bg)}>
                <k.icon className={cn("w-4 h-4", k.color)} />
              </div>
              <p className="text-xl font-bold text-foreground">{loading ? "—" : k.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground leading-tight">{k.label}</p>
                {k.delta && (
                  <span className="text-[10px] text-emerald-400 font-semibold">{k.delta}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Revenu mensuel (€)
          </h3>
          <div className="flex items-end gap-3 h-40">
            {REVENUE_BY_MONTH.map((r) => {
              const height = Math.round((r.value / maxRevenue) * 100);
              return (
                <div key={r.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    €{r.value >= 1000 ? `${(r.value / 1000).toFixed(1)}k` : r.value}
                  </span>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-emerald-500/60 to-emerald-400/30 border-t-2 border-emerald-400 transition-all hover:from-emerald-500/80 hover:to-emerald-400/50"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{r.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top agents */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Agents les plus rentables
              </h3>
            </div>
            <div className="divide-y divide-border">
              {MOCK_TOP_AGENTS.map((a, i) => (
                <div key={a.name} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.executions} exécutions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">{a.revenue}</p>
                    <div className="flex items-center justify-end gap-1">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400">{a.roi}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top actions */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Actions les plus utilisées
              </h3>
            </div>
            <div className="divide-y divide-border">
              {MOCK_TOP_ACTIONS.map((a) => (
                <div key={a.action} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
                    <a.icon className={cn("w-3.5 h-3.5", a.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.count.toLocaleString()} fois</p>
                  </div>
                  {a.credits > 0 && (
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-purple-400" />
                      <span className="text-xs text-purple-400 font-medium">{a.credits.toLocaleString()} crédits</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Credit system */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-400" />
            Système de crédits — Actions payantes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { action: "Lead Generation", cost: "3 crédits / lead", icon: TrendingUp, desc: "Trouve des prospects qualifiés" },
              { action: "Market Analysis", cost: "4 crédits / rapport", icon: BarChart2, desc: "Analyse de marché complète" },
              { action: "Business Report", cost: "5 crédits / rapport", icon: DollarSign, desc: "Rapport business détaillé" },
            ].map((item) => (
              <div key={item.action} className="p-4 rounded-lg bg-muted/20 border border-border space-y-2">
                <item.icon className="w-5 h-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">{item.action}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
                <div className="flex items-center gap-1 pt-1">
                  <CreditCard className="w-3 h-3 text-purple-400" />
                  <span className="text-xs font-bold text-purple-400">{item.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
