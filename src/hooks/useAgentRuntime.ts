/**
 * useAgentRuntime — stub après refonte.
 * Fournit les types pour AgentExecutionPanel.tsx.
 */

export interface AgentStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  output?: string;
  error?: string;
  started_at?: string;
  ended_at?: string;
}

export interface AgentExecutionState {
  status: "idle" | "running" | "completed" | "failed";
  objective: string;
  steps: AgentStep[];
  result?: string;
  error?: string;
}
