// ─── create-org-bootstrap — Edge Function ─────────────────────────────────────
// Crée une organisation ET attribue le rôle manager côté serveur.
// Remplace l'upsert client-side dans user_roles (qui était structurellement bancal).
//
// Auth requise : JWT valide.
// Body : { name: string; slug: string; seats_max: number }
// Retourne : { ok: true; org_id: string } | { ok: false; error: string }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

  try {
    // ── 1. Valider le JWT ────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: JSON_HEADERS,
      });
    }

    // Client avec le JWT de l'appelant pour valider l'identité
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: JSON_HEADERS,
      });
    }

    // ── 2. Parse et valider le body ──────────────────────────────────────────
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

    // ── 3. Déléguer à la RPC SECURITY DEFINER (côté serveur) ────────────────
    // La RPC valide auth.uid() == _user_id côté DB — pas de possibilité de proxy
    const { data, error: rpcErr } = await userClient.rpc("create_org_and_assign_manager", {
      _user_id:   user.id,
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
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: CORS_HEADERS },
    );
  }
});
