import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ─── Agent Definitions ───────────────────────────────────────────────────────

const AGENTS = {
  research: {
    name: "Research Agent",
    icon: "🔍",
    model: "google/gemini-2.5-flash",
    system: `Tu es un agent de recherche spécialisé. Tu collectes, cherches et synthétises des informations de manière exhaustive.
Tu dois :
- Identifier les sources d'information pertinentes
- Collecter des données factuelles et vérifiables
- Organiser les informations de manière structurée
- Fournir des résultats détaillés et contextualisés
Réponds toujours avec des informations concrètes et actionnables.`,
  },
  analysis: {
    name: "Analysis Agent",
    icon: "🧠",
    model: "google/gemini-2.5-pro",
    system: `Tu es un agent d'analyse expert. Tu analyses des données, identifies des patterns et tire des conclusions pertinentes.
Tu dois :
- Analyser profondément les données fournies
- Identifier les tendances, opportunités et risques
- Fournir une analyse structurée avec des insights actionnables
- Quantifier les résultats quand c'est possible
Sois précis, rigoureux et orienté résultats.`,
  },
  writer: {
    name: "Writer Agent",
    icon: "✍️",
    model: "google/gemini-3-flash-preview",
    system: `Tu es un agent rédacteur expert. Tu produis du contenu de haute qualité, clair et persuasif.
Tu dois :
- Rédiger du contenu structuré et professionnel
- Adapter le ton au contexte (business, technique, marketing)
- Utiliser le markdown pour une mise en forme optimale
- Produire un contenu actionnable et orienté résultats
Sois concis, impactant et professionnel.`,
  },
  automation: {
    name: "Automation Agent",
    icon: "⚡",
    model: "google/gemini-2.5-flash",
    system: `Tu es un agent d'automatisation spécialisé. Tu identifies les opportunités d'automatisation et conçois des workflows.
Tu dois :
- Identifier les tâches répétitives et automatisables
- Concevoir des workflows clairs et efficaces
- Proposer des outils et intégrations adaptés
- Estimer le gain de temps et l'impact
Sois technique, précis et orienté ROI.`,
  },
  code: {
    name: "Code Agent",
    icon: "💻",
    model: "google/gemini-2.5-pro",
    system: `Tu es un agent de développement expert. Tu génères du code de qualité production.
Tu dois :
- Écrire du code propre, maintenable et bien commenté
- Respecter les bonnes pratiques de développement
- Proposer des architectures scalables
- Fournir des explications claires sur les choix techniques
Utilise du markdown avec des blocs de code pour ta réponse.`,
  },
};

type AgentType = keyof typeof AGENTS;

interface SubTask {
  id: number;
  agent: AgentType;
  task: string;
  context?: string;
  result?: string;
  status: "pending" | "running" | "done" | "error";
}

interface OrchestrationPlan {
  title: string;
  description: string;
  tasks: SubTask[];
}

// ─── AI Helper ───────────────────────────────────────────────────────────────

async function callAI(model: string, messages: Array<{ role: string; content: string }>, maxTokens = 800): Promise<string> {
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4 }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Knowledge Search ─────────────────────────────────────────────────────────

async function searchKnowledge(supabase: ReturnType<typeof createClient>, userId: string, query: string): Promise<string> {
  const { data } = await supabase.rpc("search_knowledge_fts", {
    _user_id: userId,
    _query: query,
    _limit: 3,
  });
  if (!data || data.length === 0) return "";
  return data.map((r: { title: string; content: string }) => `[${r.title}]: ${r.content}`).join("\n\n");
}

// ─── Plan Generation ──────────────────────────────────────────────────────────

