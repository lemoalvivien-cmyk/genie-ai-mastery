import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token ?? "");
    if (!userData.user?.email) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: account } = await supabase.from("partner_accounts").select("id").eq("contact_email", userData.user.email).maybeSingle();
    if (!account) return new Response(JSON.stringify({ referrals: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: referrals } = await supabase.from("partner_referrals").select("*").eq("partner_id", account.id).order("created_at", { ascending: false });

    return new Response(JSON.stringify({ referrals: referrals ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
