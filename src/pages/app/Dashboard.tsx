import { Helmet } from "react-helmet-async";
import { BookOpen, BarChart3, MessageSquare, Shield, Users, Code2, Sparkles, Flame, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useStreak } from "@/hooks/useStreak";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function MiniCalendar({ last7Days }: { last7Days: string[] }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().split("T")[0];
    const label = ["D", "L", "M", "M", "J", "V", "S"][d.getDay()];
    const done = last7Days.includes(iso);
    days.push({ label, done, iso });
  }
  return (
    <div className="flex gap-1.5">
      {days.map((d) => (
        <div key={d.iso} className="flex flex-col items-center gap-1">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              d.done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            {d.done ? "✓" : ""}
          </div>
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { profile, signOut, session } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "vous";
  const { isManager } = useAuth();
  const { streak, todayLog, loading: streakLoading, last7Days } = useStreak();
  const userId = session?.user?.id;

  const { data: statsData } = useQuery({
    queryKey: ["dashboard-stats", userId],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { count: completedModules } = await supabase
        .from("progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("status", "completed");
      const { data: scores } = await supabase
        .from("progress")
        .select("score")
        .eq("user_id", userId!)
        .eq("status", "completed")
        .not("score", "is", null);
      const avgScore = scores && scores.length > 0
        ? Math.round(scores.reduce((s, r) => s + (r.score ?? 0), 0) / scores.length)
        : null;
      const { count: attestations } = await supabase
        .from("attestations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!);
      return { completedModules: completedModules ?? 0, avgScore, attestations: attestations ?? 0 };
    },
  });

  const missionDone = !!todayLog;

  const cards = [
    { icon: BookOpen, title: "Modules", description: "Continuez votre apprentissage", href: "/app/modules", color: "from-indigo-500/20 to-purple-500/20" },
    { icon: MessageSquare, title: "Chat IA", description: "Posez vos questions à votre Génie", href: "/app/chat", color: "from-cyan-500/20 to-teal-500/20" },
    { icon: BarChart3, title: "Progression", description: "Suivez vos statistiques", href: "/app/progress", color: "from-emerald-500/20 to-green-500/20" },
    { icon: Shield, title: "Cybersécurité", description: "Modules sécurité dédiés", href: "/app/modules?domain=cyber", color: "from-amber-500/20 to-orange-500/20" },
    { icon: Code2, title: "Vibe Coding", description: "Créez vos apps avec l'IA", href: "/app/modules?domain=vibe_coding", color: "from-emerald-500/20 to-teal-500/20", isNew: true },
    ...(isManager ? [{ icon: Users, title: "Espace Manager", description: "Gérez votre équipe", href: "/manager", color: "from-violet-500/20 to-pink-500/20" }] : []),
  ];

  // XP level calc (simple: 100 XP per level)
  const totalXP = streak?.total_xp ?? 0;
  const level = Math.floor(totalXP / 100) + 1;
  const xpInLevel = totalXP % 100;

  return (
    <>
      <Helmet>
        <title>Dashboard – GENIE IA</title>
      </Helmet>
      <div className="gradient-hero min-h-full">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
          {/* Welcome message */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary mb-3">
              ✨ Bienvenue sur GENIE IA
            </div>
            <h1 className="text-3xl font-bold">
              Bienvenue <span className="text-gradient">{firstName}</span> !
            </h1>
            <p className="text-muted-foreground mt-1">Votre Génie est prêt. Que voulez-vous apprendre aujourd'hui ?</p>
          </div>

          {/* Mon Parcours streak card */}
          <div className="p-5 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-card animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm text-primary">Mon parcours</h2>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              {/* Streak */}
              <div className="flex items-center gap-2">
                <Flame className="w-8 h-8 text-orange-400" />
                <div>
                  <div className="text-3xl font-black text-gradient">{streakLoading ? "—" : (streak?.current_streak ?? 0)}</div>
                  <div className="text-xs text-muted-foreground">jours d'affilée</div>
                </div>
              </div>

              {/* Mini calendar */}
              <div className="flex-1 min-w-0">
                <MiniCalendar last7Days={last7Days} />
              </div>

              {/* XP */}
              <div className="text-right">
                <div className="text-2xl font-black text-gradient">{totalXP}</div>
                <div className="text-xs text-muted-foreground">XP total · Niv. {level}</div>
                <div className="w-20 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${xpInLevel}%` }} />
                </div>
              </div>
            </div>

            <Link
              to="/app/today"
              className="mt-4 flex items-center justify-between w-full px-4 py-3 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {missionDone ? "Mission du jour ✓" : "Mission du jour →"}
                </span>
                {!missionDone && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Modules complétés", value: String(statsData?.completedModules ?? 0) },
              { label: "Série en cours", value: `${streak?.current_streak ?? 0} 🔥` },
              { label: "Score moyen", value: statsData?.avgScore ? `${statsData.avgScore}%` : "—" },
              { label: "Attestations", value: String(statsData?.attestations ?? 0) },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm">
                <div className="text-2xl font-bold text-gradient">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.href}
                  className={`group flex items-center gap-4 p-5 rounded-2xl border border-border/50 bg-gradient-to-br ${card.color} hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 shadow-card relative overflow-hidden`}
                >
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center group-hover:shadow-glow transition-all">
                    <Icon className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {card.title}
                      {"isNew" in card && card.isNew && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                          NOUVEAU
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{card.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}
