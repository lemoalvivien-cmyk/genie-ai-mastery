// ── AdaptivePathPanel ─────────────────────────────────────────────────────────
// Temporal Mirror + Infinite Branching UI — shown in Dashboard
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, RefreshCw, GitBranch, Clock, ChevronRight,
  Zap, AlertTriangle, Moon, MonitorPlay, Brain, Target,
  TrendingUp, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAdaptivePath,
  type PathStep,
  type Branch,
  type StepType,
} from "@/hooks/useAdaptivePath";

// ── Config maps ───────────────────────────────────────────────────────────────
const STEP_ICONS: Record<StepType, React.ElementType> = {
  module: Brain,
  exercise: Target,
  sleep_session: Moon,
  simulation: MonitorPlay,
  quiz: Zap,
};

const STEP_COLORS: Record<StepType, string> = {
  module: "text-[hsl(var(--primary))]",
  exercise: "text-cyan-400",
  sleep_session: "text-purple-400",
  simulation: "text-[hsl(var(--accent))]",
  quiz: "text-amber-400",
};

const STEP_BG: Record<StepType, string> = {
  module: "rgba(82,87,216,0.15)",
  exercise: "rgba(34,211,238,0.12)",
  sleep_session: "rgba(167,139,250,0.12)",
  simulation: "rgba(254,44,64,0.12)",
  quiz: "rgba(245,158,11,0.12)",
};

const STEP_LABELS: Record<StepType, string> = {
  module: "Module",
  exercise: "Exercice",
  sleep_session: "SleepForge",
  simulation: "Simulation",
  quiz: "Quiz",
};

const DIFF_COLORS: Record<string, string> = {
  debutant: "text-emerald-400",
  intermediaire: "text-amber-400",
  expert: "text-[hsl(var(--accent))]",
};

