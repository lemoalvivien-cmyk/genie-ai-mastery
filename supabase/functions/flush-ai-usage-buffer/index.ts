import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: bufferRows, error: fetchErr } = await supabase
      .from("ai_usage_buffer")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);

    if (fetchErr) throw fetchErr;

    if (!bufferRows || bufferRows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, failed: 0, remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;

    for (const row of bufferRows) {
      try {
        const { data: existing } = await supabase
          .from("ai_usage_daily")
          .select("id, tokens_in, tokens_out, cost_estimate")
          .eq("user_id", row.user_id)
          .eq("date", row.date)
          .eq("model_used", row.model)
          .maybeSingle();

        if (existing) {
          const { error: updateErr } = await supabase
            .from("ai_usage_daily")
            .update({
              tokens_in: (existing.tokens_in ?? 0) + row.tokens_in,
              tokens_out: (existing.tokens_out ?? 0) + row.tokens_out,
              cost_estimate: (Number(existing.cost_estimate) ?? 0) + Number(row.cost_estimate),
            })
            .eq("id", existing.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from("ai_usage_daily")
            .insert({
              user_id: row.user_id,
              org_id: row.org_id,
              tokens_in: row.tokens_in,
              tokens_out: row.tokens_out,
              cost_estimate: row.cost_estimate,
              model_used: row.model,
              date: row.date,
            });
          if (insertErr) throw insertErr;
        }

        await supabase.from("ai_usage_buffer").delete().eq("id", row.id);
        processed++;
      } catch (_e) {
        failed++;
      }
    }

    const { count: remaining } = await supabase
      .from("ai_usage_buffer")
      .select("*", { count: "exact", head: true });

    if ((remaining ?? 0) === 0) {
      await supabase
        .from("app_metrics")
        .update({ logging_errors: 0, updated_at: new Date().toISOString() })
        .eq("id", 1);
    }

    return new Response(JSON.stringify({ processed, failed, remaining: remaining ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("flush-ai-usage-buffer error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
