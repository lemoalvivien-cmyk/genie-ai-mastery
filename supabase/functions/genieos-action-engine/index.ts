import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const ACTION_TOOLS = {
  web_scraper: {
    label: "Web Scraper",
    description: "Scrape and extract content from a web page",
    critical: false,
    execute: async (params: { url: string; selector?: string }, mode: string) => {
      if (mode === "simulation") {
        return {
          simulated: true,
          url: params.url,
          content: `[SIMULATION] Scraped content from ${params.url}. In real mode, this would fetch and parse the actual page content, extract text, links, and structured data.`,
          links: ["https://example.com/page1", "https://example.com/page2"],
          meta: { title: "Example Page Title", description: "Page description" },
        };
      }
      // Real mode: attempt actual fetch (CORS-safe from edge function)
      try {
        const res = await fetch(params.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GenieOS/1.0)" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        // Extract text content (simple regex extraction)
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 3000);
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return {
          simulated: false,
          url: params.url,
          content: textContent,
          title: titleMatch?.[1] ?? "Unknown",
          char_count: textContent.length,
        };
      } catch (err) {
        throw new Error(`Web scraper failed: ${String(err)}`);
      }
    },
  },

  lead_finder: {
    label: "Lead Finder",
    description: "Find and qualify potential leads from a target description",
    critical: false,
    execute: async (params: { target: string; criteria?: string; count?: number }, mode: string) => {
      const count = params.count ?? 5;
      if (mode === "simulation") {
        const leads = Array.from({ length: count }, (_, i) => ({
          name: `Lead ${i + 1} — ${params.target}`,
          company: `Company ${String.fromCharCode(65 + i)}`,
          email: `contact${i + 1}@company${String.fromCharCode(97 + i)}.com`,
          score: Math.round(70 + Math.random() * 30),
          criteria_match: params.criteria ?? "General match",
        }));
        return { simulated: true, target: params.target, leads, total: count };
      }
      // Real mode: use AI to generate structured leads based on target
      const prompt = `You are a lead generation specialist. Generate ${count} realistic B2B leads for: "${params.target}".
Criteria: ${params.criteria ?? "No specific criteria"}

Return a JSON array with objects containing: name, company, email (realistic but fake), linkedin_url (fake), score (0-100), reason_for_match.
Respond ONLY with JSON array.`;
      const res = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
        }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? "[]";
      try {
        const cleaned = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
        return { simulated: false, target: params.target, leads: JSON.parse(cleaned), total: count };
      } catch (_e) {
        return { simulated: false, target: params.target, leads: [], error: "Could not parse leads" };
      }
    },
  },

  email_generator: {
    label: "Email Generator",
    description: "Generate personalized email content for outreach or communication",
    critical: false,
    execute: async (params: { recipient: string; purpose: string; tone?: string; context?: string }, mode: string) => {
      const tone = params.tone ?? "professional";
      if (mode === "simulation") {
        return {
          simulated: true,
          subject: `[SIMULATION] Email to ${params.recipient} — ${params.purpose}`,
          body: `[SIMULATION] This would generate a ${tone} email for ${params.purpose}. In real mode, an AI-generated email will appear here.`,
          recipient: params.recipient,
        };
      }
      const prompt = `Write a ${tone} email for the following purpose:

Recipient: ${params.recipient}
Purpose: ${params.purpose}
Context: ${params.context ?? "No additional context"}

Write a complete email with subject line. Format:
Subject: [subject]

[email body]

Keep it concise, personalized and action-oriented.`;
      const res = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 600,
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      const subjectMatch = content.match(/Subject:\s*(.+)/i);
      const bodyStart = content.indexOf("\n\n");
      return {
        simulated: false,
        subject: subjectMatch?.[1]?.trim() ?? `Email: ${params.purpose}`,
        body: bodyStart > -1 ? content.slice(bodyStart).trim() : content,
        recipient: params.recipient,
        full_content: content,
      };
    },
  },

  api_connector: {
    label: "API Connector",
    description: "Make an HTTP request to an external API endpoint",
    critical: true, // requires user confirmation in real mode
    execute: async (params: { url: string; method?: string; headers?: Record<string, string>; body?: unknown }, mode: string) => {
      const method = params.method ?? "GET";
      if (mode === "simulation") {
        return {
          simulated: true,
          url: params.url,
          method,
          status: 200,
          response: `[SIMULATION] API call to ${params.url} (${method}). In real mode, the actual API response would appear here. Make sure the endpoint is accessible and credentials are configured.`,
        };
      }
      // Real mode: make actual HTTP call
      try {
        const res = await fetch(params.url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(params.headers ?? {}),
          },
          body: method !== "GET" && params.body ? JSON.stringify(params.body) : undefined,
          signal: AbortSignal.timeout(15000),
        });
        const responseText = await res.text();
        let responseData: unknown;
        try { responseData = JSON.parse(responseText); } catch (_e) { responseData = responseText; }
        return {
          simulated: false,
          url: params.url,
          method,
          status: res.status,
          ok: res.ok,
          response: responseData,
        };
      } catch (err) {
        throw new Error(`API connector failed: ${String(err)}`);
      }
    },
  },

  form_submit: {
    label: "Form Submit",
    description: "Submit data to a web form or webhook endpoint",
    critical: true, // requires user confirmation in real mode
    execute: async (params: { url: string; data: Record<string, unknown>; method?: string }, mode: string) => {
      if (mode === "simulation") {
        return {
          simulated: true,
          url: params.url,
          data: params.data,
          result: `[SIMULATION] Form submission to ${params.url}. In real mode, the data would be sent as a POST request. Fields: ${Object.keys(params.data).join(", ")}`,
        };
      }
      // Real mode: POST to the target
      try {
        const res = await fetch(params.url, {
          method: params.method ?? "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params.data),
          signal: AbortSignal.timeout(10000),
        });
        const responseText = await res.text();
        return {
          simulated: false,
          url: params.url,
          status: res.status,
          ok: res.ok,
          response: responseText.slice(0, 1000),
        };
      } catch (err) {
        throw new Error(`Form submit failed: ${String(err)}`);
      }
    },
  },
};

