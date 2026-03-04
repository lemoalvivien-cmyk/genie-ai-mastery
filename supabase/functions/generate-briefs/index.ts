import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      "authorization, x-client-info, apikey, content-type",
  };
}

const DOMAIN_LABELS: Record<string, string> = {
  ia_pro: "IA Professionnelle",
  ia_perso: "IA Personnelle",
  cyber: "Cybersécurité",
  vibe_coding: "Vibe Coding",
  general: "Général",
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth: require CRON_SECRET bearer token ──────────────────────────────────
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");
  const useOpenRouter = !!Deno.env.get("OPENROUTER_API_KEY");

  try {
    // Get new items from last 48h that haven't been turned into a brief yet
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: items, error: itemsError } = await supabase
      .from("source_items")
      .select("id, source_id, title, summary, published_at, sources(name, domain, url)")
      .gte("created_at", since)
      .order("published_at", { ascending: false })
      .limit(40);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No new items to brief" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by domain
    const byDomain: Record<string, typeof items> = {};
    for (const item of items) {
      const src = item.sources as { name: string; domain: string; url: string } | null;
      const domain = src?.domain ?? "general";
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(item);
    }

    const generatedBriefs: string[] = [];

    for (const [domain, domainItems] of Object.entries(byDomain)) {
      if (domainItems.length === 0) continue;

      // Build context from items
      const itemsContext = domainItems
        .slice(0, 8)
        .map((it, i) => {
          const src = it.sources as { name: string; domain: string; url: string } | null;
          return `[${i + 1}] SOURCE: ${src?.name ?? "inconnu"}\nTITRE: ${it.title}\nRÉSUMÉ: ${it.summary ?? "(aucun)"}\nURL: ${src?.url ?? ""}`;
        })
        .join("\n\n");

      const prompt = `Tu es un analyste expert en ${DOMAIN_LABELS[domain] ?? domain}. 
Voici ${domainItems.slice(0, 8).length} actualités récentes de sources fiables:

${itemsContext}

Génère UN brief factuel au format JSON strict. RÈGLE ABSOLUE: cite uniquement des faits issus des sources ci-dessus. Si une information n'est pas dans les sources, ne l'inclus pas.

FORMAT JSON:
{
  "title": "Titre accrocheur du brief (max 80 chars)",
  "kid_summary": "Explication simple en 2-3 phrases, comme à un non-expert. Commence par le fait le plus important.",
  "action_plan": ["Action concrète 1", "Action concrète 2", "Action concrète 3"],
  "confidence": <0-100, basé sur le nombre et la qualité des sources. 0 source = 0-20, 1-2 sources = 40-60, 3+ sources = 70-95>,
  "sources_used": [<indices des sources utilisées, ex: [1,2,3]>]
}

IMPORTANT: confidence < 50 si tu n'as pas de source directe sur le sujet. Ne jamais inventer de faits.`;

      try {
        let content = "";

        if (useOpenRouter) {
          const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 600,
              temperature: 0.3,
              response_format: { type: "json_object" },
            }),
          });
          const aiData = await aiResp.json();
          content = aiData.choices?.[0]?.message?.content ?? "";
        } else {
          // Lovable AI Gateway
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 600,
              temperature: 0.3,
            }),
          });
          const aiData = await aiResp.json();
          content = aiData.choices?.[0]?.message?.content ?? "";
        }

        // Parse JSON
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/```\s*([\s\S]*?)```/i);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        const parsed = JSON.parse(jsonStr.trim());

        // Build sources array from used indices
        const usedIndices: number[] = parsed.sources_used ?? [];
        const sourcesArr = usedIndices.map((idx: number) => {
          const it = domainItems[idx - 1];
          if (!it) return null;
          const src = it.sources as { name: string; url: string } | null;
          return { title: src?.name ?? it.title, url: src?.url ?? "" };
        }).filter(Boolean);

        const confidence = Math.max(0, Math.min(100, parsed.confidence ?? 0));
        const isVerified = sourcesArr.length >= 2 && confidence >= 60;

        const { error: briefError } = await supabase.from("briefs").insert({
          domain,
          title: parsed.title ?? `Brief ${DOMAIN_LABELS[domain]}`,
          kid_summary: parsed.kid_summary ?? "",
          action_plan: parsed.action_plan ?? [],
          sources: sourcesArr,
          source_count: sourcesArr.length,
          confidence,
          is_verified: isVerified,
        });

        if (briefError) {
          console.error(`Error inserting brief for ${domain}:`, briefError);
        } else {
          generatedBriefs.push(`${domain}: ${parsed.title}`);
        }
      } catch (aiErr) {
        console.error(`AI error for domain ${domain}:`, aiErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, generated: generatedBriefs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-briefs error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
