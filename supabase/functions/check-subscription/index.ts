import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) =>
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Unauthorized");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Check org plan first (access_code path)
    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    if (profile?.org_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("plan, plan_source, stripe_subscription_id, stripe_customer_id")
        .eq("id", profile.org_id)
        .single();
      if (org?.plan === "business" && org.plan_source === "access_code") {
        return new Response(JSON.stringify({
          subscribed: true,
          source: "access_code",
          subscription_end: null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Check Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ subscribed: false, source: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const trialSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 1,
    });
    const allSubs = [...subscriptions.data, ...trialSubs.data];
    const hasActiveSub = allSubs.length > 0;

    let subscriptionEnd: string | null = null;
    let renewalDate: string | null = null;
    if (hasActiveSub) {
      const sub = allSubs[0];
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      renewalDate = subscriptionEnd;

      // Sync org plan
      if (profile?.org_id) {
        await supabase.from("organizations").update({
          plan: "business",
          stripe_subscription_id: sub.id,
          plan_source: "stripe",
          stripe_customer_id: customerId,
          seats_max: 25,
        }).eq("id", profile.org_id);
      }
    }

    logStep("Subscription checked", { hasActiveSub, subscriptionEnd });
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      source: hasActiveSub ? "stripe" : "none",
      subscription_end: subscriptionEnd,
      renewal_date: renewalDate,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
