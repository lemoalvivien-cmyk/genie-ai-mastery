/**
 * useAdaptivePath — stub après refonte.
 * Retourne un état vide pour que AdaptivePathPanel compile.
 */
import { useCallback } from "react";

export type StepType = "module" | "exercise" | "sleep_session" | "simulation" | "quiz";

export interface PathStep {
  id: string;
  type: StepType;
  title: string;
  domain: string;
  duration_min: number;
  xp: number;
  priority: "high" | "medium" | "low";
  rationale: string;
  to: string;
  locked?: boolean;
}

export interface Branch {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const BRANCHES: Branch[] = [
  { id: "optimal", label: "Optimal", emoji: "⚡", description: "Chemin recommandé par l'IA" },
  { id: "accelerated", label: "Accéléré", emoji: "🚀", description: "Progression rapide" },
  { id: "balanced", label: "Équilibré", emoji: "🎯", description: "Rythme soutenable" },
];

interface AdaptivePathData {
  steps: PathStep[];
  branch: Branch;
  totalXP: number;
  estimatedDays: number;
}

export function useAdaptivePath(_branchId?: string) {
  const regenerate = useCallback(() => {}, []);

  return {
    data: null as AdaptivePathData | null,
    isLoading: false,
    isError: false,
    regenerate,
  };
}
