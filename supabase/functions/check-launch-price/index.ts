/**
 * check-launch-price — Edge Function
 * 
 * BLQ-3 : Les données de lancement (code promo, places restantes, statut actif)
 * sont maintenant servies depuis le serveur uniquement.
 * Aucun secret n'est exposé dans le bundle client.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://formetoialia.com",
  "https://www.formetoialia.com",
  "https://genie-ai-mastery.lovable.app", // legacy — backward compat
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".lovable.app") ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const isActive = Deno.env.get("LAUNCH_PRICE_ACTIVE") === "true";
  const deadline = Deno.env.get("LAUNCH_DEADLINE") ?? "2026-04-15T23:59:59Z";
  const spotsRemaining = parseInt(Deno.env.get("LAUNCH_SPOTS_REMAINING") ?? "23", 10);

  // Récupération dynamique des spots depuis la DB si possible
  let dynamicSpots = spotsRemaining;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "launch_spots_remaining")
      .single();
    if (data?.value && typeof data.value === "number") {
      dynamicSpots = data.value;
    }
  } catch {
    // Fallback silencieux sur la valeur env
  }

  return new Response(
    JSON.stringify({
      launch_price_active: isActive,
      launch_deadline: deadline,
      spots_remaining: dynamicSpots,
      // Le code promo N'EST JAMAIS retourné ici — il est validé côté serveur uniquement
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
