import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://genie-ia.app",
  "https://genie-ai-mastery.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client (for ALL operations including auth verification)
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // PASSE B · #4 — getUser() au lieu de getClaims() pour vérification réseau
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

    // Fetch the code
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

    // Check if this user already used this code
    const usedBy: string[] = Array.isArray(codeRow.used_by) ? codeRow.used_by : [];
    if (usedBy.includes(userId)) {
      return new Response(JSON.stringify({ error: "Vous avez déjà utilisé ce code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's profile to find or create org
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("org_id, email, full_name")
      .eq("id", userId)
      .single();

    let orgId = profile?.org_id;

    if (!orgId) {
      // Create a personal org for the user
      const slug = `personal-${userId.slice(0, 8)}-${Date.now()}`;
      const { data: newOrg } = await adminSupabase
        .from("organizations")
        .insert({
          name: profile?.full_name ? `${profile.full_name} – Business` : "Mon espace Business",
          slug,
          plan: codeRow.plan,
          seats_max: 5,
        })
        .select("id")
        .single();

      if (newOrg) {
        orgId = newOrg.id;
        // Link user to org
        await adminSupabase.from("profiles").update({ org_id: orgId }).eq("id", userId);
        // Set manager role
        await adminSupabase.from("user_roles").upsert({ user_id: userId, role: "manager", org_id: orgId });
      }
    } else {
      // Update existing org plan
      await adminSupabase
        .from("organizations")
        .update({ plan: codeRow.plan })
        .eq("id", orgId);
    }

    // Mark code as used
    await adminSupabase
      .from("access_codes")
      .update({
        current_uses: codeRow.current_uses + 1,
        used_by: [...usedBy, userId],
        is_active: codeRow.current_uses + 1 >= codeRow.max_uses ? false : true,
      })
      .eq("id", codeRow.id);

    return new Response(
      JSON.stringify({
        success: true,
        plan: codeRow.plan,
        message: `Votre accès ${codeRow.plan.charAt(0).toUpperCase() + codeRow.plan.slice(1)} est activé ! 🎉`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