const BRANCH_CONFIG: Record<Branch, { label: string; color: string; desc: string }> = {
  optimal: { label: "🚀 Optimal", color: "#5257D8", desc: "Progression maximale" },
  challenger: { label: "⚡ Challenger", color: "#FE2C40", desc: "Mode hardcore — +40% XP" },
  recovery: { label: "🔁 Recovery", color: "#8B5CF6", desc: "Remédiation des lacunes" },
};

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({
  step,
  index,
  isActive,
  onClick,
}: {
  step: PathStep;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = STEP_ICONS[step.step_type] ?? Brain;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div
        className="p-4 rounded-2xl border transition-all duration-200 group-hover:scale-[1.01]"
        style={{
          background: isActive ? STEP_BG[step.step_type] : "rgba(255,255,255,0.03)",
          borderColor: isActive ? "rgba(82,87,216,0.4)" : "rgba(255,255,255,0.07)",
          boxShadow: isActive ? "0 0 16px rgba(82,87,216,0.15)" : "none",
        }}
      >
        <div className="flex items-start gap-3">
          {/* Step number + icon */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: STEP_BG[step.step_type] }}
            >
              <Icon className={`w-4 h-4 ${STEP_COLORS[step.step_type]}`} />
            </div>
            {/* vertical connector */}
            <div
              className="w-px flex-1 min-h-[12px]"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Top row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Étape {index + 1}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: STEP_BG[step.step_type], color: STEP_COLORS[step.step_type].replace("text-", "") }}
              >
                {STEP_LABELS[step.step_type]}
              </span>
              {step.cve_alert && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(254,44,64,0.15)", color: "#FE2C40" }}>
                  <AlertTriangle className="w-3 h-3" />
                  {step.cve_alert}
                </span>
              )}
            </div>

            {/* Module slug */}
            <p className="text-sm font-bold leading-snug" style={{ color: "#E8E9F0" }}>
              {step.module_slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </p>

            {/* Motivation hook */}
            <p className="text-xs text-muted-foreground mt-1 italic leading-relaxed line-clamp-2">
              "{step.motivation_hook}"
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {step.estimated_time} min
              </span>
              <span className={`text-xs font-semibold ${DIFF_COLORS[step.difficulty] ?? "text-muted-foreground"}`}>
                {step.difficulty}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {step.domain?.replace("_", " ")}
              </span>
            </div>

            {/* Branching paths */}
            {isActive && step.branch_divergence && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 grid grid-cols-2 gap-2"
              >
                <div className="p-2.5 rounded-xl text-xs"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <span className="text-emerald-400 font-semibold block mb-0.5">✅ Si maîtrisé</span>
                  <span className="text-muted-foreground line-clamp-1">
                    → {step.branch_divergence.if_mastered.replace(/-/g, " ")}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl text-xs"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <span className="text-amber-400 font-semibold block mb-0.5">🔁 Si en difficulté</span>
                  <span className="text-muted-foreground line-clamp-1">
                    → {step.branch_divergence.if_struggled.replace(/-/g, " ")}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <ChevronRight
            className={`w-4 h-4 shrink-0 transition-transform mt-1 ${
              isActive ? "rotate-90 text-primary" : "text-muted-foreground/40"
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AdaptivePathPanel() {
  const [activeBranch, setActiveBranch] = useState<Branch>("optimal");
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const navigate = useNavigate();
  const { data, isLoading, isError, regenerate } = useAdaptivePath(activeBranch);

  const handleStartStep = (step: PathStep) => {
    if (step.step_type === "module" || step.step_type === "quiz") {
      navigate(`/app/modules/${step.module_slug}`);
    } else if (step.step_type === "simulation") {
      navigate("/app/labs/cyber");
    } else {
      navigate("/app/chat?mode=kitt");
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="p-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #5257D8, #FE2C40)" }}
            >
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: "#E8E9F0" }}>
                Parcours Adaptatif IA
              </h3>
              <p className="text-xs text-muted-foreground">Temporal Mirror + Infinite Branching</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            onClick={() => regenerate.mutate(activeBranch)}
            disabled={regenerate.isPending}
          >
            <RefreshCw className={`w-4 h-4 ${regenerate.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Branch switcher */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(Object.entries(BRANCH_CONFIG) as [Branch, typeof BRANCH_CONFIG[Branch]][]).map(
            ([key, cfg]) => (
              <button
                key={key}
                onClick={() => setActiveBranch(key)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background:
                    activeBranch === key
                      ? `${cfg.color}22`
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${activeBranch === key ? cfg.color + "55" : "rgba(255,255,255,0.08)"}`,
                  color: activeBranch === key ? cfg.color : "#888",
                }}
              >
                {cfg.label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Loading */}
        {(isLoading || regenerate.isPending) && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-full animate-pulse"
                style={{ background: "linear-gradient(135deg, #5257D833, #FE2C4033)" }}
              />
              <Loader2 className="w-6 h-6 animate-spin text-primary absolute inset-0 m-auto" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Temporal Mirror en cours…
              <br />
              <span className="text-xs opacity-60">Simulation de votre futur dans 6 mois</span>
            </p>
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div
            className="p-4 rounded-xl text-center text-sm"
            style={{ background: "rgba(254,44,64,0.08)", border: "1px solid rgba(254,44,64,0.2)" }}
          >
            <p className="text-[hsl(var(--accent))] font-semibold mb-2">Génération échouée</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => regenerate.mutate(activeBranch)}
              className="text-xs"
            >
              Réessayer
            </Button>
          </div>
        )}

        {/* Data */}
        {data && !isLoading && !regenerate.isPending && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBranch}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Temporal Mirror */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(82,87,216,0.1), rgba(254,44,64,0.08))",
                  border: "1px solid rgba(82,87,216,0.2)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Temporal Mirror — Toi dans 6 mois
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {data.temporal_mirror}
                </p>
              </div>

              {/* CVE Alert */}
              {data.top_cve_focus && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl"
                  style={{
                    background: "rgba(254,44,64,0.08)",
                    border: "1px solid rgba(254,44,64,0.25)",
                  }}
                >
                  <AlertTriangle className="w-4 h-4 text-[hsl(var(--accent))] shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-[hsl(var(--accent))]">
                      Menace prioritaire :{" "}
                    </span>
                    <span className="text-xs text-muted-foreground">{data.top_cve_focus}</span>
                  </div>
                </motion.div>
              )}

              {/* Rhythm */}
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-muted-foreground">
                  Rythme : <span className="text-amber-400 font-semibold">{data.recommended_weekly_rhythm}</span>
                </span>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {data.steps.map((step, i) => (
                  <StepCard
                    key={`${step.module_slug}-${i}`}
                    step={step}
                    index={i}
                    isActive={expandedStep === i}
                    onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                  />
                ))}
              </div>

              {/* CTA */}
              {data.steps[0] && (
                <Button
                  className="w-full h-12 font-bold text-sm"
                  style={{
                    background: "linear-gradient(135deg, #5257D8, #FE2C40)",
                    color: "#fff",
                  }}
                  onClick={() => handleStartStep(data.steps[0])}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Commencer l'Étape 1
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
