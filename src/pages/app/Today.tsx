/**
 * Today.tsx — Moteur de rétention quotidien
 *
 * Structure : Loading → Paywall (si non-pro) → Card (mission) → Playing → Done (feedback)
 *
 * Principes :
 * - 1 seule action visible à la fois
 * - Bénéfice concret AVANT l'action
 * - Feedback IA contextuel APRÈS la complétion
 * - Prochain pas explicite : mission suivante ou chat
 * - Progression tangible : streak + XP
 * - Paywall intelligent : montre la valeur avant de bloquer
 *
 * Supprimé par rapport à l'ancienne version :
 * - KittVisualizer + useVoiceEngine (bruit, dépendances lourdes)
 * - setTimeout(() => navigate("/app/dashboard"), 6000) sur done
 * - Paywall muet sans contenu
 * - VoiceEngine speak() sur chaque phase
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  ChevronRight, CheckCircle2, Flame, Loader2,
  Clock, Zap, ArrowRight, Star, RotateCcw,
  MessageSquare, Trophy, BookOpen, TrendingUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useStreak } from "@/hooks/useStreak";
import { useSubscription } from "@/hooks/useSubscription";
import { getLocalDateMinusDays } from "@/lib/dateUtils";
import { GhostTrainerFeedback, type GhostFeedback } from "@/components/feedback/GhostTrainerFeedback";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Mission {
  id: string;
  domain: string;
  level: string;
  title: string;
  description: string;
  mission_type: "action" | "quiz_flash" | "reflexe";
  content: Record<string, unknown>;
  jarvis_intro: string;
  jarvis_bravo: string;
  xp: number;
}

// ── Constantes d'affichage ─────────────────────────────────────────────────────
const DOMAIN_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  cyber:       { label: "🛡️ Cybersécurité",  color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  ia_pro:      { label: "🤖 IA au travail",    color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/30" },
  ia_perso:    { label: "💡 IA quotidienne",   color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30" },
  vibe_coding: { label: "⚡ Automatisation",   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
};

const TYPE_BENEFIT: Record<string, string> = {
  action:     "Action concrète à faire maintenant",
  quiz_flash: "Testez votre réflexe en 15 secondes",
  reflexe:    "Entraînez votre bon sens face à une vraie situation",
};

// ── Composant : Strip 7 jours ──────────────────────────────────────────────────
function WeekStrip({ last7Days }: { last7Days: string[] }) {
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = getLocalDateMinusDays(6 - i);
    return { date: d, done: last7Days.includes(d) };
  });
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const today = days[6];
  return (
    <div className="flex items-center justify-center gap-2">
      {days.map((day, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              day.done
                ? "bg-primary text-primary-foreground shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                : i === 6
                ? "border-2 border-primary/40 bg-primary/5"
                : "bg-muted/40 border border-border/30"
            }`}
          >
            {day.done ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : i === 6 && !today.done ? (
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
            ) : null}
          </div>
          <span className="text-[9px] text-muted-foreground">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Composant : Action Mission ─────────────────────────────────────────────────
function ActionMission({ content, onComplete }: { content: Record<string, unknown>; onComplete: () => void }) {
  const steps = content.steps as string[];
  const proof = content.proof as string;
  const [currentStep, setCurrentStep] = useState(0);
  const [allDone, setAllDone] = useState(false);

  return (
    <div className="space-y-4">
      {content.instruction && (
        <p className="text-sm text-muted-foreground leading-relaxed">{content.instruction as string}</p>
      )}
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-300 ${
              i < currentStep
                ? "border-emerald-500/30 bg-emerald-500/8 opacity-60"
                : i === currentStep
                ? "border-primary/50 bg-primary/8 shadow-[0_0_12px_hsl(var(--primary)/0.1)]"
                : "border-border/20 bg-card/20 opacity-35"
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
              i < currentStep ? "bg-emerald-500 text-white" : i === currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className="text-sm leading-relaxed">{step}</span>
          </div>
        ))}
      </div>

      {!allDone && currentStep < steps.length && (
        <Button
          className="w-full h-12 text-sm font-semibold gradient-primary"
          onClick={() => {
            if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
            else setAllDone(true);
          }}
        >
          {currentStep < steps.length - 1 ? "Fait, étape suivante →" : "C'est fait ! →"}
        </Button>
      )}

      {allDone && (
        <div className="space-y-3">
          {proof && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-400 leading-relaxed">
              ✅ {proof}
            </div>
          )}
          <Button className="w-full h-12 font-semibold gradient-primary" onClick={onComplete}>
            Mission validée ! 🎉
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Composant : Quiz Flash ─────────────────────────────────────────────────────
function QuizFlashMission({ content, onComplete }: { content: Record<string, unknown>; onComplete: (score: number) => void }) {
  const question = content.question as string;
  const choices = content.choices as string[];
  const correctIndex = content.correct_index as number;
  const explanation = content.explanation as string;
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (selected !== null) return;
    const t = setInterval(() => {
      setTimeLeft(s => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [selected]);

  return (
    <div className="space-y-5">
      {selected === null && (
        <div className="space-y-1">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000 rounded-full" style={{ width: `${(timeLeft / 15) * 100}%` }} />
          </div>
          <p className="text-xs text-right text-muted-foreground">{timeLeft}s</p>
        </div>
      )}

      <p className="text-base font-semibold leading-snug">{question}</p>

      <div className="grid gap-2.5">
        {choices.map((choice, i) => {
          let cls = "w-full min-h-[48px] text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ";
          if (selected === null) {
            cls += "border-border/50 bg-card/60 hover:border-primary/50 hover:bg-primary/8 cursor-pointer";
          } else if (i === correctIndex) {
            cls += "border-emerald-500/60 bg-emerald-500/12 text-emerald-400";
          } else if (i === selected) {
            cls += "border-destructive/50 bg-destructive/10 text-destructive";
          } else {
            cls += "border-border/20 bg-card/20 opacity-40";
          }
          return (
            <button key={i} className={cls} onClick={() => selected === null && setSelected(i)}>
              {choice}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="space-y-3">
          <div className={`p-3.5 rounded-xl border text-sm leading-relaxed ${
            selected === correctIndex
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          }`}>
            {selected === correctIndex ? "✅ " : "💡 "}{explanation}
          </div>
          <Button className="w-full h-12 font-semibold gradient-primary" onClick={() => onComplete(selected === correctIndex ? 100 : 50)}>
            Continuer →
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Composant : Réflexe ────────────────────────────────────────────────────────
function ReflexeMission({ content, onComplete }: { content: Record<string, unknown>; onComplete: (score: number) => void }) {
  const scenario = content.scenario as string;
  const choices = content.choices as { text: string; is_best: boolean; feedback: string }[];
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-sm leading-relaxed text-muted-foreground italic">
        "{scenario}"
      </div>
      <p className="text-sm font-semibold text-foreground">Que faites-vous ?</p>
      <div className="grid gap-2.5">
        {choices.map((choice, i) => {
          let cls = "w-full min-h-[48px] text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ";
          if (selected === null) {
            cls += "border-border/50 bg-card/60 hover:border-primary/50 hover:bg-primary/8 cursor-pointer";
          } else if (choice.is_best) {
            cls += "border-emerald-500/50 bg-emerald-500/10";
          } else if (i === selected) {
            cls += "border-amber-500/50 bg-amber-500/10";
          } else {
            cls += "border-border/20 opacity-40";
          }
          return (
            <div key={i}>
              <button className={cls} onClick={() => selected === null && setSelected(i)}>{choice.text}</button>
              {selected === i && (
                <div className={`mt-1.5 px-3 py-2 rounded-lg text-xs leading-relaxed ${choice.is_best ? "text-emerald-400" : "text-amber-400"}`}>
                  {choice.is_best ? "✅ " : "💡 "}{choice.feedback}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selected !== null && (
        <Button className="w-full h-12 font-semibold gradient-primary" onClick={() => onComplete(choices[selected].is_best ? 100 : 70)}>
          Continuer →
        </Button>
      )}
    </div>
  );
}

// ── Paywall intelligent ────────────────────────────────────────────────────────
function SmartPaywall() {
  const TEASERS = [
    { icon: "🎯", title: "Mission du jour adaptée", desc: "Chaque jour, une action calibrée à votre niveau. 5 minutes. Un résultat concret." },
    { icon: "🔥", title: "Streak et XP", desc: "Suivez votre progression jour après jour. Le cerveau retient mieux ce qu'il pratique régulièrement." },
    { icon: "📄", title: "Attestation de compétence", desc: "Après chaque module complété, générez votre preuve PDF à partager." },
    { icon: "🤖", title: "Feedback IA personnalisé", desc: "Après chaque action, l'IA analyse votre réponse et vous donne un retour utile." },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Aperçu flou de la mission — donne envie */}
      <div className="relative rounded-2xl overflow-hidden border border-primary/20">
        <div className="p-6 space-y-4 blur-sm select-none pointer-events-none opacity-60">
          <div className="flex gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400 font-semibold">🛡️ Cybersécurité</span>
            <span className="text-xs px-2.5 py-1 rounded-full border bg-muted/40 border-border/40 text-muted-foreground">⚡ Quiz Flash</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">Reconnaître un email de phishing en 3 secondes</h2>
            <p className="text-sm text-muted-foreground mt-1">Votre réflexe vaut mieux qu'un long discours. Test sur une vraie situation.</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>⏱ ~3 min</span><span>✨ +30 XP</span>
          </div>
          <div className="w-full h-12 rounded-xl bg-primary/30" />
        </div>
        {/* Overlay CTA */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[2px] p-6">
          <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-3">
            <Star className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-black text-foreground text-center mb-1">Mission Pro débloquée à 59€/mois</h3>
          <p className="text-sm text-muted-foreground text-center mb-5 max-w-xs">
            5 minutes par jour, un vrai progrès mesurable. Annulable à tout moment.
          </p>
          <Button asChild size="lg" className="w-full max-w-xs font-black shadow-glow gap-2">
            <Link to="/pricing">
              <Zap className="w-4 h-4" />
              Débloquer les missions →
            </Link>
          </Button>
        </div>
      </div>

      {/* Ce que vous obtenez */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
          Ce que vous débloquez
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TEASERS.map((t, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-card/60 border border-border/40">
              <span className="text-xl shrink-0">{t.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link to="/app/modules">Voir les modules gratuits →</Link>
      </Button>
    </div>
  );
}

// ── XP Counter ─────────────────────────────────────────────────────────────────
function XPCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let c = 0;
    const step = Math.max(1, Math.ceil(target / 25));
    const t = setInterval(() => {
      c = Math.min(c + step, target);
      setCount(c);
      if (c >= target) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [target]);
  return <span className="tabular-nums">+{count} XP</span>;
}

// ── Page principale ────────────────────────────────────────────────────────────
type Phase = "loading" | "card" | "playing" | "done" | "already_done";

export default function Today() {
  const { profile, session } = useAuth();
  const { streak, todayLog, loading: streakLoading, last7Days, completeMission } = useStreak();
  const { data: subscriptionData } = useSubscription();
  const isSubscribed = subscriptionData?.isActive ?? false;
  const navigate = useNavigate();

  const [mission, setMission] = useState<Mission | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [earnedXP, setEarnedXP] = useState(0);
  const [score, setScore] = useState<number | undefined>(undefined);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [ghostFeedback, setGhostFeedback] = useState<GhostFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const startTime = useRef<number>(Date.now());
  const [userProduction, setUserProduction] = useState<string>("");

  // ── Fetch mission ──────────────────────────────────────────────────────────
  const fetchMission = useCallback(async () => {
    if (!session?.user?.id) return;

    const [gapResult, guidedResult] = await Promise.all([
      supabase
        .from("skill_mastery")
        .select("p_mastery, skills(domain)")
        .eq("user_id", session.user.id)
        .order("p_mastery", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.rpc("get_guided_daily_mission", {
        _user_id:    session.user.id,
        _persona:    profile?.persona ?? "salarie",
        _level:      profile?.level ?? 1,
        _top_domain: null,
      }),
    ]);

    const topDomain = (gapResult.data?.skills as { domain?: string } | null)?.domain ?? null;
    let guided = guidedResult.data;

    if (topDomain) {
      const { data: refined } = await supabase.rpc("get_guided_daily_mission", {
        _user_id:    session.user.id,
        _persona:    profile?.persona ?? "salarie",
        _level:      profile?.level ?? 1,
        _top_domain: topDomain,
      });
      if (refined && typeof refined === "object" && !Array.isArray(refined) && !("error" in (refined as object))) {
        guided = refined;
      }
    }

    if (guided && typeof guided === "object" && !Array.isArray(guided) && !("error" in (guided as object))) {
      setMission(guided as unknown as Mission);
      setPhase("card");
      return;
    }

    // Fallback client
    const { data: fallback } = await supabase
      .from("daily_missions")
      .select("*")
      .eq("is_active", true)
      .limit(20);
    if (fallback?.length) {
      setMission(fallback[Math.floor(Math.random() * fallback.length)] as Mission);
      setPhase("card");
    }
  }, [session?.user?.id, profile]);

  useEffect(() => {
    if (streakLoading || !session?.user?.id) return;
    if (todayLog) { setPhase("already_done"); return; }
    fetchMission();
  }, [streakLoading, todayLog, session, fetchMission]);

  const handleStart = () => {
    startTime.current = Date.now();
    setPhase("playing");
  };

  // ── Feedback Ghost Trainer post-mission ───────────────────────────────────
  const fetchAIFeedback = useCallback(async (m: Mission, missionScore?: number) => {
    if (!session?.user?.id) return;
    setFeedbackLoading(true);
    try {
      const { data } = await supabase.functions.invoke("ghost-trainer-feedback", {
        body: {
          user_input: `Mission complétée : "${m.title}". Score : ${missionScore ?? "non mesuré"}/100. Type : ${m.mission_type}. Domaine : ${m.domain}.`,
          mission_title: m.title,
          mission_type: m.mission_type,
          score: missionScore,
          context: `Professionnel, domaine: ${m.domain}`,
        },
      });
      if (data?.feedback) setGhostFeedback(data.feedback as GhostFeedback);
    } catch {
      // Feedback optionnel — ne pas bloquer la page
    } finally {
      setFeedbackLoading(false);
    }
  }, [session?.user?.id]);

  const handleComplete = useCallback(async (missionScore?: number) => {
    if (!mission) return;
    const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
    setEarnedXP(mission.xp);
    setScore(missionScore);

    const prevLongest = streak?.longest_streak ?? 0;
    await completeMission(mission.id, mission.xp, missionScore, timeSpent);

    // Analytics
    supabase.from("analytics_events").insert({
      actor_user_id: session?.user?.id ?? null,
      org_id: profile?.org_id ?? null,
      event_name: "mission_completed",
      properties: { mission_id: mission.id, domain: mission.domain, mission_type: mission.mission_type, score: missionScore, xp: mission.xp, time_spent_seconds: timeSpent },
    }).then(() => {});

    const newStreak = (streak?.current_streak ?? 0) + 1;
    if (newStreak > prevLongest) setIsNewRecord(true);
    setPhase("done");

    // Feedback IA en background
    fetchAIFeedback(mission, missionScore);
  }, [mission, streak, completeMission, session, profile, fetchAIFeedback]);

  // ── Rendu ──────────────────────────────────────────────────────────────────
  const domainMeta = mission ? (DOMAIN_LABELS[mission.domain] ?? { label: mission.domain, color: "text-muted-foreground", bg: "bg-muted/40", border: "border-border" }) : null;

  if (phase === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <>
        <Helmet><title>Mission du jour – Formetoialia</title></Helmet>
        <div className="min-h-[calc(100vh-4rem)] py-8 px-4">
          <div className="max-w-xl mx-auto">
            <SmartPaywall />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Mission du jour – Formetoialia</title></Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-6 px-4">
        <main className="max-w-xl mx-auto space-y-6">

          {/* ── Streak header (compact) ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className={`w-5 h-5 ${(streak?.current_streak ?? 0) > 0 ? "text-orange-400" : "text-muted-foreground/40"}`} />
              <span className="font-black text-foreground tabular-nums">{streak?.current_streak ?? 0}</span>
              <span className="text-sm text-muted-foreground">jours d'affilée</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="font-semibold tabular-nums">{(streak?.total_xp ?? 0).toLocaleString("fr-FR")} XP</span>
            </div>
          </div>

          {/* ── Bande 7 jours ── */}
          <WeekStrip last7Days={last7Days} />

          {/* ═══ PHASE : DÉJÀ FAITE ═══ */}
          {phase === "already_done" && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-8 text-center space-y-4 animate-fade-in">
              <div className="text-5xl">✅</div>
              <div>
                <h1 className="text-xl font-black text-foreground">Mission du jour accomplie !</h1>
                <p className="text-sm text-muted-foreground mt-1">Revenez demain pour continuer votre progression.</p>
              </div>
              <div className="flex items-center justify-center gap-2 py-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-2xl font-black text-foreground tabular-nums">{streak?.current_streak ?? 0}</span>
                <span className="text-sm text-muted-foreground">jours d'affilée</span>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link to="/app/chat"><MessageSquare className="w-4 h-4" />Continuer avec l'assistant IA</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
                  <Link to="/app/modules"><BookOpen className="w-4 h-4 mr-1.5" />Explorer les modules</Link>
                </Button>
              </div>
            </div>
          )}

          {/* ═══ PHASE : CARTE MISSION ═══ */}
          {phase === "card" && mission && domainMeta && (
            <div className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden animate-fade-in"
              style={{ borderColor: "hsl(var(--border) / 0.5)" }}>

              {/* Bandeau domaine */}
              <div className={`px-5 py-2.5 flex items-center gap-2 border-b ${domainMeta.bg} ${domainMeta.border.replace("border-", "border-b-")}`}
                style={{ borderBottomWidth: "1px" }}>
                <span className={`text-xs font-semibold ${domainMeta.color}`}>{domainMeta.label}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">{TYPE_BENEFIT[mission.mission_type]}</span>
              </div>

              <div className="p-6 space-y-5">
                {/* Titre + description */}
                <div>
                  <h1 className="text-xl font-black text-foreground leading-tight">{mission.title}</h1>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{mission.description}</p>
                </div>

                {/* Méta */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    ~3 min
                  </span>
                  <span className="flex items-center gap-1.5 text-primary font-semibold">
                    <Zap className="w-3.5 h-3.5" />
                    +{mission.xp} XP
                  </span>
                </div>

                {/* CTA */}
                <Button
                  className="w-full h-13 text-base font-black gradient-primary shadow-glow gap-2"
                  onClick={handleStart}
                >
                  Commencer maintenant
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ PHASE : EN COURS ═══ */}
          {phase === "playing" && mission && (
            <div className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden animate-fade-in"
              style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
              <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground truncate pr-4">{mission.title}</h2>
                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-primary" />+{mission.xp} XP
                </span>
              </div>
              <div className="p-6">
                {mission.mission_type === "action"     && <ActionMission    content={mission.content} onComplete={() => handleComplete(100)} />}
                {mission.mission_type === "quiz_flash" && <QuizFlashMission content={mission.content} onComplete={handleComplete} />}
                {mission.mission_type === "reflexe"    && <ReflexeMission   content={mission.content} onComplete={handleComplete} />}
              </div>
            </div>
          )}

          {/* ═══ PHASE : TERMINÉE ═══ */}
          {phase === "done" && (
            <div className="space-y-5 animate-fade-in">

              {/* Score + XP */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-3"
                style={{ boxShadow: "0 0 32px hsl(var(--primary)/0.08)" }}>
                <div className="text-4xl">{score === 100 ? "🏆" : "✅"}</div>
                <div>
                  <p className="text-lg font-black text-foreground">
                    <XPCounter target={earnedXP} />
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Streak : <span className="font-bold text-foreground tabular-nums">{streak?.current_streak ?? 1}</span> jours
                    {isNewRecord && <span className="ml-2 text-primary font-bold">— record battu 🎉</span>}
                  </p>
                </div>
              </div>

              {/* Feedback IA */}
              <div className="rounded-2xl border border-border/50 bg-card/80 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Votre assistant</p>
                </div>
                {feedbackLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyse en cours…</span>
                  </div>
                ) : aiFeedback ? (
                  <p className="text-sm text-foreground leading-relaxed">{aiFeedback}</p>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {score === 100
                      ? "Excellent travail ! Chaque action compte. Continuez à ce rythme demain."
                      : "Bien joué. L'important, c'est de pratiquer régulièrement. Revenez demain pour consolider."}
                  </p>
                )}
              </div>

              {/* Prochain pas */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prochain pas</p>
                <Button asChild className="w-full h-12 font-semibold gap-2 gradient-primary">
                  <Link to="/app/chat">
                    <MessageSquare className="w-4 h-4" />
                    Approfondir avec l'assistant IA
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full h-11 font-medium gap-2">
                  <Link to="/app/modules">
                    <BookOpen className="w-4 h-4" />
                    Explorer un module complet
                  </Link>
                </Button>
                <button
                  onClick={() => navigate("/app/dashboard")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-1"
                >
                  <ArrowRight className="w-3 h-3" />
                  Retour au tableau de bord
                </button>
              </div>

              {/* Rappel de revenir demain */}
              <div className="rounded-xl border border-border/30 bg-muted/20 px-4 py-3 flex items-center gap-3">
                <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground leading-snug">
                  Nouvelle mission disponible demain. Le secret : <span className="font-semibold text-foreground">la régularité, pas l'intensité.</span>
                </p>
              </div>

              {/* Upsell discret (non-subscribés via missions offertes) */}
              {!isSubscribed && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground leading-snug">
                    <span className="font-semibold text-foreground">Passez Pro</span> — missions illimitées, feedback IA, attestations PDF.
                  </p>
                  <Button asChild size="sm" variant="outline" className="shrink-0 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10">
                    <Link to="/pricing"><Trophy className="w-3 h-3 mr-1" />59€/mois</Link>
                  </Button>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </>
  );
}
