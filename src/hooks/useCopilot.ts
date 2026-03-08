import { useState, useCallback } from "react";

export interface CopilotPlanStep {
  step: string;
  action_type: "quiz" | "lab" | "module" | "external";
  action_id: string;
  cta_label: string;
}

export interface CopilotImmediateAction {
  type: "quiz" | "lab" | "module" | "chat" | "download";
  id: string;
  label: string;
}

export interface CopilotResponse {
  message: string;
  plan: CopilotPlanStep[];
  immediate_action: CopilotImmediateAction | null;
  proof_type: "badge" | "pdf" | "score" | "none";
  confidence: number;
}

const FALLBACK_RESPONSE: Partial<CopilotResponse> = {
  plan: [],
  immediate_action: null,
  proof_type: "none",
  confidence: 0.5,
};

/** Try to extract JSON from LLM output that may have preamble text or ```json fences */
function extractJson(raw: string): string {
  // 1. ```json ... ``` fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // 2. First { ... } block
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

export function parseJarvisResponse(raw: string): CopilotResponse {
  try {
    const jsonStr = extractJson(raw);
    const parsed = JSON.parse(jsonStr);

    return {
      message: typeof parsed.message === "string" ? parsed.message : raw,
      plan: Array.isArray(parsed.plan) ? parsed.plan : [],
      immediate_action: parsed.immediate_action ?? null,
      proof_type: parsed.proof_type ?? "none",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
    };
  } catch {
    // Graceful fallback: treat raw string as plain message
    return {
      message: raw,
      ...FALLBACK_RESPONSE,
    } as CopilotResponse;
  }
}

export function useCopilot() {
  const [plan, setPlan] = useState<CopilotPlanStep[]>([]);
  const [immediateAction, setImmediateAction] = useState<CopilotImmediateAction | null>(null);
  const [proofType, setProofType] = useState<CopilotResponse["proof_type"]>("none");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [dockVisible, setDockVisible] = useState(false);

  const applyResponse = useCallback((response: CopilotResponse) => {
    if (response.plan.length > 0) {
      setPlan(response.plan);
      setImmediateAction(response.immediate_action);
      setProofType(response.proof_type);
      setCompletedSteps(new Set());
      setDockVisible(true);
    }
  }, []);

  const markStepDone = useCallback((index: number) => {
    setCompletedSteps(prev => new Set([...prev, index]));
  }, []);

  const dismissDock = useCallback(() => setDockVisible(false), []);

  const actionPath = (action: CopilotImmediateAction | CopilotPlanStep): string => {
    const type = "type" in action ? action.type : action.action_type;
    const id = "id" in action ? action.id : action.action_id;
    switch (type) {
      case "quiz": return `/app/onboarding/quiz?id=${id}`;
      case "lab": return `/app/labs/${id}`;
      case "module": return `/app/modules/${id}`;
      case "download": return "#download";
      default: return "#";
    }
  };

  return {
    plan,
    immediateAction,
    proofType,
    completedSteps,
    dockVisible,
    applyResponse,
    markStepDone,
    dismissDock,
    actionPath,
  };
}
