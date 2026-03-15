import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const CACHE_TTL_SECONDS = 86400; // 24h

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const [usersResult, proofsResult, quizzesResult] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("proofs").select("id", { count: "exact", head: true }),
      supabase
        .from("quiz_attempts")
        .select("id", { count: "exact", head: true })
        .eq("completed", true),
    ]);

    const stats = {
      users_trained: usersResult.count ?? 0,
      proofs_generated: proofsResult.count ?? 0,
      quizzes_completed: quizzesResult.count ?? 0,
      generated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(stats), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    });
  } catch (err) {
    console.error("get-public-stats error:", err);
    return new Response(
      JSON.stringify({ error: "Stats unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
