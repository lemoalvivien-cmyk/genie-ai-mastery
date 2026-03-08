/**
 * openclaw-create-job
 * Crée un job OpenClaw validé avec Zod, vérifie permissions + policy org.
 * NE parle PAS directement à OpenClaw. Crée uniquement l'enregistrement DB.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Validation ────────────────────────────────────────────────
const ALLOWED_JOB_TYPES = ["tutor_search", "browser_lab", "scheduled_coach", "custom"] as const;
const ALLOWED_RISK_LEVELS = ["low", "medium", "high"] as const;

type JobType = typeof ALLOWED_JOB_TYPES[number];
type RiskLevel = typeof ALLOWED_RISK_LEVELS[number];

interface CreateJobBody {
  runtime_id: string;
  job_type: JobType;
  title: string;
  prompt: string;
  payload?: Record<string, unknown>;
  risk_level?: RiskLevel;
}

function validateBody(raw: unknown): { data: CreateJobBody; error: null } | { data: null; error: string } {
  if (typeof raw !== "object" || raw === null) return { data: null, error: "Body must be an object" };
  const b = raw as Record<string, unknown>;

  if (!b.runtime_id || typeof b.runtime_id !== "string") return { data: null, error: "runtime_id is required (string)" };
  if (!b.job_type || !ALLOWED_JOB_TYPES.includes(b.job_type as JobType)) {
    return { data: null, error: `job_type must be one of: ${ALLOWED_JOB_TYPES.join(", ")}` };
  }
  if (!b.title || typeof b.title !== "string" || b.title.trim().length < 3 || b.title.trim().length > 200) {
    return { data: null, error: "title must be 3-200 chars" };
  }
  if (!b.prompt || typeof b.prompt !== "string" || b.prompt.trim().length < 10 || b.prompt.trim().length > 4000) {
    return { data: null, error: "prompt must be 10-4000 chars" };
  }
  if (b.risk_level && !ALLOWED_RISK_LEVELS.includes(b.risk_level as RiskLevel)) {
    return { data: null, error: `risk_level must be one of: ${ALLOWED_RISK_LEVELS.join(", ")}` };
  }
  if (b.payload && typeof b.payload !== "object") {
    return { data: null, error: "payload must be an object" };
  }

  return {
    data: {
      runtime_id: b.runtime_id as string,
      job_type: b.job_type as JobType,
      title: b.title.trim(),
      prompt: b.prompt.trim(),
      payload: (b.payload as Record<string, unknown>) ?? {},
      risk_level: (b.risk_level as RiskLevel) ?? "low",
    },
    error: null,
  };
}

// ── Classify risk from job_type + prompt keywords ─────────────
function classifyRisk(job_type: JobType, prompt: string): { risk_level: RiskLevel; approval_required: boolean } {
  const highRiskKeywords = ["delete", "supprimer", "écrire dans", "modifier", "envoyer email", "submit", "post to", "publier"];
  const mediumRiskKeywords = ["scrape", "crawler", "télécharger", "download", "external api", "api externe"];

  const promptLower = prompt.toLowerCase();
  const hasHighRisk = highRiskKeywords.some(k => promptLower.includes(k));
  const hasMediumRisk = mediumRiskKeywords.some(k => promptLower.includes(k));

  if (job_type === "browser_lab" || hasHighRisk) {
    return { risk_level: "high", approval_required: true };
  }
  if (hasMediumRisk) {
    return { risk_level: "medium", approval_required: false };
  }
  return { risk_level: "low", approval_required: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Auth ────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);

  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Parse & Validate body ──────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: body, error: validationError } = validateBody(rawBody);
  if (validationError || !body) {
    return new Response(JSON.stringify({ error: validationError }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Load user profile to get org_id ──────────────────────
  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .select("id, org_id")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || !profile.org_id) {
    return new Response(JSON.stringify({ error: "User profile not found or no organization" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const org_id = profile.org_id as string;

  // ── Validate job via DB function ──────────────────────────
  const { data: validation, error: valErr } = await sb.rpc("validate_openclaw_job", {
    _user_id: user.id,
    _org_id: org_id,
    _runtime_id: body.runtime_id,
    _job_type: body.job_type,
  });

  if (valErr || !validation?.allowed) {
    const reason = validation?.reason ?? valErr?.message ?? "Validation failed";
    return new Response(JSON.stringify({ error: `Job validation failed: ${reason}` }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Classify risk ──────────────────────────────────────────
  const { risk_level, approval_required } = classifyRisk(body.job_type, body.prompt);
  const final_risk = body.risk_level === "high" ? "high" : risk_level;
  const final_approval = approval_required || body.risk_level === "high";

  // ── Ensure default policy exists for org ──────────────────
  const { data: existingPolicy } = await sb
    .from("openclaw_policies")
    .select("id, max_jobs_per_hour, max_concurrent_jobs")
    .eq("org_id", org_id)
    .eq("active", true)
    .maybeSingle();

  let policyId: string | undefined;

  if (!existingPolicy) {
    // Create default policy for org
    const { data: newPolicy } = await sb.from("openclaw_policies").insert({
      org_id,
      policy_name: "Default Policy",
      allowed_tools: ["web_search", "knowledge_search", "ai_summarize"],
      require_approval_for: ["browser_screenshot", "form_submit"],
      network_mode: "restricted",
      max_runtime_seconds: 120,
      max_artifacts: 10,
      max_jobs_per_hour: 20,
      max_concurrent_jobs: 5,
      active: true,
    }).select("id, max_jobs_per_hour, max_concurrent_jobs").single();
    policyId = newPolicy?.id;
  } else {
    policyId = existingPolicy.id;
  }

  // ── Quota check — jobs created in last 60 minutes ──────────
  const maxPerHour = existingPolicy?.max_jobs_per_hour ?? 20;
  const maxConcurrent = existingPolicy?.max_concurrent_jobs ?? 5;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: recentCount } = await sb
    .from("openclaw_jobs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org_id)
    .gte("created_at", oneHourAgo);

  if ((recentCount ?? 0) >= maxPerHour) {
    return new Response(JSON.stringify({
      error: `quota_exceeded: limite de ${maxPerHour} jobs par heure atteinte pour cette organisation`,
      quota: { kind: "jobs_per_hour", limit: maxPerHour, current: recentCount, window: "60min" },
    }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Quota check — concurrent running jobs ──────────────────
  const { count: runningCount } = await sb
    .from("openclaw_jobs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org_id)
    .eq("status", "running");

  if ((runningCount ?? 0) >= maxConcurrent) {
    return new Response(JSON.stringify({
      error: `quota_exceeded: limite de ${maxConcurrent} jobs simultanés atteinte. Attendez qu'un job en cours se termine.`,
      quota: { kind: "concurrent_jobs", limit: maxConcurrent, current: runningCount },
    }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Create the job ─────────────────────────────────────────
  const { data: job, error: insertErr } = await sb
    .from("openclaw_jobs")
    .insert({
      org_id,
      user_id: user.id,
      runtime_id: body.runtime_id,
      job_type: body.job_type,
      title: body.title,
      prompt: body.prompt,
      payload: body.payload ?? {},
      status: "queued",
      risk_level: final_risk,
      approval_required: final_approval,
    })
    .select()
    .single();

  if (insertErr || !job) {
    return new Response(JSON.stringify({ error: `Failed to create job: ${insertErr?.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Initial event ──────────────────────────────────────────
  await sb.from("openclaw_job_events").insert({
    job_id: job.id,
    event_type: "created",
    message: `Job créé: "${body.title}"`,
    metadata: {
      job_type: body.job_type,
      risk_level: final_risk,
      approval_required: final_approval,
      runtime_id: body.runtime_id,
      created_by: user.id,
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      job_id: job.id,
      status: job.status,
      risk_level: final_risk,
      approval_required: final_approval,
      message: final_approval
        ? "Job créé. Approbation requise avant exécution."
        : "Job créé et en attente d'exécution.",
    }),
    {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
