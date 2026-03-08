import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Tool definitions available to agents
const AVAILABLE_TOOLS = {
  web_search: {
    name: "web_search",
    description: "Search the web for information on a topic",
    // ⚠ DEMO_ONLY: This tool returns a stub. Real web search requires OpenClaw runtime (tutor_readonly profile).
    // To enable real search: create an openclaw_job of type tutor_search via /app/agent-jobs/new.
    execute: async (params: { query: string }) => {
      return `[DEMO_ONLY — web_search pour "${params.query}"]: Résultat simulé. Pour une vraie recherche, utilisez un job OpenClaw (type: tutor_search).`;
    },
  },
  ai_summarize: {
    name: "ai_summarize",
    description: "Summarize a block of text using AI",
    execute: async (params: { text: string; instruction?: string }) => {
      const prompt = `Summarize the following text concisely:\n\n${params.text}\n\nInstruction: ${params.instruction ?? "Be concise and actionable."}`;
      const res = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 400,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "Summary unavailable";
    },
  },
  database_query: {
    name: "database_query",
    description: "Query internal knowledge base",
    // ⚠ DEMO_ONLY: Returns a stub. Real database queries use RPC functions with user scoping.
    // Do NOT use for production data retrieval without proper RLS enforcement.
    execute: async (params: { query: string }) => {
      return `[DEMO_ONLY — database_query pour "${params.query}"]: Résultat simulé. Pour un vrai accès structuré, utilisez les RPC Supabase sécurisées.`;
    },
  },
  workflow_trigger: {
    name: "workflow_trigger",
    description: "Trigger an existing workflow",
    // ⚠ DEMO_ONLY: This tool returns a stub. Real workflow triggers are not yet implemented.
    // To trigger real automation: create an openclaw_job of type scheduled_coach.
    execute: async (params: { workflow_name: string; input?: string }) => {
      return `[DEMO_ONLY — workflow_trigger "${params.workflow_name}"]: Exécution simulée. Pour une vraie automation, utilisez un job OpenClaw (type: scheduled_coach).`;
    },
  },
  url_scraper: {
    name: "url_scraper",
    description: "Extract content from a URL",
    // ⚠ DEMO_ONLY: This tool returns a stub. Real URL scraping requires OpenClaw runtime (browser_lab profile).
    // To enable real scraping: create an openclaw_job of type browser_lab via /app/agent-jobs/new.
    execute: async (params: { url: string }) => {
      return `[DEMO_ONLY — url_scraper pour "${params.url}"]: Contenu simulé. Pour un vrai scraping, utilisez un job OpenClaw (type: browser_lab).`;
    },
  },
  knowledge_search: {
    name: "knowledge_search",
    description: "Search the user's personal knowledge base for relevant documents and context",
    execute: async (params: { query: string; user_id?: string }) => {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (!params.user_id) return "[knowledge_search]: No user context available.";
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const sb = createClient(supabaseUrl, supabaseServiceKey);
        const { data } = await sb.rpc("search_knowledge_fts", {
          _user_id: params.user_id,
          _query: params.query,
          _limit: 3,
        });
        if (!data || data.length === 0) return `[knowledge_search]: No documents found for "${params.query}".`;
        const results = data.map((r: { title: string; content: string }) => `[${r.title}]: ${r.content}`).join("\n\n");
        return `[knowledge_search] Résultats pour "${params.query}":\n\n${results}`;
      } catch (_e) {
        return `[knowledge_search]: Search failed for "${params.query}".`;
      }
    },
  },
};

type StepStatus = "pending" | "running" | "done" | "error";
interface AgentStep {
  id: number;
  name: string;
  description: string;
  tool?: string;
  tool_params?: Record<string, unknown>;
  result?: string;
  status: StepStatus;
  started_at?: string;
  completed_at?: string;
}

// Call the AI to generate a plan for the agent
async function generatePlan(objective: string, agentContext: string, memoryContext: string): Promise<AgentStep[]> {
  const plannerPrompt = `You are an autonomous AI agent planner. 
Given this OBJECTIVE, generate a step-by-step execution plan.

OBJECTIVE: ${objective}

AGENT CONTEXT: ${agentContext}

USER MEMORY: ${memoryContext}

AVAILABLE TOOLS: ${Object.keys(AVAILABLE_TOOLS).join(", ")}

Respond with a JSON array of steps. Each step must have:
- id: number (1-based)
- name: short step name (max 5 words)
- description: what this step does (1 sentence)
- tool: (optional) one of: ${Object.keys(AVAILABLE_TOOLS).join(", ")}
- tool_params: (optional) object with tool parameters

Example: [{\\"id\\":1,\\"name\\":\\\"Analyze request\\\",\\\"description\\\":\\\"Parse and understand the objective\\\",\\\"tool\\\":\\\"ai_summarize\\\",\\\"tool_params\\\":{\\\"text\\\":\\\"...\\\",\\\"instruction\\\":\\\"Extract key requirements\\\"}},...]

Generate 3-6 steps. Respond ONLY with the JSON array, no markdown.`;

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: plannerPrompt }],
      max_tokens: 1200,
      temperature: 0.3,
    }),
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "[]";
  try {
    const cleaned = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
    const steps = JSON.parse(cleaned);
    return steps.map((s: Partial<AgentStep>) => ({ ...s, status: "pending" as StepStatus }));
  } catch (_e) {
    return [
      { id: 1, name: "Analyze request", description: "Understanding the objective", status: "pending" },
      { id: 2, name: "Process information", description: "Processing relevant data", status: "pending" },
      { id: 3, name: "Generate result", description: "Compiling final output", status: "pending" },
    ];
  }
}

