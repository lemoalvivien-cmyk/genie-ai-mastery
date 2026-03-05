import { useState, useCallback, useRef } from "react";
import { GenieOSAgent } from "@/hooks/useGenieOSMemory";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type StepStatus = "pending" | "running" | "done" | "error";

export interface AgentStep {
  id: number;
  name: string;
  description: string;
  tool?: string;
  result?: string;
  status: StepStatus;
}

export type ExecutionPhase = "idle" | "planning" | "executing" | "synthesizing" | "completed" | "error";

export interface AgentExecutionState {
  phase: ExecutionPhase;
  steps: AgentStep[];
  currentStepId: number | null;
  result: string | null;
  error: string | null;
  executionId: string | null;
  phaseMessage: string;
}

const INITIAL_STATE: AgentExecutionState = {
  phase: "idle",
  steps: [],
  currentStepId: null,
  result: null,
  error: null,
  executionId: null,
  phaseMessage: "",
};

export function useAgentRuntime() {
  const [state, setState] = useState<AgentExecutionState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const runAgent = useCallback(async (
    objective: string,
    agent?: Partial<GenieOSAgent>,
    memoryContext?: string
  ) => {
    // Cancel any ongoing execution
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({ ...INITIAL_STATE, phase: "planning", phaseMessage: "Initialisation..." });

    const token = (() => {
      try {
        const raw = localStorage.getItem("sb-" + new URL(SUPABASE_URL).hostname.split(".")[0] + "-auth-token");
        if (raw) return JSON.parse(raw)?.access_token ?? "";
      } catch (_e) { /* ignore */ }
      return "";
    })();

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/genieos-agent-runtime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          agent_id: agent?.id ?? null,
          objective,
          agent_name: agent?.name ?? null,
          agent_system_prompt: agent?.system_prompt ?? null,
          memory_context: memoryContext ?? null,
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Network error" }));
        setState(prev => ({ ...prev, phase: "error", error: err.error ?? "Unknown error" }));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const event = JSON.parse(jsonStr);
            handleEvent(event);
          } catch (_e) { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState(prev => ({ ...prev, phase: "error", error: String(err) }));
    }
  }, []);

  const handleEvent = (event: Record<string, unknown>) => {
    switch (event.type) {
      case "phase":
        setState(prev => ({
          ...prev,
          phase: event.phase as ExecutionPhase,
          phaseMessage: event.message as string,
        }));
        break;

      case "plan":
        setState(prev => ({
          ...prev,
          steps: event.steps as AgentStep[],
          phase: "executing",
          phaseMessage: "Exécution des étapes...",
        }));
        break;

      case "step_start":
        setState(prev => ({
          ...prev,
          currentStepId: event.step_id as number,
          steps: prev.steps.map(s =>
            s.id === event.step_id ? { ...s, status: "running" } : s
          ),
        }));
        break;

      case "step_done":
        setState(prev => ({
          ...prev,
          steps: prev.steps.map(s =>
            s.id === event.step_id ? { ...s, status: "done", result: event.result as string } : s
          ),
        }));
        break;

      case "step_error":
        setState(prev => ({
          ...prev,
          steps: prev.steps.map(s =>
            s.id === event.step_id ? { ...s, status: "error", result: event.error as string } : s
          ),
        }));
        break;

      case "completed":
        setState(prev => ({
          ...prev,
          phase: "completed",
          result: event.result as string,
          executionId: event.execution_id as string,
          currentStepId: null,
          phaseMessage: "Exécution terminée ✓",
        }));
        break;

      case "error":
        setState(prev => ({
          ...prev,
          phase: "error",
          error: event.error as string,
        }));
        break;
    }
  };

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  const isRunning = state.phase === "planning" || state.phase === "executing" || state.phase === "synthesizing";

  return { state, runAgent, reset, isRunning };
}
