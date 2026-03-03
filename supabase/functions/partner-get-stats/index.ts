import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGINS = [
  "https://genie-ia.app",
  "https://genie-ai-mastery.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token ?? "");
    if (!userData.user?.email) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: account } = await supabase.from("partner_accounts").select("id").eq("contact_email", userData.user.email).maybeSingle();
    if (!account) return new Response(JSON.stringify({ clients_count: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Count orgs whose partner_org_id links back to this partner (via partner_orgs table)
    // We use partner_referrals join to count attributed orgs
    const { count } = await supabase.from("partner_referrals")
      .select("id", { count: "exact" })
      .eq("partner_id", account.id);

    // Count orgs attributed to this partner's referral codes via partner_orgs
    const { data: referrals } = await supabase.from("partner_referrals").select("id").eq("partner_id", account.id);
    const _referralIds = (referrals ?? []).map((r: { id: string }) => r.id);

    // For now count partner_commissions unique orgs
    const { data: commissions } = await supabase.from("partner_commissions").select("org_id").eq("partner_id", account.id);
    const uniqueOrgs = new Set((commissions ?? []).map((c: { org_id: string | null }) => c.org_id).filter(Boolean));

    return new Response(JSON.stringify({ clients_count: uniqueOrgs.size }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), clients_count: 0 }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
