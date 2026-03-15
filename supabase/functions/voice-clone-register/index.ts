/**
 * voice-clone-register v2.0 — Secured · Audited · Rate-limited
 *
 * Auth: getUser() réseau (verify_jwt=true).
 * Security: rate-limit 5 req/heure + audit_log.
 */
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Rate limiting (in-memory, 5 clones/hour per user) ────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxPerHour = 5): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  if (entry.count >= maxPerHour) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // ── Auth: getUser() réseau — source de vérité ───────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: JSON_HEADERS,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: JSON_HEADERS,
      });
    }

    // ── Rate limiting ────────────────────────────────────────────────────────
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Too many requests — max 5 voice clones/hour" }), {
        status: 429, headers: JSON_HEADERS,
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile) {
      return new Response(JSON.stringify({ error: "audio file required" }), {
        status: 400, headers: JSON_HEADERS,
      });
    }

    // ── Audit log ────────────────────────────────────────────────────────────
    const ipHash = req.headers.get("x-forwarded-for") ?? "unknown";
    try {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "voice_register",
        event_type: "voice_register",
        resource_type: "voice_clone",
        details: { file_size: audioFile.size, file_type: audioFile.type },
        ip_address: ipHash,
      });
    } catch (_e) { /* never fail the main flow */ }

    const DASHSCOPE_API_KEY = Deno.env.get("DASHSCOPE_API_KEY");
    if (!DASHSCOPE_API_KEY) throw new Error("DASHSCOPE_API_KEY not configured");

    // ── Register custom voice via DashScope CosyVoice ─────────────────────────
    const cloneForm = new FormData();
    cloneForm.append("audio_file", audioFile, "sample.webm");
    cloneForm.append("prefix", `usr_${user.id.replace(/-/g, "").slice(0, 12)}`);

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
      console.warn("Voice clone API unavailable:", errText);
      // Fallback preset so UX still works
      return new Response(JSON.stringify({
        voice_id:    "loongstella_v2",
        is_fallback: true,
        message:     "Clone API indisponible dans cette région — voix Stella sélectionnée",
      }), { headers: JSON_HEADERS });
    }

    const cloneData = await cloneRes.json() as { voice_id?: string; id?: string };
    const voiceId   = cloneData.voice_id ?? cloneData.id ?? "loongstella_v2";

    // ── Persist voice_id (service client for bypass RLS) ────────────────────
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    await adminClient
      .from("profiles")
      .update({ custom_data: { cloned_voice_id: voiceId } } as Record<string, unknown>)
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ voice_id: voiceId, is_fallback: false }),
      { headers: JSON_HEADERS }
    );
  } catch (err) {
    const origin2 = req.headers.get("origin");
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Clone failed" }),
      { status: 500, headers: { ...getCorsHeaders(origin2), "Content-Type": "application/json" } }
    );
  }
});
