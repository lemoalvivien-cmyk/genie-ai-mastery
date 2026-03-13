// ── AdversarialExerciseWidget ─────────────────────────────────────────────────
// Inline component: used inside ModuleDetail after the module content.
// Shows exercise type selector → generates → user answers → scores + sarcasm.
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Zap, Brain, Bug, Mail, Code2,
  RefreshCw, CheckCircle2, XCircle, Clock,
  ChevronRight, Skull, Trophy, Loader2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAdversarialExercise,
  type ExerciseType,
  type Exercise,
} from "@/hooks/useAdversarialExercise";

// ── Config ────────────────────────────────────────────────────────────────────
const EXERCISE_TYPES: { id: ExerciseType; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { id: "quiz", label: "Quiz Adversarial", icon: Brain, desc: "QCM basé sur TTPs réels", color: "#5257D8" },
  { id: "phishing_text", label: "Phishing Détection", icon: Mail, desc: "Analyser un email suspect", color: "#F59E0B" },
  { id: "ransomware_sim", label: "Ransomware Sim", icon: Bug, desc: "Gérer un incident réel", color: "#FE2C40" },
  { id: "code_audit", label: "Code Audit", icon: Code2, desc: "Trouver la vulnérabilité", color: "#10B981" },
  { id: "lab", label: "Lab Pratique", icon: Zap, desc: "Action concrète guidée", color: "#8B5CF6" },
];

const DIFF_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  debutant: { bg: "rgba(16,185,129,0.12)", text: "#10B981", label: "🌱 Débutant" },
  intermediaire: { bg: "rgba(245,158,11,0.12)", text: "#F59E0B", label: "⚡ Intermédiaire" },
  expert: { bg: "rgba(254,44,64,0.12)", text: "#FE2C40", label: "🔥 Expert" },
  apex: { bg: "rgba(139,92,246,0.15)", text: "#8B5CF6", label: "💀 APEX PREDATOR" },
};

// ── Timer bar ─────────────────────────────────────────────────────────────────
function TimerBar({ limit, onExpire }: { limit: number; onExpire: () => void }) {
  const [left, setLeft] = useState(limit);
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    if (left <= 0) { cb.current(); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const pct = (left / limit) * 100;
  const color = pct > 50 ? "#10B981" : pct > 25 ? "#F59E0B" : "#FE2C40";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{left}s</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>
    </div>
  );
}