// ─── Autonomous Agent Loop ────────────────────────────────────────────────────

async function generateActionPlan(objective: string, availableTools: string[]): Promise<{ steps: ActionStep[] }> {
  const prompt = `You are an autonomous action agent. Plan a sequence of actions to achieve:

OBJECTIVE: ${objective}

AVAILABLE TOOLS: ${availableTools.join(", ")}

Tool descriptions:
- web_scraper: Scrape and extract content from a URL
- lead_finder: Find potential leads given a target description  
- email_generator: Generate personalized email content
- api_connector: Make HTTP requests to external APIs
- form_submit: Submit data to web forms or webhooks

Generate a JSON plan with 2-5 action steps. Each step:
{
  "id": 1,
  "name": "Short action name",
  "description": "What this action does",
  "tool": "tool_name",
  "params": { relevant params for the tool },
  "depends_on": [] // step ids this depends on
}

Respond ONLY with JSON: { "steps": [...] }`;

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
    }),
  });
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '{"steps":[]}';
  try {
    const cleaned = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (_e) {
    return {
      steps: [
        { id: 1, name: "Execute objective", description: objective, tool: "web_scraper", params: { url: "https://example.com" }, depends_on: [] },
      ],
    };
  }
}

async function evaluateAndIterate(
  objective: string,
  completedSteps: ActionStep[],
  iteration: number,
): Promise<{ continue: boolean; reason: string; next_steps?: ActionStep[] }> {
  if (iteration >= 3) return { continue: false, reason: "Max iterations reached" };

  const stepsText = completedSteps.map(s => `${s.name}: ${JSON.stringify(s.result)?.slice(0, 200)}`).join("\n");
  const prompt = `An autonomous agent has completed these actions:

OBJECTIVE: ${objective}
ITERATION: ${iteration}

COMPLETED ACTIONS:
${stepsText}

Evaluate: Is the objective fully achieved? Should we continue with more actions?
Respond with JSON: { "continue": boolean, "reason": "explanation", "next_steps": [] }
If continuing, add 1-2 additional steps. Keep next_steps empty if done.`;

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    }),
  });
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '{"continue":false,"reason":"Done"}';
  try {
    const cleaned = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (_e) {
    return { continue: false, reason: "Evaluation complete" };
  }
}

interface ActionStep {
  id: number;
  name: string;
  description: string;
  tool: string;
  params: Record<string, unknown>;
  depends_on?: number[];
  status?: string;
  result?: unknown;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // Auth
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const {
    objective,
    mode = "simulation", // simulation | real
    agent_id,
    tools: requestedTools,
    autonomous = false,
  } = body;

