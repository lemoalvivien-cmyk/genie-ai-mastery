import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AgentType = "research" | "analysis" | "writer" | "automation" | "code";

export interface SubTask {
  id: number;
  agent: AgentType;
  task: string;
  context?: string;
  result?: string;
  status: "pending" | "running" | "done" | "error";
}

export interface OrchestrationPlan {
  title: string;
  description: string;
  tasks: SubTask[];
}

export type ExecutionPhase = "idle" | "planning" | "executing" | "synthesizing" | "done" | "error";

export interface MultiAgentState {
  phase: ExecutionPhase;
  plan: OrchestrationPlan | null;
  tasks: SubTask[];
  currentAgentName: string | null;
  currentAgentIcon: string | null;
  finalResult: string | null;
  error: string | null;
  knowledgeUsed: boolean;
}

const AGENT_ICONS: Record<AgentType, string> = {
  research: "🔍",
  analysis: "🧠",
  writer: "✍️",
  automation: "⚡",
  code: "💻",
};

const AGENT_NAMES: Record<AgentType, string> = {
  research: "Research Agent",
  analysis: "Analysis Agent",
  writer: "Writer Agent",
  automation: "Automation Agent",
  code: "Code Agent",
};

export function useMultiAgentRuntime() {
  const [state, setState] = useState<MultiAgentState>({
    phase: "idle",
    plan: null,
    tasks: [],
    currentAgentName: null,
    currentAgentIcon: null,
    finalResult: null,
    error: null,
    knowledgeUsed: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({
      phase: "idle",
      plan: null,
      tasks: [],
      currentAgentName: null,
      currentAgentIcon: null,
      finalResult: null,
      error: null,
      knowledgeUsed: false,
    });
  }, []);

  const run = useCallback(async (objective: string, memoryContext?: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({
      phase: "planning",
      plan: null,
      tasks: [],
      currentAgentName: null,
      currentAgentIcon: null,
      finalResult: null,
      error: null,
      knowledgeUsed: false,
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/genieos-multi-agent-runtime`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ objective, memory_context: memoryContext, use_knowledge: true }),
          signal: abortRef.current.signal,
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

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
          } catch (_e) { /* ignore parse errors */ }
        }
      }

    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState(s => ({ ...s, phase: "error", error: String(err) }));
    }
  }, []);

  const handleEvent = (event: Record<string, unknown>) => {
    const type = event.type as string;

    if (type === "phase") {
      const phase = event.phase as string;
      setState(s => ({
        ...s,
        phase: phase === "planning" ? "planning"
          : phase === "executing" ? "executing"
          : phase === "synthesizing" ? "synthesizing"
          : s.phase,
      }));
    }

    else if (type === "plan") {
      const plan = event.plan as OrchestrationPlan;
      setState(s => ({
        ...s,
        plan,
        tasks: plan.tasks,
        phase: "executing",
      }));
    }

    else if (type === "knowledge") {
      setState(s => ({ ...s, knowledgeUsed: true }));
    }

    else if (type === "agent_start") {
      const taskId = event.task_id as number;
      const agentType = event.agent as AgentType;
      setState(s => ({
        ...s,
        phase: "executing",
        currentAgentName: (event.agent_name as string) ?? AGENT_NAMES[agentType],
        currentAgentIcon: (event.agent_icon as string) ?? AGENT_ICONS[agentType],
        tasks: s.tasks.map(t => t.id === taskId ? { ...t, status: "running" } : t),
      }));
    }

    else if (type === "agent_done") {
      const taskId = event.task_id as number;
      const result = event.result as string;
      setState(s => ({
        ...s,
        tasks: s.tasks.map(t => t.id === taskId ? { ...t, status: "done", result } : t),
        currentAgentName: null,
        currentAgentIcon: null,
      }));
    }

    else if (type === "agent_error") {
      const taskId = event.task_id as number;
      setState(s => ({
        ...s,
        tasks: s.tasks.map(t => t.id === taskId ? { ...t, status: "error", result: event.error as string } : t),
      }));
    }

    else if (type === "completed") {
      setState(s => ({
        ...s,
        phase: "done",
        finalResult: event.result as string,
        currentAgentName: null,
        currentAgentIcon: null,
      }));
    }

    else if (type === "error") {
      setState(s => ({ ...s, phase: "error", error: event.error as string }));
    }
  };

  return { state, run, reset };
}
