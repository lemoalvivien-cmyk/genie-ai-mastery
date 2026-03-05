import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  if (Deno.env.get("DEBUG_WEBHOOK") === "true") {
    console.log(`[STRIPE-WEBHOOK] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
  }
};

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

  logStep("Processing event", { type: event.type, id: event.id });

  // ── PASSE E — Idempotency : vérifie si cet event a déjà été traité ─────────
  // Utilise l'event.id Stripe comme clé d'idempotence dans audit_logs.
  // Si un doublon de webhook arrive, on renvoie 200 immédiatement sans doublon DB.
  const { data: existingEvent } = await supabase
    .from("audit_logs")
    .select("id")
    .eq("action", "stripe_event_processed")
    .eq("resource_id", event.id)
    .maybeSingle();

  if (existingEvent) {
    logStep("Event already processed — skipping (idempotency)", { eventId: event.id });
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Helper: resolve orgId from subscription metadata or customer
  async function resolveOrgId(subOrSession: { metadata?: Record<string, string>; customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null }): Promise<string | null> {
    const metaOrg = subOrSession.metadata?.org_id;
    if (metaOrg) return metaOrg;
    // Fallback: look up org by customer id
    const customerId = typeof subOrSession.customer === "string" ? subOrSession.customer : null;
    if (customerId) {
      const { data } = await supabase.from("organizations").select("id").eq("stripe_customer_id", customerId).maybeSingle();
      return data?.id ?? null;
    }
    return null;
  }

  try {
    // ── checkout.session.completed ────────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id ?? null;
      const userId = session.metadata?.user_id ?? null;
      const subscriptionId = session.subscription as string;
      const seatsRaw = session.metadata?.seats ?? "1";
      const seats = Math.max(1, parseInt(seatsRaw, 10) || 1);
      logStep("checkout.session.completed", { orgId, userId, subscriptionId, seats });

      // Resolve partner attribution from metadata
      const referralCode = session.metadata?.referral_code ?? null;
      let partnerAccountId: string | null = null;
      if (referralCode) {
        const { data: refData } = await supabase.rpc("resolve_referral", { _code: referralCode });
        if (refData?.found) {
          partnerAccountId = refData.partner_id;
          logStep("Partner attribution found", { partnerAccountId, referralCode });
        }
      }

      const settingsUpdate = partnerAccountId ? { partner_account_id: partnerAccountId } : undefined;

      if (orgId) {
        await supabase.from("organizations").update({
          plan: "business",
          stripe_subscription_id: subscriptionId,
          plan_source: "stripe",
          seats_max: seats * 25, // 25 seats per seat unit
          ...(settingsUpdate ? { settings: settingsUpdate } : {}),
        }).eq("id", orgId);
      } else if (userId) {
        // No org yet — create a personal one
        const { data: profile } = await supabase.from("profiles").select("full_name, org_id").eq("id", userId).single();
        if (!profile?.org_id) {
          const slug = `personal-${userId.slice(0, 8)}-${Date.now()}`;
          const { data: newOrg } = await supabase.from("organizations").insert({
            name: profile?.full_name ? `${profile.full_name} – Business` : "Mon espace Business",
            slug,
            plan: "business",
            plan_source: "stripe",
            stripe_subscription_id: subscriptionId,
            seats_max: seats * 25,
          }).select("id").single();
          if (newOrg) {
            await supabase.from("profiles").update({ org_id: newOrg.id }).eq("id", userId);
            await supabase.from("user_roles").upsert({ user_id: userId, role: "manager", org_id: newOrg.id });
          }
        }
      }

      if (userId) {
        await supabase.from("audit_logs").insert({
          user_id: userId,
          action: "subscription_created",
          details: { subscription_id: subscriptionId, org_id: orgId, seats },
        });
      }

    // ── customer.subscription.updated ────────────────────────────────────────
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      logStep("subscription.updated", { status: sub.status, id: sub.id });

      // Seats = sum of all quantities on subscription items
      const totalSeats = sub.items.data.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
      const seatsMax = totalSeats * 25;

      const orgId = await resolveOrgId(sub);
      if (orgId) {
        const newPlan = (sub.status === "active" || sub.status === "trialing") ? "business" : "free";
        const planSource = newPlan === "business" ? "stripe" : "none";
        await supabase.from("organizations").update({
          plan: newPlan,
          plan_source: planSource,
          seats_max: newPlan === "business" ? seatsMax : 1,
        }).eq("id", orgId);
        logStep("Updated org plan", { orgId, newPlan, seatsMax });
      } else {
        // Fallback: update by stripe_subscription_id
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_subscription_id", sub.id);
        if (orgs?.length) {
          const newPlan = (sub.status === "active" || sub.status === "trialing") ? "business" : "free";
          await supabase.from("organizations").update({
            plan: newPlan,
            plan_source: newPlan === "business" ? "stripe" : "none",
            seats_max: newPlan === "business" ? seatsMax : 1,
          }).eq("stripe_subscription_id", sub.id);
        }
      }

      await supabase.from("audit_logs").insert({
        action: "subscription_updated",
        details: { subscription_id: sub.id, status: sub.status, seats: totalSeats },
      });

    // ── customer.subscription.deleted ────────────────────────────────────────
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      logStep("subscription.deleted", { subscriptionId: sub.id });

      const orgId = await resolveOrgId(sub);

      // PASSE D · #13 — Grace period : accès maintenu jusqu'à current_period_end
      // Le downgrade immédiat est remplacé par un basculement en read_only sans downgrade plan
      // Le plan passe à "free" seulement APRÈS la fin de la période payée
      const now = Math.floor(Date.now() / 1000);
      const periodEnd = sub.current_period_end ?? now;
      const gracePeriodActive = periodEnd > now;

      const cancelUpdate = gracePeriodActive
        ? {
            // Garde l'accès Pro mais marque is_read_only pour signaler l'annulation
            plan: "business" as const,
            plan_source: "stripe_cancelling",
            is_read_only: false,
          }
        : {
            plan: "free" as const,
            stripe_subscription_id: null,
            plan_source: "none",
            seats_max: 1,
            is_read_only: true,
          };

      const filter = orgId
        ? supabase.from("organizations").update(cancelUpdate).eq("id", orgId)
        : supabase.from("organizations").update(cancelUpdate).eq("stripe_subscription_id", sub.id);

      await filter;
      logStep("Subscription cancelled", { orgId, gracePeriodActive, periodEnd });

      await supabase.from("audit_logs").insert({
        action: "subscription_cancelled",
        details: { subscription_id: sub.id },
      });

    // ── invoice.payment_failed — dunning ─────────────────────────────────────
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("payment_failed", { invoiceId: invoice.id, attemptCount: invoice.attempt_count });

      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id, name")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (org) {
          // After 3 failed attempts → downgrade to free (Stripe handles dunning emails)
          if ((invoice.attempt_count ?? 0) >= 3) {
            await supabase.from("organizations").update({
              plan: "free",
              plan_source: "none",
            }).eq("id", org.id);
            logStep("Downgraded org to free after 3 failed payments", { orgId: org.id });
          }
        }
      }

      await supabase.from("audit_logs").insert({
        action: "payment_failed",
        details: {
          invoice_id: invoice.id,
          customer_id: customerId,
          attempt_count: invoice.attempt_count,
        },
      });

    // ── invoice.paid — restore + commissions partenaire ──────────────────────
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      if (customerId && invoice.subscription) {
        const { data: org } = await supabase
          .from("organizations").select("id, plan, partner_org_id").eq("stripe_customer_id", customerId).maybeSingle();
        if (org) {
          // Re-activate if previously downgraded
          if (org.plan === "free") {
            await supabase.from("organizations").update({ plan: "business", plan_source: "stripe", is_read_only: false }).eq("id", org.id);
            logStep("Restored org to business after successful payment", { orgId: org.id });
          }

          // ── Partner commission calculation ────────────────────────────────
          // Check if this org is attributed to a partner via partner_referrals / partner_accounts
          // We look up partner_commissions to find an existing partner link
          const amountPaid = invoice.amount_paid ?? 0; // in cents

          if (amountPaid > 0) {
            // Find a partner referral linked to this org (via metadata stored in org.settings)
            const { data: orgFull } = await supabase.from("organizations").select("settings").eq("id", org.id).single();
            const partnerAccountId = orgFull?.settings?.partner_account_id as string | undefined;

            if (partnerAccountId) {
              const { data: partnerAccount } = await supabase
                .from("partner_accounts")
                .select("id, revshare_percent, status")
                .eq("id", partnerAccountId)
                .maybeSingle();

              if (partnerAccount && partnerAccount.status === "active") {
                const commissionCents = Math.round(amountPaid * partnerAccount.revshare_percent / 100);
                await supabase.from("partner_commissions").insert({
                  partner_id: partnerAccount.id,
                  org_id: org.id,
                  amount_cents: commissionCents,
                  status: "pending",
                  stripe_invoice_id: invoice.id,
                });
                logStep("Commission created", { partnerId: partnerAccount.id, commissionCents, orgId: org.id });
              }
            }
          }
        }
      }
    }

  } catch (err) {
    logStep("Error handling event", { error: String(err) });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