// ── Score card ────────────────────────────────────────────────────────────────
function ScoreCard({ result }: { result: NonNullable<ReturnType<typeof useAdversarialExercise>["result"]> }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      {/* Score ring */}
      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
            style={{
              background: result.is_correct
                ? "radial-gradient(circle, rgba(16,185,129,0.2), rgba(16,185,129,0.05))"
                : "radial-gradient(circle, rgba(254,44,64,0.2), rgba(254,44,64,0.05))",
              border: `2px solid ${result.is_correct ? "#10B981" : "#FE2C40"}`,
              boxShadow: `0 0 20px ${result.is_correct ? "rgba(16,185,129,0.3)" : "rgba(254,44,64,0.3)"}`,
            }}
          >
            {result.is_correct
              ? <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              : <XCircle className="w-8 h-8 text-[hsl(var(--accent))]" />}
            <span
              className="text-xl font-black mt-1"
              style={{ color: result.is_correct ? "#10B981" : "#FE2C40" }}
            >
              {result.score}
            </span>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div
        className="p-4 rounded-xl text-sm leading-relaxed"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#C8CAD6",
        }}
      >
        <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Explication
        </p>
        {result.explanation}
      </div>

      {/* Sarcasm + joke */}
      <div
        className="p-4 rounded-xl"
        style={{ background: "rgba(82,87,216,0.08)", border: "1px solid rgba(82,87,216,0.2)" }}
      >
        <p className="text-sm italic text-muted-foreground">
          🤖 <span className="text-primary font-medium">JARVIS :</span> "{result.sarcasm_comment}"
        </p>
        {result.joke && (
          <p className="text-xs text-muted-foreground mt-2 opacity-70">😏 {result.joke}</p>
        )}
      </div>

      {/* Next step */}
      {result.next_step && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-emerald-400 text-xs">{result.next_step}</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Exercise renderer ─────────────────────────────────────────────────────────
function ExerciseRenderer({
  exercise,
  onAnswer,
  answered,
}: {
  exercise: Exercise;
  onAnswer: (ans: string | number, timeTaken: number) => void;
  answered: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const startRef = useRef(Date.now());

  const handleSelect = (i: number) => {
    if (selected !== null || answered || expired) return;
    setSelected(i);
    onAnswer(i, Math.round((Date.now() - startRef.current) / 1000));
  };

  const diff = DIFF_STYLES[exercise.difficulty] ?? DIFF_STYLES.debutant;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span
          className="text-xs px-2.5 py-1 rounded-full font-bold"
          style={{ background: diff.bg, color: diff.text }}
        >
          {diff.label}
        </span>
        <span
          className="text-xs px-2 py-1 rounded-full font-mono"
          style={{ background: "rgba(255,255,255,0.04)", color: "#888", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {exercise.ttp_reference}
        </span>
      </div>

      {/* Timer */}
      {!answered && !expired && (
        <TimerBar
          limit={exercise.time_limit_seconds}
          onExpire={() => {
            setExpired(true);
            onAnswer(-1, exercise.time_limit_seconds);
          }}
        />
      )}

      {/* Question */}
      <div
        className="p-4 rounded-xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-sm font-semibold leading-relaxed" style={{ color: "#E8E9F0" }}>
          {exercise.question}
        </p>
      </div>

      {/* Options */}
      {exercise.options && exercise.options.length > 0 && (
        <div className="space-y-2">
          {exercise.options.map((opt, i) => {
            const isCorrect = i === exercise.correct;
            const isSelected = selected === i;
            let bg = "rgba(255,255,255,0.03)";
            let border = "rgba(255,255,255,0.08)";
            let textColor = "#C8CAD6";

            if (answered || expired) {
              if (isCorrect) { bg = "rgba(16,185,129,0.12)"; border = "#10B98155"; textColor = "#10B981"; }
              else if (isSelected && !isCorrect) { bg = "rgba(254,44,64,0.12)"; border = "#FE2C4055"; textColor = "#FE2C40"; }
              else { textColor = "#666"; }
            } else if (isSelected) {
              bg = "rgba(82,87,216,0.15)"; border = "#5257D855";
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered || expired}
                className="w-full text-left p-3.5 rounded-xl text-sm font-medium transition-all duration-150 hover:brightness-110 disabled:cursor-default"
                style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
              >
                <span className="font-bold mr-2" style={{ color: border.replace("55", "") }}>
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Chain of thought (collapsed) */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-muted-foreground flex items-center gap-1.5 select-none hover:text-primary transition-colors">
          <Brain className="w-3 h-3" /> Chaîne de pensée de l'agent
        </summary>
        <div
          className="mt-2 p-3 rounded-xl space-y-1.5 text-xs"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {Object.entries(exercise.chain_of_thought).map(([k, v]) => (
            <div key={k}>
              <span className="text-primary font-semibold capitalize">{k.replace(/_/g, " ")} : </span>
              <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
interface AdversarialExerciseWidgetProps {
  moduleTitle: string;
  moduleDomain: string;
  moduleSlug?: string;
}

export function AdversarialExerciseWidget({
  moduleTitle,
  moduleDomain,
  moduleSlug,
}: AdversarialExerciseWidgetProps) {
  const [selectedType, setSelectedType] = useState<ExerciseType>("quiz");
  const [apexMode, setApexMode] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [phase, setPhase] = useState<"select" | "playing" | "scored">("select");
  const { exercise, result, generating, scoring, error, generate, score, reset } =
    useAdversarialExercise();

  const handleGenerate = async () => {
    await generate({
      module_title: moduleTitle,
      module_domain: moduleDomain,
      module_slug: moduleSlug,
      exercise_type: selectedType,
      apex_mode: apexMode,
    });
    setAnswered(false);
    setPhase("playing");
  };

  const handleAnswer = async (ans: string | number, timeTaken: number) => {
    if (!exercise || answered) return;
    setAnswered(true);
    await score({ exercise, user_answer: ans, time_taken: timeTaken, module_slug: moduleSlug });
    setPhase("scored");
  };

  const handleReset = () => {
    reset();
    setPhase("select");
    setAnswered(false);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #FE2C40, #5257D8)" }}
            >
              <Swords className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: "#E8E9F0" }}>
                Adversarial Exercise Generator
              </h3>
              <p className="text-xs text-muted-foreground">TTPs réels · Feedback IA · Apex Mode</p>
            </div>
          </div>

          {/* Apex toggle */}
          <button
            onClick={() => setApexMode((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: apexMode ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${apexMode ? "#8B5CF6" : "rgba(255,255,255,0.1)"}`,
              color: apexMode ? "#8B5CF6" : "#888",
            }}
          >
            <Skull className="w-3.5 h-3.5" />
            Apex
          </button>
        </div>

        {apexMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 flex items-center gap-2 text-xs"
            style={{ color: "#8B5CF6" }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Mode Apex Predator : Exercice APT-grade. Aucune pitié. Aucune aide.
          </motion.div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Phase: select */}
          {phase === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-xs text-muted-foreground">Choisir le type d'exercice :</p>
              <div className="grid grid-cols-1 gap-2">
                {EXERCISE_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = selectedType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedType(t.id)}
                      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: active ? `${t.color}18` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${active ? t.color + "55" : "rgba(255,255,255,0.07)"}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: active ? `${t.color}25` : "rgba(255,255,255,0.06)" }}
                      >
                        <Icon className="w-4 h-4" style={{ color: active ? t.color : "#888" }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: active ? "#E8E9F0" : "#888" }}>
                          {t.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button
                className="w-full h-12 font-bold text-sm"
                style={{
                  background: apexMode
                    ? "linear-gradient(135deg, #8B5CF6, #FE2C40)"
                    : "linear-gradient(135deg, #5257D8, #FE2C40)",
                  color: "#fff",
                }}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Génération en cours…</>
                  : <><Swords className="w-4 h-4 mr-2" />Générer l'exercice adversarial</>}
              </Button>

              {error && (
                <p className="text-xs text-center" style={{ color: "#FE2C40" }}>{error}</p>
              )}
            </motion.div>
          )}

          {/* Phase: playing */}
          {phase === "playing" && exercise && !generating && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ExerciseRenderer
                exercise={exercise}
                onAnswer={handleAnswer}
                answered={answered}
              />
              {(scoring) && (
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scoring en cours…
                </div>
              )}
            </motion.div>
          )}

          {/* Phase: loading */}
          {generating && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-3"
            >
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-full animate-pulse"
                  style={{
                    background: apexMode
                      ? "radial-gradient(circle, rgba(139,92,246,0.3), rgba(254,44,64,0.15))"
                      : "radial-gradient(circle, rgba(82,87,216,0.3), rgba(254,44,64,0.15))",
                  }}
                />
                <Swords className="w-6 h-6 absolute inset-0 m-auto" style={{ color: apexMode ? "#8B5CF6" : "#5257D8" }} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {apexMode ? "💀 Mode Apex Predator — Génération APT-grade…" : "Analyse des TTPs réels…"}
                <br />
                <span className="text-xs opacity-60">MITRE ATT&CK 2025 · CVE récents</span>
              </p>
            </motion.div>
          )}

          {/* Phase: scored */}
          {phase === "scored" && result && (
            <motion.div key="scored" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <ScoreCard result={result} />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 text-xs font-semibold"
                  onClick={handleReset}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Nouvel exercice
                </Button>
                <Button
                  size="sm"
                  className="h-10 text-xs font-semibold"
                  style={{ background: "linear-gradient(135deg, #5257D8, #FE2C40)", color: "#fff" }}
                  onClick={handleGenerate}
                >
                  <Trophy className="w-3.5 h-3.5 mr-1.5" />
                  Rejouer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
