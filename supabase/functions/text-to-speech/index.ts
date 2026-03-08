import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthenticatedUser, createServiceClient, handleOptions, jsonResponse } from "../_shared/auth.ts";
import { requireProPlan } from "../_shared/subscription.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleOptions(req, corsHeaders);
  if (preflight) return preflight;

  // ── Kill-Switch ───────────────────────────────────────────────────────────────
  if (Deno.env.get("AI_DISABLED") === "true") {
    return jsonResponse({ error: "Le service vocal est temporairement désactivé." }, 503, corsHeaders);
  }

  try {
    const supabaseAdmin = createServiceClient();
    const user = await getAuthenticatedUser(req, supabaseAdmin);
    const userId = user.id;

    // ── Plan check: TTS is Pro-only ───────────────────────────────────────────
    try {
      await requireProPlan(supabaseAdmin, userId, corsHeaders);
    } catch (e) {
      if (e instanceof Response) return e;
      throw e;
    }

    // ── Rate limit (Pro = 200/day, Free = 5/day) ──────────────────────────────
    const planLabel = "pro"; // requireProPlan passed → user is pro
    await checkRateLimit(supabaseAdmin, userId, "text-to-speech", planLabel, corsHeaders);

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
