import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const logStep = (step: string, details?: unknown) =>
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
    if (userError || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Read profile → org
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      logStep("No org_id, returning not subscribed");
      return new Response(JSON.stringify({ subscribed: false, source: "none", renewal_date: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("plan, plan_source, stripe_subscription_id, stripe_customer_id, seats_max, seats_used")
      .eq("id", profile.org_id)
      .single();

    logStep("Org data", { plan: org?.plan, source: org?.plan_source });

    const isPaidPlan = org?.plan === "pro" || org?.plan === "business" || org?.plan === "compliance" || org?.plan === "partner";
    const isSubscribed = isPaidPlan && (org?.plan_source === "stripe" || org?.plan_source === "access_code");

    let renewalDate: string | null = null;
    let isTrialing = false;
    let trialEndsAt: string | null = null;

    // Enrich from Stripe if Stripe subscription exists
    if (org?.stripe_subscription_id) {
      try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (stripeKey) {
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
          const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
          renewalDate = new Date(sub.current_period_end * 1000).toISOString();
          isTrialing = sub.status === "trialing";
          if (isTrialing && sub.trial_end) {
            trialEndsAt = new Date(sub.trial_end * 1000).toISOString();
          }
          logStep("Stripe sub fetched", { status: sub.status, renewalDate });
        }
      } catch (err) {
        logStep("Stripe fetch failed (non-critical)", { error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        subscribed: isSubscribed,
        source: isSubscribed ? (org?.plan_source ?? "stripe") : "none",
        renewal_date: renewalDate,
        is_trialing: isTrialing,
        trial_ends_at: trialEndsAt,
        seats_max: org?.seats_max ?? 1,
        seats_used: org?.seats_used ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
