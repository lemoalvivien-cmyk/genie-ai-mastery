import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  if (Deno.env.get("DEBUG_WEBHOOK") === "true") {
    console.log(`[STRIPE-WEBHOOK] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
type OrgUpdate = Record<string, unknown>;

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return new Response("Missing Stripe config", { status: 500 });

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

  // ── Idempotency check ───────────────────────────────────────────────────────
  const { data: existingEvent } = await supabase
    .from("audit_logs")
    .select("id")
    .eq("action", "stripe_event_processed")
    .eq("resource_id", event.id)
    .maybeSingle();

  if (existingEvent) {
    logStep("Event already processed — skipping", { eventId: event.id });
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Resolve orgId helper ────────────────────────────────────────────────────
  async function resolveOrgId(subOrSession: {
    metadata?: Record<string, string>;
    customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null;
  }): Promise<string | null> {
    const metaOrg = subOrSession.metadata?.org_id;
    if (metaOrg) return metaOrg;
    const customerId = typeof subOrSession.customer === "string" ? subOrSession.customer : null;
    if (customerId) {
      const { data } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      return data?.id ?? null;
    }
    return null;
  }

  // ── Upsert invoice into org_invoices ────────────────────────────────────────
  async function upsertOrgInvoice(invoice: Stripe.Invoice, orgId: string | null, seatsHint?: number) {
    if (!orgId) return;
    const resolvedOrgId = orgId;
    const totalSeats = seatsHint ?? 1;
    const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null;
    const periodEnd   = invoice.period_end   ? new Date(invoice.period_end   * 1000).toISOString() : null;
    const paidAt      = invoice.status === "paid" && invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : invoice.status === "paid" ? new Date().toISOString() : null;

    const payload = {
      org_id:             resolvedOrgId,
      stripe_invoice_id:  invoice.id,
      stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : null,
      amount_cents:       invoice.amount_paid ?? invoice.amount_due ?? 0,
      currency:           invoice.currency ?? "eur",
      status:             invoice.status ?? "draft",
      description:        invoice.description ?? `Abonnement Génie IA — ${new Date().toLocaleDateString("fr-FR")}`,
      period_start:       periodStart,
      period_end:         periodEnd,
      paid_at:            paidAt,
      invoice_pdf_url:    invoice.invoice_pdf ?? null,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      seats:              totalSeats,
    };

    const { error } = await supabase
      .from("org_invoices")
      .upsert(payload, { onConflict: "stripe_invoice_id" });

    if (error) logStep("upsertOrgInvoice error", { error: error.message });
    else logStep("upsertOrgInvoice ok", { invoiceId: invoice.id, orgId, status: invoice.status });
  }

  // ── Track payment event in brain_events ─────────────────────────────────────
  async function trackPaymentEvent(
    eventType: string,
    userId: string | null,
    orgId: string | null,
    details: Record<string, unknown>,
  ) {
    if (!orgId) return;
    const { error } = await supabase.from("brain_events").insert({
      event_type: eventType,
      user_id:    userId ?? "00000000-0000-0000-0000-000000000000",
      org_id:     orgId,
      metadata:   details,
    });
    if (error) logStep("trackPaymentEvent error", { error: error.message });
  }

  try {
    // ── checkout.session.completed ──────────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId   = session.metadata?.org_id ?? null;
      const userId  = session.metadata?.user_id ?? null;
      const subscriptionId = session.subscription as string;
      const seatsRaw = session.metadata?.seats ?? "1";
      const seats = Math.max(1, parseInt(seatsRaw, 10) || 1);
      logStep("checkout.session.completed", { orgId, userId, subscriptionId, seats });

      // Partner attribution
      const referralCode = session.metadata?.referral_code ?? null;
      let partnerAccountId: string | null = null;
      if (referralCode) {
        const { data: refData } = await supabase.rpc("resolve_referral", { _code: referralCode });
        if (refData?.found) {
          partnerAccountId = refData.partner_id;
          logStep("Partner attribution", { partnerAccountId, referralCode });
        }
      }

      const settingsUpdate = partnerAccountId ? { partner_account_id: partnerAccountId } : undefined;
      let resolvedOrgId = orgId;

      if (orgId) {
        await supabase.from("organizations").update({
          plan: "business",
          stripe_subscription_id: subscriptionId,
          plan_source: "stripe",
          seats_max: seats * 25,
          ...(settingsUpdate ? { settings: settingsUpdate } : {}),
        }).eq("id", orgId);
      } else if (userId) {
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
            resolvedOrgId = newOrg.id;
            await supabase.from("profiles").update({ org_id: newOrg.id }).eq("id", userId);
            await supabase.from("user_roles").upsert({ user_id: userId, role: "manager", org_id: newOrg.id });
          }
        } else {
          resolvedOrgId = profile.org_id;
        }
      }

      // Track in brain_events
      await trackPaymentEvent("payment_checkout_completed", userId, resolvedOrgId, {
        subscription_id: subscriptionId,
        seats,
        amount: session.amount_total,
        currency: session.currency,
      });

      if (userId) {
        await supabase.from("audit_logs").insert({
          user_id: userId,
          action: "subscription_created",
          details: { subscription_id: subscriptionId, org_id: resolvedOrgId, seats },
        });
      }

    // ── customer.subscription.updated ──────────────────────────────────────────
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      logStep("subscription.updated", { status: sub.status, id: sub.id });
      const totalSeats = sub.items.data.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
      const seatsMax = totalSeats * 25;
      const orgId = await resolveOrgId(sub);

      if (orgId) {
        const newPlan = (sub.status === "active" || sub.status === "trialing") ? "business" : "free";
        await supabase.from("organizations").update({
          plan: newPlan,
          plan_source: newPlan === "business" ? "stripe" : "none",
          seats_max: newPlan === "business" ? seatsMax : 1,
        }).eq("id", orgId);
        logStep("Updated org plan", { orgId, newPlan, seatsMax });
      } else {
        const { data: orgs } = await supabase.from("organizations").select("id").eq("stripe_subscription_id", sub.id);
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

    // ── customer.subscription.deleted ──────────────────────────────────────────
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      logStep("subscription.deleted", { subscriptionId: sub.id });
      const orgId = await resolveOrgId(sub);
      const now = Math.floor(Date.now() / 1000);
      const periodEnd = sub.current_period_end ?? now;
      const gracePeriodActive = periodEnd > now;

      const cancelUpdate = gracePeriodActive
        ? { plan: "business" as const, plan_source: "stripe_cancelling", is_read_only: false }
        : { plan: "free" as const, stripe_subscription_id: null, plan_source: "none", seats_max: 1, is_read_only: true };

      const filter = orgId
        ? supabase.from("organizations").update(cancelUpdate).eq("id", orgId)
        : supabase.from("organizations").update(cancelUpdate).eq("stripe_subscription_id", sub.id);
      await filter;

      await trackPaymentEvent("subscription_cancelled", null, orgId, {
        subscription_id: sub.id,
        grace_period_active: gracePeriodActive,
      });

      await supabase.from("audit_logs").insert({
        action: "subscription_cancelled",
        details: { subscription_id: sub.id },
      });

    // ── invoice.payment_failed ──────────────────────────────────────────────────
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("payment_failed", { invoiceId: invoice.id, attemptCount: invoice.attempt_count });
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      if (customerId) {
        const { data: org } = await supabase.from("organizations").select("id, name").eq("stripe_customer_id", customerId).maybeSingle();
        if (org) {
          if ((invoice.attempt_count ?? 0) >= 3) {
            await supabase.from("organizations").update({ plan: "free", plan_source: "none" }).eq("id", org.id);
            logStep("Downgraded org after 3 failed payments", { orgId: org.id });
          }
          // Upsert failed invoice
          await upsertOrgInvoice(invoice, org.id);
          await trackPaymentEvent("payment_failed", null, org.id, {
            invoice_id: invoice.id,
            attempt_count: invoice.attempt_count,
            amount: invoice.amount_due,
          });
        }
      }

      await supabase.from("audit_logs").insert({
        action: "payment_failed",
        details: { invoice_id: invoice.id, customer_id: customerId, attempt_count: invoice.attempt_count },
      });

    // ── invoice.paid ────────────────────────────────────────────────────────────
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("invoice.paid", { invoiceId: invoice.id, amount: invoice.amount_paid });
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;

      if (customerId && invoice.subscription) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id, plan, partner_org_id, settings")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (org) {
          // Re-activate if previously downgraded
          if (org.plan === "free") {
            await supabase.from("organizations").update({
              plan: "business", plan_source: "stripe", is_read_only: false,
            }).eq("id", org.id);
            logStep("Restored org to business", { orgId: org.id });
          }

          // Get seats from subscription
          let seats = 1;
          try {
            const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
            seats = sub.items.data.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
          } catch (_e) { /* fallback to 1 */ }

          // ── CORE: upsert invoice in org_invoices ──────────────────────────
          await upsertOrgInvoice(invoice, org.id, seats);

          // ── Track payment_success in brain_events ─────────────────────────
          await trackPaymentEvent("payment_invoice_paid", null, org.id, {
            invoice_id:     invoice.id,
            amount_paid:    invoice.amount_paid,
            currency:       invoice.currency,
            seats,
            period_start:   invoice.period_start,
            period_end:     invoice.period_end,
          });

          // ── Partner commission ─────────────────────────────────────────────
          const amountPaid = invoice.amount_paid ?? 0;
          if (amountPaid > 0) {
            const partnerAccountId = (org.settings as Record<string, unknown>)?.partner_account_id as string | undefined;
            if (partnerAccountId) {
              const { data: partnerAccount } = await supabase
                .from("partner_accounts")
                .select("id, revshare_percent, status")
                .eq("id", partnerAccountId)
                .maybeSingle();
              if (partnerAccount?.status === "active") {
                const commissionCents = Math.round(amountPaid * partnerAccount.revshare_percent / 100);
                await supabase.from("partner_commissions").insert({
                  partner_id: partnerAccount.id,
                  org_id: org.id,
                  amount_cents: commissionCents,
                  status: "pending",
                  stripe_invoice_id: invoice.id,
                });
                logStep("Commission created", { partnerId: partnerAccount.id, commissionCents });
              }
            }
          }
        }
      }
    }

  } catch (err) {
    logStep("Error handling event", { error: String(err) });
  }

  // ── Mark event as processed (idempotency) ───────────────────────────────────
  try {
    await supabase.from("audit_logs").insert({
      action: "stripe_event_processed",
      resource_id: event.id,
      resource_type: "stripe_event",
      details: { event_type: event.type },
    });
  } catch (_e) { /* non-fatal */ }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
