import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { getAuthenticatedUser } from "../_shared/auth.ts";
import { getClientIp, hashIp, checkIpRateLimit } from "../_shared/shield.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAILS = 500;

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);
  const rl = await checkIpRateLimit(ipHash, "validate-csv-import", 30, 1);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate caller
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { emails, org_id } = body as { emails: unknown; org_id: unknown };

    // Input validation
    if (!Array.isArray(emails) || typeof org_id !== "string") {
      return new Response(JSON.stringify({ error: "Paramètres invalides" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (emails.length > MAX_EMAILS) {
      return new Response(JSON.stringify({ error: `Maximum ${MAX_EMAILS} emails par import` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a manager of this org
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = (roles ?? []).map((r: { role: string }) => r.role);
    const isManager = userRoles.includes("manager") || userRoles.includes("admin");
    const isOrgMatch = profile?.org_id === org_id;

    if (!isManager || (!isOrgMatch && !userRoles.includes("admin"))) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Org capacity check
    const { data: org } = await supabase
      .from("organizations")
      .select("seats_used, seats_max, is_read_only, plan")
      .eq("id", org_id)
      .single();

    if (!org) {
      return new Response(JSON.stringify({ error: "Organisation introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (org.is_read_only) {
      return new Response(JSON.stringify({ error: "Organisation en lecture seule" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seatsAvailable = (org.seats_max ?? 0) - (org.seats_used ?? 0);

    // Deduplicate + validate emails
    const uniqueEmails = [...new Set(
      (emails as string[])
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => EMAIL_RE.test(e))
    )];

    // Check which emails already exist as members of this org
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("email")
      .eq("org_id", org_id)
      .in("email", uniqueEmails);

    const alreadyMembers = new Set(
      (existingProfiles ?? []).map((p: { email: string }) => p.email.toLowerCase())
    );

    // Check pending invitations
    const { data: pendingInvites } = await supabase
      .from("org_invitations")
      .select("email")
      .eq("org_id", org_id)
      .eq("status", "pending")
      .in("email", uniqueEmails);

    const alreadyInvited = new Set(
      (pendingInvites ?? []).map((i: { email: string }) => i.email.toLowerCase())
    );

    const allowed: string[] = [];
    const blocked: string[] = [];
    const reason: Record<string, string> = {};

    let slotsUsed = 0;

    for (const email of uniqueEmails) {
      if (alreadyMembers.has(email)) {
        blocked.push(email);
        reason[email] = "Déjà membre de l'organisation";
        continue;
      }
      if (alreadyInvited.has(email)) {
        blocked.push(email);
        reason[email] = "Invitation déjà en attente";
        continue;
      }
      if (slotsUsed >= seatsAvailable) {
        blocked.push(email);
        reason[email] = "Limite de sièges atteinte";
        continue;
      }
      allowed.push(email);
      slotsUsed++;
    }

    return new Response(
      JSON.stringify({ allowed, blocked, reason, seats_available: seatsAvailable }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("validate-csv-import error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
