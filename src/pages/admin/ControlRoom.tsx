import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  Activity, AlertTriangle, DollarSign, Users, Power, PowerOff,
  Loader2, RefreshCw, ShieldAlert, CheckCircle2, Archive
} from "lucide-react";

type UsageRow = {
  user_id: string;
  tokens_in: number;
  tokens_out: number;
  cost_estimate: number;
  model_used: string;
  date: string;
};

type AppMetrics = {
  logging_errors: number;
  last_logging_error_at: string | null;
  updated_at: string | null;
};

type BufferRow = {
  id: string;
  user_id: string | null;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_estimate: number;
  created_at: string;
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

  // App metrics (logging integrity)
  const { data: metrics, refetch: refetchMetrics } = useQuery<AppMetrics>({
    queryKey: ["app-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_metrics")
        .select("logging_errors, last_logging_error_at, updated_at")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as AppMetrics;
    },
    refetchInterval: 15_000,
  });

  // Buffer rows count
  const { data: bufferRows = [], refetch: refetchBuffer } = useQuery<BufferRow[]>({
    queryKey: ["ai-usage-buffer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_usage_buffer")
        .select("id, user_id, model, tokens_in, tokens_out, cost_estimate, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as BufferRow[];
    },
    refetchInterval: 20_000,
  });

  // Flush buffer
  const flushBuffer = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("flush-ai-usage-buffer");
      if (error) throw error;
      return data as { processed: number; failed: number; remaining: number };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["ai-usage-buffer"] });
      qc.invalidateQueries({ queryKey: ["app-metrics"] });
      qc.invalidateQueries({ queryKey: ["ai-usage"] });
      toast({
        title: "✅ Buffer vidé",
        description: `${result.processed} lignes reprocessées, ${result.failed} échecs, ${result.remaining} restantes.`,
      });
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de vider le buffer.", variant: "destructive" }),
  });

  // Aggregate stats
  const totalCost = usageRows.reduce((s, r) => s + Number(r.cost_estimate), 0);
  const totalTokens = usageRows.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0);
  const uniqueUsers = new Set(usageRows.map((r) => r.user_id)).size;

  // Top users by cost
  const byUser: Record<string, number> = {};
  usageRows.forEach((r) => { byUser[r.user_id] = (byUser[r.user_id] ?? 0) + Number(r.cost_estimate); });
  const topUsers = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Cost by model
  const byModel: Record<string, number> = {};
  usageRows.forEach((r) => { byModel[r.model_used] = (byModel[r.model_used] ?? 0) + Number(r.cost_estimate); });

  // Daily cost
  const byDay: Record<string, number> = {};
  usageRows.forEach((r) => { byDay[r.date] = (byDay[r.date] ?? 0) + Number(r.cost_estimate); });
  const dailyEntries = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDailyCost = Math.max(...dailyEntries.map(([, v]) => v), 0.001);

  const loggingErrors = metrics?.logging_errors ?? 0;
  const hasErrors = loggingErrors > 0;
  const bufferCount = bufferRows.length;

  const formatDate = (iso: string | null) => iso
    ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
    : "—";

  return (
    <>
      <Helmet><title>Control Room – GENIE IA Admin</title></Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">🎛️ Control Room</h1>
              <p className="text-muted-foreground text-sm mt-1">Supervision IA · Coûts · Kill Switch · Intégrité logs</p>
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
                onClick={() => { refetch(); refetchMetrics(); refetchBuffer(); }}
                className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Kill Switch */}
          <div className={`rounded-2xl border-2 p-5 mb-6 flex items-center justify-between ${aiDisabled ? "border-destructive bg-destructive/5" : "border-green-500/40 bg-green-500/5"}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {aiDisabled
                  ? <PowerOff className="w-5 h-5 text-destructive" />
                  : <Power className="w-5 h-5 text-primary" />}
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

          {/* Log Integrity Block */}
          <div className={`rounded-2xl border-2 p-5 mb-8 ${hasErrors ? "border-destructive/60 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {hasErrors
                    ? <ShieldAlert className="w-5 h-5 text-destructive" />
                    : <CheckCircle2 className="w-5 h-5 text-primary" />}
                  <span className="font-bold text-foreground">
                    Intégrité des logs {hasErrors ? `⚠️ ${loggingErrors} erreur${loggingErrors > 1 ? "s" : ""}` : "✅ OK"}
                  </span>
                  {bufferCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                      {bufferCount} en buffer
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {hasErrors ? (
                    <>
                      <p>Des logs IA n'ont pas pu être enregistrés dans <code className="text-xs bg-muted px-1 rounded">ai_usage_daily</code>.</p>
                      <p>Dernière erreur : <span className="text-foreground font-medium">{formatDate(metrics?.last_logging_error_at ?? null)}</span></p>
                      {bufferCount > 0 && (
                        <p className="text-destructive/80">
                          {bufferCount} entrée{bufferCount > 1 ? "s" : ""} en attente dans le buffer de secours.
                        </p>
                      )}
                    </>
                  ) : (
                    <p>Tous les logs IA sont correctement enregistrés. Buffer vide.</p>
                  )}
                </div>
              </div>
              {(hasErrors || bufferCount > 0) && (
                <button
                  onClick={() => flushBuffer.mutate()}
                  disabled={flushBuffer.isPending || bufferCount === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {flushBuffer.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Archive className="w-4 h-4" />}
                  Vider le buffer
                </button>
              )}
            </div>

            {/* Buffer rows preview */}
            {bufferCount > 0 && (
              <div className="mt-4 rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Buffer de secours ({bufferCount} entrées visibles)
                </div>
                <div className="divide-y divide-border max-h-48 overflow-y-auto">
                  {bufferRows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-2 text-xs">
                      <span className="font-mono text-muted-foreground">{r.user_id?.slice(0, 8)}…</span>
                      <span className="text-muted-foreground">{r.model?.split("/").pop() ?? "?"}</span>
                      <span className="text-muted-foreground">{(r.tokens_in + r.tokens_out).toLocaleString()} tok</span>
                      <span className="font-semibold text-foreground">€{Number(r.cost_estimate).toFixed(5)}</span>
                      <span className="text-muted-foreground/60">{formatDate(r.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
