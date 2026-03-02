import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  Activity, AlertTriangle, DollarSign, Users, Power, PowerOff, Loader2, RefreshCw
} from "lucide-react";

type UsageRow = {
  user_id: string;
  tokens_in: number;
  tokens_out: number;
  cost_estimate: number;
  model_used: string;
  date: string;
};

function StatCard({ icon: Icon, label, value, sub, warn }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; warn?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 bg-card ${warn ? "border-destructive/40" : "border-border"}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
        <Icon className="w-4 h-4" />{label}
      </div>
      <div className={`text-2xl font-bold ${warn ? "text-destructive" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function ControlRoom() {
  const qc = useQueryClient();
  const [days, setDays] = useState(7);

  // Kill switch state
  const { data: killSwitchData, isLoading: ksLoading } = useQuery({
    queryKey: ["kill-switch"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "ai_kill_switch").single();
      return data?.value as { disabled: boolean } ?? { disabled: false };
    },
    refetchInterval: 10_000,
  });
  const aiDisabled = killSwitchData?.disabled ?? false;

  const toggleKillSwitch = useMutation({
    mutationFn: async () => {
      const next = !aiDisabled;
      const { error } = await supabase.from("app_settings").update({
        value: { disabled: next },
        updated_at: new Date().toISOString(),
      }).eq("key", "ai_kill_switch");
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      qc.invalidateQueries({ queryKey: ["kill-switch"] });
      toast({
        title: next ? "🔴 IA désactivée" : "🟢 IA réactivée",
        description: next ? "Tous les appels IA retournent 503." : "L'IA répond à nouveau normalement.",
        variant: next ? "destructive" : "default",
      });
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de modifier le kill switch.", variant: "destructive" }),
  });

  // Usage stats
  const since = new Date(Date.now() - days * 86400_000).toISOString().split("T")[0];
  const { data: usageRows = [], isLoading: usageLoading, refetch } = useQuery<UsageRow[]>({
    queryKey: ["ai-usage", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_usage_daily")
        .select("user_id, tokens_in, tokens_out, cost_estimate, model_used, date")
        .gte("date", since)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as UsageRow[];
    },
  });

  // Aggregate stats
  const totalCost = usageRows.reduce((s, r) => s + Number(r.cost_estimate), 0);
  const totalTokens = usageRows.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0);
  const uniqueUsers = new Set(usageRows.map((r) => r.user_id)).size;

  // Top users by cost
  const byUser: Record<string, number> = {};
  usageRows.forEach((r) => {
    byUser[r.user_id] = (byUser[r.user_id] ?? 0) + Number(r.cost_estimate);
  });
  const topUsers = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Cost by model
  const byModel: Record<string, number> = {};
  usageRows.forEach((r) => {
    byModel[r.model_used] = (byModel[r.model_used] ?? 0) + Number(r.cost_estimate);
  });

  // Daily cost
  const byDay: Record<string, number> = {};
  usageRows.forEach((r) => {
    byDay[r.date] = (byDay[r.date] ?? 0) + Number(r.cost_estimate);
  });
  const dailyEntries = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDailyCost = Math.max(...dailyEntries.map(([, v]) => v), 0.001);

  return (
    <>
      <Helmet><title>Control Room – GENIE IA Admin</title></Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">🎛️ Control Room</h1>
              <p className="text-muted-foreground text-sm mt-1">Supervision IA · Coûts · Kill Switch</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
              >
                <option value={1}>Aujourd'hui</option>
                <option value={7}>7 jours</option>
                <option value={30}>30 jours</option>
              </select>
              <button
                onClick={() => refetch()}
                className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Kill Switch */}
          <div className={`rounded-2xl border-2 p-5 mb-8 flex items-center justify-between ${aiDisabled ? "border-destructive bg-destructive/5" : "border-green-500/40 bg-green-500/5"}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {aiDisabled
                  ? <PowerOff className="w-5 h-5 text-destructive" />
                  : <Power className="w-5 h-5 text-green-500" />}
                <span className="font-bold text-foreground">
                  IA {aiDisabled ? "DÉSACTIVÉE 🔴" : "ACTIVE 🟢"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {aiDisabled
                  ? "Tous les appels chat retournent 503. Activez pour rétablir."
                  : "L'IA répond normalement. Désactivez en cas d'abus ou d'attaque."}
              </p>
            </div>
            <button
              onClick={() => toggleKillSwitch.mutate()}
              disabled={ksLoading || toggleKillSwitch.isPending}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                aiDisabled
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              }`}
            >
              {toggleKillSwitch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {aiDisabled ? "Réactiver l'IA" : "Couper l'IA"}
            </button>
          </div>

          {/* Stats */}
          {usageLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard icon={DollarSign} label="Coût total" value={`€${totalCost.toFixed(4)}`} sub={`${days}j`} warn={totalCost > 10} />
                <StatCard icon={Activity} label="Tokens totaux" value={totalTokens.toLocaleString()} sub="in+out" />
                <StatCard icon={Users} label="Utilisateurs actifs" value={uniqueUsers} sub={`${days}j`} />
                <StatCard icon={AlertTriangle} label="Coût/appel moy." value={usageRows.length > 0 ? `€${(totalCost / usageRows.length).toFixed(5)}` : "—"} />
              </div>

              {/* Daily cost chart */}
              {dailyEntries.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 mb-6">
                  <h2 className="text-sm font-semibold text-foreground mb-4">Coût quotidien (€)</h2>
                  <div className="flex items-end gap-1 h-24">
                    {dailyEntries.map(([date, cost]) => (
                      <div key={date} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-primary/60 rounded-sm min-h-[2px]"
                          style={{ height: `${Math.max((cost / maxDailyCost) * 88, 2)}px` }}
                          title={`${date}: €${cost.toFixed(4)}`}
                        />
                        <span className="text-[9px] text-muted-foreground/70 truncate max-w-full">
                          {date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Cost by model */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-4">Coût par modèle</h2>
                  <div className="space-y-3">
                    {Object.entries(byModel).sort((a, b) => b[1] - a[1]).map(([model, cost]) => (
                      <div key={model} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-mono text-xs truncate max-w-[60%]">{model.split("/").pop()}</span>
                        <span className="font-semibold text-foreground">€{cost.toFixed(4)}</span>
                      </div>
                    ))}
                    {Object.keys(byModel).length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucune donnée pour cette période.</p>
                    )}
                  </div>
                </div>

                {/* Top users */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-4">Top utilisateurs (coût)</h2>
                  <div className="space-y-2">
                    {topUsers.map(([uid, cost], i) => (
                      <div key={uid} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-4">{i + 1}.</span>
                          <span className="text-muted-foreground font-mono text-xs truncate max-w-[160px]">{uid.slice(0, 8)}…</span>
                        </div>
                        <span className={`font-semibold text-xs ${cost > 1 ? "text-destructive" : "text-foreground"}`}>
                          €{cost.toFixed(4)}
                        </span>
                      </div>
                    ))}
                    {topUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucune donnée pour cette période.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
