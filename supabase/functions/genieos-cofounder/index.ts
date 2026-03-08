import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MODEL = "google/gemini-2.5-flash";

async function callLLM(prompt: string, systemPrompt: string): Promise<string> {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://genie-ai-mastery.lovable.app",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (Deno.env.get("GENIEOS_ENABLED") !== "true") {
    return new Response("Feature disabled", { status: 503, headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const supabaseResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "Authorization": authHeader, "apikey": SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!supabaseResp.ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { idea } = await req.json();
  if (!idea) return new Response(JSON.stringify({ error: "idea is required" }), { status: 400, headers: corsHeaders });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (data: object) => {
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const COFOUNDER_PERSONA = `Tu es un co-fondateur IA expert en startups, SaaS, IA et stratégie business. 
Tu analyses les idées avec précision et génères des analyses actionnables et concrètes.
Réponds en français, de façon structurée et directe. Sois concis mais complet.`;

        // Step 1: Market Analysis
        send({ type: "step_start", step: "market" });
        const marketAnalysis = await callLLM(
          `Analyse ce marché pour l'idée suivante: "${idea}"\n\nFournis: taille marché, tendances clés, segments cibles, timing.`,
          COFOUNDER_PERSONA
        );
        send({ type: "step_done", step: "market", title: "Analyse Marché", content: marketAnalysis });

        // Step 2: Business Model
        send({ type: "step_start", step: "model" });
        const businessModel = await callLLM(
          `Génère un business model canvas pour: "${idea}"\n\nContexte marché: ${marketAnalysis.slice(0, 200)}\n\nInclus: proposition valeur, segments clients, revenus, canaux, coûts clés.`,
          COFOUNDER_PERSONA
        );
        send({ type: "step_done", step: "model", title: "Business Model", content: businessModel });

        // Step 3: Competition
        send({ type: "step_start", step: "competition" });
        const competition = await callLLM(
          `Analyse la concurrence pour: "${idea}"\n\nIdentifie: concurrents directs, indirects, gaps à exploiter, avantages compétitifs à développer.`,
          COFOUNDER_PERSONA
        );
        send({ type: "step_done", step: "competition", title: "Analyse Concurrence", content: competition });

        // Step 4: Product Roadmap
        send({ type: "step_start", step: "roadmap" });
        const roadmap = await callLLM(
          `Génère une roadmap produit 3 mois pour: "${idea}"\n\nContexte: ${businessModel.slice(0, 200)}\n\nStructure par phases: MVP, validation, scale.`,
          COFOUNDER_PERSONA
        );
        send({ type: "step_done", step: "roadmap", title: "Roadmap Produit", content: roadmap });

        // Step 5: Go-to-Market Strategy
        send({ type: "step_start", step: "strategy" });
        const strategy = await callLLM(
          `Génère une stratégie go-to-market pour: "${idea}"\n\nInclus: canaux d'acquisition, pricing, traction initiale, KPIs clés, first 100 customers.`,
          COFOUNDER_PERSONA
        );
        send({ type: "step_done", step: "strategy", title: "Stratégie Go-to-Market", content: strategy });

        send({ type: "complete" });
      } catch (e: any) {
        send({ type: "error", message: e.message });
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
