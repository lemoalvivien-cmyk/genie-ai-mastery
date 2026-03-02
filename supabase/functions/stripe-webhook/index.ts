import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) =>
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Missing Stripe config", { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("No signature", { status: 400 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: String(err) });
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  logStep("Processing event", { type: event.type });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id;
      const userId = session.metadata?.user_id;
      const subscriptionId = session.subscription as string;
      logStep("checkout.session.completed", { orgId, userId, subscriptionId });

      if (orgId) {
        await supabase.from("organizations").update({
          plan: "business",
          stripe_subscription_id: subscriptionId,
          plan_source: "stripe",
          seats_max: 25,
        }).eq("id", orgId);
      }
      if (userId) {
        await supabase.from("audit_logs").insert({
          user_id: userId,
          action: "subscription_created",
          details: { subscription_id: subscriptionId, org_id: orgId },
        });
      }
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      logStep("subscription.updated", { status: sub.status, customerId: sub.customer });
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_subscription_id", sub.id);
      if (orgs?.length) {
        const newPlan = sub.status === "active" || sub.status === "trialing" ? "business" : "free";
        await supabase.from("organizations").update({
          plan: newPlan,
          plan_source: newPlan === "business" ? "stripe" : "none",
        }).eq("stripe_subscription_id", sub.id);
        await supabase.from("audit_logs").insert({
          action: "subscription_updated",
          details: { subscription_id: sub.id, status: sub.status, new_plan: newPlan },
        });
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      logStep("subscription.deleted", { subscriptionId: sub.id });
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_subscription_id", sub.id);
      if (orgs?.length) {
        await supabase.from("organizations").update({
          plan: "free",
          stripe_subscription_id: null,
          plan_source: "none",
          seats_max: 1,
        }).eq("stripe_subscription_id", sub.id);
        await supabase.from("audit_logs").insert({
          action: "subscription_cancelled",
          details: { subscription_id: sub.id },
        });
      }
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("payment_failed", { invoiceId: invoice.id });
      await supabase.from("audit_logs").insert({
        action: "payment_failed",
        details: { invoice_id: invoice.id, customer_id: invoice.customer },
      });
    }
  } catch (err) {
    logStep("Error handling event", { error: String(err) });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
