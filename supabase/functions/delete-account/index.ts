/**
 * delete-account — Edge Function sécurisée (RGPD Art. 17 — Droit à l'effacement)
 *
 * Vérifie le JWT utilisateur, supprime toutes les données liées,
 * puis supprime le compte auth via service role key.
 *
 * Sécurité :
 * - JWT validé via getUser()
 * - Confirmation textuelle obligatoire côté client
 * - Ne peut supprimer QUE le compte du JWT appelant
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://genie-ia.app",          // legacy domain — keep for backward compat
  "https://genie-ai-mastery.lovable.app", // legacy Lovable URL — keep for backward compat
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function json(data: unknown, status = 200, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

  // ── 1. Auth JWT strict
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401, cors);
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401, cors);
  }

  // ── 2. Parse body + vérifier confirmation
  let body: { confirmation?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, cors);
  }

  if (body.confirmation !== "SUPPRIMER") {
    return json({ error: "Confirmation invalide. Tapez SUPPRIMER." }, 400, cors);
  }

  // ── 3. Supprimer les données utilisateur via service role
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const userId = user.id;

  // Suppression en cascade des données publiques (la FK cascade supprime le reste)
  // On supprime explicitement les tables sans FK cascade vers profiles
  const tables = [
    "chat_messages",
    "genieos_conversations",
    "knowledge_documents",
    "knowledge_chunks",
    "knowledge_sources",
    "data_documents",
    "data_sources",
    "genieos_agents",
    "genieos_workflows",
    "openclaw_jobs",
    "memory_timeline",
    "action_logs",
    "agent_executions",
    "agent_logs",
  ];

  for (const table of tables) {
    await admin.from(table).delete().eq("user_id", userId);
  }

  // Supprimer le profil (supprime via cascade user_roles, progress, nudges…)
  await admin.from("profiles").delete().eq("id", userId);

  // ── 4. Supprimer le compte auth
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("[delete-account] Auth delete error:", deleteError);
    return json({ error: "Erreur lors de la suppression du compte auth." }, 500, cors);
  }

  // Audit (best-effort — l'utilisateur n'existe plus)
  await admin.from("audit_logs").insert({
    user_id: null,
    action: "account_deleted",
    resource_type: "auth",
    resource_id: userId,
    details: { deleted_at: new Date().toISOString() },
  }).catch(() => {});

  return json({ success: true, message: "Compte supprimé avec succès." }, 200, cors);
});
