import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ActionMode = "simulation" | "real";
export type ActionStatus = "idle" | "planning" | "running" | "evaluating" | "synthesizing" | "completed" | "error";
export type ActionTool = "web_scraper" | "lead_finder" | "email_generator" | "api_connector" | "form_submit";

export interface ActionStep {
  id: number;
  name: string;
  description: string;
  tool: ActionTool;
  params: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed" | "requires_confirmation";
  result?: unknown;
  error?: string;
  duration_ms?: number;
  started_at?: string;
  completed_at?: string;
}

export interface ActionEvent {
  type: string;
  [key: string]: unknown;
}

export interface ActionEngineState {
  status: ActionStatus;
  mode: ActionMode;
  objective: string;
  steps: ActionStep[];
  events: ActionEvent[];
  report: string;
  iteration: number;
  pendingConfirmation: { step_id: number; step_name: string; tool: string; message: string } | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useActionEngine() {
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<ActionEngineState>({
    status: "idle",
    mode: "simulation",
    objective: "",
    steps: [],
    events: [],
    report: "",
    iteration: 0,
    pendingConfirmation: null,
  });

  const updateState = useCallback((patch: Partial<ActionEngineState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const run = useCallback(async (
    objective: string,
    mode: ActionMode = "simulation",
    options?: {
      tools?: ActionTool[];
      autonomous?: boolean;
      agentId?: string;
      confirmedCritical?: boolean;
    }
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    updateState({
      status: "planning",
      objective,
      mode,
      steps: [],
      events: [],
      report: "",
      iteration: 0,
      pendingConfirmation: null,
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `${SUPABASE_URL}/functions/v1/genieos-action-engine`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          objective,
          mode,
          tools: options?.tools,
          autonomous: options?.autonomous ?? false,
          agent_id: options?.agentId,
          confirmed_critical: options?.confirmedCritical ?? false,
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        if (resp.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
        if (resp.status === 402) throw new Error("Insufficient credits. Please add funds to your workspace.");
        throw new Error(`Engine error: ${resp.status}`);
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || line.trim() === "") continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            updateState({ status: "completed" });
            break;
          }

          try {
            const event: ActionEvent = JSON.parse(jsonStr);
            setState(prev => ({
              ...prev,
              events: [...prev.events, event],
            }));
            handleEvent(event);
          } catch (_e) {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = (err as Error).message;
      updateState({ status: "error" });
      toast({ title: "Action Engine Error", description: msg, variant: "destructive" });
    }
  }, [toast, updateState]);

  const handleEvent = useCallback((event: ActionEvent) => {
    switch (event.type) {
      case "phase":
        updateState({ status: event.phase as ActionStatus });
        break;
      case "plan":
        updateState({
          steps: (event.steps as ActionStep[]).map(s => ({ ...s, status: "pending" })),
          status: "running",
        });
        break;
      case "step_start":
        setState(prev => ({
          ...prev,
          steps: prev.steps.map(s =>
            s.id === event.step_id ? { ...s, status: "running" } : s
          ),
        }));
        break;
      case "step_done":
        setState(prev => ({
          ...prev,
          steps: prev.steps.map(s =>
            s.id === event.step_id
              ? { ...s, status: "completed", result: event.result, duration_ms: event.duration_ms as number }
              : s
          ),
        }));
        break;
      case "step_error":
        setState(prev => ({
          ...prev,
          steps: prev.steps.map(s =>
            s.id === event.step_id ? { ...s, status: "failed", error: event.error as string } : s
          ),
        }));
        break;
      case "requires_confirmation":
        updateState({
          pendingConfirmation: {
            step_id: event.step_id as number,
            step_name: event.step_name as string,
            tool: event.tool as string,
            message: event.message as string,
          },
        });
        break;
      case "iteration_start":
        updateState({ iteration: event.iteration as number });
        break;
      case "completed":
        updateState({ report: event.report as string, status: "completed" });
        break;
      case "error":
        updateState({ status: "error" });
        break;
    }
  }, [updateState]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    updateState({ status: "idle" });
  }, [updateState]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({
      status: "idle",
      mode: "simulation",
      objective: "",
      steps: [],
      events: [],
      report: "",
      iteration: 0,
      pendingConfirmation: null,
    });
  }, []);

  return { state, run, stop, reset, updateState };
}
