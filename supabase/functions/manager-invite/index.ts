// ─── manager-invite — Edge Function ──────────────────────────────────────────
// Envoie une invitation B2B par email.
// VAGUE 1.6 : écrit dans org_invitations (preuve serveur) AVANT inviteUserByEmail.
// handle_new_user résout l'invitation via la table, pas via metadata brut.
//
// Auth requise : JWT valide + rôle manager ou admin dans user_roles.
// Body : { email: string; org_id: string }
// CORS : dynamique via _shared/cors.ts — plus de wildcard *
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // ── 1. Valider le JWT ─────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: JSON_HEADERS,
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: JSON_HEADERS,
      });
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const orgId = typeof body.org_id === "string" ? body.org_id.trim() : "";

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

    // ── 3. Vérifier droits manager via service_role ───────────────────────────
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: profileData } = await adminClient
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!profileData || profileData.org_id !== orgId) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : org non correspondante" }),
        { status: 403, headers: JSON_HEADERS },
      );
    }

    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["manager", "admin"]);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Accès refusé : rôle insuffisant" }),
        { status: 403, headers: JSON_HEADERS },
      );
    }

    // ── 4. Vérifier les sièges ────────────────────────────────────────────────
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

    // ── 5. Vérifier qu'une invitation pending n'existe pas déjà ──────────────
    const { data: existingInvite } = await adminClient
      .from("org_invitations")
      .select("id, status, expires_at")
      .eq("org_id", orgId)
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "Une invitation est déjà en attente pour cet email." }),
        { status: 409, headers: JSON_HEADERS },
      );
    }

    // ── 6. Écrire l'invitation dans la table serveur (preuve) ─────────────────
    // CRITIQUE : on écrit AVANT d'appeler inviteUserByEmail.
    // handle_new_user résoudra l'invitation depuis cette table.
    const { data: invitationRow, error: invInsertErr } = await adminClient
      .from("org_invitations")
      .insert({
        org_id:     orgId,
        invited_by: user.id,
        email:      email,
        status:     "pending",
      })
      .select("id, token")
      .single();

    if (invInsertErr || !invitationRow) {
      throw new Error(`Impossible de créer l'invitation : ${invInsertErr?.message}`);
    }

    // ── 7. Envoyer l'invitation auth via service_role ─────────────────────────
    // AUCUN org_id dans les metadata : handle_new_user résout l'invitation
    // depuis public.org_invitations via l'email — pas depuis raw_user_meta_data.
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://genie-ai-mastery.lovable.app";
    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          // Contexte UI uniquement — jamais utilisé pour décisions de sécurité
          org_name: org?.name ?? "votre équipe",
        },
        redirectTo: `${siteUrl}/onboarding`,
      },
    );

    if (inviteErr) {
      // Annuler l'invitation si l'envoi auth échoue
      await adminClient
        .from("org_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationRow.id);

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
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
