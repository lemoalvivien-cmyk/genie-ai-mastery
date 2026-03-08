/**
 * _shared/auth.ts — Middleware d'authentification centralisé
 *
 * Exports :
 *  - getAuthenticatedUser()  → valide le JWT via getUser() (réseau, pas local)
 *  - requireAdmin()          → vérifie le rôle 'admin' via user_roles (source de vérité RBAC)
 *  - requireRole()           → vérifie un rôle arbitraire via user_roles
 *  - handleOptions()         → répond aux preflight CORS OPTIONS
 *  - withAuth()              → wrapper try/catch complet pour un handler authentifié
 *  - createServiceClient()   → client Supabase avec la service role key
 *
 * Sécurité :
 *  - Utilise TOUJOURS getUser() côté serveur (vérification réseau) — jamais getClaims() seul
 *  - Le rôle admin est lu dans user_roles, pas dans profiles.role (anti-escalade de privilèges)
 *  - Ne logue jamais le JWT en clair
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "./cors.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email?: string;
};

export type AuthHandler = (
  req: Request,
  user: AuthUser,
  supabase: SupabaseClient,
) => Promise<Response>;

// ─── Client factory ──────────────────────────────────────────────────────────

/**
 * Crée un client Supabase avec la service role key.
 * À utiliser pour les opérations qui nécessitent un accès élevé (bypass RLS).
 */
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/**
 * Crée un client Supabase scopé au JWT de l'utilisateur.
 * Les requêtes respecteront les RLS policies.
 */
export function createUserScopedClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

// ─── Auth primitives ─────────────────────────────────────────────────────────

/**
 * Extrait et valide le JWT depuis le header Authorization.
 * Utilise getUser() (vérification réseau côté serveur) — source de vérité.
 *
 * @throws Response 401 si le token est absent ou invalide
 */
export async function getAuthenticatedUser(
  req: Request,
  supabase: SupabaseClient,
): Promise<AuthUser> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized", code: "missing_token" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized", code: "invalid_token" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  return { id: user.id, email: user.email };
}

/**
 * Vérifie qu'un utilisateur possède le rôle admin dans user_roles.
 * Source de vérité RBAC — ne pas utiliser profiles.role (cache display uniquement).
 *
 * @throws Response 403 si l'utilisateur n'est pas admin
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!data) {
    throw new Response(
      JSON.stringify({ error: "Forbidden", code: "insufficient_role" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
}

/**
 * Vérifie qu'un utilisateur possède l'un des rôles spécifiés dans user_roles.
 *
 * @throws Response 403 si aucun des rôles requis n'est présent
 */
export async function requireRole(
  supabase: SupabaseClient,
  userId: string,
  roles: string[],
): Promise<void> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", roles)
    .maybeSingle();

  if (!data) {
    throw new Response(
      JSON.stringify({
        error: "Forbidden",
        code: "insufficient_role",
        required: roles,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
}

// ─── CORS / Options handler ───────────────────────────────────────────────────

/**
 * Répond immédiatement aux requêtes OPTIONS (preflight CORS).
 * Retourne null si la méthode n'est pas OPTIONS (le handler principal doit continuer).
 */
export function handleOptions(
  req: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// ─── withAuth wrapper ─────────────────────────────────────────────────────────

/**
 * Wrapper complet qui :
 *  1. Gère les OPTIONS preflight
 *  2. Crée le client Supabase service-role
 *  3. Authentifie l'utilisateur via getUser()
 *  4. Passe (req, user, supabase) au handler métier
 *  5. Attrape les Response throwées (401, 403, 429...) et les renvoie telles quelles
 *  6. Attrape les erreurs inattendues et retourne 500
 *
 * Usage :
 * ```ts
 * Deno.serve(withAuth(async (req, user, supabase) => {
 *   // Votre logique ici
 *   return new Response("ok");
 * }));
 * ```
 */
export function withAuth(handler: AuthHandler): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(req);

    // Handle preflight
    const preflight = handleOptions(req, corsHeaders);
    if (preflight) return preflight;

    try {
      const supabase = createServiceClient();
      const user = await getAuthenticatedUser(req, supabase);
      return await handler(req, user, supabase);
    } catch (e) {
      // Re-throw Responses (401, 403, 429, etc.) with CORS headers
      if (e instanceof Response) {
        const body = await e.text();
        return new Response(body, {
          status: e.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      // Unexpected errors → 500
      console.error("[withAuth] Unexpected error:", e);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  };
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Construit une Response JSON avec CORS headers.
 */
export function jsonResponse(
  data: unknown,
  status = 200,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
