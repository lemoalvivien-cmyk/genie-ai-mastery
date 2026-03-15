import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token ?? "");
    if (!userData.user?.email) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { return_url } = await req.json();

    const { data: account } = await supabase.from("partner_accounts").select("*").eq("contact_email", userData.user.email).maybeSingle();
    if (!account) return new Response(JSON.stringify({ error: "Compte partenaire non trouvé" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let connectAccountId = account.stripe_connect_account_id;

    // Create Stripe Connect account if needed
    if (!connectAccountId) {
      const connectAccount = await stripe.accounts.create({
        type: "express",
        email: account.contact_email,
        capabilities: { transfers: { requested: true } },
        business_type: "company",
        metadata: { partner_account_id: account.id },
      });
      connectAccountId = connectAccount.id;

      await supabase.from("partner_accounts").update({
        stripe_connect_account_id: connectAccountId,
      }).eq("id", account.id);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: return_url ?? "https://genie-ai-mastery.lovable.app/partner",
      return_url: return_url ?? "https://genie-ai-mastery.lovable.app/partner",
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
