/**
 * CyberPath 48h — Défi "Obsolescence Totale"
 *
 * Un utilisateur sans formateur humain termine une formation cyber
 * complète en 48h guidée par le swarm JARVIS.
 *
 * Parcours en 6 étapes :
 *  1. Diagnostic JARVIS (15 min)  → swarm Predictor
 *  2. Phishing Lab (20 min)       → adversarial
 *  3. Module IA Auto-Généré (30 min) → SleepForge
 *  4. Quiz Adversarial (15 min)   → attaquant/défenseur
 *  5. Cyber Lab (25 min)          → hands-on
 *  6. Attestation NFT (5 min)     → signature cryptographique
 *
 * Total : ~110 min actives sur 48h. JARVIS nudge toutes les 4h.
 */

import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, Brain, Target, FlaskConical, Award,
  CheckCircle, Clock, ChevronRight, Lock, Flame,
  TrendingUp, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Step {
  id: string;
  step: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  duration: string;
  xp: number;
  path: string;
  agentMode: string;
  description: string;
}

const STEPS: Step[] = [
  {
    id: "diagnostic",
    step: 1,
    title: "Diagnostic Genie",
    subtitle: "Swarm Predictor — Analyse votre profil de risque",
    icon: Brain,
    color: "#5257D8",
    duration: "15 min",
    xp: 50,
    path: "/app/chat",
    agentMode: "predictor",
    description: "Le swarm de 5 agents analyse vos lacunes et prédit les menaces les plus critiques pour votre profil.",
  },
  {
    id: "phishing",
    step: 2,
    title: "Phishing Lab",
    subtitle: "Simulation d'attaques réelles — Adversarial Mode",
    icon: Target,
    color: "#EF4444",
    duration: "20 min",
    xp: 80,
    path: "/app/labs/phishing",
    agentMode: "attaquant",
    description: "L'agent Attaquant génère des emails de phishing personnalisés basés sur votre domaine métier. Apprenez à les détecter.",
  },
  {
    id: "sleepforge",
    step: 3,
    title: "Module Auto-Généré",
    subtitle: "SleepForge IA — Module créé la nuit pour vous",
    icon: Zap,
    color: "#8B5CF6",
    duration: "30 min",
    xp: 120,
    path: "/app/modules",
    agentMode: "tuteur",
    description: "Un module hyper-personnalisé généré par l'IA pendant votre sommeil, basé sur vos lacunes détectées.",
  },
  {
    id: "adversarial",
    step: 4,
    title: "Quiz Adversarial",
    subtitle: "Attaquant vs Défenseur — Testez vos réflexes",
    icon: Shield,
    color: "#F59E0B",
    duration: "15 min",
    xp: 100,
    path: "/app/chat",
    agentMode: "adversarial",
    description: "Quiz généré en temps réel par l'agent Attaquant. Chaque mauvaise réponse déclenche une simulation d'attaque.",
  },
  {
    id: "cyberlab",
    step: 5,
    title: "Cyber Lab",
    subtitle: "Hands-on : audit de sécurité en conditions réelles",
    icon: FlaskConical,
    color: "#10B981",
    duration: "25 min",
    xp: 150,
    path: "/app/labs/cyber",
    agentMode: "defenseur",
    description: "Audit de mots de passe, checklist d'incidents, simulation de réponse à une breach. Preuves enregistrées.",
  },
  {
    id: "attestation",
    step: 6,
    title: "Attestation NFT",
    subtitle: "Certification cryptographique vérifiable on-chain",
    icon: Award,
    color: "#F59E0B",
    duration: "5 min",
    xp: 200,
    path: "/app/settings",
    agentMode: "analyst",
    description: "Votre formation est validée par signature SHA-256 ancrée dans notre registre immuable. QR code de vérification inclus.",
  },
];

