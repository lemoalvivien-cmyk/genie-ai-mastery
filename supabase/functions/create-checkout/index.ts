import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) =>
  console.log(`[CREATE-CHECKOUT] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Unauthorized");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Rate limit: max 5 checkout sessions / hour
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", "checkout_created")
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Trop de tentatives. Réessayez dans une heure." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let seats = 1;
    let referralCode: string | null = null;
    try {
      const body = await req.json();
      if (body?.seats && typeof body.seats === "number" && body.seats >= 1 && body.seats <= 500) {
        seats = Math.floor(body.seats);
      }
      if (body?.referral_code && typeof body.referral_code === "string") {
        referralCode = body.referral_code.trim().toUpperCase();
      }
    } catch (_e) { /* body is optional */ }

    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    const orgId = profile?.org_id;
    let orgData: { stripe_customer_id?: string; plan?: string; plan_source?: string; stripe_subscription_id?: string } = {};
    if (orgId) {
      const { data } = await supabase
        .from("organizations")
        .select("stripe_customer_id, plan, plan_source, stripe_subscription_id")
        .eq("id", orgId)
        .single();
      orgData = data ?? {};
    }

    if (
      (orgData.plan === "business" || orgData.plan === "compliance") &&
      orgData.plan_source === "stripe" &&
      orgData.stripe_subscription_id
    ) {
      return new Response(JSON.stringify({ error: "Vous avez déjà un abonnement actif. Gérez-le depuis le portail." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = Deno.env.get("STRIPE_PRICE_59_TTC") ?? Deno.env.get("STRIPE_PRICE_PRO");
    if (!priceId) throw new Error("Price ID non configuré — vérifier STRIPE_PRICE_59_TTC dans les secrets");
    logStep("Using price", { priceId, seats });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let customerId = orgData.stripe_customer_id;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          name: user.user_metadata?.full_name as string | undefined,
          metadata: { user_id: user.id, org_id: orgId ?? "" },
        });
        customerId = customer.id;
      }
      if (orgId) {
        await supabase.from("organizations").update({ stripe_customer_id: customerId }).eq("id", orgId);
      }
      logStep("Customer ready", { customerId });
    }

    const origin = req.headers.get("origin") || "https://formetoialia.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: seats }],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id, org_id: orgId ?? "", seats: String(seats), referral_code: referralCode ?? "" },
      },
      automatic_tax: { enabled: true },
      customer_update: { address: "auto" },
      tax_id_collection: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${origin}/app/dashboard?payment=success&upgrade=success`,
      cancel_url: `${origin}/pricing?cancelled=true`,
      metadata: { user_id: user.id, org_id: orgId ?? "", seats: String(seats), referral_code: referralCode ?? "" },
    });
    logStep("Checkout session created", { sessionId: session.id, seats });

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "checkout_created",
      details: { session_id: session.id, price_id: priceId, seats },
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
