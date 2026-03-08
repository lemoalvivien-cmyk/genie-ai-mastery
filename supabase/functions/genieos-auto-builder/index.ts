/**
 * genieos-auto-builder
 * AI Auto Builder: generate complete projects, architectures, agents & strategies from an idea.
 * Modes: build | brain_analyze | brain_update
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

function sse(ctrl: ReadableStreamDefaultController, data: unknown) {
  ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

async function callLLM(prompt: string, system: string, apiKey: string, model = "google/gemini-2.5-pro"): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      max_tokens: 3000,
      temperature: 0.8,
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey      = Deno.env.get("OPENROUTER_API_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);
  const authHeader = req.headers.get("Authorization") ?? "";
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_e) { /* empty */ }

  const mode = (body.mode as string) ?? "build";

  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        // ── MODE: brain_analyze ─────────────────────────────────────────
        if (mode === "brain_analyze") {
          sse(ctrl, { type: "progress", message: "Analyse de votre activité..." });

          // Fetch recent activity
          const { data: activity } = await supabase
            .from("user_activity")
            .select("event_type, module, metadata, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100);

          const { data: goals } = await supabase
            .from("user_goals")
            .select("title, category, status, progress")
            .eq("user_id", user.id)
            .limit(20);

          const { data: memory } = await supabase
            .from("genieos_user_memory")
            .select("*")
            .eq("user_id", user.id)
            .single();

          sse(ctrl, { type: "progress", message: "Construction du profil cognitif..." });

          const activitySummary = activity?.map((a) =>
            `${a.event_type} on ${a.module ?? "os"}`
          ).join(", ") ?? "No activity yet";

          const goalsSummary = goals?.map((g) => `${g.title} (${g.status})`).join(", ") ?? "No goals set";

          const profile = await callLLM(
            `Analyze this user's AI activity and create a comprehensive cognitive profile.

Activity: ${activitySummary}
Goals: ${goalsSummary}
Memory context: ${memory?.context_summary ?? "None"}
Skill level: ${memory?.skill_level ?? "intermediate"}

Generate:
1. expertise_level (beginner/intermediate/advanced/expert)
2. top_skills (array of 5-8 skills)
3. interests (array of 5-8 topics)
4. work_domain (main domain)
5. personality (object: {curiosity, autonomy, creativity, analytical} scores 1-10)
6. summary (2-3 sentences about the user)

Return as JSON object.`,
            "You are an AI cognitive profiling expert. Return only valid JSON.",
            apiKey,
            "google/gemini-2.5-flash"
          );

          let profileData: Record<string, unknown> = {};
          try {
            profileData = JSON.parse(profile.replace(/```json\n?/g, "").replace(/```\n?/g, ""));
          } catch (_e) { profileData = {}; }

          // Upsert brain profile
          await supabase.from("user_brain_profile").upsert({
            user_id: user.id,
            expertise_level: profileData.expertise_level as string ?? "intermediate",
            top_skills: profileData.top_skills as string[] ?? [],
            interests: profileData.interests as string[] ?? [],
            work_domain: profileData.work_domain as string ?? "",
            personality: profileData.personality ?? {},
            summary: profileData.summary as string ?? "",
            last_analyzed_at: new Date().toISOString(),
          });

          sse(ctrl, { type: "done", profile: profileData });
          ctrl.close();
          return;
        }

        // ── MODE: brain_update (add goal / activity) ────────────────────
        if (mode === "brain_update") {
          const action = body.action as string;
          if (action === "add_goal") {
            const { data: goal, error } = await supabase.from("user_goals").insert({
              user_id: user.id,
              title: body.title as string,
              description: body.description as string ?? "",
              category: body.category as string ?? "growth",
              priority: body.priority as number ?? 5,
            }).select().single();
            if (error) throw error;
            sse(ctrl, { type: "done", goal });
          } else if (action === "log_activity") {
            await supabase.from("user_activity").insert({
              user_id: user.id,
              event_type: body.event_type as string,
              module: body.module as string ?? "os",
              metadata: body.metadata ?? {},
            });
            sse(ctrl, { type: "done", logged: true });
          }
          ctrl.close();
          return;
        }

        // ── MODE: build (AI Auto Builder) ───────────────────────────────
        const idea = (body.idea as string) ?? (body.query as string) ?? "";
        if (!idea) throw new Error("idea required");

        sse(ctrl, { type: "progress", message: "🧠 Analyse de l'idée..." });

        const step1 = await callLLM(
          `Analyze this business/project idea: "${idea}"
          
Return a JSON with:
{
  "project_name": "CamelCase name",
  "tagline": "one-line description",
  "problem": "problem being solved",
  "solution": "your solution",
  "target_audience": "who is this for",
  "monetization": ["model1","model2"],
  "market_size": "estimated market",
  "competition_level": "low|medium|high"
}`,
          "You are a startup analyst. Return only valid JSON.",
          apiKey,
          "google/gemini-2.5-flash"
        );

        let analysis: Record<string, unknown> = {};
        try { analysis = JSON.parse(step1.replace(/```json\n?/g, "").replace(/```\n?/g, "")); } catch (_e) { analysis = { project_name: "MyProject" }; }

        sse(ctrl, { type: "step", step: "analysis", data: analysis, label: "📊 Analyse complétée" });
        sse(ctrl, { type: "progress", message: "⚙️ Génération de l'architecture..." });

        const step2 = await callLLM(
          `For the project "${analysis.project_name ?? idea}", design a complete technical architecture.

Include:
1. **Stack Recommandé** – frontend, backend, database, AI models
2. **Modules Clés** – list 5-7 core modules with descriptions  
3. **Agents IA Nécessaires** – list 3-5 AI agents with their roles
4. **API & Intégrations** – list external services needed
5. **Schéma Base de Données** – 4-6 key tables with columns
6. **Architecture Diagram** (text-based)

Format in clear markdown.`,
          "You are a senior software architect. Be specific and practical.",
          apiKey
        );

        sse(ctrl, { type: "step", step: "architecture", data: step2, label: "🏗️ Architecture générée" });
        sse(ctrl, { type: "progress", message: "🤖 Création des agents..." });

        const step3 = await callLLM(
          `For "${analysis.project_name ?? idea}", define the AI agents to build.

For each agent provide:
- name, role, capabilities (array), system_prompt (2-3 sentences)

Return as JSON array of agents.`,
          "You are an AI agent architect. Return only valid JSON array.",
          apiKey,
          "google/gemini-2.5-flash"
        );

        let agents: unknown[] = [];
        try { agents = JSON.parse(step3.replace(/```json\n?/g, "").replace(/```\n?/g, "")); } catch (_e) { agents = []; }

        sse(ctrl, { type: "step", step: "agents", data: agents, label: "🤖 Agents définis" });
        sse(ctrl, { type: "progress", message: "🚀 Génération de la stratégie..." });

        const step4 = await callLLM(
          `Create a go-to-market strategy for "${analysis.project_name ?? idea}".

Include:
1. **Phase 1 – MVP (0-3 mois)** – 5 key actions
2. **Phase 2 – Growth (3-12 mois)** – 5 key actions
3. **Phase 3 – Scale (12+ mois)** – 5 key actions
4. **KPIs to Track** – 6 metrics
5. **Budget Estimatif** – breakdown
6. **Risques & Mitigation** – top 3 risks

Format in clear markdown.`,
          "You are a startup growth strategist with 10 years experience.",
          apiKey
        );

        sse(ctrl, { type: "step", step: "strategy", data: step4, label: "🚀 Stratégie générée" });
        sse(ctrl, { type: "progress", message: "✨ Finalisation..." });

        // Save project in genieos_projects
        const { data: project } = await supabase.from("genieos_projects").insert({
          user_id: user.id,
          name: (analysis.project_name as string) ?? idea,
          description: (analysis.tagline as string) ?? "",
          type: "saas",
          status: "draft",
          metadata: { analysis, agents, idea },
        }).select().single();

        sse(ctrl, {
          type: "done",
          project,
          steps: { analysis, architecture: step2, agents, strategy: step4 },
        });
        ctrl.close();
      } catch (err) {
        sse(ctrl, { type: "error", message: err instanceof Error ? err.message : "Unknown error" });
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
});
