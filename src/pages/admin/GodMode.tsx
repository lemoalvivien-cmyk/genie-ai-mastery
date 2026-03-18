import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import {
  Shield, Users, Building2, DollarSign, Zap, RefreshCw, Loader2,
  Lock, Unlock, Power, PowerOff, Edit3, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, X, Check, Crown, Eye
} from "lucide-react";

const GOD_EMAIL = "lemoalvivien@gmail.com";

// ── Typed responses ──────────────────────────────────────────────
interface OrgRow {
  id: string; name: string; slug: string; plan: string;
  seats_used: number; seats_max: number; is_read_only: boolean;
  stripe_subscription_id: string | null; created_at: string;
}
interface UserRow {
  id: string; email: string; full_name: string | null; role: string;
  org_id: string | null; level: number; onboarding_completed: boolean;
  created_at: string; last_active_at: string | null; abuse_score: number;
}
interface BudgetRow {
  org_id: string; daily_limit: number; used_today: number;
  is_blocked: boolean; reset_date: string; updated_at: string;
}
interface StripeSub {
  id: string; status: string; current_period_end: number;
  items: { data: { price: { id: string; unit_amount: number | null } }[] };
}
interface Stats {
  total_orgs: number; total_users: number; ai_cost_today: string;
}

// ── Admin API caller ─────────────────────────────────────────────
async function godCall<T>(action: string, payload?: object): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const res = await supabase.functions.invoke("admin-operations", {
    body: { action, payload: payload ?? {} },
  });
  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data as T;
}

