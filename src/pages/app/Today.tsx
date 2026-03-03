import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { ChevronRight, CheckCircle2, Flame, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useStreak } from "@/hooks/useStreak";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import KittVisualizer, { KittState } from "@/components/chat/KittVisualizer";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallOverlay } from "@/components/PaywallOverlay";
import { getLocalDateMinusDays } from "@/lib/dateUtils";

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

const DOMAIN_COLORS: Record<string, string> = {
  cyber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ia_pro: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  ia_perso: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  vibe_coding: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const DOMAIN_LABELS: Record<string, string> = {
  cyber: "🛡️ Cybersécurité",
  ia_pro: "🤖 IA Pro",
  ia_perso: "💡 IA Perso",
  vibe_coding: "⚡ Vibe Coding",
};

const TYPE_LABELS: Record<string, string> = {
  action: "✅ Action",
  quiz_flash: "⚡ Quiz Flash",
  reflexe: "🎯 Réflexe",
};

// ── XP Counter animation ───────────────────────────────────────────────────────
function XPCounter({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = Math.ceil(target / 30);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(current);
      if (current >= target) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <div className="text-center">
      <div className="text-5xl font-black text-gradient">+{count}</div>
      <div className="text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// ── Action Mission ─────────────────────────────────────────────────────────────
function ActionMission({
  content,
  onComplete,
}: {
  content: Record<string, unknown>;
  onComplete: () => void;
}) {
  const steps = content.steps as string[];
  const proof = content.proof as string;
  const [currentStep, setCurrentStep] = useState(0);
  const [allDone, setAllDone] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{content.instruction as string}</p>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
              i < currentStep
                ? "border-emerald-500/40 bg-emerald-500/10 opacity-60"
                : i === currentStep
                ? "border-primary/50 bg-primary/10"
                : "border-border/30 bg-card/30 opacity-40"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                i < currentStep ? "bg-emerald-500 text-white" : i === currentStep ? "gradient-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className="text-sm leading-relaxed pt-0.5">{step}</span>
          </div>
        ))}
      </div>

      {!allDone && currentStep < steps.length && (
        <Button
          className="w-full h-14 text-base gradient-primary text-primary-foreground font-semibold"
          onClick={() => {
            if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
            else setAllDone(true);
          }}
        >
          Fait ✓
        </Button>
      )}

      {allDone && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-400">
            {proof}
          </div>
          <Button className="w-full h-14 text-base gradient-primary text-primary-foreground font-semibold" onClick={onComplete}>
            Mission terminée ! 🎉
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Quiz Flash Mission ─────────────────────────────────────────────────────────
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
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [selected]);

  const handleSelect = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
  };

  return (
    <div className="space-y-5">
      {/* Timer bar */}
      {selected === null && (
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-1000"
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          />
        </div>
      )}

      <p className="text-lg font-semibold leading-snug">{question}</p>

      <div className="grid gap-3">
        {choices.map((choice, i) => {
          let cls = "w-full min-h-[52px] text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ";
          if (selected === null) {
            cls += "border-border/50 bg-card/60 hover:border-primary/50 hover:bg-primary/10";
          } else if (i === correctIndex) {
            cls += "border-emerald-500/60 bg-emerald-500/15 text-emerald-400";
          } else if (i === selected) {
            cls += "border-destructive/60 bg-destructive/15 text-destructive";
          } else {
            cls += "border-border/30 bg-card/30 opacity-50";
          }
          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={selected !== null && timeLeft === 0}>
              {choice}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border text-sm ${selected === correctIndex ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
            {selected === correctIndex ? "✅ " : "💡 "}{explanation}
          </div>
          <Button
            className="w-full h-14 text-base gradient-primary text-primary-foreground font-semibold"
            onClick={() => onComplete(selected === correctIndex ? 100 : 50)}
          >
            Continuer →
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Reflexe Mission ───────────────────────────────────────────────────────────
function ReflexeMission({ content, onComplete }: { content: Record<string, unknown>; onComplete: (score: number) => void }) {
  const scenario = content.scenario as string;
  const choices = content.choices as { text: string; is_best: boolean; feedback: string }[];
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-card/60 border border-border/50 text-sm leading-relaxed italic text-muted-foreground">
        "{scenario}"
      </div>
      <p className="text-sm font-medium">Que fais-tu ?</p>
      <div className="grid gap-3">
        {choices.map((choice, i) => {
          let cls = "w-full min-h-[52px] text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ";
          if (selected === null) {
            cls += "border-border/50 bg-card/60 hover:border-primary/50 hover:bg-primary/10";
          } else if (choice.is_best) {
            cls += "border-emerald-500/60 bg-emerald-500/15";
          } else if (i === selected) {
            cls += "border-amber-500/60 bg-amber-500/15";
          } else {
            cls += "border-border/30 opacity-50";
          }
          return (
            <div key={i}>
              <button className={cls} onClick={() => selected === null && setSelected(i)}>
                {choice.text}
              </button>
              {selected === i && (
                <div className={`mt-2 px-4 py-2 rounded-lg text-xs leading-relaxed ${choice.is_best ? "text-emerald-400" : "text-amber-400"}`}>
                  {choice.is_best ? "✅ " : "💡 "}{choice.feedback}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selected !== null && (
        <Button
          className="w-full h-14 text-base gradient-primary text-primary-foreground font-semibold"
          onClick={() => onComplete(choices[selected].is_best ? 100 : 70)}
        >
          Continuer →
        </Button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type Phase = "loading" | "card" | "playing" | "done" | "already_done";

export default function Today() {
  const { profile, signOut, session } = useAuth();
  const { streak, todayLog, loading: streakLoading, completeMission } = useStreak();
  const { data: subscriptionData } = useSubscription();
  const isSubscribed = subscriptionData?.isActive ?? false;
  const navigate = useNavigate();

  const [mission, setMission] = useState<Mission | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [kittState, setKittState] = useState<KittState>("idle");
  const [earnedXP, setEarnedXP] = useState(0);
  const [score, setScore] = useState<number | undefined>(undefined);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const startTime = useRef<number>(Date.now());

  const voiceEnabled = profile?.voice_enabled ?? true;
  const { speak, getAnalyser, isSpeaking } = useVoiceEngine({
    onTranscript: () => {},
    onStateChange: setKittState,
    voiceEnabled,
  });

  // Fetch mission
  useEffect(() => {
    if (streakLoading || !session?.user?.id) return;

    if (todayLog) {
      setPhase("already_done");
      return;
    }

    fetchMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streakLoading, todayLog, session]);

  const fetchMission = async () => {
    if (!session?.user?.id) return;
    const sevenDaysAgo = getLocalDateMinusDays(7);

    // Get missions not done in 7 days
    const { data: recentLogs } = await supabase
      .from("user_daily_log")
      .select("mission_id")
      .eq("user_id", session.user.id)
      .gte("completed_date", sevenDaysAgo);

    const recentIds = (recentLogs ?? []).map((l) => l.mission_id);

    let query = supabase
      .from("daily_missions")
      .select("*")
      .eq("is_active", true);

    // Filter by user's domain preferences based on persona
    const domainMap: Record<string, string[]> = {
      dirigeant: ["cyber", "ia_pro"],
      salarie: ["cyber", "ia_pro", "ia_perso"],
      jeune: ["vibe_coding", "ia_perso"],
      independant: ["ia_pro", "vibe_coding"],
      parent: ["ia_perso", "cyber"],
      senior: ["cyber", "ia_perso"],
    };
    const persona = profile?.persona ?? null;
    const preferredDomains = persona && domainMap[persona] ? domainMap[persona] : ["cyber", "ia_pro", "ia_perso", "vibe_coding"];

    query = query.in("domain", preferredDomains);

    if (recentIds.length > 0) {
      query = query.not("id", "in", `(${recentIds.join(",")})`);
    }

    const { data: missions } = await query;

    if (!missions || missions.length === 0) {
      // Recycle — pick any random mission
      const { data: anyMissions } = await supabase.from("daily_missions").select("*").eq("is_active", true).limit(30);
      if (anyMissions && anyMissions.length > 0) {
        const picked = anyMissions[Math.floor(Math.random() * anyMissions.length)];
        setMission(picked as Mission);
        setPhase("card");
      }
    } else {
      const picked = missions[Math.floor(Math.random() * missions.length)];
      setMission(picked as Mission);
      setPhase("card");
    }
  };

  const handleStart = () => {
    startTime.current = Date.now();
    setPhase("playing");
    setKittState("speaking");
    if (mission?.jarvis_intro) speak(mission.jarvis_intro);
  };

  const handleComplete = async (missionScore?: number) => {
    if (!mission) return;
    const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
    const xp = mission.xp;
    setEarnedXP(xp);
    setScore(missionScore);
    const prevLongest = streak?.longest_streak ?? 0;
    await completeMission(mission.id, xp, missionScore, timeSpent);
    // Track mission completion
    try {
      await supabase.from("analytics_events").insert({
        actor_user_id: session?.user?.id ?? null,
        org_id: profile?.org_id ?? null,
        event_name: "mission_completed",
        properties: {
          mission_id: mission.id,
          domain: mission.domain,
          mission_type: mission.mission_type,
          score: missionScore,
          xp,
          time_spent_seconds: timeSpent,
        },
      });
    } catch { /* silent */ }
    // Check if new record
    const newStreak = (streak?.current_streak ?? 0) + 1;
    if (newStreak > prevLongest) setIsNewRecord(true);
    setPhase("done");
    setKittState("speaking");
    if (mission?.jarvis_bravo) speak(mission.jarvis_bravo);
    setTimeout(() => navigate("/app/dashboard"), 6000);
  };

  // Sync kitt state with speaking
  useEffect(() => {
    if (!isSpeaking && kittState === "speaking") setKittState("idle");
  }, [isSpeaking, kittState]);

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Hard paywall: missions require Pro ────────────────────────────────────────
  if (!isSubscribed) {
    return (
      <>
        <Helmet><title>Mission du jour – GENIE IA</title></Helmet>
        <div className="gradient-hero min-h-full flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <PaywallOverlay
              feature="Missions Quotidiennes"
              description="5 minutes par jour. Streak, XP, conformité AI Act & NIS2 — réservé aux membres Pro."
            >
              <div className="rounded-2xl border border-border/40 bg-card/60 p-8 space-y-4">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
                <div className="h-10 bg-muted rounded-xl w-full mt-4" />
              </div>
            </PaywallOverlay>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Mission du jour – GENIE IA</title></Helmet>
      <div className="gradient-hero min-h-full">
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
          {/* KITT */}
          <div className="flex justify-center mb-6">
            <KittVisualizer state={kittState} analyserNode={getAnalyser()} />
          </div>

          {/* ALREADY DONE */}
          {phase === "already_done" && (
            <div className="text-center space-y-6 animate-slide-up">
              <div className="text-6xl">🎉</div>
              <h1 className="text-2xl font-bold">Mission du jour accomplie !</h1>
              <p className="text-muted-foreground">Tu as déjà fait ta mission aujourd'hui. Reviens demain pour continuer ta série !</p>
              <div className="flex items-center justify-center gap-2 text-3xl font-black">
                <Flame className="w-8 h-8 text-orange-400" />
                <span className="text-gradient">{streak?.current_streak ?? 0}</span>
                <span className="text-base font-normal text-muted-foreground">jours d'affilée</span>
              </div>
              <Button asChild className="w-full h-14 gradient-primary text-primary-foreground font-semibold">
                <Link to="/app/dashboard">Retour au Dashboard</Link>
              </Button>
            </div>
          )}

          {/* MISSION CARD */}
          {phase === "card" && mission && (
            <div className="space-y-6 animate-slide-up">
              <div className="p-6 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-card space-y-5">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${DOMAIN_COLORS[mission.domain] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {DOMAIN_LABELS[mission.domain] ?? mission.domain}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-border/40 bg-muted/40 text-muted-foreground">
                    {TYPE_LABELS[mission.mission_type]}
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl font-bold leading-snug">{mission.title}</h1>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{mission.description}</p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>⏱ ~3 min</span>
                  <span>✨ +{mission.xp} XP</span>
                </div>

                <Button
                  className="w-full h-14 text-base gradient-primary text-primary-foreground font-semibold shadow-glow"
                  onClick={handleStart}
                >
                  C'est parti ! <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>

              {/* Streak display */}
              {(streak?.current_streak ?? 0) > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>{streak?.current_streak} jours d'affilée — continue comme ça !</span>
                </div>
              )}
            </div>
          )}

          {/* PLAYING */}
          {phase === "playing" && mission && (
            <div className="space-y-6 animate-slide-up">
              <div className="p-6 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-card space-y-5">
                <div>
                  <h2 className="text-xl font-bold">{mission.title}</h2>
                </div>

                {mission.mission_type === "action" && (
                  <ActionMission content={mission.content} onComplete={() => handleComplete(100)} />
                )}
                {mission.mission_type === "quiz_flash" && (
                  <QuizFlashMission content={mission.content} onComplete={(s) => handleComplete(s)} />
                )}
                {mission.mission_type === "reflexe" && (
                  <ReflexeMission content={mission.content} onComplete={(s) => handleComplete(s)} />
                )}
              </div>
            </div>
          )}

          {/* DONE */}
          {phase === "done" && (
            <div className="text-center space-y-8 animate-slide-up">
              <div className="text-6xl">{score === 100 ? "🏆" : "✅"}</div>
              <XPCounter target={earnedXP} label="XP gagnés" />
              <div className="flex items-center justify-center gap-2 text-3xl font-black">
                <Flame className="w-8 h-8 text-orange-400" />
                <span className="text-gradient">{streak?.current_streak ?? 1}</span>
                <span className="text-base font-normal text-muted-foreground">jours d'affilée !</span>
              </div>
              {isNewRecord && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold animate-pulse">
                  🎉 Nouveau record !
                </div>
              )}

              {!isSubscribed && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-sm text-left">
                  <p className="font-semibold mb-1">Avec GENIE Pro, débloquez des missions illimitées et boostez votre progression →</p>
                  <Link to="/pricing" className="text-primary hover:underline font-medium">
                    Voir les offres Pro
                  </Link>
                </div>
              )}

              <Button asChild className="w-full h-14 gradient-primary text-primary-foreground font-semibold">
                <Link to="/app/dashboard">
                  <CheckCircle2 className="mr-2 w-5 h-5" />
                  Retour au Dashboard
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">Redirection automatique dans quelques secondes...</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
