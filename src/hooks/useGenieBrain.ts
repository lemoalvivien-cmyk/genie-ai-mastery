/**
 * useGenieBrain — stub après suppression de GenieOS.
 * Fournit uniquement les types et l'état minimal pour Chat.tsx.
 */
import { useState, useCallback } from "react";

export type AgentType = "attaquant" | "defenseur" | "tuteur" | "predictor" | "analyst";
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents

export interface AgentResponse {
  agent: AgentType;
  content: string;
  latency_ms?: number;
}

export type BrainPhase = "idle" | "thinking" | "swarming" | "complete" | "error";

export interface BrainState {
  palantirMode: boolean;
  isRunning: boolean;
  phase: BrainPhase;
  riskScore: number;
  riskDelta: number;
  agentResponses: AgentResponse[];
  activeAgents: string[];
  finalContent: string;
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
  phase: "idle",
  riskScore: 0,
  riskDelta: 0,
  agentResponses: [],
  activeAgents: [],
  finalContent: "",
  prediction: null,
  humanComparison: null,
  generatedModule: null,
  error: null,
};

export function useGenieBrain(_userId: string | null) {
  const [state, setState] = useState<BrainState>(DEFAULT_STATE);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runBrain = useCallback(async (..._args: any[]) => {
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
