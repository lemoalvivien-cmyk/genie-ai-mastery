import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Enforce admin-only access for partner account creation
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { name, contact_email } = await req.json();
    if (!name || !contact_email) return new Response(JSON.stringify({ error: "name and contact_email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check if already exists
    const { data: existing } = await supabase.from("partner_accounts").select("id").eq("contact_email", contact_email).maybeSingle();
    if (existing) return new Response(JSON.stringify({ error: "Ce compte partenaire existe déjà." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: account, error } = await supabase.from("partner_accounts").insert({
      name,
      contact_email,
      status: "active",
      revshare_percent: 30,
    }).select().single();

    if (error) throw error;

    // Auto-create first referral code
    const code = `GENIE-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await supabase.from("partner_referrals").insert({
      partner_id: account.id,
      referral_code: code,
      landing_url_slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    });

    return new Response(JSON.stringify({ account, message: "Compte partenaire créé !" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
