/**
 * useGenieBrain — Hook central Génie Brain Palantir-level
 * Gère le swarm de 5 agents + realtime brain data
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AgentType = "attaquant" | "defenseur" | "tuteur" | "predictor" | "analyst";

export interface AgentResponse {
  agent: AgentType;
  content: string;
  timestamp: number;
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  risk: number;
}

export interface BrainPrediction {
  prediction: string;
  risk_domain: string;
  confidence_pct: number;
  module_title?: string;
  module_description?: string;
  urgency: "high" | "medium" | "low";
  predicted_failure_hours?: number;
}

export interface HumanComparison {
  genie_response_ms: number;
  human_response_s: number;
  human_error_rate: number;
  human_cost_eur: number;
  genie_cost_eur: number;
  advantage_factor: number;
}

export interface BrainState {
  phase: "idle" | "thinking" | "swarming" | "complete" | "error";
  agentResponses: AgentResponse[];
  finalContent: string;
  riskScore: number;
  riskDelta: number;
  mitreTechniques: MitreTechnique[];
  prediction: BrainPrediction | null;
  humanComparison: HumanComparison | null;
  generatedModule: { title: string; domain: string; urgency: string; confidence: number } | null;
  activeAgents: AgentType[];
  palantirMode: boolean;
  error: string | null;
}

export interface BrainData {
  predicted_risk_score: number;
  knowledge_graph: Record<string, unknown>;
  ontology_nodes: string[];
  last_analysis_at: string | null;
  next_failure_prediction: string | null;
  agent_states: Record<string, unknown>;
}

const INITIAL_STATE: BrainState = {
  phase: "idle",
  agentResponses: [],
  finalContent: "",
  riskScore: 50,
  riskDelta: 0,
  mitreTechniques: [],
  prediction: null,
  humanComparison: null,
  generatedModule: null,
  activeAgents: ["tuteur"],
  palantirMode: false,
  error: null,
};

const DEFAULT_AGENTS: AgentType[] = ["tuteur"];
const PALANTIR_AGENTS: AgentType[] = ["attaquant", "defenseur", "tuteur", "predictor", "analyst"];

export function useGenieBrain(userId: string | null) {
  const [state, setState] = useState<BrainState>(INITIAL_STATE);
  const [brainData, setBrainData] = useState<BrainData | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch brain data + realtime ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    supabase
      .from("genie_brain")
      .select("predicted_risk_score, knowledge_graph, ontology_nodes, last_analysis_at, next_failure_prediction, agent_states")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBrainData(data as BrainData);
      });

    const channel = supabase
      .channel(`brain-${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "genie_brain",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.new) {
          setBrainData(payload.new as BrainData);
          setState(s => ({ ...s, riskScore: (payload.new as BrainData).predicted_risk_score ?? s.riskScore }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ── Toggle Palantir Mode ────────────────────────────────────────────────────
  const togglePalantirMode = useCallback(() => {
    setState(s => ({
      ...s,
      palantirMode: !s.palantirMode,
      activeAgents: !s.palantirMode ? PALANTIR_AGENTS : DEFAULT_AGENTS,
    }));
  }, []);

  // ── Run brain swarm ─────────────────────────────────────────────────────────
  const runBrain = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    userProfile: Record<string, unknown>,
    sessionId: string,
    palantirMode: boolean,
    activeAgents: AgentType[]
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState(s => ({
      ...s,
      phase: "thinking",
      agentResponses: [],
      finalContent: "",
      riskDelta: 0,
      mitreTechniques: [],
      prediction: null,
      humanComparison: null,
      generatedModule: null,
      error: null,
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/genie-brain-orchestrator`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            user_profile: userProfile,
            session_id: sessionId,
            palantir_mode: palantirMode,
            active_agents: activeAgents,
          }),
          signal: abortRef.current.signal,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      setState(s => ({ ...s, phase: "swarming" }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;

          try {
            const event = JSON.parse(raw);
            handleEvent(event);
          } catch (_e) {
            // Ignore parse errors
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState(s => ({ ...s, phase: "error", error: String(err) }));
    }
  }, []);

  const handleEvent = (event: Record<string, unknown>) => {
    const type = event.type as string;

    if (type === "brain_start") {
      setState(s => ({
        ...s,
        riskScore: (event.risk_score as number) ?? s.riskScore,
        mitreTechniques: (event.mitre_techniques as MitreTechnique[]) ?? [],
      }));
    }

    else if (type === "agent_response") {
      setState(s => ({
        ...s,
        agentResponses: [...s.agentResponses, {
          agent: event.agent as AgentType,
          content: event.content as string,
          timestamp: event.timestamp as number,
        }],
      }));
    }

    else if (type === "module_generated") {
      setState(s => ({
        ...s,
        generatedModule: {
          title: event.title as string,
          domain: event.domain as string,
          urgency: event.urgency as string,
          confidence: event.confidence as number,
        },
      }));
    }

    else if (type === "brain_complete") {
      setState(s => ({
        ...s,
        phase: "complete",
        finalContent: event.content as string,
        riskScore: (event.risk_score as number) ?? s.riskScore,
        riskDelta: (event.risk_delta as number) ?? 0,
        prediction: event.prediction as BrainPrediction | null,
        humanComparison: event.human_comparison as HumanComparison | null,
      }));
    }

    else if (type === "error") {
      setState(s => ({ ...s, phase: "error", error: event.error as string }));
    }
  };

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    brainData,
    runBrain,
    reset,
    togglePalantirMode,
    PALANTIR_AGENTS,
    DEFAULT_AGENTS,
  };
}
