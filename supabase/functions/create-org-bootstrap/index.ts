// ─── create-org-bootstrap v2.0 — Secured · Audited · Rate-limited ─────────────
// Auth: getUser() réseau (verify_jwt=true) — plus de getClaims() local.
// Security: rate-limit 10 req/heure + audit_log sur chaque appel.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Rate limiting (in-memory, 10 créations d'org/heure par user) ──────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxPerHour = 10): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  if (entry.count >= maxPerHour) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // ── 1. Auth: getUser() réseau — source de vérité ─────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: JSON_HEADERS,
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: JSON_HEADERS,
      });
    }

    const userId = user.id;

    // ── 2. Rate limiting ───────────────────────────────────────────────────────
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ ok: false, error: "Too many requests" }), {
        status: 429, headers: JSON_HEADERS,
      });
    }

    // ── 3. Parse et valider le body ────────────────────────────────────────────
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const seatsMax = typeof body.seats_max === "number" ? body.seats_max : 5;

    if (!name || name.length < 2 || name.length > 120) {
      return new Response(
        JSON.stringify({ ok: false, error: "Nom d'organisation invalide (2–120 caractères)" }),
        { status: 400, headers: JSON_HEADERS },
      );
    }
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Slug invalide" }),
        { status: 400, headers: JSON_HEADERS },
      );
    }
    if (seatsMax < 1 || seatsMax > 10000) {
      return new Response(
        JSON.stringify({ ok: false, error: "seats_max hors limites (1–10000)" }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    // ── 4. Audit log — appel tracé avant exécution ──────────────────────────
    const ipHash = req.headers.get("x-forwarded-for") ?? "unknown";
    try {
      await userClient.from("audit_logs").insert({
        user_id: userId,
        action: "org_bootstrap",
        event_type: "org_bootstrap",
        resource_type: "organization",
        details: { name, slug, seats_max: seatsMax },
        ip_address: ipHash,
      });
    } catch (_e) { /* never fail the main flow */ }

    // ── 5. Déléguer à la RPC SECURITY DEFINER ────────────────────────────────
    const { data, error: rpcErr } = await userClient.rpc("create_org_and_assign_manager", {
      _user_id:   userId,
      _name:      name,
      _slug:      slug,
      _seats_max: seatsMax,
    });

    if (rpcErr) {
      return new Response(
        JSON.stringify({ ok: false, error: rpcErr.message }),
        { status: 500, headers: JSON_HEADERS },
      );
    }

    const result = data as { ok: boolean; error?: string; org_id?: string };

    if (!result.ok) {
      const status = result.error?.includes("already") ? 409 : 400;
      return new Response(
        JSON.stringify({ ok: false, error: result.error }),
        { status, headers: JSON_HEADERS },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, org_id: result.org_id }),
      { status: 200, headers: JSON_HEADERS },
    );
  } catch (err) {
    const origin2 = req.headers.get("origin");
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...getCorsHeaders(origin2), "Content-Type": "application/json" } },
    );
  }
});
