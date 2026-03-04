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

  // ── Kill-Switch ───────────────────────────────────────────────────────────────
  if (Deno.env.get("AI_DISABLED") === "true") {
    return new Response(JSON.stringify({ error: "Le service vocal est temporairement désactivé." }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PASSE B · #8 — getUser() pour vérification réseau du token
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { text, voice = "loongstella_v2", speed = 1.0 } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncatedText = text.trim().slice(0, 500);
    // Rough estimate: ~150 chars/sec spoken at normal speed
    const estimatedSeconds = Math.ceil(truncatedText.length / 150);

    // Get user org
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("org_id").eq("id", userId).single();
    const orgId = profile?.org_id ?? "00000000-0000-0000-0000-000000000000";

    // ── Quota check ────────────────────────────────────────────────────────────
    const { data: quotaData } = await supabaseAdmin.rpc("can_execute", {
      _user_id: userId,
      _org_id: orgId,
      _kind: "tts_seconds",
    });
    const quota = quotaData as { allowed: boolean; current_usage: number; limit: number } | null;
    if (quota && !quota.allowed && quota.limit !== -1) {
      return new Response(JSON.stringify({
        error: "quota_exceeded",
        quota_exceeded: true,
        message: `Quota voix atteint (${quota.current_usage}s / ${quota.limit}s ce mois). Mode lecture activé.`,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const DASHSCOPE_API_KEY = Deno.env.get("DASHSCOPE_API_KEY");
    if (!DASHSCOPE_API_KEY) throw new Error("DASHSCOPE_API_KEY not configured");

    const response = await fetch(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/audio/speech",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "cosyvoice-v2",
          input: { text: truncatedText },
          voice,
          parameters: { format: "mp3", rate: speed },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      await response.text(); // consume body
      throw new Error(`DashScope error ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = btoa(binary);

    // ── Increment TTS usage (fire-and-forget) ─────────────────────────────────
    supabaseAdmin.rpc("increment_usage", {
      _user_id: userId,
      _org_id: orgId,
      _kind: "tts_seconds",
      _amount: estimatedSeconds,
    }).then(() => {}).catch(() => {});

    return new Response(
      JSON.stringify({ audio: base64Audio, format: "mp3", seconds_used: estimatedSeconds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "TTS failed" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
