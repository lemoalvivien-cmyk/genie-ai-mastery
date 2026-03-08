/**
 * Première Victoire en 120 secondes — Parcours gamifié post-inscription
 * 
 * Objectif : Amener le nouvel utilisateur à sa première action IA concrète
 * en moins de 2 minutes, créer le sentiment de "ça marche vraiment".
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Zap, ArrowRight, Trophy, Timer } from "lucide-react";

type Step = {
  id: number;
  emoji: string;
  title: string;
  description: string;
  action: string;
  duration: number; // secondes estimées
};

const STEPS: Step[] = [
  {
    id: 1,
    emoji: "🎯",
    title: "Pose ta première question à l'IA",
    description: 'Tape simplement : "Explique-moi ce qu\'est le phishing en 3 points"',
    action: "Ouvrir le chat IA",
    duration: 30,
  },
  {
    id: 2,
    emoji: "⚡",
    title: "Lance ton premier module",
    description: "Découvrez le module Cybersécurité en 5 minutes. 3 questions. Un score.",
    action: "Commencer le module",
    duration: 45,
  },
  {
    id: 3,
    emoji: "🏆",
    title: "Génère ton attestation",
    description: "Complète le quiz et obtiens ta première preuve de compétence PDF.",
    action: "Voir mon score",
    duration: 20,
  },
];

export default function FirstVictory() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [phase, setPhase] = useState<"ready" | "active" | "done">("ready");
  const [showConfetti, setShowConfetti] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const firstName = profile?.full_name?.split(" ")[0] ?? "toi";
  const totalDuration = STEPS.reduce((a, s) => a + s.duration, 0);
  const progressPercent = Math.min(
    100,
    Math.round((completedSteps.length / STEPS.length) * 100)
  );

  // Timer
  useEffect(() => {
    if (phase === "active") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const handleStart = () => {
    setPhase("active");
    setCurrentStep(0);
  };

  const handleStepAction = () => {
    const step = STEPS[currentStep];

    if (step.id === 1) {
      // Ouvrir chat avec prompt pré-rempli
      navigate("/app/chat?q=Explique-moi+ce+qu%27est+le+phishing+en+3+points");
      return;
    }
    if (step.id === 2) {
      navigate("/app/modules");
      return;
    }
    if (step.id === 3) {
      navigate("/app/modules");
      return;
    }
  };

  const handleMarkDone = async () => {
    const newCompleted = [...completedSteps, currentStep];
    setCompletedSteps(newCompleted);

    if (newCompleted.length === STEPS.length) {
      // Mission complète
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("done");
      setShowConfetti(true);
      // Mark welcome complete
      if (session?.user?.id) {
        await supabase
          .from("profiles")
          .update({ has_completed_welcome: true })
          .eq("id", session.user.id);
      }
    } else {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handleSkip = () => {
    navigate("/app/dashboard");
  };

  return (
    <>
      <Helmet><title>Première Victoire – GENIE IA</title></Helmet>

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-10%",
                background: ["hsl(var(--primary))", "hsl(var(--accent))", "#22C55E", "#F59E0B", "#F97316"][i % 5],
                animationName: "confettiFall",
                animationDuration: `${1.5 + Math.random() * 2}s`,
                animationDelay: `${Math.random() * 1.5}s`,
                animationFillMode: "forwards",
                animationTimingFunction: "ease-in",
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* ── Phase: READY ── */}
          {phase === "ready" && (
            <div className="text-center space-y-8">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: "hsl(var(--primary) / 0.15)" }}
                >
                  🚀
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                  Première victoire en 120&nbsp;secondes
                </h1>
                <p className="text-muted-foreground text-base max-w-sm">
                  Salut {firstName} ! 3 micro-actions pour vivre ta première expérience IA concrète.
                  Chrono lancé dès que tu cliques.
                </p>
              </div>

              {/* Steps preview */}
              <div className="space-y-3">
                {STEPS.map((step, i) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-4 rounded-xl px-4 py-3 text-left"
                    style={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  >
                    <span className="text-xl shrink-0">{step.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                      <p className="text-xs text-muted-foreground">~{step.duration}s</p>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: "hsl(var(--primary) / 0.1)",
                        color: "hsl(var(--primary))",
                      }}
                    >
                      Étape {i + 1}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="w-full font-black text-base py-5 shadow-glow"
                  style={{ background: "hsl(var(--accent))" }}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Lancer le chrono — Go ! 🏁
                </Button>
                <button
                  onClick={handleSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Passer — aller au dashboard
                </button>
              </div>
            </div>
          )}

          {/* ── Phase: ACTIVE ── */}
          {phase === "active" && (
            <div className="space-y-6">
              {/* Header with timer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  <span className="font-mono text-base font-bold text-foreground">
                    {formatTime(elapsedSeconds)}
                  </span>
                  <span>/ ~{formatTime(totalDuration)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <span>{completedSteps.length}/{STEPS.length} étapes</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                  }}
                />
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {STEPS.map((step, i) => {
                  const isDone = completedSteps.includes(i);
                  const isActive = i === currentStep && !isDone;
                  const isLocked = i > currentStep && !isDone;

                  return (
                    <div
                      key={step.id}
                      className="rounded-2xl p-5 transition-all duration-300"
                      style={{
                        background: isDone
                          ? "hsl(var(--primary) / 0.08)"
                          : isActive
                          ? "hsl(var(--card))"
                          : "hsl(var(--card) / 0.5)",
                        border: isDone
                          ? "1px solid hsl(var(--primary) / 0.4)"
                          : isActive
                          ? "2px solid hsl(var(--primary))"
                          : "1px solid hsl(var(--border) / 0.5)",
                        opacity: isLocked ? 0.4 : 1,
                        boxShadow: isActive ? "0 0 20px hsl(var(--primary) / 0.15)" : "none",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-2xl shrink-0 mt-0.5">
                          {isDone ? "✅" : step.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-foreground">{step.title}</p>
                            {isDone && (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                          {isActive && (
                            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                              <Button
                                onClick={handleStepAction}
                                size="sm"
                                className="font-semibold"
                                style={{ background: "hsl(var(--primary))" }}
                              >
                                <ArrowRight className="w-3 h-3 mr-1.5" />
                                {step.action}
                              </Button>
                              <Button
                                onClick={handleMarkDone}
                                variant="outline"
                                size="sm"
                                className="font-semibold"
                              >
                                ✓ C'est fait !
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSkip}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Continuer plus tard → dashboard
              </button>
            </div>
          )}

          {/* ── Phase: DONE ── */}
          {phase === "done" && (
            <div className="text-center space-y-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl animate-bounce"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.2))" }}
                >
                  🏆
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
                    Première victoire ! 🎉
                  </h1>
                  <p className="text-muted-foreground">
                    Accompli en{" "}
                    <span className="font-bold text-primary font-mono">
                      {formatTime(elapsedSeconds)}
                    </span>
                    {elapsedSeconds <= 120 && (
                      <span className="ml-1 text-accent font-bold">
                        — record battu ! 🚀
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Score card */}
              <div
                className="rounded-2xl p-6 text-left space-y-3"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--primary) / 0.3)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <p className="font-bold text-foreground">Ton score de démarrage</p>
                </div>
                {STEPS.map((step) => (
                  <div key={step.id} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">{step.title}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => navigate("/app/dashboard")}
                  size="lg"
                  className="w-full font-black text-base py-5"
                  style={{ background: "hsl(var(--accent))" }}
                >
                  Découvrir mon dashboard →
                </Button>
                <Button
                  onClick={() => navigate("/app/chat")}
                  variant="outline"
                  size="lg"
                  className="w-full font-semibold"
                >
                  💬 Continuer avec l'IA
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
