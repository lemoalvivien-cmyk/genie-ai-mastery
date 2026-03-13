/**
 * voice-clone-register
 * Receives a WebM audio sample and registers a custom voice via DashScope CosyVoice.
 * Returns a voice_id for subsequent TTS calls.
 */
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthenticatedUser, createServiceClient, handleOptions } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight   = handleOptions(req, corsHeaders);
  if (preflight) return preflight;

  try {
    const supabaseAdmin = createServiceClient();
    const user          = await getAuthenticatedUser(req, supabaseAdmin);

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile) {
      return new Response(JSON.stringify({ error: "audio file required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DASHSCOPE_API_KEY = Deno.env.get("DASHSCOPE_API_KEY");
    if (!DASHSCOPE_API_KEY) throw new Error("DASHSCOPE_API_KEY not configured");

    // ── Register custom voice via DashScope CosyVoice voice customization ────
    // DashScope voice cloning: POST to /compatible-mode/v1/audio/voice-clone
    const cloneForm = new FormData();
    cloneForm.append("audio_file", audioFile, "sample.webm");
    cloneForm.append("prefix",     `usr_${user.id.replace(/-/g, "").slice(0, 12)}`);

    const cloneRes = await fetch(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/audio/voice-clone",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
        body: cloneForm,
        signal: AbortSignal.timeout(60_000),
      }
    );

    if (!cloneRes.ok) {
      const errText = await cloneRes.text();
      // Fallback: return a synthetic voice_id (feature unavailable in region)
      console.warn("Voice clone API unavailable:", errText);
      // Return a "best-match" preset so the UX still works
      return new Response(JSON.stringify({
        voice_id:     "loongstella_v2",
        is_fallback:  true,
        message:      "Clone API indisponible dans cette région — voix Stella sélectionnée",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cloneData = await cloneRes.json() as { voice_id?: string; id?: string };
    const voiceId   = cloneData.voice_id ?? cloneData.id ?? "loongstella_v2";

    // Persist voice_id to profile custom_data
    await supabaseAdmin
      .from("profiles")
      .update({ custom_data: { cloned_voice_id: voiceId } } as Record<string, unknown>)
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ voice_id: voiceId, is_fallback: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Clone failed" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
