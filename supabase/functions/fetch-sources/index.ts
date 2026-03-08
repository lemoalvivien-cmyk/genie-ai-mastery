import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronSecret } from "../_shared/cron-auth.ts";

const ALLOWED_ORIGINS = [
  "https://genie-ia.app",
  "https://genie-ai-mastery.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };
}

// Simple SHA-256 hash via Web Crypto
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Parse RSS/Atom XML to extract items
function parseRSS(xml: string): Array<{ title: string; summary: string; url: string; published_at: string | null }> {
  const items: Array<{ title: string; summary: string; url: string; published_at: string | null }> = [];

  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch =
      block.match(/<link[^>]*href="([^"]+)"/i) ??
      block.match(/<link[^>]*>(https?:\/\/[^<]+)<\/link>/i) ??
      block.match(/<link>(https?:\/\/[^<]+)<\/link>/i);
    const descMatch =
      block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ??
      block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
    const dateMatch =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ??
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ??
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);

    const title = titleMatch ? titleMatch[1].trim().replace(/<[^>]+>/g, "") : "";
    const url = linkMatch ? linkMatch[1].trim() : "";
    const rawDesc = descMatch ? descMatch[1].trim() : "";
    const summary = rawDesc.replace(/<[^>]+>/g, "").trim().slice(0, 500);
    const published_at = dateMatch ? dateMatch[1].trim() : null;

    if (title && title.length > 3) {
      items.push({ title, summary, url, published_at });
    }
  }

  return items.slice(0, 20);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth: CRON_SECRET (called by pg_cron, no JWT) ──────────────────────────
  try {
    verifyCronSecret(req);
  } catch (resp) {
    return resp as Response;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const [legacySources, watchlistSources] = await Promise.all([
      supabase.from("sources").select("*").eq("enabled", true),
      supabase.from("sources_watchlist").select("*").eq("enabled", true),
    ]);
    const sourcesError = legacySources.error || watchlistSources.error;
    const allSources = [
      ...(legacySources.data ?? []),
      ...(watchlistSources.data ?? []).map((w) => ({ ...w, last_fetch_at: w.last_fetch_at })),
    ];

    if (sourcesError) throw sourcesError;
    if (!allSources || allSources.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No sources" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ source: string; fetched: number; inserted: number; error?: string }> = [];

    for (const source of allSources) {
      try {
        console.log(`Fetching: ${source.name} (${source.url})`);

        const resp = await fetch(source.url, {
          headers: { "User-Agent": "GenieMastery/1.0 RSS Reader" },
          signal: AbortSignal.timeout(10000),
        });

        if (!resp.ok) {
          results.push({ source: source.name, fetched: 0, inserted: 0, error: `HTTP ${resp.status}` });
          continue;
        }

        const text = await resp.text();
        const items = parseRSS(text);

        let inserted = 0;
        for (const item of items) {
          const hashInput = `${source.id}::${item.title}::${item.published_at ?? ""}`;
          const hash = await sha256(hashInput);

          const { error: insertError } = await supabase
            .from("source_items")
            .upsert(
              {
                source_id: source.id,
                title: item.title.slice(0, 300),
                summary: item.summary.slice(0, 500),
                raw: item.url,
                published_at: item.published_at
                  ? new Date(item.published_at).toISOString()
                  : new Date().toISOString(),
                hash,
              },
              { onConflict: "hash", ignoreDuplicates: true }
            );

          if (!insertError) inserted++;
        }

        await supabase
          .from("sources")
          .update({ last_fetch_at: new Date().toISOString() })
          .eq("id", source.id);

        supabase
          .from("sources_watchlist")
          .update({ last_fetch_at: new Date().toISOString() })
          .eq("id", source.id)
          .then(() => {})
          .catch(() => {});

        results.push({ source: source.name, fetched: items.length, inserted });
      } catch (err) {
        console.error(`Error fetching ${source.name}:`, err);
        results.push({
          source: source.name,
          fetched: 0,
          inserted: 0,
          error: err instanceof Error ? err.message : "Unknown",
        });
      }
    }

    console.log("fetch-sources results:", JSON.stringify(results));

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-sources error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
