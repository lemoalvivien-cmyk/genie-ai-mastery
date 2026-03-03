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
  console.log(`[UPDATE-SEATS] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;

    // Verify manager/admin role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["manager", "admin"])
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Permission refusée" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { seats } = await req.json();
    if (!seats || typeof seats !== "number" || seats < 1 || seats > 200) {
      return new Response(JSON.stringify({ error: "Nombre de sièges invalide (1-200)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch org
    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    const orgId = profile?.org_id;
    if (!orgId) throw new Error("Aucune organisation trouvée");

    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_subscription_id, plan_source, seats_used")
      .eq("id", orgId)
      .single();

    if (org?.plan_source !== "stripe" || !org?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "Aucun abonnement Stripe actif" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Can't reduce below current usage
    const seatsUsed = org.seats_used ?? 0;
    if (seats * 25 < seatsUsed) {
      return new Response(JSON.stringify({
        error: `Impossible de réduire en dessous des ${seatsUsed} membres actifs`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get subscription and find the line item
    const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) throw new Error("Subscription item not found");

    // Update quantity on Stripe
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{ id: itemId, quantity: seats }],
      proration_behavior: "create_prorations",
    });
    logStep("Stripe subscription updated", { seats, newSeats: seats });

    // Update in DB
    await supabase.from("organizations").update({ seats_max: seats * 25 }).eq("id", orgId);

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "seats_updated",
      details: { org_id: orgId, seats, subscription_id: org.stripe_subscription_id },
    });

    return new Response(JSON.stringify({
      success: true,
      seats_max: seats * 25,
      message: `Abonnement mis à jour : ${seats * 25} sièges`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