async function generateOrchestrationPlan(objective: string, memoryContext: string): Promise<OrchestrationPlan> {
  const prompt = `Tu es un orchestrateur multi-agents IA. Analyse cet OBJECTIF et décompose-le en sous-tâches assignées aux bons agents spécialisés.

OBJECTIF: ${objective}

CONTEXTE UTILISATEUR: ${memoryContext || "Aucun contexte disponible."}

AGENTS DISPONIBLES:
- research: collecte et synthèse d'informations
- analysis: analyse de données, patterns, insights
- writer: rédaction de contenu, rapports, copies
- automation: conception de workflows et automatisations
- code: génération de code et architecture technique

Réponds UNIQUEMENT avec un JSON valide (sans markdown) :
{
  "title": "titre court du projet",
  "description": "description en 1 phrase",
  "tasks": [
    {
      "id": 1,
      "agent": "research",
      "task": "description précise de la sous-tâche",
      "context": "contexte ou données à utiliser"
    }
  ]
}

Génère 3 à 5 tâches. Chaque tâche doit avoir un rôle clair et distinct. Assigne le bon agent à chaque tâche.`;

  const raw = await callAI("google/gemini-2.5-pro", [{ role: "user", content: prompt }], 1000);
  try {
    const cleaned = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
    const plan = JSON.parse(cleaned);
    return {
      ...plan,
      tasks: plan.tasks.map((t: Partial<SubTask>) => ({ ...t, status: "pending" as const })),
    };
  } catch (_e) {
    return {
      title: "Exécution de l'objectif",
      description: objective,
      tasks: [
        { id: 1, agent: "research" as AgentType, task: `Rechercher des informations sur: ${objective}`, status: "pending" as const },
        { id: 2, agent: "analysis" as AgentType, task: `Analyser et synthétiser les résultats`, status: "pending" as const },
        { id: 3, agent: "writer" as AgentType, task: `Rédiger un rapport final avec les conclusions`, status: "pending" as const },
      ],
    };
  }
}

// ─── Execute a single agent task ─────────────────────────────────────────────

async function executeAgentTask(
  task: SubTask,
  objective: string,
  previousResults: Array<{ agent: string; task: string; result: string }>,
  knowledgeContext: string
): Promise<string> {
  const agent = AGENTS[task.agent] ?? AGENTS.research;

  const previousContext = previousResults.length > 0
    ? `\n\nRÉSULTATS DES AGENTS PRÉCÉDENTS:\n${previousResults.map(r => `**${r.agent.toUpperCase()}** (${r.task}):\n${r.result}`).join("\n\n---\n\n")}`
    : "";

  const knowledgeSection = knowledgeContext
    ? `\n\nBASE DE CONNAISSANCES PERTINENTE:\n${knowledgeContext}`
    : "";

  const userMessage = `OBJECTIF GLOBAL: ${objective}

TA MISSION: ${task.task}
${task.context ? `CONTEXTE: ${task.context}` : ""}${previousContext}${knowledgeSection}

Exécute ta mission de manière complète et professionnelle. Fournis un résultat concret et actionnable. Maximum 500 mots.`;

  return await callAI(agent.model, [
    { role: "system", content: agent.system },
    { role: "user", content: userMessage },
  ], 600);
}

// ─── Final synthesis ──────────────────────────────────────────────────────────

