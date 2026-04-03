import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Always log in production — filter noise by level, not by env flag
const logStep = (step: string, details?: unknown) =>
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

type OrgUpdate = Record<string, unknown>;

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("FATAL: Missing Stripe config");
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

  // ── Replay protection — reject events older than 24h ────────────────────────
  const MAX_EVENT_AGE_SECONDS = 86400;
  const eventAge = Math.floor(Date.now() / 1000) - event.created;
  if (eventAge > MAX_EVENT_AGE_SECONDS) {
    logStep("Event too old — rejecting", { eventId: event.id, ageSeconds: eventAge });
    return new Response("Event too old", { status: 400 });
  }

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
    const totalSeats = seatsHint ?? 1;
    const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null;
    const periodEnd   = invoice.period_end   ? new Date(invoice.period_end   * 1000).toISOString() : null;
    const paidAt      = invoice.status === "paid" && invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : invoice.status === "paid" ? new Date().toISOString() : null;

    const payload = {
      org_id:             orgId,
      stripe_invoice_id:  invoice.id,
      stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : null,
      amount_cents:       invoice.amount_paid ?? invoice.amount_due ?? 0,
      currency:           invoice.currency ?? "eur",
      status:             invoice.status ?? "draft",
      description:        invoice.description ?? `Abonnement Formetoialia — ${new Date().toLocaleDateString("fr-FR")}`,
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
          is_read_only: false,
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
            is_read_only: false,
          }).select("id").single();
          if (newOrg) {
            resolvedOrgId = newOrg.id;
            await supabase.from("profiles").update({ org_id: newOrg.id }).eq("id", userId);
            await supabase.from("user_roles").upsert({ user_id: userId, role: "manager", org_id: newOrg.id });
          }
        } else {
          resolvedOrgId = profile.org_id;
          await supabase.from("organizations").update({
            plan: "business",
            stripe_subscription_id: subscriptionId,
            plan_source: "stripe",
            seats_max: seats * 25,
            is_read_only: false,
          }).eq("id", profile.org_id);
        }
      }

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

      // Determine new plan state
      const isActive   = sub.status === "active" || sub.status === "trialing";
      const isPastDue  = sub.status === "past_due";
      const isCanceling = sub.cancel_at_period_end === true;

      let newPlan: string;
      let newSource: string;
      let isReadOnly = false;
      let planSource = "stripe";

      if (isActive) {
        newPlan   = "business";
        newSource = isCanceling ? "stripe_cancelling" : "stripe";
        isReadOnly = false;
      } else if (isPastDue) {
        // Keep access but flag as past_due — grace period from Stripe Smart Retries (7–28 days)
        newPlan    = "business";
        newSource  = "stripe_past_due";
        isReadOnly = false;
      } else {
        // unpaid / incomplete_expired / canceled
        newPlan    = "free";
        newSource  = "none";
        isReadOnly = true;
      }

      const orgUpdate: OrgUpdate = {
        plan:       newPlan,
        plan_source: newSource,
        is_read_only: isReadOnly,
        ...(isActive ? { seats_max: seatsMax } : {}),
      };

      if (orgId) {
        await supabase.from("organizations").update(orgUpdate).eq("id", orgId);
        logStep("Updated org plan", { orgId, newPlan, newSource, isReadOnly, seatsMax });
      } else {
        const { data: orgs } = await supabase.from("organizations").select("id").eq("stripe_subscription_id", sub.id);
        if (orgs?.length) {
          await supabase.from("organizations").update(orgUpdate).eq("stripe_subscription_id", sub.id);
          logStep("Updated org plan by sub_id fallback", { count: orgs.length, newPlan });
        } else {
          logStep("WARNING: No org found for subscription", { subId: sub.id });
        }
      }

      await supabase.from("audit_logs").insert({
        action: "subscription_updated",
        details: { subscription_id: sub.id, status: sub.status, seats: totalSeats, cancel_at_period_end: sub.cancel_at_period_end },
      });

    // ── customer.subscription.deleted ──────────────────────────────────────────
    // Fired when a subscription is fully ended (not just cancelled-at-period-end).
    // At this point the period is over — no grace, downgrade immediately.
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      logStep("subscription.deleted", { subscriptionId: sub.id });
      const orgId = await resolveOrgId(sub);

      // Hard downgrade: subscription is gone, period ended
      const cancelUpdate: OrgUpdate = {
        plan:                   "free",
        plan_source:            "none",
        stripe_subscription_id: null,
        seats_max:              1,
        is_read_only:           true,
      };

      if (orgId) {
        await supabase.from("organizations").update(cancelUpdate).eq("id", orgId);
        logStep("Hard downgrade org", { orgId });
      } else {
        await supabase.from("organizations").update(cancelUpdate).eq("stripe_subscription_id", sub.id);
      }

      await trackPaymentEvent("subscription_deleted", null, orgId, {
        subscription_id: sub.id,
      });

      await supabase.from("audit_logs").insert({
        action: "subscription_cancelled",
        details: { subscription_id: sub.id, final: true },
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
            // Stripe will fire subscription.deleted after exhausting retries — but let's also mark past_due now
            await supabase.from("organizations").update({
              plan_source: "stripe_past_due",
            }).eq("id", org.id);
            logStep("Marked org past_due after 3 failed payments", { orgId: org.id });
          }
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

    // ── invoice.payment_action_required (3DS / SCA) ─────────────────────────────
    } else if (event.type === "invoice.payment_action_required") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("payment_action_required", { invoiceId: invoice.id });
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      if (customerId) {
        const { data: org } = await supabase.from("organizations").select("id").eq("stripe_customer_id", customerId).maybeSingle();
        if (org) {
          // Mark past_due until customer completes 3DS
          await supabase.from("organizations").update({
            plan_source: "stripe_past_due",
          }).eq("id", org.id);

          await upsertOrgInvoice(invoice, org.id);
          await trackPaymentEvent("payment_action_required", null, org.id, {
            invoice_id: invoice.id,
            hosted_invoice_url: invoice.hosted_invoice_url,
          });
        }
      }

      await supabase.from("audit_logs").insert({
        action: "payment_action_required",
        details: { invoice_id: invoice.id, customer_id: customerId },
      });

    // ── customer.subscription.trial_will_end ───────────────────────────────────
    // Fires 3 days before trial ends — good hook for "upgrade before trial ends" email/nudge
    } else if (event.type === "customer.subscription.trial_will_end") {
      const sub = event.data.object as Stripe.Subscription;
      logStep("trial_will_end", { subscriptionId: sub.id, trialEnd: sub.trial_end });
      const orgId = await resolveOrgId(sub);

      if (orgId) {
        await trackPaymentEvent("trial_will_end", null, orgId, {
          subscription_id: sub.id,
          trial_end: sub.trial_end,
          days_remaining: 3,
        });
      }

      await supabase.from("audit_logs").insert({
        action: "trial_will_end",
        details: { subscription_id: sub.id, trial_end: sub.trial_end },
      });

    // ── invoice.paid ────────────────────────────────────────────────────────────
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("invoice.paid", { invoiceId: invoice.id, amount: invoice.amount_paid });
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;

      if (customerId && invoice.subscription) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id, plan, plan_source, partner_org_id, settings")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (org) {
          // Re-activate if previously downgraded or marked past_due
          if (org.plan === "free" || org.plan_source === "stripe_past_due") {
            await supabase.from("organizations").update({
              plan: "business",
              plan_source: "stripe",
              is_read_only: false,
            }).eq("id", org.id);
            logStep("Restored org to business / cleared past_due", { orgId: org.id });
          }

          let seats = 1;
          try {
            const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
            seats = sub.items.data.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
          } catch (_e) { /* fallback to 1 */ }

          await upsertOrgInvoice(invoice, org.id, seats);

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
    } else {
      logStep("Unhandled event type (ignored)", { type: event.type });
    }

  } catch (err) {
    logStep("Error handling event", { error: String(err), eventType: event.type, eventId: event.id });
    // Still mark as processed to avoid infinite retry loops on non-transient errors
    // Transient errors (network) will be retried by Stripe naturally
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
