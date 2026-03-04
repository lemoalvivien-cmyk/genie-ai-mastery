/**
 * daily-cron — runs once per day via pg_cron
 * 1. Fetches RSS/release-notes from all enabled sources
 * 2. Generates AI briefs from new items
 *
 * Protected by CRON_SECRET bearer token to prevent unauthorized triggering.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://genie-ai-mastery.lovable.app",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // ── Auth: require CRON_SECRET bearer token ──────────────────────────────────
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${cronSecret}`,
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
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("daily-cron error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
