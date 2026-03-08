// ─── manager-invite — Edge Function ──────────────────────────────────────────
// Envoie une invitation par email à un collaborateur.
// Utilise service_role pour appeler supabase.auth.admin.inviteUserByEmail
// côté serveur (la clé admin ne doit jamais être exposée côté client).
//
// Auth requise : JWT valide + rôle manager ou admin dans user_roles.
// Body : { email: string; org_id: string }
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGINS = [
  "https://genie-ia.app",
  "https://genie-ai-mastery.lovable.app",
];

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const JSON_HEADERS = { ...cors, "Content-Type": "application/json" };

  try {
    // ── 1. Auth — vérifie le JWT appelant ────────────────────────────────
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: JSON_HEADERS,
      });
    }

    // Client anon pour vérifier l'identité de l'appelant
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: JSON_HEADERS,
      });
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const orgId = typeof body.org_id === "string" ? body.org_id : "";

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !EMAIL_REGEX.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Email invalide" }), {
        status: 400, headers: JSON_HEADERS,
      });
    }
    if (!orgId) {
      return new Response(JSON.stringify({ error: "org_id manquant" }), {
        status: 400, headers: JSON_HEADERS,
      });
    }

    // ── 3. Vérification des droits — service_role ─────────────────────────
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Le manager doit appartenir à cet org ET avoir le rôle manager/admin
    const { data: profileData } = await adminClient
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!profileData || profileData.org_id !== orgId) {
      return new Response(JSON.stringify({ error: "Accès refusé : org non correspondante" }), {
        status: 403, headers: JSON_HEADERS,
      });
    }

    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["manager", "admin"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Accès refusé : rôle insuffisant" }), {
        status: 403, headers: JSON_HEADERS,
      });
    }

    // ── 4. Vérification des sièges ────────────────────────────────────────
    const { data: org } = await adminClient
      .from("organizations")
      .select("seats_used, seats_max, name")
      .eq("id", orgId)
      .single();

    if (org && (org.seats_used ?? 0) >= (org.seats_max ?? 1)) {
      return new Response(
        JSON.stringify({ error: "Limite de sièges atteinte. Passez à un plan supérieur." }),
        { status: 422, headers: JSON_HEADERS },
      );
    }

    // ── 5. Envoi de l'invitation via service_role ─────────────────────────
    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { org_id: orgId, invited_by: user.id },
        redirectTo: `${Deno.env.get("SITE_URL") ?? "https://genie-ai-mastery.lovable.app"}/onboarding`,
      },
    );

    if (inviteErr) {
      // Cas : utilisateur déjà existant
      if (inviteErr.message?.includes("already")) {
        return new Response(
          JSON.stringify({ error: "Cet email est déjà inscrit sur la plateforme." }),
          { status: 409, headers: JSON_HEADERS },
        );
      }
      throw inviteErr;
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: inviteData.user.id }),
      { status: 200, headers: JSON_HEADERS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders(req) },
    );
  }
});