// ── Plan badge ───────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  launch: "bg-accent/20 text-accent",
  pro: "bg-primary/20 text-primary",
  business: "bg-emerald/20 text-emerald",
  partner: "bg-warning/20 text-warning",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan] ?? "bg-muted text-muted-foreground"}`}>
      {plan.toUpperCase()}
    </span>
  );
}

// ── Section wrapper ──────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary" />
          <span className="font-bold text-base">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// ── Inline editable field ────────────────────────────────────────
function InlineEdit({ value, onSave }: { value: number | string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-sm font-mono hover:text-primary transition-colors">
        {value} <Edit3 className="w-3 h-3" />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-24 px-2 py-0.5 text-sm rounded bg-secondary border border-primary/40 font-mono"
        onKeyDown={e => { if (e.key === "Enter") { onSave(val); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
      />
      <button onClick={() => { onSave(val); setEditing(false); }} className="text-emerald hover:text-emerald/80"><Check className="w-4 h-4" /></button>
      <button onClick={() => setEditing(false)} className="text-destructive hover:text-destructive/80"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function GodMode() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedOrgForStripe, setSelectedOrgForStripe] = useState<OrgRow | null>(null);

  const isAuthorized = !authLoading && !!user && user.email === GOD_EMAIL;

  // ── Queries — toujours appelés (règle React Hooks) ───────────
  const statsQ = useQuery({
    queryKey: ["god-stats"],
    queryFn: () => godCall<Stats>("stats"),
    refetchInterval: 30_000,
  });

  const orgsQ = useQuery({
    queryKey: ["god-orgs"],
    queryFn: () => godCall<{ orgs: OrgRow[] }>("list_orgs").then(r => r.orgs),
  });

  const usersQ = useQuery({
    queryKey: ["god-users"],
    queryFn: () => godCall<{ users: UserRow[] }>("list_users").then(r => r.users),
  });

  const budgetsQ = useQuery({
    queryKey: ["god-budgets"],
    queryFn: () => godCall<{ budgets: BudgetRow[] }>("list_budgets").then(r => r.budgets),
  });

  const stripeSubsQ = useQuery({
    queryKey: ["god-stripe-subs", selectedOrgForStripe?.id],
    queryFn: () => selectedOrgForStripe
      ? godCall<{ subscriptions: StripeSub[] }>("stripe_list_subs", { org_id: selectedOrgForStripe.id }).then(r => r.subscriptions)
      : Promise.resolve([]),
    enabled: !!selectedOrgForStripe,
  });

  // ── Mutations ──────────────────────────────────────────────────
  const toggleRO = useMutation({
    mutationFn: ({ org_id, is_read_only }: { org_id: string; is_read_only: boolean }) =>
      godCall("toggle_readonly", { org_id, is_read_only }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["god-orgs"] }); toast({ title: "✅ Accès mis à jour" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const setPlan = useMutation({
    mutationFn: ({ org_id, plan }: { org_id: string; plan: string }) =>
      godCall("set_plan", { org_id, plan }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["god-orgs"] }); toast({ title: "✅ Plan mis à jour" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateBudget = useMutation({
    mutationFn: ({ org_id, daily_limit }: { org_id: string; daily_limit: number }) =>
      godCall("update_budget", { org_id, daily_limit }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["god-budgets"] }); toast({ title: "✅ Budget mis à jour" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const resetBudget = useMutation({
    mutationFn: (org_id: string) => godCall("reset_budget", { org_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["god-budgets"] }); toast({ title: "✅ Budget réinitialisé" }); },
  });

  const cancelSub = useMutation({
    mutationFn: (subscription_id: string) => godCall("stripe_cancel_sub", { subscription_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["god-stripe-subs"] });
      toast({ title: "✅ Abonnement annulé" });
    },
    onError: (e: Error) => toast({ title: "Erreur Stripe", description: e.message, variant: "destructive" }),
  });

  const forceActive = useMutation({
    mutationFn: (org_id: string) => godCall("stripe_force_active", { org_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["god-orgs"] });
      toast({ title: "✅ Org débloquée manuellement" });
    },
  });

  const setUserRole = useMutation({
    mutationFn: ({ user_id, role }: { user_id: string; role: string }) =>
      godCall("set_user_role", { user_id, role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["god-users"] }); toast({ title: "✅ Rôle mis à jour" }); },
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>GOD MODE — Formetoialia Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Crown className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">GOD MODE <span className="text-accent">⚡</span></h1>
            <p className="text-xs text-muted-foreground">Accès absolu — Connecté en tant que {user?.email}</p>
          </div>
          <button
            onClick={() => qc.invalidateQueries()}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh tout
          </button>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Building2, label: "Organisations", value: statsQ.data?.total_orgs ?? "…", color: "text-primary" },
            { icon: Users, label: "Utilisateurs", value: statsQ.data?.total_users ?? "…", color: "text-emerald" },
            { icon: DollarSign, label: "Coût IA aujourd'hui", value: statsQ.data ? `${statsQ.data.ai_cost_today}€` : "…", color: "text-warning" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border/60 bg-card/60 px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-6">

          {/* ── ORGANISATIONS ─────────────────────────────────── */}
          <Section title="Organisations" icon={Building2}>
            {orgsQ.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground text-xs">
                      <th className="text-left pb-2 pr-4">Nom</th>
                      <th className="text-left pb-2 pr-4">Plan</th>
                      <th className="text-left pb-2 pr-4">Sièges</th>
                      <th className="text-left pb-2 pr-4">Statut</th>
                      <th className="text-left pb-2 pr-4">Changer plan</th>
                      <th className="text-left pb-2 pr-4">Accès</th>
                      <th className="text-left pb-2">Stripe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(orgsQ.data ?? []).map(org => (
                      <tr key={org.id} className="hover:bg-muted/10">
                        <td className="py-2.5 pr-4 font-medium">{org.name}</td>
                        <td className="py-2.5 pr-4"><PlanBadge plan={org.plan} /></td>
                        <td className="py-2.5 pr-4 font-mono text-xs">{org.seats_used}/{org.seats_max}</td>
                        <td className="py-2.5 pr-4">
                          {org.is_read_only
                            ? <span className="text-xs text-destructive flex items-center gap-1"><Lock className="w-3 h-3" />Lecture seule</span>
                            : <span className="text-xs text-emerald flex items-center gap-1"><Unlock className="w-3 h-3" />Actif</span>}
                        </td>
                        <td className="py-2.5 pr-4">
                          <select
                            value={org.plan}
                            onChange={e => setPlan.mutate({ org_id: org.id, plan: e.target.value })}
                            className="text-xs bg-secondary border border-border rounded px-2 py-1"
                          >
                            {["free","launch","pro","business","partner"].map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 pr-4">
                          <button
                            onClick={() => toggleRO.mutate({ org_id: org.id, is_read_only: !org.is_read_only })}
                            className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                              org.is_read_only
                                ? "bg-emerald/10 text-emerald hover:bg-emerald/20"
                                : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                            }`}
                          >
                            {org.is_read_only
                              ? <><Unlock className="w-3 h-3" />Débloquer</>
                              : <><Lock className="w-3 h-3" />Bloquer</>}
                          </button>
                        </td>
                        <td className="py-2.5">
                          <button
                            onClick={() => setSelectedOrgForStripe(org === selectedOrgForStripe ? null : org)}
                            className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Eye className="w-3 h-3" />Stripe
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Stripe sub drawer */}
            {selectedOrgForStripe && (
              <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Abonnements Stripe — {selectedOrgForStripe.name}</p>
                  <button onClick={() => setSelectedOrgForStripe(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                {stripeSubsQ.isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Chargement Stripe…</div>
                ) : stripeSubsQ.data?.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun abonnement Stripe trouvé.</p>
                ) : (
                  <div className="space-y-2">
                    {(stripeSubsQ.data ?? []).map(sub => (
                      <div key={sub.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-xs">
                        <div>
                          <span className="font-mono text-muted-foreground">{sub.id}</span>
                          <span className={`ml-2 font-semibold ${sub.status === "active" ? "text-emerald" : "text-destructive"}`}>
                            {sub.status}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            expire: {new Date(sub.current_period_end * 1000).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => forceActive.mutate(selectedOrgForStripe.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald/10 text-emerald hover:bg-emerald/20"
                          >
                            <Power className="w-3 h-3" />Forcer actif
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Annuler l'abonnement ${sub.id} ?`))
                                cancelSub.mutate(sub.id);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"
                          >
                            <PowerOff className="w-3 h-3" />Annuler
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── AI BUDGETS ─────────────────────────────────────── */}
          <Section title="Quotas IA (ai_budgets)" icon={Zap}>
            {budgetsQ.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" />Chargement…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground text-xs">
                      <th className="text-left pb-2 pr-4">Org ID</th>
                      <th className="text-left pb-2 pr-4">Limite / jour (€)</th>
                      <th className="text-left pb-2 pr-4">Utilisé auj. (€)</th>
                      <th className="text-left pb-2 pr-4">Statut</th>
                      <th className="text-left pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(budgetsQ.data ?? []).map(b => {
                      const pct = b.daily_limit > 0 ? Math.min((b.used_today / b.daily_limit) * 100, 100) : 0;
                      const org = orgsQ.data?.find(o => o.id === b.org_id);
                      return (
                        <tr key={b.org_id} className="hover:bg-muted/10">
                          <td className="py-2.5 pr-4">
                            <span className="font-medium">{org?.name ?? "—"}</span>
                            <span className="block text-xs text-muted-foreground font-mono">{b.org_id.slice(0, 8)}…</span>
                          </td>
                          <td className="py-2.5 pr-4">
                            <InlineEdit
                              value={b.daily_limit}
                              onSave={v => updateBudget.mutate({ org_id: b.org_id, daily_limit: parseFloat(v) })}
                            />
                          </td>
                          <td className="py-2.5 pr-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-xs">{b.used_today.toFixed(4)}€</span>
                              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct > 80 ? "bg-destructive" : pct > 50 ? "bg-warning" : "bg-emerald"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4">
                            {b.is_blocked
                              ? <span className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Bloqué</span>
                              : <span className="text-xs text-emerald flex items-center gap-1"><Check className="w-3 h-3" />OK</span>}
                          </td>
                          <td className="py-2.5">
                            <button
                              onClick={() => resetBudget.mutate(b.org_id)}
                              className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />Reset
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── UTILISATEURS ──────────────────────────────────── */}
          <Section title="Utilisateurs" icon={Users}>
            {usersQ.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" />Chargement…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground text-xs">
                      <th className="text-left pb-2 pr-4">Email</th>
                      <th className="text-left pb-2 pr-4">Nom</th>
                      <th className="text-left pb-2 pr-4">Rôle</th>
                      <th className="text-left pb-2 pr-4">Niveau</th>
                      <th className="text-left pb-2 pr-4">Abuse</th>
                      <th className="text-left pb-2 pr-4">Dernière activité</th>
                      <th className="text-left pb-2">Changer rôle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(usersQ.data ?? []).map(u => (
                      <tr key={u.id} className="hover:bg-muted/10">
                        <td className="py-2.5 pr-4 font-mono text-xs">{u.email}</td>
                        <td className="py-2.5 pr-4">{u.full_name ?? "—"}</td>
                        <td className="py-2.5 pr-4">
                          <PlanBadge plan={u.role ?? "learner"} />
                        </td>
                        <td className="py-2.5 pr-4 text-center">{u.level}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`text-xs font-bold ${u.abuse_score > 50 ? "text-destructive" : "text-muted-foreground"}`}>
                            {u.abuse_score}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                          {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString("fr-FR") : "jamais"}
                        </td>
                        <td className="py-2.5">
                          <select
                            value={u.role ?? "learner"}
                            onChange={e => setUserRole.mutate({ user_id: u.id, role: e.target.value })}
                            className="text-xs bg-secondary border border-border rounded px-2 py-1"
                          >
                            {["learner","manager","admin"].map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-2">{usersQ.data?.length ?? 0} utilisateurs (max 200)</p>
              </div>
            )}
          </Section>

        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground/50">
            ⚡ GOD MODE — toutes les actions sont irréversibles et tracées dans les audit_logs
          </p>
        </div>
      </div>
    </>
  );
}
