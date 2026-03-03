import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const GOD_EMAIL = "lemoalvivien@gmail.com";

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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth check ──────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimErr } = await supabaseAnon.auth.getClaims(token);
  if (claimErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: corsHeaders,
    });
  }

  // ── Service-role client (bypasses RLS) ─────────────────────────
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Verify email via service role
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", claims.claims.sub)
    .single();

  if (profile?.email !== GOD_EMAIL) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: corsHeaders,
    });
  }

  const { action, payload } = await req.json();
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  // ── Route actions ───────────────────────────────────────────────
  try {
    // LIST ALL ORGS
    if (action === "list_orgs") {
      const { data } = await admin
        .from("organizations")
        .select("id, name, slug, plan, seats_used, seats_max, is_read_only, stripe_subscription_id, created_at")
        .order("created_at", { ascending: false });
      return json({ orgs: data }, corsHeaders);
    }

    // LIST ALL USERS
    if (action === "list_users") {
      const { data } = await admin
        .from("profiles")
        .select("id, email, full_name, role, org_id, level, onboarding_completed, created_at, last_active_at, abuse_score")
        .order("created_at", { ascending: false })
        .limit(200);
      return json({ users: data }, corsHeaders);
    }

    // LIST AI BUDGETS
    if (action === "list_budgets") {
      const { data } = await admin
        .from("ai_budgets")
        .select("org_id, daily_limit, used_today, is_blocked, reset_date, updated_at")
        .order("updated_at", { ascending: false });
      return json({ budgets: data }, corsHeaders);
    }

    // UPDATE AI BUDGET
    if (action === "update_budget") {
      const { org_id, daily_limit } = payload;
      if (!org_id || daily_limit == null) throw new Error("Missing org_id or daily_limit");
      await admin
        .from("ai_budgets")
        .upsert({ org_id, daily_limit, is_blocked: false, used_today: 0, reset_date: new Date().toISOString().split("T")[0] });
      return json({ ok: true }, corsHeaders);
    }

    // RESET BUDGET (unblock)
    if (action === "reset_budget") {
      const { org_id } = payload;
      await admin.from("ai_budgets").update({ is_blocked: false, used_today: 0 }).eq("org_id", org_id);
      return json({ ok: true }, corsHeaders);
    }

    // TOGGLE ORG READ-ONLY
    if (action === "toggle_readonly") {
      const { org_id, is_read_only } = payload;
      await admin.from("organizations").update({ is_read_only }).eq("id", org_id);
      return json({ ok: true }, corsHeaders);
    }

    // SET ORG PLAN
    if (action === "set_plan") {
      const { org_id, plan } = payload;
      await admin.from("organizations").update({ plan }).eq("id", org_id);
      return json({ ok: true }, corsHeaders);
    }

    // LIST STRIPE SUBSCRIPTIONS for an org
    if (action === "stripe_list_subs") {
      const { org_id } = payload;
      const { data: org } = await admin.from("organizations").select("stripe_customer_id, stripe_subscription_id").eq("id", org_id).single();
      if (!org?.stripe_customer_id) return json({ subscriptions: [] }, corsHeaders);
      const subs = await stripe.subscriptions.list({ customer: org.stripe_customer_id, limit: 5 });
      return json({ subscriptions: subs.data }, corsHeaders);
    }

    // CANCEL STRIPE SUBSCRIPTION
    if (action === "stripe_cancel_sub") {
      const { subscription_id } = payload;
      const sub = await stripe.subscriptions.cancel(subscription_id);
      return json({ subscription: sub }, corsHeaders);
    }

    // RESUME / REACTIVATE STRIPE SUBSCRIPTION (create new checkout for org)
    if (action === "stripe_force_active") {
      const { org_id } = payload;
      await admin.from("organizations").update({ is_read_only: false }).eq("id", org_id);
      return json({ ok: true, note: "org unlocked (manual override)" }, corsHeaders);
    }

    // GLOBAL STATS
    if (action === "stats") {
      const [orgsRes, usersRes, todayUsageRes] = await Promise.all([
        admin.from("organizations").select("id", { count: "exact", head: true }),
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("ai_usage_daily").select("cost_estimate").eq("date", new Date().toISOString().split("T")[0]),
      ]);
      const todayCost = (todayUsageRes.data || []).reduce((s: number, r: { cost_estimate: number }) => s + r.cost_estimate, 0);
      return json({
        total_orgs: orgsRes.count,
        total_users: usersRes.count,
        ai_cost_today: todayCost.toFixed(4),
      }, corsHeaders);
    }

    // UPDATE USER ROLE
    if (action === "set_user_role") {
      const { user_id, role } = payload;
      // Update both: display cache (profiles) AND source of truth (user_roles)
      await Promise.all([
        admin.from("profiles").update({ role }).eq("id", user_id),
        admin.from("user_roles").upsert(
          { user_id, role },
          { onConflict: "user_id" }
        ),
      ]);
      return json({ ok: true }, corsHeaders);
    }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: corsHeaders,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(data: unknown, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
