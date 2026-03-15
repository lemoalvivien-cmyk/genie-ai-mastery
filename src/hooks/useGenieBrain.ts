/**
 * useGenieBrain — stub léger après suppression de GenieOS.
 * Fournit uniquement les types et l'état minimal pour Chat.tsx.
 */
import { useState, useCallback } from "react";

export type AgentType = "attaquant" | "defenseur" | "tuteur" | "predictor" | "analyst";

export interface AgentResponse {
  agent: AgentType;
  content: string;
  latency_ms?: number;
}

export interface BrainState {
  palantirMode: boolean;
  isRunning: boolean;
  riskScore: number;
  riskDelta: number;
  agentResponses: AgentResponse[];
  prediction: Record<string, unknown> | null;
  humanComparison: {
    genie_response_ms: number;
    human_response_s: number;
    human_error_rate: number;
    human_cost_eur: number;
  } | null;
  generatedModule: { title: string; domain: string; urgency: string; confidence: number } | null;
  error: string | null;
}

const DEFAULT_STATE: BrainState = {
  palantirMode: false,
  isRunning: false,
  riskScore: 0,
  riskDelta: 0,
  agentResponses: [],
  prediction: null,
  humanComparison: null,
  generatedModule: null,
  error: null,
};

export function useGenieBrain(_userId: string | null) {
  const [state, setState] = useState<BrainState>(DEFAULT_STATE);

  const runBrain = useCallback(async (_prompt: string) => {
    // Brain feature removed — no-op
    return null;
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const togglePalantirMode = useCallback(() => {
    setState((prev) => ({ ...prev, palantirMode: !prev.palantirMode }));
  }, []);

  return { state, runBrain, reset, togglePalantirMode };
}
