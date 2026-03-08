/**
 * admin-operations — Panneau d'administration sécurisé
 *
 * Sécurité :
 *  - verify_jwt = true dans config.toml  → Supabase vérifie le JWT avant d'atteindre ce code
 *  - Vérification du rôle 'admin' via user_roles (source de vérité RBAC)
 *  - Rate limit : 30 appels / heure / userId (stocké en mémoire + audit_logs)
 *  - Audit log systématique sur chaque action réussie
 *  - CORS dynamique via _shared/cors.ts
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Rate limiting (in-memory, par userId) ──────────────────────────────────
// Suffisant pour un panneau admin à faible trafic.
// Pour une solution distribuée : utiliser la table ip_rate_limits.
interface RateBucket {
  count: number;
  windowStart: number;
}
const rateBuckets = new Map<string, RateBucket>();

const RATE_LIMIT = { max: 30, windowMs: 3_600_000 }; // 30 appels/heure/userId

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);

  if (!bucket || now - bucket.windowStart > RATE_LIMIT.windowMs) {
    // Nouvelle fenêtre
    rateBuckets.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (bucket.count >= RATE_LIMIT.max) {
    const retryAfter = Math.ceil((RATE_LIMIT.windowMs - (now - bucket.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }

  bucket.count++;
  return { allowed: true };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth (JWT déjà validé par verify_jwt = true dans config.toml) ──────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  // Service-role client pour les opérations admin
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Récupération du user via getUser() côté serveur (source de vérité)
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  const userId = user.id;

  // ── Rate limit ──────────────────────────────────────────────────────────
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests", retry_after_seconds: rateCheck.retryAfter }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(rateCheck.retryAfter ?? 3600),
        },
      }
    );
  }

  // ── Vérification rôle admin via user_roles ──────────────────────────────
  const { data: roleData } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return json({ error: "Forbidden" }, 403, corsHeaders);
  }

  let body: { action: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const { action, payload } = body;
  if (!action) {
    return json({ error: "Missing action" }, 400, corsHeaders);
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  // Helper : audit log après chaque action réussie
  async function auditLog(operation: string, target?: Record<string, unknown>) {
    try {
      await admin.from("audit_logs").insert({
        user_id: userId,
        action: "admin-operation",
        resource_type: "admin",
        details: { operation, target: target ?? {} },
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[admin-operations] audit_log error:", e);
    }
  }

  // ── Route actions ───────────────────────────────────────────────────────
  try {
    // LIST ALL ORGS
    if (action === "list_orgs") {
      const { data } = await admin
        .from("organizations")
        .select("id, name, slug, plan, seats_used, seats_max, is_read_only, stripe_subscription_id, created_at")
        .order("created_at", { ascending: false });
      await auditLog("list_orgs");
      return json({ orgs: data }, 200, corsHeaders);
    }

    // LIST ALL USERS
    if (action === "list_users") {
      const { data } = await admin
        .from("profiles")
        .select("id, email, full_name, role, org_id, level, onboarding_completed, created_at, last_active_at, abuse_score")
        .order("created_at", { ascending: false })
        .limit(200);
      await auditLog("list_users");
      return json({ users: data }, 200, corsHeaders);
    }

    // LIST AI BUDGETS
    if (action === "list_budgets") {
      const { data } = await admin
        .from("ai_budgets")
        .select("org_id, daily_limit, used_today, is_blocked, reset_date, updated_at")
        .order("updated_at", { ascending: false });
      await auditLog("list_budgets");
      return json({ budgets: data }, 200, corsHeaders);
    }

    // UPDATE AI BUDGET
    if (action === "update_budget") {
      const { org_id, daily_limit } = (payload ?? {}) as { org_id?: string; daily_limit?: number };
      if (!org_id || daily_limit == null) throw new Error("Missing org_id or daily_limit");
      await admin
        .from("ai_budgets")
        .upsert({ org_id, daily_limit, is_blocked: false, used_today: 0, reset_date: new Date().toISOString().split("T")[0] });
      await auditLog("update_budget", { org_id, daily_limit });
      return json({ ok: true }, 200, corsHeaders);
    }

    // RESET BUDGET (unblock)
    if (action === "reset_budget") {
      const { org_id } = (payload ?? {}) as { org_id?: string };
      if (!org_id) throw new Error("Missing org_id");
      await admin.from("ai_budgets").update({ is_blocked: false, used_today: 0 }).eq("org_id", org_id);
      await auditLog("reset_budget", { org_id });
      return json({ ok: true }, 200, corsHeaders);
    }

    // TOGGLE ORG READ-ONLY
    if (action === "toggle_readonly") {
      const { org_id, is_read_only } = (payload ?? {}) as { org_id?: string; is_read_only?: boolean };
      if (!org_id || is_read_only == null) throw new Error("Missing org_id or is_read_only");
      await admin.from("organizations").update({ is_read_only }).eq("id", org_id);
      await auditLog("toggle_readonly", { org_id, is_read_only });
      return json({ ok: true }, 200, corsHeaders);
    }

    // SET ORG PLAN
    if (action === "set_plan") {
      const { org_id, plan } = (payload ?? {}) as { org_id?: string; plan?: string };
      if (!org_id || !plan) throw new Error("Missing org_id or plan");
      await admin.from("organizations").update({ plan }).eq("id", org_id);
      await auditLog("set_plan", { org_id, plan });
      return json({ ok: true }, 200, corsHeaders);
    }

    // LIST STRIPE SUBSCRIPTIONS for an org
    if (action === "stripe_list_subs") {
      const { org_id } = (payload ?? {}) as { org_id?: string };
      if (!org_id) throw new Error("Missing org_id");
      const { data: org } = await admin
        .from("organizations")
        .select("stripe_customer_id, stripe_subscription_id")
        .eq("id", org_id)
        .single();
      if (!org?.stripe_customer_id) return json({ subscriptions: [] }, 200, corsHeaders);
      const subs = await stripe.subscriptions.list({ customer: org.stripe_customer_id, limit: 5 });
      await auditLog("stripe_list_subs", { org_id });
      return json({ subscriptions: subs.data }, 200, corsHeaders);
    }

    // CANCEL STRIPE SUBSCRIPTION
    if (action === "stripe_cancel_sub") {
      const { subscription_id } = (payload ?? {}) as { subscription_id?: string };
      if (!subscription_id) throw new Error("Missing subscription_id");
      const sub = await stripe.subscriptions.cancel(subscription_id);
      await auditLog("stripe_cancel_sub", { subscription_id });
      return json({ subscription: sub }, 200, corsHeaders);
    }

    // FORCE ACTIVE (manual override)
    if (action === "stripe_force_active") {
      const { org_id } = (payload ?? {}) as { org_id?: string };
      if (!org_id) throw new Error("Missing org_id");
      await admin.from("organizations").update({ is_read_only: false }).eq("id", org_id);
      await auditLog("stripe_force_active", { org_id });
      return json({ ok: true, note: "org unlocked (manual override)" }, 200, corsHeaders);
    }

    // GLOBAL STATS
    if (action === "stats") {
      const [orgsRes, usersRes, todayUsageRes] = await Promise.all([
        admin.from("organizations").select("id", { count: "exact", head: true }),
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("ai_usage_daily").select("cost_estimate").eq("date", new Date().toISOString().split("T")[0]),
      ]);
      const todayCost = (todayUsageRes.data || []).reduce(
        (s: number, r: { cost_estimate: number }) => s + r.cost_estimate, 0
      );
      await auditLog("stats");
      return json({
        total_orgs: orgsRes.count,
        total_users: usersRes.count,
        ai_cost_today: todayCost.toFixed(4),
      }, 200, corsHeaders);
    }

    // UPDATE USER ROLE
    if (action === "set_user_role") {
      const { user_id, role } = (payload ?? {}) as { user_id?: string; role?: string };
      if (!user_id || !role) throw new Error("Missing user_id or role");
      await Promise.all([
        admin.from("profiles").update({ role }).eq("id", user_id),
        admin.from("user_roles").upsert({ user_id, role }, { onConflict: "user_id" }),
      ]);
      await auditLog("set_user_role", { user_id, role });
      return json({ ok: true }, 200, corsHeaders);
    }

    return json({ error: "Unknown action" }, 400, corsHeaders);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin-operations] error:", msg);
    return json({ error: msg }, 500, corsHeaders);
  }
});

function json(data: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
