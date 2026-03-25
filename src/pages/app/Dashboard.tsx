import { Helmet } from "react-helmet-async";
import { Flame, BookOpen, CheckCircle, Zap, ChevronRight, Crown, TrendingUp, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useStreak } from "@/hooks/useStreak";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { NextBestActionCard } from "@/components/dashboard/NextBestActionCard";
import { RecentArtifactsCard } from "@/components/dashboard/RecentArtifactsCard";
import NeuroRewardsDashboard from "@/components/rewards/NeuroRewardsDashboard";

// ── Animated counter ────────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const target = value;
    const start = prev.current;
    prev.current = target;
    let frame: number;
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      setDisplay(Math.round(start + (target - start) * p));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display}</>;
}

export default function Dashboard() {
  const { profile, session } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "vous";
  const { streak, todayLog, loading: streakLoading } = useStreak();
  const { data: sub } = useSubscription();
  const userId = session?.user?.id;
  const { track } = useAnalytics();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // PASSE C · #7 — Invalider le cache subscription après paiement réussi
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      track("checkout_success");
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    }
  }, []);

  // Dashboard stats
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats-v2", userId],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      // PASSE B · #18 — toutes les requêtes avec .limit() pour éviter unbounded
      const [completedRes, quizRes, recentProgressRes, messagesRes] = await Promise.all([
        supabase.from("progress").select("*", { count: "exact", head: true }).eq("user_id", userId!).eq("status", "completed"),
        supabase.from("progress").select("*", { count: "exact", head: true }).eq("user_id", userId!).eq("status", "completed").not("score", "is", null).gte("score", 70),
        supabase.from("progress").select("module_id, updated_at, status, modules(title, domain, slug)").eq("user_id", userId!).order("updated_at", { ascending: false }).limit(4),
        // Count today's messages for free users
        supabase.from("chat_messages").select("*", { count: "exact", head: true }).eq("user_id", userId!).gte("created_at", new Date().toISOString().split("T")[0]),
      ]);
      return {
        completedModules: completedRes.count ?? 0,
        quizPassed: quizRes.count ?? 0,
        recentProgress: recentProgressRes.data ?? [],
        todayMessages: messagesRes.count ?? 0,
      };
    },
  });

  const isFree = !sub?.isActive;
  const maxMessages = sub?.maxMessagesPerDay ?? 5;
  const usedMessages = stats?.todayMessages ?? 0;
  const quotaExhausted = isFree && usedMessages >= maxMessages;

  const totalXP = streak?.total_xp ?? 0;
  const currentStreak = streak?.current_streak ?? 0;
  const missionDone = !!todayLog;
  // isLoading : vrai tant que streak OU stats ne sont pas encore chargés
  const isDashboardLoading = streakLoading || !stats;

  const metrics = [
    { label: "XP Total", value: totalXP, icon: Zap, color: "text-[hsl(var(--primary))]" },
    { label: "Playbooks", value: stats?.completedModules ?? 0, icon: BookOpen, color: "text-cyan-400" },
    { label: "Validations", value: stats?.quizPassed ?? 0, icon: CheckCircle, color: "text-emerald-400" },
    { label: "Série", value: currentStreak, icon: Flame, color: "text-[hsl(var(--accent))]" },
  ];

  const DOMAIN_LABELS: Record<string, string> = {
    cyber: "🛡️ Cyber",
    ia_pro: "🤖 IA Pro",
    ia_perso: "💡 IA Perso",
    vibe_coding: "⚡ Vibe Coding",
  };

  return (
    <>
      <Helmet>
        <title>Dashboard – Formetoialia</title>
      </Helmet>

      <div className="min-h-full page-enter" style={{ background: "#13151E" }}>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* ── Billing warning banner ── */}
          {sub?.billingWarning && (
            <div
              className="rounded-xl px-4 py-3 text-sm flex items-start gap-3"
              style={{
                background: sub.status === "past_due" || sub.status === "action_required"
                  ? "hsl(var(--destructive) / 0.1)"
                  : sub.status === "cancelling"
                  ? "hsl(var(--accent) / 0.1)"
                  : "hsl(var(--primary) / 0.08)",
                border: `1px solid ${
                  sub.status === "past_due" || sub.status === "action_required"
                    ? "hsl(var(--destructive) / 0.4)"
                    : sub.status === "cancelling"
                    ? "hsl(var(--accent) / 0.35)"
                    : "hsl(var(--primary) / 0.25)"
                }`,
                color: "hsl(var(--foreground))",
              }}
              role="alert"
            >
              <span className="leading-relaxed flex-1">{sub.billingWarning}</span>
              {(sub.status === "past_due" || sub.status === "action_required" || sub.status === "cancelling") && (
                <a
                  href="/app/settings"
                  className="shrink-0 text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
                >
                  Gérer →
                </a>
              )}
            </div>
          )}

          {/* ── 1. Header ── */}
          <div className="flex items-center justify-between animate-slide-up">
            <div>
              <p className="text-sm text-muted-foreground">Bon retour 👋</p>
              <h1 className="text-2xl font-black" style={{ color: "#E8E9F0" }}>
                Bonjour, {firstName}
              </h1>
            </div>
            {currentStreak > 0 && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm"
                style={{ background: "rgba(254,44,64,0.15)", border: "1px solid rgba(254,44,64,0.4)", color: "#FE2C40" }}
              >
                <Flame className="w-4 h-4" />
                {currentStreak} jour{currentStreak > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* ── 2. Barre progression journalière ── */}
          <div
            className="p-4 rounded-2xl animate-slide-up"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: "#E8E9F0" }}>
                Progression du jour
              </span>
              <span className="text-xs text-muted-foreground">
                {missionDone ? "1" : "0"}/1 mission
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: missionDone ? "100%" : "0%",
                  background: "linear-gradient(90deg, #5257D8, #FE2C40)",
                }}
              />
            </div>
          </div>

          {/* ── 3. Mission du jour ── */}
          {!missionDone && (
            <Link
              to="/app/today"
              className="block animate-slide-up group"
            >
              <div
                className="p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                style={{
                  background: "rgba(82,87,216,0.08)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(82,87,216,0.3)",
                  boxShadow: "0 0 24px rgba(82,87,216,0.15)",
                }}
              >
                {/* Glow pulse */}
                <div
                  className="absolute inset-0 rounded-2xl animate-pulse pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(82,87,216,0.12) 0%, transparent 70%)" }}
                />

                <div className="relative flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: "#FE2C40" }}
                      />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Mission du jour
                      </span>
                    </div>
                    <h2 className="text-lg font-bold" style={{ color: "#E8E9F0" }}>
                      Votre défi vous attend
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      3 minutes · Gagnez du XP
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all group-hover:brightness-110"
                    style={{ background: "#FE2C40", color: "#fff" }}
                  >
                    Commencer
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          )}

          {missionDone && (
            <div
              className="p-5 rounded-2xl animate-slide-up"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-400">Mission du jour accomplie ! 🎉</p>
                  <p className="text-sm text-muted-foreground">Revenez demain pour continuer votre série.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── 4. Grille 2x2 métriques ── */}
          <div className="grid grid-cols-2 gap-3 animate-slide-up">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="p-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${m.color}`} />
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                  </div>
                  <div className={`text-3xl font-black ${m.color}`}>
                    {isDashboardLoading ? <Skeleton className="h-8 w-16" /> : <AnimatedNumber value={m.value} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 5. Upsell contextuel (FREE + quota épuisé) ── */}
          {quotaExhausted && (
            <div
              className="p-5 rounded-2xl animate-slide-up relative overflow-hidden"
              style={{
                background: "rgba(82,87,216,0.07)",
                border: "1px solid transparent",
                backgroundClip: "padding-box",
              }}
            >
              {/* Gradient border trick */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  padding: "1px",
                  background: "linear-gradient(135deg, #5257D8, #FE2C40)",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />

              <div className="relative space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #5257D8, #FE2C40)" }}
                  >
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "#E8E9F0" }}>
                      Débloquez tout Formetoialia Pro
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Vous avez utilisé {usedMessages}/{maxMessages} message{maxMessages > 1 ? "s" : ""} KITT aujourd'hui. Passez Pro pour un accès illimité.
                    </p>
                  </div>
                </div>

                {/* Barre quota pleine */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Messages utilisés</span>
                    <span className="font-semibold" style={{ color: "#FE2C40" }}>{usedMessages}/{maxMessages}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "100%",
                        background: "#FE2C40",
                      }}
                    />
                  </div>
                </div>

                <Link
                  to="/pricing"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110"
                  style={{ background: "#FE2C40", color: "#fff" }}
                >
                  <Crown className="w-4 h-4" />
                  Passer Pro — 14 jours gratuits →
                </Link>
              </div>
            </div>
          )}

          {/* ── 6. Derniers playbooks ── */}
          {isDashboardLoading ? (
            <div className="animate-slide-up space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            </div>
          ) : (stats?.recentProgress?.length ?? 0) > 0 ? (
            <div className="animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Votre progression
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(stats?.recentProgress ?? []).map((p: { module_id: string; status: string; modules?: { title?: string; domain?: string; slug?: string } | null }) => (
                  <Link
                    key={p.module_id}
                    to={`/app/modules/${p.modules?.slug ?? p.module_id}`}
                    className="p-3.5 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {DOMAIN_LABELS[p.modules?.domain] ?? p.modules?.domain ?? "Module"}
                    </div>
                    <div
                      className="text-sm font-semibold leading-snug line-clamp-2"
                      style={{ color: "#E8E9F0" }}
                    >
                      {p.modules?.title ?? "Module"}
                    </div>
                    {p.status === "completed" && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs text-emerald-400">Complété</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            /* Empty state — premier lancement, aucune progression */
            <div
              className="animate-slide-up p-5 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}
            >
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium" style={{ color: "#E8E9F0" }}>
                Aucune progression pour l'instant
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Commencez votre premier playbook pour suivre votre progression ici.
              </p>
              <Link
                to="/app/modules"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Explorer les playbooks <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* ── 7. CyberPath 48h Challenge Banner ── */}
          <Link
            to="/app/cyberpath"
            className="block animate-slide-up group"
          >
            <div
              className="p-4 rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: "rgba(254,44,64,0.06)",
                border: "1px solid rgba(254,44,64,0.25)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #5257D8, #FE2C40)" }}
                  >
                    <Shield className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Défi Exclusif
                    </p>
                    <p className="text-sm font-bold" style={{ color: "#E8E9F0" }}>
                      CyberPath 48h — Zéro formateur humain
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Formation cyber complète guidée par l'IA. +700 XP.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </div>
            </div>
          </Link>

          {/* ── 8. NBA Card ── */}
          <div className="animate-slide-up">
            <NextBestActionCard />
          </div>

          {/* ── 9. Recent Artifacts ── */}
          <div className="animate-slide-up">
            <RecentArtifactsCard />
          </div>

          {/* ── 10. Neuro-Rewards + Hive Intelligence ── */}
          <div className="animate-slide-up">
            <NeuroRewardsDashboard />
          </div>

        </main>
      </div>
    </>
  );
}
