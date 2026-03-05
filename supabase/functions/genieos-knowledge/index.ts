import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";

// ─── Text Chunking ────────────────────────────────────────────────────────────

function chunkText(text: string, chunkSize = 600, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk.trim());
    i += chunkSize - overlap;
  }
  return chunks;
}

// ─── Embedding Generation ─────────────────────────────────────────────────────

async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${AI_GATEWAY}/embeddings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/text-embedding-ada-002",
        input: text.slice(0, 8000),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch (_e) {
    return null;
  }
}

// ─── Document Summarization ───────────────────────────────────────────────────

async function summarizeForTitle(text: string): Promise<string> {
  try {
    const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{
          role: "user",
          content: `Génère un titre court (max 8 mots) pour ce document :\n\n${text.slice(0, 1000)}`,
        }],
        max_tokens: 50,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "Document sans titre";
  } catch (_e) {
    return "Document sans titre";
  }
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

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "search";

  // ── ACTION: ingest ──────────────────────────────────────────────────────────
  if (action === "ingest") {
    const body = await req.json();
    const { content, name, type = "text", source_url } = body;

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create source
    const { data: source, error: srcErr } = await supabase
      .from("knowledge_sources")
      .insert({
        user_id: user.id,
        name: name ?? "Document",
        type,
        url: source_url ?? null,
        metadata: {},
      })
      .select()
      .single();

    if (srcErr || !source) {
      return new Response(JSON.stringify({ error: "Failed to create source", detail: srcErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Auto-generate title if not provided
    const title = name || await summarizeForTitle(content);

    // 3. Create document
    const { data: doc, error: docErr } = await supabase
      .from("knowledge_documents")
      .insert({
        user_id: user.id,
        source_id: source.id,
        title,
        content: content.slice(0, 50000),
        status: "processing",
        metadata: { char_count: content.length },
      })
      .select()
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Failed to create document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Chunk + embed in background
    const chunks = chunkText(content);
    let embedded = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getEmbedding(chunk);

      await supabase.from("knowledge_chunks").insert({
        document_id: doc.id,
        user_id: user.id,
        content: chunk,
        chunk_index: i,
        embedding: embedding ? JSON.stringify(embedding) : null,
        metadata: { chunk_index: i, total_chunks: chunks.length },
      });

      if (embedding) embedded++;
    }

    // 5. Mark document as ready
    await supabase.from("knowledge_documents").update({
      status: "ready",
      metadata: { char_count: content.length, chunks: chunks.length, embedded },
    }).eq("id", doc.id);

    return new Response(JSON.stringify({
      success: true,
      document_id: doc.id,
      source_id: source.id,
      chunks: chunks.length,
      embedded,
      title,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── ACTION: search ──────────────────────────────────────────────────────────
  if (action === "search") {
    const body = await req.json();
    const { query, limit = 5, use_semantic = true } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let results: Array<{ content: string; title: string; similarity: number; document_id: string }> = [];

    // Try semantic search first
    if (use_semantic) {
      const embedding = await getEmbedding(query);
      if (embedding) {
        const { data: semResults } = await supabase.rpc("search_knowledge_semantic", {
          _user_id: user.id,
          _embedding: JSON.stringify(embedding),
          _limit: limit,
        });
        if (semResults && semResults.length > 0) {
          results = semResults.map((r: { content: string; title: string; similarity: number; document_id: string }) => ({
            content: r.content,
            title: r.title,
            similarity: r.similarity,
            document_id: r.document_id,
          }));
        }
      }
    }

    // Fallback to FTS
    if (results.length === 0) {
      const { data: ftsResults } = await supabase.rpc("search_knowledge_fts", {
        _user_id: user.id,
        _query: query,
        _limit: limit,
      });
      if (ftsResults) {
        results = ftsResults.map((r: { content: string; title: string; similarity: number; document_id: string }) => ({
          content: r.content,
          title: r.title,
          similarity: r.similarity,
          document_id: r.document_id,
        }));
      }
    }

    return new Response(JSON.stringify({ results, query }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── ACTION: delete ──────────────────────────────────────────────────────────
  if (action === "delete") {
    const body = await req.json();
    const { document_id } = body;
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error } = await supabase
      .from("knowledge_documents")
      .delete()
      .eq("id", document_id)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ success: !error, error: error?.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
