/**
 * _shared/cron-auth.ts
 *
 * Utilitaire d'authentification pour les Edge Functions déclenchées par cron.
 * Vérifie le header X-CRON-SECRET contre la variable d'environnement CRON_SECRET.
 *
 * Usage :
 *   import { verifyCronSecret } from "../_shared/cron-auth.ts";
 *   verifyCronSecret(req); // lève une Response 401 si invalide
 */

/**
 * Vérifie que le header `X-CRON-SECRET` correspond à la variable d'env `CRON_SECRET`.
 * Lance une `Response` (401) si la vérification échoue — à attraper avec un try/catch
 * ou à laisser remonter directement depuis le handler.
 *
 * @throws {Response} 401 Unauthorized si le secret est absent ou incorrect
 */
export function verifyCronSecret(req: Request): void {
  const secret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");

  if (!secret || provided !== secret) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized: invalid or missing CRON_SECRET" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
