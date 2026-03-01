import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle2, XCircle, Trophy, RotateCcw, Clock, Loader2, Download } from "lucide-react";
import type { Quiz, Module } from "@/hooks/useModules";

interface Props {
  quiz: Quiz;
  module: Module;
  onClose: () => void;
  onComplete: (score: number, answers: Record<string, number>) => Promise<void>;
}

export function QuizPlayer({ quiz, module: mod, onClose, onComplete }: Props) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit_seconds ?? null);
  const [confetti, setConfetti] = useState(false);

  const question = quiz.questions[currentQ];
  const passed = score >= quiz.passing_score;

  // Timer
  useEffect(() => {
    if (timeLeft === null || finished) return;
    if (timeLeft <= 0) { handleFinish(answers); return; }
    const t = setTimeout(() => setTimeLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, finished]);

  // Score animation
  useEffect(() => {
    if (!finished) return;
    let current = 0;
    const target = score;
    const step = Math.ceil(target / 30);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayScore(current);
      if (current >= target) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [finished, score]);

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    setAnswers((prev) => ({ ...prev, [currentQ]: idx }));
  };

  const handleNext = () => {
    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      handleFinish({ ...answers, [currentQ]: selected! });
    }
  };

  const handleFinish = useCallback((finalAnswers: Record<string, number>) => {
    const correct = quiz.questions.filter((q, i) => finalAnswers[i] === q.correct_index).length;
    const pct = Math.round((correct / quiz.questions.length) * 100);
    setScore(pct);
    setFinished(true);
    if (pct >= quiz.passing_score) setTimeout(() => setConfetti(true), 300);
  }, [quiz]);

  const handleSave = async () => {
    setSaving(true);
    await onComplete(score, answers);
    setSaving(false);
  };

  const handleRetry = () => {
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setAnswers({});
    setFinished(false);
    setScore(0);
    setDisplayScore(0);
    setConfetti(false);
    setTimeLeft(quiz.time_limit_seconds ?? null);
  };

  const correctCount = quiz.questions.filter((q, i) => answers[i] === q.correct_index).length;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Quiz">
      {/* Confetti animation */}
      {confetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 10}%`,
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
                backgroundColor: ["#6366f1", "#10b981", "#f97316", "#ec4899", "#f59e0b"][Math.floor(Math.random() * 5)],
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Fermer le quiz"
          className="absolute -top-2 -right-2 z-10 w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
          {!finished ? (
            <>
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-border/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {currentQ + 1} / {quiz.questions.length}
                  </span>
                  {timeLeft !== null && (
                    <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold ${timeLeft < 30 ? "text-destructive" : "text-muted-foreground"}`}>
                      <Clock className="w-4 h-4" />
                      {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                    </div>
                  )}
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full bg-secondary overflow-hidden" role="progressbar" aria-valuenow={currentQ + 1} aria-valuemin={1} aria-valuemax={quiz.questions.length}>
                  <div
                    className="h-full gradient-primary rounded-full transition-all duration-500"
                    style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="p-6">
                <p className="text-lg sm:text-xl font-bold mb-6 leading-snug">{question.question}</p>

                {/* Options */}
                <div className="space-y-3" role="radiogroup" aria-label="Choisir une réponse">
                  {question.options.map((opt, i) => {
                    const isCorrect = i === question.correct_index;
                    const isSelected = selected === i;
                    let cls = "border-border/60 bg-card/40 hover:border-primary/50 hover:bg-primary/5";
                    if (answered) {
                      if (isCorrect) cls = "border-emerald bg-emerald/10";
                      else if (isSelected && !isCorrect) cls = "border-destructive bg-destructive/10";
                      else cls = "border-border/30 bg-card/20 opacity-60";
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelect(i)}
                        disabled={answered}
                        role="radio"
                        aria-checked={isSelected}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${cls} ${!answered ? "cursor-pointer" : "cursor-default"} focus-ring`}
                      >
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                          answered && isCorrect ? "border-emerald bg-emerald text-white" :
                          answered && isSelected && !isCorrect ? "border-destructive bg-destructive text-white" :
                          "border-current"
                        }`}>
                          {answered && isCorrect ? <CheckCircle2 className="w-4 h-4" /> :
                           answered && isSelected && !isCorrect ? <XCircle className="w-4 h-4" /> :
                           String.fromCharCode(65 + i)}
                        </div>
                        <span className="text-sm sm:text-base">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {answered && (
                  <div className={`mt-4 p-4 rounded-xl border-l-4 ${selected === question.correct_index ? "border-emerald bg-emerald/5" : "border-destructive bg-destructive/5"} animate-slide-up`}>
                    <p className={`text-sm font-semibold mb-1 ${selected === question.correct_index ? "text-emerald" : "text-destructive"}`}>
                      {selected === question.correct_index ? "✓ Correct !" : "✗ Incorrect"}
                    </p>
                    <p className="text-sm text-muted-foreground">{question.explanation}</p>
                  </div>
                )}

                {answered && (
                  <button
                    onClick={handleNext}
                    className="mt-5 w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all"
                  >
                    {currentQ < quiz.questions.length - 1 ? "Question suivante →" : "Voir les résultats →"}
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Results */
            <div className="p-6 sm:p-8 text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${passed ? "bg-emerald/10 border-2 border-emerald/40" : "bg-destructive/10 border-2 border-destructive/30"}`}>
                {passed ? <Trophy className="w-10 h-10 text-emerald" /> : <XCircle className="w-10 h-10 text-destructive" />}
              </div>

              <div className="text-5xl font-extrabold font-mono mb-1 text-gradient tabular-nums">
                {displayScore}%
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {correctCount} / {quiz.questions.length} bonnes réponses
              </p>

              <div className={`text-lg font-bold mb-1 ${passed ? "text-emerald" : "text-destructive"}`}>
                {passed ? "🎉 Bravo ! Module validé." : "Pas encore... Réessayez après révision."}
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {passed ? `Score requis : ${quiz.passing_score}% · Vous avez obtenu ${score}%.` : `Il vous faut ${quiz.passing_score}% pour valider. Vous avez obtenu ${score}%.`}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary/60 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> Refaire le quiz
                </button>
                {passed && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" /> Sauvegarder & Attestation</>}
                  </button>
                )}
                {!passed && (
                  <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-all">
                    Revenir au module
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
