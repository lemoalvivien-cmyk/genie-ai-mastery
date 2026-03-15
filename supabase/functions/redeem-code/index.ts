import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

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

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Code requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedCode = code.trim().toUpperCase();

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
      return new Response(JSON.stringify({ error: "Ce code a déjà été utilisé" }), {
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
          name: profile?.full_name ? `${profile.full_name} – Business` : "Mon espace Business",
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
      }
    } else {
      // Always set plan_source so subscription.ts recognises the plan as active
      await adminSupabase
        .from("organizations")
        .update({ plan: codeRow.plan, plan_source: "access_code" })
        .eq("id", orgId);
    }

    // Atomic increment — prevents race condition on concurrent redeems
    const { error: codeUpdateErr } = await adminSupabase
      .from("access_codes")
      .update({
        used_by: [...usedBy, userId],
        is_active: codeRow.current_uses + 1 >= codeRow.max_uses ? false : true,
      })
      .eq("id", codeRow.id)
      .lt("current_uses", codeRow.max_uses); // Only update if still under limit

    // Separate atomic counter increment (avoids stale-read race)
    await adminSupabase.rpc("increment_access_code_uses", { _code_id: codeRow.id });

    if (codeUpdateErr) {
      return new Response(JSON.stringify({ error: "Ce code a déjà été utilisé au maximum" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan: codeRow.plan,
        message: `Votre accès ${codeRow.plan.charAt(0).toUpperCase() + codeRow.plan.slice(1)} est activé ! 🎉`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
