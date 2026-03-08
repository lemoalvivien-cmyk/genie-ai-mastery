/**
 * useOnboarding — Gère l'état du parcours onboarding express
 * (quiz phishing → résultat → unlock)
 */
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useAnalytics } from "@/hooks/useAnalytics";

// UUID du quiz phishing onboarding seedé en DB
export const ONBOARDING_QUIZ_ID = "e94e3ee8-7836-4741-948c-a903d7cb6939";
// Module phishing associé (pour afficher le contexte)
export const ONBOARDING_MODULE_ID = "15fcff32-ccaa-4433-9275-e8045566410b";

export interface OnboardingScore {
  score: number;       // 0-100
  correct: number;
  total: number;
}

export function useOnboarding() {
  const { user, fetchProfile } = useAuthStore();
  const navigate = useNavigate();
  const { track } = useAnalytics();

  /** Sauvegarde le score et passe à la page résultat */
  const completeQuiz = useCallback(async (score: number, answers: Record<string, number>) => {
    if (!user) return;

    const correct = Object.keys(answers).length > 0
      ? Object.values(answers).filter((_, i) => {
          // score is already computed — just persist
          return true;
        }).length
      : 0;

    track("onboarding_quiz_done", { score, user_id: user.id });

    // Persist score in sessionStorage for result page
    const correctCount = Math.round((score / 100) * 3);
    sessionStorage.setItem("onboarding_quiz_score", JSON.stringify({ score, correct: correctCount, total: 3 }));

    navigate("/app/onboarding/result", { replace: false });
  }, [user, navigate, track]);

  /** Marque l'onboarding comme terminé et redirige */
  const finishOnboarding = useCallback(async (skipToApp = false) => {
    if (!user) {
      navigate("/app/dashboard", { replace: true });
      return;
    }

    await supabase
      .from("profiles")
      .update({ onboarding_completed: true, has_completed_welcome: true })
      .eq("id", user.id);

    await fetchProfile(user.id);
    track("onboarding_completed", { skipped: skipToApp });

    navigate(skipToApp ? "/app/dashboard" : "/app/onboarding/unlock", { replace: false });
  }, [user, navigate, fetchProfile, track]);

  /** Lit le score stocké en session */
  const getStoredScore = useCallback((): OnboardingScore => {
    try {
      const raw = sessionStorage.getItem("onboarding_quiz_score");
      if (raw) return JSON.parse(raw) as OnboardingScore;
    } catch { /* ignore */ }
    return { score: 0, correct: 0, total: 3 };
  }, []);

  return { completeQuiz, finishOnboarding, getStoredScore };
}
