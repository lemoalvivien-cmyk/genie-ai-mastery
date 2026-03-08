/**
 * daily-cron — runs once per day via pg_cron
 * 1. Fetches RSS/release-notes from all enabled sources
 * 2. Generates AI briefs from new items
 *
 * Auth: NOT JWT-protected (called by pg_cron).
 * Protected by X-CRON-SECRET header to prevent unauthorized triggering.
 */
import { verifyCronSecret } from "../_shared/cron-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://genie-ai-mastery.lovable.app",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
      },
    });
  }

  // ── Auth: require CRON_SECRET header ────────────────────────────────────────
  try {
    verifyCronSecret(req);
  } catch (resp) {
    return resp as Response;
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

  const headers = {
    "Content-Type": "application/json",
    "x-cron-secret": CRON_SECRET,
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
      headers: {
        ...headers,
        // generate-briefs requires JWT — use service-role approach via anon key passthrough
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
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
