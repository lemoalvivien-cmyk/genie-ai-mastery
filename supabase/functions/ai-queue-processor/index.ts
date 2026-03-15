/**
 * ai-queue-processor — Processes a single ai_jobs row.
 * Called internally (service role) by ai-queue-enqueue or a cron.
 * Fallback chain: OpenRouter → Groq (llama-3.3-70b) → Fireworks.
 * Also handles PDF jobs (delegates to generate-pdf logic inline).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { handleOptions } from "../_shared/auth.ts";
import { sendAlert, aiJobFailedAlert, allProvidersFailed } from "../_shared/alerts.ts";

// ── Provider configs ──────────────────────────────────────────────────────────
interface ProviderConfig {
  name: string;
  url: string;
  modelFn: (requested?: string) => string;
  authHeaderFn: () => string;
  extraHeaders?: Record<string, string>;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    modelFn: (m) => m ?? "deepseek/deepseek-chat",
    authHeaderFn: () => `Bearer ${Deno.env.get("OPENROUTER_API_KEY") ?? ""}`,
    extraHeaders: { "HTTP-Referer": "https://formetoialia.com", "X-Title": "Formetoialia" },
  },
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    modelFn: () => "llama-3.3-70b-versatile",
    authHeaderFn: () => `Bearer ${Deno.env.get("GROQ_API_KEY") ?? ""}`,
  },
  {
    name: "fireworks",
    url: "https://api.fireworks.ai/inference/v1/chat/completions",
    modelFn: () => "accounts/fireworks/models/llama-v3p3-70b-instruct",
    authHeaderFn: () => `Bearer ${Deno.env.get("FIREWORKS_API_KEY") ?? ""}`,
  },
];

async function callProviderWithFallback(
  messages: { role: string; content: string }[],
  requestedModel?: string,
  maxTokens = 2000,
): Promise<{ content: string; provider: string; model: string }> {
  let lastError = "";
  let allSkipped = true;

  for (const provider of PROVIDERS) {
    const apiKey = provider.authHeaderFn().replace("Bearer ", "");
    if (!apiKey) {
      console.warn(`[processor] ${provider.name}: no API key, skipping`);
      continue;
    }
    allSkipped = false;

    const model = provider.modelFn(requestedModel);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30_000);
      const resp = await fetch(provider.url, {
        method: "POST",
        headers: {
          Authorization: provider.authHeaderFn(),
          "Content-Type": "application/json",
          ...(provider.extraHeaders ?? {}),
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        lastError = `${provider.name} ${resp.status}: ${errText.slice(0, 200)}`;
        console.warn(`[processor] ${lastError}`);
        continue;
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      return { content, provider: provider.name, model };
    } catch (e) {
      lastError = `${provider.name}: ${(e as Error).message}`;
      console.warn(`[processor] ${lastError}`);
    }
  }

  const reason = allSkipped
    ? "All providers failed — no API keys configured or all returned errors"
    : `All providers failed — last error: ${lastError}`;
  throw new Error(reason);
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const preflight = handleOptions(req, corsHeaders);
  if (preflight) return preflight;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { job_id } = body as { job_id?: string };

    if (!job_id) {
      // Batch mode: pick up to 5 pending jobs (for cron usage)
      const { data: pendingJobs } = await supabase
        .from("ai_jobs")
        .select("id")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(5);

      if (!pendingJobs?.length) {
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let processed = 0;
      for (const j of pendingJobs) {
        await processJob(supabase, j.id);
        processed++;
      }
      return new Response(JSON.stringify({ processed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await processJob(supabase, job_id);
    return new Response(JSON.stringify({ ok: true, job_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ai-queue-processor] unexpected:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processJob(supabase: ReturnType<typeof createClient>, jobId: string) {
  // Claim the job atomically
  const { data: job, error: fetchErr } = await supabase
    .from("ai_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("status", "pending")
    .single();

  if (fetchErr || !job) {
    console.warn(`[processor] job ${jobId} not found or not pending`);
    return;
  }

  // Mark as processing
  await supabase
    .from("ai_jobs")
    .update({ status: "processing" })
    .eq("id", jobId)
    .eq("status", "pending"); // optimistic lock

  try {
    let result: Record<string, unknown> = {};
    let providerUsed = "none";

    if (job.job_type === "chat" || job.job_type === "brain") {
      const { messages, model, max_tokens } = job.payload as {
        messages?: { role: string; content: string }[];
        model?: string;
        max_tokens?: number;
      };

      if (!messages?.length) throw new Error("payload.messages is required for chat/brain jobs");

      let llmResult: { content: string; provider: string; model: string };
      try {
        llmResult = await callProviderWithFallback(messages, model, max_tokens ?? 2000);
      } catch (providerErr) {
        // All providers failed — send critical alert before re-throwing
        EdgeRuntime.waitUntil(
          sendAlert(allProvidersFailed({
            jobId,
            jobType: job.job_type,
            userId: job.user_id ?? null,
          }))
        );
        throw providerErr;
      }

      result = { content: llmResult.content, model_used: llmResult.model };
      providerUsed = llmResult.provider;

    } else if (job.job_type === "pdf") {
      // PDF job: delegate to generate-pdf edge function
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const pdfResp = await fetch(`${SUPABASE_URL}/functions/v1/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          "x-internal-user-id": job.user_id,
        },
        body: JSON.stringify({ ...job.payload, _queue_mode: true }),
      });

      if (!pdfResp.ok) {
        const errData = await pdfResp.json().catch(() => ({ error: "PDF generation failed" }));
        throw new Error(errData.error ?? `PDF HTTP ${pdfResp.status}`);
      }

      const pdfData = await pdfResp.json();
      result = pdfData;
      providerUsed = "generate-pdf";
    }

    // Mark completed
    await supabase
      .from("ai_jobs")
      .update({
        status: "completed",
        result,
        provider_used: providerUsed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`[processor] ✅ job ${jobId} completed via ${providerUsed}`);
  } catch (e) {
    const errMsg = String(e);
    console.error(`[processor] ❌ job ${jobId} failed:`, e);

    await supabase
      .from("ai_jobs")
      .update({
        status: "failed",
        error: errMsg,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Send alert for any job failure (fire-and-forget via EdgeRuntime)
    EdgeRuntime.waitUntil(
      sendAlert(aiJobFailedAlert({
        jobId,
        jobType: job.job_type,
        userId: job.user_id ?? null,
        error: errMsg,
      }))
    );
  }
}
