/**
 * useCopilot + parseJarvisResponse — stub après suppression de GenieOS.
 * Fournit les types attendus par Jarvis.tsx et CopilotDock.tsx.
 */
import { useCallback } from "react";

export interface CopilotPlanStep {
  step: string;
  detail: string;
  to: string;
  label?: string;
  action_type?: string;
  cta_label?: string;
  xp?: number;
}

export interface CopilotImmediateAction {
  label: string;
  to: string;
  emoji: string;
}

export interface ParsedJarvisResponse {
  message: string;
  plan: CopilotPlanStep[];
  immediate_action: CopilotImmediateAction | null;
  proofType?: "badge" | "pdf" | "score" | "none";
}

export function parseJarvisResponse(raw: string): ParsedJarvisResponse {
  try {
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.message) return { plan: [], immediate_action: null, proofType: "none", ...parsed };
    }
  } catch {
    // fall through
  }
  return { message: raw, plan: [], immediate_action: null, proofType: "none" };
}

export function useCopilot() {
  const applyResponse = useCallback((_response: ParsedJarvisResponse) => {}, []);
  const markStepDone = useCallback((_i: number) => {}, []);
  const dismiss = useCallback(() => {}, []);
  const actionPath = useCallback((_step: CopilotPlanStep) => "/app/modules", []);

  return {
    plan: [] as CopilotPlanStep[],
    immediateAction: null as CopilotImmediateAction | null,
    proofType: "none" as const,
    completedSteps: new Set<number>(),
    markStepDone,
    dismiss,
    applyResponse,
    dockVisible: false,
    isVisible: false,
    actionPath,
  };
}
