import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface GenieOSAgent {
  id: string;
  user_id: string;
  name: string;
  description: string;
  objective: string;
  system_prompt: string;
  tools: unknown[];
  status: "draft" | "active" | "archived";
  executions: number;
  last_executed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GenieOSWorkflow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  trigger_event: string;
  steps: unknown[];
  tools: string;
  status: "draft" | "active";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserMemory {
  user_id?: string;
  skill_level: string;
  primary_goals: string[];
  recent_topics: string[];
  context_summary: string;
  preferences: Record<string, unknown>;
  updated_at?: string;
}

// Mirror of AI_ROUTER from edge function — keep in sync
export const AI_ROUTER_CLIENT: Record<string, string> = {
  assistant:     "gemini-3-flash",
  ai_tools:      "gemini-3-flash",
  agent_builder: "gemini-2.5-flash",
  automation:    "gemini-2.5-flash",
  business:      "gemini-2.5-flash",
  app_builder:   "gemini-2.5-pro",
  reasoning:     "gemini-2.5-pro",
  code:          "gemini-2.5-flash",
};

export function useGenieOSMemory() {
  const [agents, setAgents] = useState<GenieOSAgent[]>([]);
  const [workflows, setWorkflows] = useState<GenieOSWorkflow[]>([]);
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      const [agentsRes, workflowsRes, memoryRes] = await Promise.all([
        supabase
          .from("genieos_agents" as never)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("genieos_workflows" as never)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("genieos_user_memory" as never)
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ]);
      if (agentsRes.data) setAgents(agentsRes.data as GenieOSAgent[]);
      if (workflowsRes.data) setWorkflows(workflowsRes.data as GenieOSWorkflow[]);
      if (memoryRes.data) setMemory(memoryRes.data as UserMemory);
    } catch (_e) {
      // silent — memory failure is non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAgent = useCallback(async (
    agent: Pick<GenieOSAgent, "name" | "description" | "objective" | "system_prompt" | "tools">
  ): Promise<GenieOSAgent | null> => {
    if (!session?.user?.id) return null;
    const { data, error } = await supabase
      .from("genieos_agents" as never)
      .insert({ ...agent, user_id: session.user.id } as never)
      .select()
      .single();
    if (error || !data) return null;
    const saved = data as GenieOSAgent;
    setAgents(prev => [saved, ...prev]);
    return saved;
  }, [session?.user?.id]);

  const updateAgent = useCallback(async (id: string, updates: Partial<GenieOSAgent>) => {
    await supabase
      .from("genieos_agents" as never)
      .update({ ...updates, updated_at: new Date().toISOString() } as never)
      .eq("id", id);
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteAgent = useCallback(async (id: string) => {
    await supabase.from("genieos_agents" as never).delete().eq("id", id);
    setAgents(prev => prev.filter(a => a.id !== id));
  }, []);

  const saveWorkflow = useCallback(async (
    wf: Pick<GenieOSWorkflow, "name" | "description" | "trigger_event" | "steps" | "tools">
  ): Promise<GenieOSWorkflow | null> => {
    if (!session?.user?.id) return null;
    const { data, error } = await supabase
      .from("genieos_workflows" as never)
      .insert({ ...wf, user_id: session.user.id } as never)
      .select()
      .single();
    if (error || !data) return null;
    const saved = data as GenieOSWorkflow;
    setWorkflows(prev => [saved, ...prev]);
    return saved;
  }, [session?.user?.id]);

  const deleteWorkflow = useCallback(async (id: string) => {
    await supabase.from("genieos_workflows" as never).delete().eq("id", id);
    setWorkflows(prev => prev.filter(w => w.id !== id));
  }, []);

  const saveConversation = useCallback(async (
    messages: { role: string; content: string }[],
    module: string,
    modelUsed: string
  ) => {
    if (!session?.user?.id || messages.length < 2) return;
    const title = messages[0]?.content?.slice(0, 60) ?? "Conversation";
    await supabase.from("genieos_conversations" as never).insert({
      user_id: session.user.id,
      module,
      messages,
      title,
      model_used: modelUsed,
    } as never);
  }, [session?.user?.id]);

  const updateMemory = useCallback(async (updates: Partial<UserMemory>) => {
    if (!session?.user?.id) return;
    await supabase
      .from("genieos_user_memory" as never)
      .upsert({
        user_id: session.user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      } as never, { onConflict: "user_id" });
    setMemory(prev => prev ? { ...prev, ...updates } : updates as UserMemory);
  }, [session?.user?.id]);

  const addRecentTopic = useCallback(async (topic: string) => {
    if (!topic) return;
    setMemory(prev => {
      const current = prev?.recent_topics ?? [];
      const updated = [topic, ...current.filter(t => t !== topic)].slice(0, 10);
      // Persist asynchronously
      if (session?.user?.id) {
        supabase.from("genieos_user_memory" as never).upsert({
          user_id: session.user.id,
          recent_topics: updated,
          updated_at: new Date().toISOString(),
        } as never, { onConflict: "user_id" }).then(() => {/* no-op */});
      }
      return prev ? { ...prev, recent_topics: updated } : { skill_level: "beginner", primary_goals: [], recent_topics: updated, context_summary: "", preferences: {} };
    });
  }, [session?.user?.id]);

  return {
    agents,
    workflows,
    memory,
    isLoading,
    load,
    saveAgent,
    updateAgent,
    deleteAgent,
    saveWorkflow,
    deleteWorkflow,
    saveConversation,
    updateMemory,
    addRecentTopic,
  };
}
