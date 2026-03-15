/**
 * useCopilot + parseJarvisResponse — stub après suppression de GenieOS.
 * Fournit les types attendus par Jarvis.tsx et CopilotDock.tsx.
 */
import { useCallback } from "react";

export interface CopilotPlanStep {
  label: string;
  detail: string;
  to: string;
  xp?: number;
}

export interface CopilotImmediateAction {
  label: string;
  to: string;
  emoji: string;
}

export interface ParsedJarvisResponse {
  message: string;
  plan?: CopilotPlanStep[];
  immediateAction?: CopilotImmediateAction | null;
  proofType?: "badge" | "pdf" | "score" | "none";
}

export function parseJarvisResponse(raw: string): ParsedJarvisResponse {
  // Attempt to parse JSON blocks, fall back to plain text
  try {
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.message) return parsed as ParsedJarvisResponse;
    }
  } catch {
    // fall through
  }
  return { message: raw, plan: [], immediateAction: null, proofType: "none" };
}

export function useCopilot() {
  const activate = useCallback((_response: ParsedJarvisResponse) => {
    // no-op stub — CopilotDock display only
  }, []);

  return {
    plan: [] as CopilotPlanStep[],
    immediateAction: null as CopilotImmediateAction | null,
    proofType: "none" as const,
    completedSteps: new Set<number>(),
    markDone: (_i: number) => {},
    dismiss: () => {},
    activate,
    isVisible: false,
  };
}
