/**
 * genieos-data-engine
 * Data ingestion, scraping, normalization + Business Intelligence engine.
 * Modes:
 *   scrape       – fetch a URL and store as data_document
 *   analyze      – run business intelligence analysis via LLM
 *   ai_watch     – fetch curated AI news feed + generate digest
 *   opportunities – find business opportunities from data
 *   add_source    – persist a new data_source
 *   list_docs     – return recent data_documents for user
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── helpers ──────────────────────────────────────────────────────────────────

function sse(controller: ReadableStreamDefaultController, data: unknown) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
  );
}

async function callLLM(
  prompt: string,
  system: string,
  apiKey: string,
  model = "google/gemini-2.5-flash"
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`LLM error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** Lightweight scrape – fetch URL and return readable text */
async function scrapeUrl(url: string): Promise<{ title: string; content: string; domain: string }> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "GenieOS-DataEngine/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  const html = await resp.text();

  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/si);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : url;

  // Strip HTML tags and script/style blocks
  const clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);

  const domain = new URL(url).hostname;
  return { title, content: clean, domain };
}

// Curated AI news RSS/sources for ai_watch
const AI_WATCH_SOURCES = [
  { name: "HuggingFace Papers", url: "https://huggingface.co/papers", category: "research" },
  { name: "OpenAI Blog", url: "https://openai.com/blog", category: "models" },
  { name: "Anthropic News", url: "https://www.anthropic.com/news", category: "models" },
  { name: "AI News Weekly", url: "https://ainews.io", category: "tools" },
  { name: "Towards Data Science", url: "https://towardsdatascience.com", category: "frameworks" },
];

