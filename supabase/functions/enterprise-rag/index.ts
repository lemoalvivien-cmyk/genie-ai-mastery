/**
 * enterprise-rag
 * Actions:
 *  - ingest_doc   : chunk + embed org document (text / extracted PDF text)
 *  - delete_doc   : remove document + chunks
 *  - search       : semantic + FTS org-scoped search → RAG context
 *  - upsert_prompt: save org system prompt + variables
 *  - get_prompt   : retrieve org system prompt
 *  - worldwatch_fetch : fetch CVE/news feeds and store in worldwatch_entries
 *  - worldwatch_ingest: embed WorldWatch entries as org knowledge chunks
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LOVABLE_API_KEY      = Deno.env.get("LOVABLE_API_KEY") ?? "";
const AI_GATEWAY           = "https://ai.gateway.lovable.dev/v1";

// ── Helpers ──────────────────────────────────────────────────────────────────

function chunkText(text: string, size = 500, overlap = 80): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + size).join(" ").trim();
    if (chunk) chunks.push(chunk);
    i += size - overlap;
  }
  return chunks;
}

async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${AI_GATEWAY}/embeddings`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-ada-002", input: text.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.data?.[0]?.embedding ?? null;
  } catch (_e) {
    return null;
  }
}

async function autoTitle(text: string): Promise<string> {
  try {
    const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: `Titre court (6 mots max) pour ce document d'entreprise :\n\n${text.slice(0, 800)}` }],
        max_tokens: 40,
      }),
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content?.trim() ?? "Document entreprise";
  } catch (_e) {
    return "Document entreprise";
  }
}

// ── CVE / Threat feed fetcher ────────────────────────────────────────────────

interface FeedEntry {
  entry_id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  severity: string;
  published_at: string;
  tags: string[];
}

async function fetchNVDRecent(): Promise<FeedEntry[]> {
  try {
    const res = await fetch(
      "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20&startIndex=0",
      { headers: { "User-Agent": "GENIE-WorldWatch/1.0" }, signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return [];
    const d = await res.json();
    return (d.vulnerabilities ?? []).map((v: Record<string, unknown>) => {
      const cve = (v.cve as Record<string, unknown>) ?? {};
      const cveId = String(cve.id ?? "");
      const descriptions = (cve.descriptions as Array<{ lang: string; value: string }>) ?? [];
      const desc = descriptions.find((d) => d.lang === "en")?.value ?? "";
      const metrics = (cve.metrics as Record<string, unknown>) ?? {};
      const cvssV3 = (metrics.cvssMetricV31 as Array<{ cvssData: { baseSeverity: string; baseScore: number } }>) ?? [];
      const severity = cvssV3[0]?.cvssData?.baseSeverity?.toLowerCase() ?? "unknown";
      return {
        entry_id: cveId,
        title: `${cveId} — ${desc.slice(0, 80)}`,
        summary: desc,
        source: "nvd",
        url: `https://nvd.nist.gov/vuln/detail/${cveId}`,
        severity,
        published_at: String((cve as Record<string, unknown>).published ?? new Date().toISOString()),
        tags: ["cve", severity],
      };
    });
  } catch (_e) {
    return [];
  }
}

async function fetchCISA(): Promise<FeedEntry[]> {
  try {
    const res = await fetch(
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return [];
    const d = await res.json();
    return ((d.vulnerabilities as Array<Record<string, string>>) ?? []).slice(0, 15).map((v) => ({
      entry_id: `cisa-${v.cveID}`,
      title: `[CISA KEV] ${v.cveID} — ${v.vulnerabilityName ?? ""}`,
      summary: v.shortDescription ?? "",
      source: "cisa",
      url: v.references ?? `https://www.cisa.gov/known-exploited-vulnerabilities-catalog`,
      severity: "critical",
      published_at: v.dateAdded ? new Date(v.dateAdded).toISOString() : new Date().toISOString(),
      tags: ["cisa", "kev", "critical", v.product ?? ""],
    }));
  } catch (_e) {
    return [];
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Auth
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get user org
  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  const orgId = profile?.org_id as string | null;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "search";
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION: ingest_doc
  // ─────────────────────────────────────────────────────────────────────────
  if (action === "ingest_doc") {
    if (!orgId) return new Response(JSON.stringify({ error: "No org" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { content, name, category = "custom", source_type = "upload", file_path, source_url } = body;
    if (!content?.trim()) return new Response(JSON.stringify({ error: "content required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const title = name || await autoTitle(content);

    const { data: doc, error: docErr } = await supabase.from("org_knowledge_documents").insert({
      org_id: orgId,
      uploaded_by: user.id,
      title,
      content: content.slice(0, 100_000),
      status: "processing",
      category,
      source_type,
      file_path: file_path ?? null,
      source_url: source_url ?? null,
      metadata: { char_count: content.length },
    }).select().single();

    if (docErr || !doc) return new Response(JSON.stringify({ error: "Failed to create doc", detail: docErr?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const chunks = chunkText(content);
    let embedded = 0;

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await getEmbedding(chunks[i]);
      await supabase.from("org_knowledge_chunks").insert({
        document_id: doc.id, org_id: orgId, content: chunks[i],
        chunk_index: i, embedding: embedding ? JSON.stringify(embedding) : null,
        metadata: { chunk_index: i, total_chunks: chunks.length },
      });
      if (embedding) embedded++;
    }

    await supabase.from("org_knowledge_documents").update({
      status: "ready", metadata: { char_count: content.length, chunks: chunks.length, embedded },
    }).eq("id", doc.id);

    return new Response(JSON.stringify({ success: true, document_id: doc.id, chunks: chunks.length, embedded, title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION: delete_doc
  // ─────────────────────────────────────────────────────────────────────────
  if (action === "delete_doc") {
    if (!orgId) return new Response(JSON.stringify({ error: "No org" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { document_id } = body;
    await supabase.from("org_knowledge_documents").delete().eq("id", document_id).eq("org_id", orgId);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION: search  (RAG retrieval)
  // ─────────────────────────────────────────────────────────────────────────
  if (action === "search") {
    if (!orgId) return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { query, limit = 6, category } = body;
    if (!query) return new Response(JSON.stringify({ error: "query required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let results: Array<{ content: string; title: string; similarity: number; category: string; source_type: string }> = [];

    const embedding = await getEmbedding(query);
    if (embedding) {
      const { data: sem } = await supabase.rpc("search_org_knowledge_semantic", {
        _org_id: orgId, _embedding: JSON.stringify(embedding), _limit: limit, _category: category ?? null,
      });
      if (sem?.length > 0) results = sem;
    }

    if (results.length === 0) {
      const { data: fts } = await supabase.rpc("search_org_knowledge_fts", {
        _org_id: orgId, _query: query, _limit: limit,
      });
      if (fts) results = fts;
    }

    return new Response(JSON.stringify({ results, query }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION: upsert_prompt
  // ─────────────────────────────────────────────────────────────────────────
  if (action === "upsert_prompt") {
    if (!orgId) return new Response(JSON.stringify({ error: "No org" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { prompt_text, variables = {} } = body;
    await supabase.from("org_system_prompts").upsert({
      org_id: orgId, prompt_text, variables, updated_by: user.id, is_active: true,
    }, { onConflict: "org_id" });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION: get_prompt
  // ─────────────────────────────────────────────────────────────────────────
  if (action === "get_prompt") {
    if (!orgId) return new Response(JSON.stringify({ prompt: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data } = await supabase.from("org_system_prompts").select("*").eq("org_id", orgId).single();
    return new Response(JSON.stringify({ prompt: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION: worldwatch_fetch  (fetch CVE/CISA feeds)
  // ─────────────────────────────────────────────────────────────────────────
  if (action === "worldwatch_fetch") {
    const [nvd, cisa] = await Promise.all([fetchNVDRecent(), fetchCISA()]);
    const all = [...nvd, ...cisa];
    let stored = 0;
    for (const entry of all) {
      const { error } = await supabase.from("worldwatch_entries").upsert({
        source: entry.source,
        entry_id: entry.entry_id,
        title: entry.title,
        summary: entry.summary,
        severity: entry.severity,
        url: entry.url,
        published_at: entry.published_at,
        tags: entry.tags,
        is_ingested: false,
      }, { onConflict: "entry_id", ignoreDuplicates: true });
      if (!error) stored++;
    }
    return new Response(JSON.stringify({ success: true, fetched: all.length, stored }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION: worldwatch_ingest  (embed recent CVE entries as org RAG chunks)
  // ─────────────────────────────────────────────────────────────────────────
  if (action === "worldwatch_ingest") {
    if (!orgId) return new Response(JSON.stringify({ error: "No org" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: entries } = await supabase.from("worldwatch_entries")
      .select("*").eq("is_ingested", false).order("fetched_at", { ascending: false }).limit(20);

    if (!entries?.length) return new Response(JSON.stringify({ success: true, ingested: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let ingested = 0;
    for (const entry of entries) {
      const content = `[${entry.source.toUpperCase()}] ${entry.title}\n\nSévérité: ${entry.severity ?? "inconnue"}\n${entry.summary ?? ""}\nSource: ${entry.url ?? ""}`;

      // Create org doc
      const { data: doc } = await supabase.from("org_knowledge_documents").insert({
        org_id: orgId,
        uploaded_by: user.id,
        title: entry.title.slice(0, 120),
        content,
        status: "processing",
        category: "worldwatch",
        source_type: entry.source === "nvd" || entry.source === "cisa" ? "cve" : "worldwatch",
        source_url: entry.url ?? null,
        is_auto: true,
        metadata: { entry_id: entry.entry_id, severity: entry.severity, tags: entry.tags },
      }).select().single();

      if (!doc) continue;

      const embedding = await getEmbedding(content);
      await supabase.from("org_knowledge_chunks").insert({
        document_id: doc.id, org_id: orgId, content,
        chunk_index: 0, embedding: embedding ? JSON.stringify(embedding) : null,
        metadata: { source: entry.source, entry_id: entry.entry_id },
      });

      await supabase.from("org_knowledge_documents").update({ status: "ready", metadata: { chunks: 1, embedded: embedding ? 1 : 0 } }).eq("id", doc.id);
      await supabase.from("worldwatch_entries").update({ is_ingested: true }).eq("id", entry.id);
      ingested++;
    }

    return new Response(JSON.stringify({ success: true, ingested }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
