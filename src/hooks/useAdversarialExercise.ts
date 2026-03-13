// ── Adversarial Exercise Generator hook ───────────────────────────────────────
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ExerciseType = "quiz" | "lab" | "ransomware_sim" | "phishing_text" | "code_audit";

export interface Exercise {
  id: string;
  type: ExerciseType;
  difficulty: "debutant" | "intermediaire" | "expert" | "apex";
  question: string;
  options?: string[];
  correct?: number | string;
  explanation: string;
  sarcasm_comment: string;
  ttp_reference: string;
  time_limit_seconds: number;
  apex_predator_mode: boolean;
  chain_of_thought: {
    module_context: string;
    stress_level: string;
    current_ttps: string;
    feedback_angle: string;
  };
}

export interface ScoredResult {
  exercise_id: string;
  score: number;
  is_correct: boolean;
  explanation: string;
  sarcasm_comment: string;
  joke: string;
  skill_delta: number;
  next_step: string;
}

interface GenerateParams {
  module_title: string;
  module_domain: string;
  module_slug?: string;
  exercise_type: ExerciseType;
  apex_mode?: boolean;
}

interface ScoreParams {
  exercise: Exercise;
  user_answer: string | number;
  time_taken: number;
  module_slug?: string;
}

export function useAdversarialExercise() {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [result, setResult] = useState<ScoredResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: GenerateParams) => {
    setGenerating(true);
    setError(null);
    setResult(null);
    setExercise(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "adversarial-exercise-gen",
        { body: { action: "generate", ...params } },
      );
      if (fnErr) throw fnErr;
      setExercise(data as Exercise);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Génération échouée");
    } finally {
      setGenerating(false);
    }
  }, []);

  const score = useCallback(async (params: ScoreParams) => {
    setScoring(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "adversarial-exercise-gen",
        { body: { action: "score", ...params } },
      );
      if (fnErr) throw fnErr;
      setResult(data as ScoredResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring échoué");
    } finally {
      setScoring(false);
    }
  }, []);

  const reset = useCallback(() => {
    setExercise(null);
    setResult(null);
    setError(null);
  }, []);

  return { exercise, result, generating, scoring, error, generate, score, reset };
}
