import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) =>
  console.log(`[CREATE-CHECKOUT] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

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

    // Rate limit: max 3 checkout sessions / hour
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", "checkout_created")
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Trop de tentatives. Réessayez dans une heure." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch org
    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    const orgId = profile?.org_id;
    let orgData: { stripe_customer_id?: string; plan?: string; plan_source?: string } = {};
    if (orgId) {
      const { data } = await supabase
        .from("organizations")
        .select("stripe_customer_id, plan, plan_source")
        .eq("id", orgId)
        .single();
      orgData = data ?? {};
    }

    // Already subscribed?
    if (orgData.plan === "business" && orgData.plan_source === "stripe" && orgData.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "Vous avez déjà un abonnement actif." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine price
    const launchActive = Deno.env.get("LAUNCH_PRICE_ACTIVE") === "true";
    const priceId = launchActive
      ? Deno.env.get("STRIPE_PRICE_PRO")
      : Deno.env.get("STRIPE_PRICE_PRO_FULL");
    if (!priceId) throw new Error("Price ID not configured");
    logStep("Using price", { priceId, launchActive });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create or reuse customer
    let customerId = orgData.stripe_customer_id;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: { user_id: user.id, org_id: orgId ?? "" },
        });
        customerId = customer.id;
      }
      // Store customer id if org exists
      if (orgId) {
        await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", orgId);
      }
      logStep("Customer ready", { customerId });
    }

    const origin = req.headers.get("origin") || "https://genie-ai-mastery.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      trial_period_days: 14,
      success_url: `${origin}/app/dashboard?payment=success`,
      cancel_url: `${origin}/pricing?payment=cancelled`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, org_id: orgId ?? "" },
    });
    logStep("Checkout session created", { sessionId: session.id });

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "checkout_created",
      details: { session_id: session.id, price_id: priceId },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
