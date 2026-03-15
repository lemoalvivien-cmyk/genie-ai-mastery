/**
 * OnboardingQuiz — Étape 2 du parcours express
 * Réutilise QuizPlayer tel quel avec le quiz phishing onboarding
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuizPlayer } from "@/components/modules/QuizPlayer";
import { useOnboarding, ONBOARDING_QUIZ_ID, ONBOARDING_MODULE_ID } from "@/hooks/useOnboarding";
import type { Quiz, Module } from "@/hooks/useModules";

export default function OnboardingQuiz() {
  const navigate = useNavigate();
  const { completeQuiz } = useOnboarding();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [mod, setMod] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [{ data: quizData, error: qErr }, { data: modData, error: mErr }] = await Promise.all([
          supabase.from("quizzes").select("id, module_id, questions, passing_score, time_limit_seconds").eq("id", ONBOARDING_QUIZ_ID).single(),
          supabase.from("modules").select("id, domain, slug, title, subtitle, description, content_json, persona_variant, level, duration_minutes, icon_name, order_index, sources, confidence_score, is_gold, is_published, deliverables, created_at, updated_at").eq("id", ONBOARDING_MODULE_ID).single(),
        ]);
        if (qErr || !quizData) throw new Error("Quiz introuvable");
        if (mErr || !modData) throw new Error("Module introuvable");
        setQuiz(quizData as unknown as Quiz);
        setMod(modData as unknown as Module);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSkip = () => navigate("/app/dashboard", { replace: true });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !quiz || !mod) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground">{error ?? "Impossible de charger le quiz."}</p>
        <button onClick={handleSkip} className="text-sm text-primary underline">
          Aller au dashboard →
        </button>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Mini Quiz Phishing – Formetoialia</title></Helmet>

      {/* Skip link */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-card/80 backdrop-blur px-3 py-1.5 rounded-full border border-border/50"
        >
          Explorer d'abord →
        </button>
      </div>

      {/* Header progress */}
      <div className="fixed top-0 left-0 right-0 z-40 h-1">
        <div
          className="h-full"
          style={{
            width: "50%",
            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
          }}
        />
      </div>

      {/* QuizPlayer réutilisé tel quel */}
      <QuizPlayer
        quiz={quiz}
        module={mod}
        onClose={handleSkip}
        onComplete={completeQuiz}
      />
    </>
  );
}