  if (!objective) {
    return new Response(JSON.stringify({ error: "objective is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const availableToolNames = requestedTools ?? Object.keys(ACTION_TOOLS);

  // SSE stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const send = async (data: unknown) => {
    await writer.write(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      await send({ type: "start", mode, objective });

      // Phase 1: Generate plan
      await send({ type: "phase", phase: "planning", message: `🧠 Planning actions (mode: ${mode})...` });
      const plan = await generateActionPlan(objective, availableToolNames);
      await send({ type: "plan", steps: plan.steps, mode });

      let allCompletedSteps: ActionStep[] = [];
      let iteration = 0;
      let currentSteps = plan.steps;
      let continueLoop = true;

      while (continueLoop) {
        iteration++;
        await send({ type: "iteration_start", iteration });

        // Execute each step
        for (const step of currentSteps) {
          const logEntry = {
            user_id: user.id,
            agent_id: agent_id ?? null,
            action_type: step.tool,
            mode,
            status: "running",
            input: { step_name: step.name, params: step.params, objective },
          };
          const { data: log } = await sb.from("action_logs").insert(logEntry).select().single();
          const logId = log?.id;

          step.status = "running";
          step.started_at = new Date().toISOString();
          await send({ type: "step_start", step_id: step.id, step_name: step.name, tool: step.tool, mode });

          try {
            if (!(step.tool in ACTION_TOOLS)) {
              throw new Error(`Unknown tool: ${step.tool}`);
            }
            const tool = ACTION_TOOLS[step.tool as keyof typeof ACTION_TOOLS];

            // Critical actions in real mode require confirmation flag in body
            if (mode === "real" && tool.critical && !body.confirmed_critical) {
              step.status = "requires_confirmation";
              await send({
                type: "requires_confirmation",
                step_id: step.id,
                step_name: step.name,
                tool: step.tool,
                message: `This action (${tool.label}) requires explicit confirmation before executing in real mode.`,
              });
              if (logId) await sb.from("action_logs").update({ status: "cancelled", error: "Awaiting user confirmation" }).eq("id", logId);
              continue;
            }

            const startTime = Date.now();
            const result = await tool.execute(step.params as never, mode);
            const durationMs = Date.now() - startTime;

            step.result = result;
            step.status = "completed";
            step.completed_at = new Date().toISOString();
            allCompletedSteps.push(step);

            if (logId) {
              await sb.from("action_logs").update({
                status: "completed",
                output: result as Record<string, unknown>,
                duration_ms: durationMs,
                confirmed_by_user: mode === "real",
              }).eq("id", logId);
            }

            await send({ type: "step_done", step_id: step.id, result, duration_ms: durationMs });
          } catch (stepErr) {
            step.status = "failed";
            step.error = String(stepErr);
            allCompletedSteps.push(step);
            if (logId) await sb.from("action_logs").update({ status: "failed", error: String(stepErr) }).eq("id", logId);
            await send({ type: "step_error", step_id: step.id, error: String(stepErr) });
          }
        }

        // Phase 3: Evaluate and decide whether to iterate (only in autonomous mode)
        if (autonomous && iteration < 3) {
          await send({ type: "phase", phase: "evaluating", message: "🔍 Evaluating results..." });
          const evaluation = await evaluateAndIterate(objective, allCompletedSteps, iteration);
          await send({ type: "evaluation", ...evaluation });

          if (evaluation.continue && evaluation.next_steps && evaluation.next_steps.length > 0) {
            currentSteps = evaluation.next_steps.map((s, i) => ({ ...s, id: allCompletedSteps.length + i + 1 }));
            await send({ type: "iterating", next_steps: currentSteps });
          } else {
            continueLoop = false;
          }
        } else {
          continueLoop = false;
        }
      }

      // Final synthesis
      await send({ type: "phase", phase: "synthesizing", message: "📋 Generating action report..." });

      const synthPrompt = `Summarize the results of these automated actions:

OBJECTIVE: ${objective}
MODE: ${mode}
ITERATIONS: ${iteration}

ACTIONS COMPLETED:
${allCompletedSteps.map(s => `- ${s.name} (${s.tool}): ${s.status} — ${JSON.stringify(s.result)?.slice(0, 300)}`).join("\n")}

Write a concise report with: what was accomplished, key results, and recommended next steps.
Use markdown.`;

      const synthRes = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: synthPrompt }],
          max_tokens: 600,
        }),
      });
      const synthData = await synthRes.json();
      const report = synthData.choices?.[0]?.message?.content ?? "Actions completed.";

      await send({ type: "completed", report, mode, steps_count: allCompletedSteps.length, iterations: iteration });
      await send("[DONE]");
    } catch (err) {
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
