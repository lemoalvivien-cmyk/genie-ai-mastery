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

const MODULE_SYSTEM_PROMPTS: Record<string, string> = {
  assistant: `Tu es GENIE OS, un copilote IA universel. Tu réponds en français, de manière claire, structurée et actionnable. Tu expliques les concepts IA, aides à comprendre les nouvelles technologies et guides l'utilisateur vers les meilleures pratiques.`,
  agent_builder: `Tu es GENIE OS en mode Agent Builder. Tu aides l'utilisateur à concevoir et construire des agents IA autonomes. Pour chaque demande, tu fournis: 1) Le nom et rôle de l'agent, 2) Les capacités et outils nécessaires, 3) Le prompt système de l'agent, 4) Les étapes d'implémentation, 5) Les cas d'usage. Réponds en français, de façon structurée.`,
  automation: `Tu es GENIE OS en mode Automation. Tu identifies les tâches répétitives et proposes des workflows d'automatisation concrets avec: 1) Déclencheur, 2) Actions séquentielles, 3) Outils recommandés (Make, Zapier, n8n), 4) Code ou configuration. Réponds en français.`,
  app_builder: `Tu es GENIE OS en mode App Builder. Tu génères des architectures d'applications IA complètes avec: 1) Stack technique recommandée, 2) Structure des composants, 3) Modèle de données, 4) APIs et intégrations IA, 5) Plan d'implémentation par phases. Réponds en français avec des blocs de code quand utile.`,
  ai_tools: `Tu es GENIE OS en mode AI Tools Explorer. Tu analyses, compares et recommandes des outils IA selon les besoins. Pour chaque outil: nom, catégorie, forces, limites, prix, cas d'usage idéal, alternatives. Réponds en français.`,
  business: `Tu es GENIE OS en mode Business Analysis. Tu analyses des opportunités business liées à l'IA: taille du marché, compétiteurs, proposition de valeur unique, modèle de revenus, risques, prochaines étapes. Réponds en français avec une structure claire.`,
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    // Validate user auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, module = "assistant", conversationId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = MODULE_SYSTEM_PROMPTS[module] ?? MODULE_SYSTEM_PROMPTS.assistant;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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

    return new Response(response.body, {
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