async function synthesize(objective: string, plan: OrchestrationPlan, tasks: SubTask[]): Promise<string> {
  const tasksText = tasks
    .filter(t => t.result)
    .map(t => {
      const agent = AGENTS[t.agent];
      return `## ${agent.icon} ${agent.name}: ${t.task}\n\n${t.result}`;
    })
    .join("\n\n---\n\n");

  const prompt = `Tu es l'orchestrateur final d'un système multi-agents. Synthétise les résultats de tous les agents en un rapport final cohérent et actionnable.

OBJECTIF INITIAL: ${objective}

RÉSULTATS DES AGENTS:
${tasksText}

Produis un rapport final en markdown avec :
1. Un résumé exécutif (3-5 phrases)
2. Les points clés et insights majeurs
3. Les actions recommandées (liste priorisée)
4. Les prochaines étapes concrètes

Sois synthétique, professionnel et orienté résultats.`;

  return await callAI("google/gemini-2.5-pro", [{ role: "user", content: prompt }], 1000);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { objective, memory_context, use_knowledge = true, parallel = false } = body;

  if (!objective) {
    return new Response(JSON.stringify({ error: "objective is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SSE setup
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const send = async (data: unknown) => {
    await writer.write(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      // Phase 1: Planning
      await send({ type: "phase", phase: "planning", message: "🧠 Orchestrateur : génération du plan multi-agents..." });

      const plan = await generateOrchestrationPlan(objective, memory_context ?? "");
      await send({ type: "plan", plan });

      // Phase 2: Knowledge search
      let knowledgeContext = "";
      if (use_knowledge) {
        try {
          knowledgeContext = await searchKnowledge(supabase, user.id, objective);
          if (knowledgeContext) {
            await send({ type: "knowledge", message: "📚 Base de connaissances consultée", chunks: knowledgeContext.length });
          }
        } catch (_e) { /* no knowledge available */ }
      }

      // Phase 3: Execute agents
      // In parallel mode: run independent tasks concurrently
      const updatedTasks = [...plan.tasks];
      await send({ type: "phase", phase: "executing", message: `⚡ Lancement de ${updatedTasks.length} agents${parallel ? " en parallèle" : ""}...` });

      if (parallel && updatedTasks.length > 1) {
        // Run all tasks in parallel, collect results
        const previousResults: Array<{ agent: string; task: string; result: string }> = [];

        // Split into parallel batches: first N-1 tasks parallel, last task sequential (needs prior results)
        const parallelTasks = updatedTasks.slice(0, Math.max(1, updatedTasks.length - 1));
        const sequentialTasks = updatedTasks.slice(Math.max(1, updatedTasks.length - 1));

        // Mark parallel tasks as running
        for (const task of parallelTasks) {
          const agentDef = AGENTS[task.agent] ?? AGENTS.research;
          task.status = "running";
          await send({
            type: "agent_start",
            task_id: task.id,
            agent: task.agent,
            agent_name: agentDef.name,
            agent_icon: agentDef.icon,
            task_description: task.task,
          });
        }

        // Execute parallel tasks concurrently
        const parallelPromises = parallelTasks.map(async (task) => {
          const agentDef = AGENTS[task.agent] ?? AGENTS.research;
          try {
            const result = await executeAgentTask(task, objective, [], knowledgeContext);
            task.result = result;
            task.status = "done";
            await send({ type: "agent_done", task_id: task.id, agent: task.agent, result });
            return { agent: agentDef.name, task: task.task, result };
          } catch (err) {
            task.status = "error";
            await send({ type: "agent_error", task_id: task.id, error: String(err) });
            return { agent: agentDef.name, task: task.task, result: `Error: ${String(err)}` };
          }
        });

        const parallelResults = await Promise.all(parallelPromises);
        previousResults.push(...parallelResults);

        // Run sequential tasks using parallel results
        for (const task of sequentialTasks) {
          const agentDef = AGENTS[task.agent] ?? AGENTS.research;
          task.status = "running";
          await send({
            type: "agent_start",
            task_id: task.id,
            agent: task.agent,
            agent_name: agentDef.name,
            agent_icon: agentDef.icon,
            task_description: task.task,
          });
          try {
            const result = await executeAgentTask(task, objective, previousResults, knowledgeContext);
            task.result = result;
            task.status = "done";
            previousResults.push({ agent: agentDef.name, task: task.task, result });
            await send({ type: "agent_done", task_id: task.id, agent: task.agent, result });
          } catch (err) {
            task.status = "error";
            await send({ type: "agent_error", task_id: task.id, error: String(err) });
          }
        }
      } else {
        // Sequential mode
        const previousResults: Array<{ agent: string; task: string; result: string }> = [];
        for (let i = 0; i < updatedTasks.length; i++) {
          const task = updatedTasks[i];
          const agent = AGENTS[task.agent] ?? AGENTS.research;
          task.status = "running";
          await send({
            type: "agent_start",
            task_id: task.id,
            agent: task.agent,
            agent_name: agent.name,
            agent_icon: agent.icon,
            task_description: task.task,
          });
          try {
            const result = await executeAgentTask(task, objective, previousResults, knowledgeContext);
            task.result = result;
            task.status = "done";
            previousResults.push({ agent: agent.name, task: task.task, result });
            await send({ type: "agent_done", task_id: task.id, agent: task.agent, result });
          } catch (err) {
            task.status = "error";
            task.result = `Erreur: ${String(err)}`;
            await send({ type: "agent_error", task_id: task.id, error: String(err) });
          }
        }
      }

      // Phase 4: Synthesis
      await send({ type: "phase", phase: "synthesizing", message: "📋 Synthèse finale en cours..." });
      const finalResult = await synthesize(objective, plan, updatedTasks);

      await send({ type: "completed", result: finalResult, plan_title: plan.title });
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
