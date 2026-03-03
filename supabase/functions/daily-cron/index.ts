/**
 * daily-cron — runs once per day via pg_cron
 * 1. Fetches RSS/release-notes from all enabled sources
 * 2. Generates AI briefs from new items
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "apikey": SUPABASE_ANON_KEY,
  };

  const log: string[] = [];

  try {
    // 1. Fetch sources
    const fetchResp = await fetch(`${SUPABASE_URL}/functions/v1/fetch-sources`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const fetchData = await fetchResp.json();
    log.push(`fetch-sources: ${JSON.stringify(fetchData?.results?.length ?? fetchData?.message ?? fetchData?.error)}`);

    // 2. Generate briefs
    const briefsResp = await fetch(`${SUPABASE_URL}/functions/v1/generate-briefs`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const briefsData = await briefsResp.json();
    log.push(`generate-briefs: ${JSON.stringify(briefsData?.generated ?? briefsData?.error)}`);

    console.log("daily-cron done:", log.join(" | "));
    return new Response(JSON.stringify({ ok: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("daily-cron error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