// Execute a single step
async function executeStep(step: AgentStep, objective: string, previousResults: string[]): Promise<string> {
  // If the step has a tool, call it
  if (step.tool && step.tool in AVAILABLE_TOOLS) {
    const tool = AVAILABLE_TOOLS[step.tool as keyof typeof AVAILABLE_TOOLS];
    const params = (step.tool_params as Record<string, string>) ?? { query: objective };
    return await tool.execute(params as never);
  }

  // Otherwise, use the AI to complete this step
  const contextSoFar = previousResults.length > 0
    ? `\n\nPrevious steps results:\n${previousResults.map((r, i) => `Step ${i + 1}: ${r}`).join("\n")}`
    : "";

  const stepPrompt = `You are executing step ${step.id} of an autonomous agent task.\n\nOVERALL OBJECTIVE: ${objective}\nCURRENT STEP: ${step.name}\nSTEP DESCRIPTION: ${step.description}${contextSoFar}\n\nExecute this step and provide a concrete, actionable result. Be specific and thorough. Max 300 words.`;

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: stepPrompt }],
      max_tokens: 500,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? `Step ${step.id} completed.`;
}

// Generate final synthesis from all step results
async function synthesizeResult(objective: string, steps: AgentStep[]): Promise<string> {
  const stepsText = steps
    .filter(s => s.result)
    .map(s => `**${s.name}**: ${s.result}`)
    .join("\n\n");

  const synthPrompt = `You are synthesizing the results of an autonomous AI agent run.\n\nOBJECTIVE: ${objective}\n\nSTEPS COMPLETED:\n${stepsText}\n\nWrite a clear, structured final report summarizing what was accomplished, key findings, and recommended next actions. Use markdown formatting with headers.`;

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "user", content: synthPrompt }],
      max_tokens: 800,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "Agent execution completed.";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (Deno.env.get("GENIEOS_ENABLED") !== "true") {
    return new Response("Feature disabled", { status: 503, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  const userSupabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await userSupabase.auth.getUser(token);

  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { agent_id, objective, agent_name, agent_system_prompt, memory_context } = body;

  if (!objective) {
    return new Response(JSON.stringify({ error: "objective is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create execution record
  const { data: execution, error: execErr } = await userSupabase
    .from("agent_executions")
    .insert({
      agent_id: agent_id ?? null,
      user_id: user.id,
      objective,
      steps: [],
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (execErr || !execution) {
    return new Response(JSON.stringify({ error: "Failed to create execution" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SSE stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  const send = async (data: unknown) => {
    await writer.write(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Run execution in background
  (async () => {
    try {
      const agentContext = agent_system_prompt
        ? `Agent: ${agent_name ?? "Custom Agent"}\nSystem Prompt: ${agent_system_prompt}`
        : `Generic agent for: ${objective}`;
      const memCtx = memory_context ?? "";

      // Phase 1: Plan
      await send({ type: "phase", phase: "planning", message: "🧠 Generating execution plan..." });
      const steps = await generatePlan(objective, agentContext, memCtx);
      await send({ type: "plan", steps });

      // Update DB with plan
      await userSupabase.from("agent_executions").update({ steps }).eq("id", execution.id);

      // Phase 2: Execute each step
      const previousResults: string[] = [];
      const updatedSteps = [...steps];

      for (let i = 0; i < updatedSteps.length; i++) {
        const step = updatedSteps[i];
        step.status = "running";
        step.started_at = new Date().toISOString();
        await send({ type: "step_start", step_id: step.id, step_name: step.name, step_description: step.description });

        try {
          const result = await executeStep(step, objective, previousResults);
          step.result = result;
          step.status = "done";
          step.completed_at = new Date().toISOString();
          previousResults.push(result);
          await send({ type: "step_done", step_id: step.id, result });
        } catch (stepErr) {
          step.status = "error";
          step.result = String(stepErr);
          await send({ type: "step_error", step_id: step.id, error: String(stepErr) });
        }

        // Update DB
        await userSupabase.from("agent_executions").update({ steps: updatedSteps }).eq("id", execution.id);
      }

      // Phase 3: Synthesize
      await send({ type: "phase", phase: "synthesizing", message: "📋 Generating final report..." });
      const finalResult = await synthesizeResult(objective, updatedSteps);

      // Complete
      await userSupabase.from("agent_executions").update({
        steps: updatedSteps,
        result: finalResult,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", execution.id);

      // Increment agent executions counter
      if (agent_id) {
        await userSupabase.from("genieos_agents")
          .update({ executions: userSupabase.rpc("increment", { x: 1 }) })
          .eq("id", agent_id);
      }

      await send({ type: "completed", result: finalResult, execution_id: execution.id });
      await send("[DONE]");

    } catch (err) {
      await userSupabase.from("agent_executions").update({
        status: "failed",
        error: String(err),
        completed_at: new Date().toISOString(),
      }).eq("id", execution.id);
      await send({ type: "error", error: String(err) });
      await send("[DONE]");
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
