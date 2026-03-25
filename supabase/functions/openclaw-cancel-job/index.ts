/**
 * openclaw-cancel-job — Edge Function sécurisée
 * 
 * Annule un job OpenClaw avec vérification JWT + ownership strict.
 * Un utilisateur ne peut annuler QUE ses propres jobs.
 * Un manager/admin peut annuler les jobs de son org.
 * 
 * Remplace le client-side update direct (vulnérabilité BLQ-1).
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://formetoialia.com",
  "https://www.formetoialia.com",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".lovable.app") ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function json(data: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  // ── 1. Auth JWT strict — pas d'anon key
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401, corsHeaders);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Valider le JWT utilisateur via getUser() — jamais via anon key
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  // ── 2. Parse body
  let body: { job_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const { job_id } = body;
  if (!job_id || typeof job_id !== "string") {
    return json({ error: "job_id is required" }, 400, corsHeaders);
  }

  // ── 3. Vérification ownership stricte
  const { data: job, error: jobError } = await supabase
    .from("openclaw_jobs")
    .select("id, user_id, org_id, status")
    .eq("id", job_id)
    .single();

  if (jobError || !job) {
    return json({ error: "Job not found" }, 404, corsHeaders);
  }

  // Seuls statuts annulables
  const cancellableStatuses = ["queued", "running"];
  if (!cancellableStatuses.includes(job.status)) {
    return json({ error: `Cannot cancel a job with status '${job.status}'` }, 409, corsHeaders);
  }

  // Vérifier ownership : user_id direct OU manager/admin de l'org
  const isOwner = job.user_id === user.id;

  let isManagerOrAdmin = false;
  if (!isOwner && job.org_id) {
    const { data: roleCheck } = await supabase.rpc("is_manager_of_org", {
      _user_id: user.id,
      _org_id: job.org_id,
    });
    isManagerOrAdmin = roleCheck === true;
  }

  if (!isOwner && !isManagerOrAdmin) {
    return json({ error: "Forbidden: you do not own this job" }, 403, corsHeaders);
  }

  // ── 4. Annulation
  const { error: updateError } = await supabase
    .from("openclaw_jobs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      error_message: `Cancelled by user ${user.id} at ${new Date().toISOString()}`,
    })
    .eq("id", job_id);

  if (updateError) {
    console.error("[openclaw-cancel-job] Update error:", updateError);
    return json({ error: "Failed to cancel job" }, 500, corsHeaders);
  }

  // Audit log
  await supabase.rpc("log_audit", {
    _action: "openclaw_job_cancelled",
    _resource_type: "openclaw_jobs",
    _resource_id: job_id,
    _meta: { cancelled_by: user.id, previous_status: job.status },
  }).catch(() => {});

  return json({ success: true, job_id, message: "Job annulé avec succès." }, 200, corsHeaders);
});