// ── main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (Deno.env.get("GENIEOS_ENABLED") !== "true") {
    return new Response("Feature disabled", { status: 503, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("OPENROUTER_API_KEY")!;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_e) { /* empty body */ }

  const mode = (body.mode as string) ?? "analyze";

  // SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── MODE: add_source ─────────────────────────────────────────────
        if (mode === "add_source") {
          const { name, type, url } = body as { name: string; type: string; url: string };
          const { data, error } = await supabase
            .from("data_sources")
            .insert({ user_id: user.id, name, type: type ?? "website", url })
            .select()
            .single();
          if (error) throw error;
          sse(controller, { type: "done", source: data });
          controller.close();
          return;
        }

        // ── MODE: list_docs ──────────────────────────────────────────────
        if (mode === "list_docs") {
          const category = body.category as string | undefined;
          let q = supabase
            .from("data_documents")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50);
          if (category) q = q.eq("category", category);
          const { data, error } = await q;
          if (error) throw error;
          sse(controller, { type: "done", documents: data });
          controller.close();
          return;
        }

        // ── MODE: scrape ─────────────────────────────────────────────────
        if (mode === "scrape") {
          const url = body.url as string;
          if (!url) throw new Error("url required");

          sse(controller, { type: "progress", message: `Scraping ${url}...` });
          const { title, content, domain } = await scrapeUrl(url);

          sse(controller, { type: "progress", message: "Generating summary..." });
          const summary = await callLLM(
            `Summarize this web page content in 3-5 sentences, highlight key insights:\n\n${content.slice(0, 4000)}`,
            "You are a precise content analyst. Return only a concise summary.",
            apiKey
          );

          const tags = await callLLM(
            `Extract 5 relevant tags from this content. Return as JSON array of strings:\n\n${content.slice(0, 2000)}`,
            "Return only a JSON array like [\"tag1\",\"tag2\"]",
            apiKey
          );

          let parsedTags: string[] = [];
          try { parsedTags = JSON.parse(tags); } catch (_e) { parsedTags = []; }

          sse(controller, { type: "progress", message: "Storing document..." });
          const { data: doc, error: insertErr } = await supabase
            .from("data_documents")
            .insert({
              user_id: user.id,
              source_id: body.source_id ?? null,
              title,
              content: content.slice(0, 10000),
              url,
              domain,
              category: (body.category as string) ?? "general",
              summary,
              tags: parsedTags,
              is_processed: true,
            })
            .select()
            .single();
          if (insertErr) throw insertErr;

          // Log update
          await supabase.from("data_updates").insert({
            user_id: user.id,
            document_id: doc.id,
            update_type: "new",
            title: doc.title,
            summary: doc.summary,
            importance: "medium",
          });

          sse(controller, { type: "done", document: doc, summary });
          controller.close();
          return;
        }

        // ── MODE: ai_watch ───────────────────────────────────────────────
        if (mode === "ai_watch") {
          sse(controller, { type: "progress", message: "Fetching AI news sources..." });

          const results: Array<{ source: string; title: string; summary: string; category: string }> = [];

          for (const src of AI_WATCH_SOURCES) {
            try {
              sse(controller, { type: "progress", message: `Checking ${src.name}...` });
              const { content } = await scrapeUrl(src.url);

              const digest = await callLLM(
                `From this page content, extract the 3 most important recent AI news items or announcements. Format as JSON array: [{\"title\":\"...\",\"summary\":\"...\"}]\n\nContent:\n${content.slice(0, 3000)}`,
                "You are an AI news curator. Return only valid JSON array.",
                apiKey
              );

              let items: Array<{ title: string; summary: string }> = [];
              try {
                const parsed = JSON.parse(digest.replace(/```json\n?/g, "").replace(/```\n?/g, ""));
                items = Array.isArray(parsed) ? parsed : [];
              } catch (_e) { items = []; }

              for (const item of items.slice(0, 3)) {
                results.push({ source: src.name, category: src.category, ...item });
              }
            } catch (_e) {
              // Skip failed sources silently
            }
          }

          // Store as data_documents
          for (const r of results.slice(0, 10)) {
            await supabase.from("data_documents").insert({
              user_id: user.id,
              title: r.title,
              content: r.summary,
              summary: r.summary,
              category: "ai_news",
              tags: [r.category, r.source],
              is_processed: true,
            }).single();
          }

          // Generate master digest
          const masterDigest = await callLLM(
            `Create a comprehensive AI intelligence briefing from these news items:\n\n${JSON.stringify(results.slice(0, 10), null, 2)}\n\nInclude: key model releases, new tools, important frameworks, industry trends. Format in markdown.`,
            "You are an expert AI industry analyst writing a daily briefing.",
            apiKey,
            "google/gemini-2.5-pro"
          );

          sse(controller, { type: "done", items: results, digest: masterDigest });
          controller.close();
          return;
        }

        // ── MODE: opportunities ──────────────────────────────────────────
        if (mode === "opportunities") {
          const query = (body.query as string) ?? "SaaS IA";
          sse(controller, { type: "progress", message: "Analysing market data..." });

          // Fetch recent docs for context
          const { data: recentDocs } = await supabase
            .from("data_documents")
            .select("title, summary, tags")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

          const context = recentDocs?.map((d) => `• ${d.title}: ${d.summary}`).join("\n") ?? "";

          sse(controller, { type: "progress", message: "Generating opportunity analysis..." });

          const analysis = await callLLM(
            `You are a business intelligence agent specialized in AI/SaaS markets.

User query: "${query}"

Recent market context from data engine:
${context || "(No stored data yet — use general market knowledge)"}

Generate a detailed business intelligence report including:
1. **Market Overview** – current state and trends
2. **Top 5 Opportunities** – specific niches with high potential
3. **Competitive Landscape** – key players and gaps
4. **Recommended Actions** – concrete next steps
5. **Risk Assessment** – key challenges to consider

Format in clear markdown with emoji indicators.`,
            "You are an expert business analyst and venture strategist specializing in AI/SaaS opportunities.",
            apiKey,
            "google/gemini-2.5-pro"
          );

          sse(controller, { type: "done", analysis, query });
          controller.close();
          return;
        }

        // ── MODE: analyze (general business analysis) ────────────────────
        const query = (body.query as string) ?? "marché IA";
        const analysisType = (body.analysis_type as string) ?? "market";

        sse(controller, { type: "progress", message: "Initializing business analysis..." });

        const systemPrompts: Record<string, string> = {
          market: "You are an expert market analyst specializing in AI and technology markets.",
          competitor: "You are a competitive intelligence expert with deep knowledge of the AI industry.",
          saas: "You are a SaaS business strategist with expertise in product-market fit and growth.",
          trend: "You are a technology trend analyst and futurist specializing in AI/ML ecosystems.",
        };

        const systemPrompt = systemPrompts[analysisType] ?? systemPrompts.market;

        sse(controller, { type: "progress", message: "Running deep analysis..." });

        const result = await callLLM(
          `Perform a comprehensive ${analysisType} analysis for: "${query}"

Structure your analysis with:
- Executive Summary
- Key Findings (5-7 points)
- Data & Evidence
- Strategic Implications
- Actionable Recommendations

Be specific, data-driven, and actionable. Format in markdown.`,
          systemPrompt,
          apiKey,
          "google/gemini-2.5-pro"
        );

        sse(controller, { type: "done", result, query, analysis_type: analysisType });
        controller.close();
      } catch (err) {
        sse(controller, {
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
