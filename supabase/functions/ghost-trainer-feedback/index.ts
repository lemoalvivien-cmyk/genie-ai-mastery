import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      user_input,        // ce que l'utilisateur a produit/répondu
      mission_title,     // titre de la mission
      mission_type,      // quiz | action | reflexe
      score,             // 0-100
      context,           // contexte métier (persona, domaine)
    } = body;

    if (!user_input || !mission_title) {
      return new Response(JSON.stringify({ error: "user_input and mission_title are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es un coach IA expert en formation professionnelle à l'usage de l'IA au travail.
Ton rôle : analyser la production d'un apprenant après une mission et donner un feedback structuré, direct et actionnable.

RÈGLES STRICTES :
- Sois direct, précis, bienveillant mais pas complaisant
- Ne dis jamais "bravo, continue" sans contenu réel
- Donne toujours une version améliorée ou un exemple concret
- Le "prochain défi" doit être une action immédiatement réalisable
- Réponds en français, ton professionnel mais accessible

STRUCTURE DE RÉPONSE (JSON strict) :
{
  "strengths": "Ce qui est bien (1-2 points précis, max 2 phrases)",
  "weaknesses": "Ce qui peut être amélioré (1-2 points précis, max 2 phrases)",
  "improvement_tip": "Comment améliorer spécifiquement (conseil actionnable, max 3 phrases)",
  "improved_version": "Version améliorée ou exemple concret de ce que ça aurait pu donner (texte court)",
  "next_challenge": "Un mini-défi immédiatement réalisable pour progresser (1 phrase, verbe d'action)",
  "artifact_title": "Titre court pour sauvegarder cet artefact dans la bibliothèque (max 60 char)",
  "artifact_type": "prompt | checklist | synthese | reponse_amelioree | analyse"
}`;

    const userPrompt = `Mission : "${mission_title}" (type: ${mission_type ?? "action"})
Contexte : ${context ?? "Professionnel, usage IA au travail"}
Score obtenu : ${score ?? "non mesuré"}/100

Production de l'apprenant :
"""
${String(user_input).slice(0, 1500)}
"""

Analyse cette production et génère le feedback Ghost Trainer.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "ai_gateway_error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "{}";

    let feedback;
    try {
      feedback = JSON.parse(rawContent);
    } catch {
      return new Response(JSON.stringify({ error: "invalid_ai_response", raw: rawContent }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghost-trainer-feedback error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