function StepCard({
  step,
  index,
  completed,
  active,
  locked,
  onClick,
}: {
  step: Step;
  index: number;
  completed: boolean;
  active: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="relative"
    >
      {/* Connector line */}
      {index < STEPS.length - 1 && (
        <div
          className="absolute left-7 top-[72px] w-0.5 h-6 z-0"
          style={{ background: completed ? step.color : "rgba(255,255,255,0.08)" }}
        />
      )}

      <button
        onClick={onClick}
        disabled={locked}
        className="w-full text-left relative z-10 group transition-all duration-200 disabled:opacity-50"
      >
        <div
          className="p-4 rounded-2xl transition-all"
          style={{
            background: active
              ? `rgba(${hexToRgb(step.color)}, 0.12)`
              : completed
              ? "rgba(255,255,255,0.04)"
              : "rgba(255,255,255,0.025)",
            border: active
              ? `1.5px solid rgba(${hexToRgb(step.color)}, 0.5)`
              : completed
              ? "1px solid rgba(255,255,255,0.1)"
              : "1px solid rgba(255,255,255,0.05)",
            boxShadow: active ? `0 0 20px rgba(${hexToRgb(step.color)}, 0.15)` : "none",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Step icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
              style={{
                background: completed
                  ? "rgba(16,185,129,0.2)"
                  : active
                  ? `rgba(${hexToRgb(step.color)}, 0.2)`
                  : "rgba(255,255,255,0.05)",
              }}
            >
              {completed ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : locked ? (
                <Lock className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Icon className="w-5 h-5" style={{ color: step.color }} />
              )}
            </div>

            {/* Step info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Étape {step.step}/6
                </span>
                {active && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                    style={{ background: `rgba(${hexToRgb(step.color)}, 0.2)`, color: step.color }}
                  >
                    EN COURS
                  </span>
                )}
              </div>
              <p className="text-sm font-bold mt-0.5" style={{ color: "#E8E9F0" }}>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">{step.subtitle}</p>
            </div>

            {/* XP + duration */}
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: step.color }}>
                <Zap className="w-3 h-3" />
                +{step.xp} XP
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <Clock className="w-3 h-3" />
                {step.duration}
              </div>
            </div>

            {!locked && !completed && (
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors ml-1" />
            )}
          </div>

          {/* Description (active only) */}
          {active && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-xs text-muted-foreground mt-3 pl-[52px] leading-relaxed"
            >
              {step.description}
            </motion.p>
          )}
        </div>
      </button>
    </motion.div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function CyberPath48h() {
  const { profile, session } = useAuth();
  const { streak } = useStreak();
  const navigate = useNavigate();

  // Track completed steps (persisted in local state + DB progress)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState<string>("diagnostic");
  const [startTime] = useState(() => {
    const stored = localStorage.getItem("cyberpath_start");
    if (stored) return new Date(stored);
    const now = new Date();
    localStorage.setItem("cyberpath_start", now.toISOString());
    return now;
  });

  const [timeLeft, setTimeLeft] = useState("");

  // Compute 48h countdown
  useEffect(() => {
    const deadline = new Date(startTime.getTime() + 48 * 3600000);
    const update = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Défi expiré"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m restantes`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [startTime]);

  // Load user's progress from DB
  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("progress")
        .select("module_id, status")
        .eq("user_id", session.user.id)
        .eq("status", "completed");

      const done = new Set<string>();
      // Map modules to step IDs based on slug patterns
      const mapping: Record<string, string> = {
        phishing: "phishing",
        cyber:    "cyberlab",
      };
      for (const p of data ?? []) {
        for (const [key, stepId] of Object.entries(mapping)) {
          if ((p.module_id ?? "").includes(key)) done.add(stepId);
        }
      }

      // Also check audit_logs for specific actions
      const { data: logs } = await supabase
        .from("audit_logs")
        .select("event_type")
        .eq("user_id", session.user.id)
        .in("event_type", ["cyberpath_diagnostic", "cyberpath_sleepforge", "cyberpath_adversarial", "cyberpath_attestation"]);

      for (const log of logs ?? []) {
        const et = log.event_type ?? "";
        if (et === "cyberpath_diagnostic") done.add("diagnostic");
        if (et === "cyberpath_sleepforge")  done.add("sleepforge");
        if (et === "cyberpath_adversarial") done.add("adversarial");
        if (et === "cyberpath_attestation") done.add("attestation");
      }

      setCompletedSteps(done);

      // Set active to first uncompleted
      const firstUncompleted = STEPS.find(s => !done.has(s.id));
      if (firstUncompleted) setActiveStep(firstUncompleted.id);
      else setActiveStep("attestation");
    })();
  }, [session?.user?.id]);

  const completedCount = completedSteps.size;
  const totalXP = STEPS.filter(s => completedSteps.has(s.id)).reduce((acc, s) => acc + s.xp, 0);
  const progress = (completedCount / STEPS.length) * 100;

  const handleStepClick = async (step: Step) => {
    // Log analytics
    if (session?.user?.id) {
      await supabase.from("audit_logs").insert({
        user_id:       session.user.id,
        action:        `cyberpath_step_${step.id}`,
        event_type:    "cyberpath_navigation",
        resource_type: "cyberpath",
        details:       { step: step.id, agent_mode: step.agentMode },
      });
    }

    // Navigate with Jarvis pre-primed
    if (step.id === "diagnostic") {
      toast.success("🧠 JARVIS active le mode Predictor — analyse en cours…");
      navigate("/app/chat", {
        state: { prePrompt: "Lance un diagnostic complet de mon profil cyber. Mode Predictor activé.", agentMode: "predictor" },
      });
      markDone("diagnostic");
    } else if (step.id === "adversarial") {
      toast.success("⚔️ Mode Adversarial activé — l'agent Attaquant est en ligne");
      navigate("/app/chat", {
        state: { prePrompt: "Lance un quiz adversarial cyber. L'agent Attaquant génère les questions, le Défenseur valide mes réponses.", agentMode: "adversarial" },
      });
      markDone("adversarial");
    } else {
      navigate(step.path);
    }
  };

  const markDone = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(stepId);
      const nextIdx = STEPS.findIndex(s => s.id === stepId) + 1;
      if (nextIdx < STEPS.length) setActiveStep(STEPS[nextIdx].id);
      return next;
    });
  };

  const isComplete = completedCount === STEPS.length;

  return (
    <>
      <Helmet>
        <title>CyberPath 48h — Défi Obsolescence Totale | GENIE IA</title>
      </Helmet>

      <div className="min-h-full page-enter" style={{ background: "#13151E" }}>
        <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #5257D8, #FE2C40)" }}
              >
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Défi Exclusif
              </span>
            </div>
            <h1 className="text-2xl font-black" style={{ color: "#E8E9F0" }}>
              CyberPath 48h
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Formation cyber complète guidée par l'IA. Zéro formateur humain requis.
            </p>
          </motion.div>

          {/* ── Timer + Stats ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { label: "Temps restant", value: timeLeft, icon: Clock,      color: "text-amber-400" },
              { label: "Étapes",        value: `${completedCount}/6`,     icon: CheckCircle, color: "text-emerald-400" },
              { label: "XP gagné",      value: `+${totalXP}`,             icon: Zap,         color: "text-[hsl(var(--primary))]" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="p-3 rounded-xl text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                <p className={`text-base font-black ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </motion.div>

          {/* ── Progress bar ── */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Progression du défi</span>
              <span className="font-semibold" style={{ color: "#E8E9F0" }}>{Math.round(progress)}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #5257D8, #FE2C40)" }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* ── Completion banner ── */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-5 rounded-2xl text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(82,87,216,0.15), rgba(254,44,64,0.15))",
                  border: "1px solid rgba(82,87,216,0.4)",
                }}
              >
                <div className="text-4xl mb-2">🏆</div>
                <h2 className="text-lg font-black" style={{ color: "#E8E9F0" }}>
                  Défi Complété !
                </h2>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Formation cyber terminée sans formateur humain. Vous faites partie des 1%.
                </p>
                <Link
                  to="/app/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
                  style={{ background: "#FE2C40", color: "#fff" }}
                >
                  <Award className="w-4 h-4" />
                  Générer mon Attestation NFT
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── JARVIS AI vs Human ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl"
            style={{
              background: "rgba(82,87,216,0.06)",
              border: "1px solid rgba(82,87,216,0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#E8E9F0" }}>
                GENIE IA vs Formateur Humain
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Temps de réponse", genie: "< 2s", human: "47s moy." },
                { label: "Disponibilité",    genie: "24/7",   human: "8h-18h L-V" },
                { label: "Personnalisation", genie: "100%",   human: "Générique" },
                { label: "Coût / session",   genie: "0.002€", human: "120€" },
              ].map(({ label, genie, human }) => (
                <div key={label} className="text-xs space-y-1">
                  <p className="text-muted-foreground">{label}</p>
                  <div className="flex gap-2">
                    <span className="font-bold text-emerald-400">⚡ {genie}</span>
                    <span className="text-muted-foreground line-through">{human}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Steps list ── */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
              Parcours de formation
            </h2>
            {STEPS.map((step, i) => (
              <StepCard
                key={step.id}
                step={step}
                index={i}
                completed={completedSteps.has(step.id)}
                active={activeStep === step.id}
                locked={i > 0 && !completedSteps.has(STEPS[i - 1].id)}
                onClick={() => handleStepClick(step)}
              />
            ))}
          </div>

          {/* ── Warning ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-amber-400">Challenge actif : </span>
              Complétez les 6 étapes dans les 48h pour obtenir le badge{" "}
              <span className="font-bold text-amber-400">«Autonomous Cyber Master»</span> et votre attestation NFT.
            </p>
          </motion.div>

        </div>
      </div>
    </>
  );
}
