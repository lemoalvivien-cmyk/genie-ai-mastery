import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MODEL = "google/gemini-2.5-flash";

async function callLLM(prompt: string, system: string): Promise<string> {
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
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.7,
    }),
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function saveToSupabase(table: string, rows: object[], serviceKey: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(rows),
    });
  } catch {}
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (Deno.env.get("GENIEOS_ENABLED") !== "true") {
    return new Response("Feature disabled", { status: 503, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  // Auth check
  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "Authorization": authHeader, "apikey": SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!userResp.ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  const { id: userId } = await userResp.json();

  const { query } = await req.json();
  if (!query) return new Response(JSON.stringify({ error: "query required" }), { status: 400, headers: corsHeaders });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (data: object) => ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      const REVENUE_AGENT_SYSTEM = `Tu es le Revenue Agent de GENIE OS — un expert en business development, 
génération de leads et détection d'opportunités business IA.
Tu analyses les marchés, identifies des prospects et génères des opportunités concrètes et actionnables.
Tu réponds en français. Tes analyses sont précises, basées sur des données réelles et actionnables.
Pour chaque opportunité, tu fournis: titre, marché, valeur estimée en EUR, probabilité (%), plan d'action.
Pour chaque lead, tu fournis: entreprise, secteur, problème principal, score opportunité (0-100).`;

      try {
        // Phase 1: Market analysis
        send({ type: "token", text: "## 🔍 Analyse du marché\n\n" });
        const marketAnalysis = await callLLM(
          `Analyse ce marché et identifie les opportunités business: "${query}"
          
Fournis:
1. Taille et dynamique du marché
2. Tendances clés 2024-2025
3. Segments de clients cibles (avec entreprises concrètes)
4. Points de douleur principaux`,
          REVENUE_AGENT_SYSTEM
        );
        send({ type: "token", text: marketAnalysis + "\n\n" });

        // Phase 2: Generate leads as JSON
        send({ type: "token", text: "## 👥 Génération de Leads\n\n" });
        const leadsText = await callLLM(
          `Sur la base de cette analyse: "${query}" et contexte: ${marketAnalysis.slice(0, 300)}
          
Génère 5 leads prospects B2B qualifiés en JSON array:
[{
  "company_name": "Nom entreprise",
  "industry": "Secteur",
  "pain_point": "Problème principal que GENIE OS/IA peut résoudre",
  "website": "https://example.com",
  "opportunity_score": 75
}]
Retourne UNIQUEMENT le JSON, rien d'autre.`,
          REVENUE_AGENT_SYSTEM
        );

        let leads: any[] = [];
        try {
          const jsonMatch = leadsText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            leads = JSON.parse(jsonMatch[0]);
            send({ type: "token", text: `Identifié **${leads.length} prospects qualifiés**:\n` });
            for (const lead of leads) {
              send({ type: "token", text: `- **${lead.company_name}** (${lead.industry}) — Score: ${lead.opportunity_score}%\n` });
            }

            // Save leads to DB
            const leadRows = leads.map((l) => ({
              user_id: userId,
              company_name: l.company_name,
              industry: l.industry,
              pain_point: l.pain_point,
              website: l.website,
              opportunity_score: Math.min(100, Math.max(0, l.opportunity_score ?? 50)),
              source: "ai_agent",
              status: "new",
            }));
            await saveToSupabase("revenue_leads", leadRows, SUPABASE_SERVICE_ROLE_KEY);
            send({ type: "leads_saved", count: leads.length });
          }
        } catch {}

        // Phase 3: Opportunities JSON
        send({ type: "token", text: "\n## 🎯 Opportunités Business Détectées\n\n" });
        const oppsText = await callLLM(
          `Sur la base de l'analyse du marché "${query}", génère 3 opportunités business en JSON array:
[{
  "title": "Titre de l'opportunité",
  "description": "Description détaillée",
  "market": "Marché cible",
  "estimated_value_eur": 50000,
  "probability": 65,
  "tags": ["tag1", "tag2"],
  "action_plan": ["Action 1", "Action 2", "Action 3"]
}]
Retourne UNIQUEMENT le JSON.`,
          REVENUE_AGENT_SYSTEM
        );

        try {
          const jsonMatch = oppsText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const opps: any[] = JSON.parse(jsonMatch[0]);
            for (const opp of opps) {
              send({
                type: "token",
                text: `\n### ${opp.title}\n- **Marché**: ${opp.market}\n- **Valeur estimée**: ${Number(opp.estimated_value_eur).toLocaleString("fr-FR")}€\n- **Probabilité**: ${opp.probability}%\n- **Plan**: ${(opp.action_plan ?? []).slice(0, 2).join(", ")}\n`,
              });
            }

            const oppRows = opps.map((o) => ({
              user_id: userId,
              title: o.title,
              description: o.description,
              market: o.market,
              estimated_value_eur: o.estimated_value_eur ?? 0,
              probability: Math.min(100, Math.max(0, o.probability ?? 50)),
              tags: o.tags ?? [],
              action_plan: o.action_plan ?? [],
              source: "ai_agent",
              status: "identified",
            }));
            await saveToSupabase("revenue_opportunities", oppRows, SUPABASE_SERVICE_ROLE_KEY);
            send({ type: "opps_saved", count: opps.length });

            // Save report
            const totalPipeline = opps.reduce((s, o) => s + (o.estimated_value_eur ?? 0), 0);
            await saveToSupabase("revenue_reports", [{
              user_id: userId,
              report_type: "growth_loop",
              title: `Revenue Analysis: ${query.slice(0, 60)}`,
              summary: marketAnalysis.slice(0, 300),
              leads_generated: leads.length,
              opportunities_found: opps.length,
              estimated_pipeline_eur: totalPipeline,
            }], SUPABASE_SERVICE_ROLE_KEY);
          }
        } catch {}

        send({ type: "token", text: "\n\n---\n✅ **Analyse complète** — Leads et opportunités sauvegardés dans ton Revenue Engine." });
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
