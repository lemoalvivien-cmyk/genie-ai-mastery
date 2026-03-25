import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) =>
  console.log(`[REDEEM-CODE] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await adminSupabase.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Code requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedCode = code.trim().toUpperCase();
    logStep("Attempting redeem", { code: normalizedCode });

    const { data: codeRow, error: codeErr } = await adminSupabase
      .from("access_codes")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (codeErr || !codeRow) {
      return new Response(JSON.stringify({ error: "Code invalide" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!codeRow.is_active) {
      return new Response(JSON.stringify({ error: "Ce code n'est plus actif" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Ce code a expiré" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (codeRow.current_uses >= codeRow.max_uses) {
      return new Response(JSON.stringify({ error: "Ce code a atteint son nombre maximum d'utilisations" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usedBy: string[] = Array.isArray(codeRow.used_by) ? codeRow.used_by : [];
    if (usedBy.includes(userId)) {
      return new Response(JSON.stringify({ error: "Vous avez déjà utilisé ce code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ATOMIC UPDATE: single SQL operation — prevents double-redemption race condition
    // We append userId to used_by AND increment current_uses in ONE update,
    // guarded by a WHERE clause that checks current_uses < max_uses AND user not already in array.
    // If 2 concurrent requests race, only one will match the WHERE clause.
    const { data: updatedCode, error: atomicErr } = await adminSupabase
      .from("access_codes")
      .update({
        used_by: [...usedBy, userId],
        current_uses: codeRow.current_uses + 1,
        is_active: codeRow.current_uses + 1 < codeRow.max_uses,
      })
      .eq("id", codeRow.id)
      .eq("current_uses", codeRow.current_uses) // Optimistic lock: only update if count hasn't changed
      .not("used_by", "cs", JSON.stringify([userId])) // Guard: user not already in array
      .select("id")
      .maybeSingle();

    if (atomicErr || !updatedCode) {
      logStep("Atomic update failed — concurrent redeem or already used", { codeId: codeRow.id, userId });
      return new Response(JSON.stringify({ error: "Ce code a déjà été utilisé ou a atteint sa limite" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Code redeemed atomically", { codeId: codeRow.id, userId, plan: codeRow.plan });

    // ── Provision org access ────────────────────────────────────────────────────
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("org_id, email, full_name")
      .eq("id", userId)
      .single();

    let orgId = profile?.org_id;

    if (!orgId) {
      const slug = `personal-${userId.slice(0, 8)}-${Date.now()}`;
      const { data: newOrg } = await adminSupabase
        .from("organizations")
        .insert({
          name: profile?.full_name ? `${profile.full_name} – Espace Pro` : "Mon espace Pro",
          slug,
          plan: codeRow.plan,
          plan_source: "access_code",
          seats_max: 5,
        })
        .select("id")
        .single();

      if (newOrg) {
        orgId = newOrg.id;
        await adminSupabase.from("profiles").update({ org_id: orgId }).eq("id", userId);
        await adminSupabase.from("user_roles").upsert({ user_id: userId, role: "manager", org_id: orgId });
        logStep("Created new org for user", { orgId, plan: codeRow.plan });
      }
    } else {
      await adminSupabase
        .from("organizations")
        .update({ plan: codeRow.plan, plan_source: "access_code", is_read_only: false })
        .eq("id", orgId);
      logStep("Updated existing org plan", { orgId, plan: codeRow.plan });
    }

    await adminSupabase.from("audit_logs").insert({
      user_id: userId,
      action: "access_code_redeemed",
      details: { code_id: codeRow.id, plan: codeRow.plan, org_id: orgId },
    });

    return new Response(
      JSON.stringify({
        success: true,
        plan: codeRow.plan,
        message: `Votre accès ${codeRow.plan.charAt(0).toUpperCase() + codeRow.plan.slice(1)} est activé ! 🎉`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    logStep("Unhandled error", { error: String(err) });
    return new Response(
      JSON.stringify({ error: "Une erreur est survenue" }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" } },
    );
  }
});
