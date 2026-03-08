import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGINS = [
  "https://genie-ia.app",
  "https://genie-ai-mastery.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
  };
}

// ── AI ROUTER ────────────────────────────────────────────────────
// Maps each module to the optimal model for that task type.
// Add new models here — the router is the single source of truth.
const AI_ROUTER: Record<string, string> = {
  // Fast conversational tasks
  assistant:     "google/gemini-3-flash-preview",
  ai_tools:      "google/gemini-3-flash-preview",
  // Balanced: structured output + reasoning
  agent_builder: "google/gemini-2.5-flash",
  automation:    "google/gemini-2.5-flash",
  business:      "google/gemini-2.5-flash",
  // Deep reasoning: architecture & complex problems
  app_builder:   "google/gemini-2.5-pro",
  reasoning:     "google/gemini-2.5-pro",
  code:          "google/gemini-2.5-flash",
};

function routeModel(module: string): string {
  return AI_ROUTER[module] ?? "google/gemini-3-flash-preview";
}

// ── SYSTEM PROMPTS ───────────────────────────────────────────────
const MODULE_SYSTEM_PROMPTS: Record<string, string> = {
  assistant: `Tu es GENIE OS, un copilote IA universel. Tu réponds en français, de manière claire, structurée et actionnable. Tu expliques les concepts IA, aides à comprendre les nouvelles technologies et guides l'utilisateur vers les meilleures pratiques. Si l'utilisateur veut créer un agent, une automatisation ou une app, propose-lui d'ouvrir le module correspondant.`,
  agent_builder: `Tu es GENIE OS en mode Agent Builder. Tu aides à concevoir des agents IA autonomes. Pour chaque demande, fournis:
1. **Nom & Rôle** de l'agent
2. **Objectif principal** et périmètre
3. **Prompt système** complet prêt à l'emploi
4. **Outils & APIs** nécessaires
5. **Étapes d'implémentation** concrètes
6. **Tests & cas limites**
Réponds en français, avec des blocs de code quand pertinent.`,
  automation: `Tu es GENIE OS en mode Automation. Tu conçois des workflows d'automatisation concrets:
1. **Déclencheur** précis
2. **Étapes** numérotées avec actions
3. **Outils recommandés** (Make, Zapier, n8n) avec configuration
4. **Conditions & gestion d'erreurs**
5. **Métriques** à suivre
Sois précis et actionnable. Inclus des exemples de configuration.`,
  app_builder: `Tu es GENIE OS en mode App Builder. Tu génères des architectures d'applications IA complètes:
1. **Stack technique** justifiée
2. **Architecture** (frontend, backend, DB, IA)
3. **Schéma de données** complet
4. **Plan d'implémentation** par phases
5. **Estimation effort** par phase
6. **Risques techniques** et mitigation
Inclus des blocs de code pour les parties critiques.`,
  business: `Tu es GENIE OS en mode Business Analysis. Pour chaque opportunité, analyses:
1. **Taille du marché** et croissance
2. **Proposition de valeur unique**
3. **Modèle de revenus** viable
4. **Compétiteurs** et différenciation
5. **Risques** et mitigation
6. **Plan de validation** en 30/60/90 jours
Sois direct, quantifié et actionnable.`,
  ai_tools: `Tu es GENIE OS en mode AI Tools Explorer. Pour chaque outil ou comparaison:
- Nom, catégorie, URL
- Forces et limitations
- Prix et modèle freemium
- Cas d'usage idéal
- Alternatives et quand les choisir
Réponds en tableau structuré quand tu compares plusieurs outils.`,
};

// ── MEMORY INJECTION ─────────────────────────────────────────────
type UserMemory = {
  skill_level?: string;
  primary_goals?: string[];
  recent_topics?: string[];
  context_summary?: string;
};

function buildSystemPrompt(module: string, memory: UserMemory | null): string {
  const base = MODULE_SYSTEM_PROMPTS[module] ?? MODULE_SYSTEM_PROMPTS.assistant;
  if (!memory) return base;

  const ctx: string[] = [];
  if (memory.skill_level) ctx.push(`Niveau utilisateur: ${memory.skill_level}`);
  if (memory.primary_goals?.length) ctx.push(`Objectifs: ${memory.primary_goals.join(", ")}`);
  if (memory.context_summary) ctx.push(`Contexte: ${memory.context_summary}`);
  if (memory.recent_topics?.length) ctx.push(`Sujets récents: ${memory.recent_topics.slice(0, 3).join(", ")}`);

  if (ctx.length === 0) return base;
  return `${base}\n\n---\n**Contexte utilisateur (injecté automatiquement)**\n${ctx.join("\n")}`;
}

// ── MAIN HANDLER ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (Deno.env.get("GENIEOS_ENABLED") !== "true") {
    return new Response("Feature disabled", { status: 503, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    // 1. Validate user
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, module = "assistant" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // 2. Load user memory (best-effort, non-blocking)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    let memory: UserMemory | null = null;
    try {
      const { data } = await admin
        .from("genieos_user_memory")
        .select("skill_level, primary_goals, recent_topics, context_summary")
        .eq("user_id", user.id)
        .maybeSingle();
      memory = data;
    } catch (_e) {
      // Memory loading failure is non-fatal
    }

    // 3. Route to optimal model
    const model = routeModel(module);

    // 4. Build enriched system prompt
    const systemPrompt = buildSystemPrompt(module, memory);

    // 5. Stream response
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte. Réessaie dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepend router metadata as first SSE event so client knows which model was selected
    const routerEvent = `data: ${JSON.stringify({ type: "router", model, module })}\n\n`;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(routerEvent));
        if (!response.body) { controller.close(); return; }
        const reader = response.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          console.error("Stream read error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("genie-os-chat error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
