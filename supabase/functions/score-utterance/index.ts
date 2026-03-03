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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Verify user from token
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { utterance, assistant_reply, skill_ids, module_id } = await req.json();

    if (!utterance || !skill_ids?.length || !userId) {
      return new Response(JSON.stringify({ ok: false, reason: "missing_params" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Use service role for upsert
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch existing p_mastery values for these skills
    const { data: existing } = await supabaseService
      .from("skill_mastery")
      .select("skill_id, p_mastery")
      .eq("user_id", userId)
      .in("skill_id", skill_ids);

    const existingMap: Record<string, number> = {};
    (existing ?? []).forEach((row: { skill_id: string; p_mastery: number }) => {
      existingMap[row.skill_id] = row.p_mastery;
    });

    if (!lovableApiKey) {
      // Fallback: slight increment if user showed engagement
      for (const skillId of skill_ids) {
        const current = existingMap[skillId] ?? 0.1;
        const updated = Math.min(1.0, current + 0.03);
        await supabaseService.rpc("upsert_skill_mastery", {
          _user_id: userId,
          _skill_id: skillId,
          _p_mastery: updated,
        });
      }
      return new Response(JSON.stringify({ ok: true, method: "fallback" }), { headers: corsHeaders });
    }

    // Build prompt for LLM evaluation
    const systemPrompt = `Tu es un expert pédagogique. Analyse l'échange suivant entre un apprenant et son assistant IA.
Pour chaque skill_id fourni, évalue si l'apprenant démontre une COMPRÉHENSION ACTIVE (pas juste lire, mais comprendre et reformuler/appliquer).
Retourne un score de maîtrise pour chaque skill entre 0 (aucune maîtrise) et 1 (maîtrise totale).
Sois conservateur : donner 1.0 doit être exceptionnel. 0.8 = très bien compris. 0.5 = comprend les bases.
Le nouveau score doit tenir compte du score précédent (fourni). Il ne peut que progresser ou rester stable.`;

    const userPrompt = `Message apprenant: "${utterance}"
Réponse assistant: "${assistant_reply ?? ""}"
Skills à évaluer (skill_id: score_actuel): ${skill_ids.map((id: string) => `${id}: ${existingMap[id] ?? 0.1}`).join(", ")}
Retourne uniquement un JSON: {"scores": {"<skill_id>": <nouveau_score_float>, ...}}`;

    const llmResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!llmResponse.ok) {
      // Silently fail – don't block user
      console.error("LLM error", llmResponse.status);
      return new Response(JSON.stringify({ ok: false, reason: "llm_error" }), { headers: corsHeaders });
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content ?? "{}";

    // Extract JSON safely
    let scores: Record<string, number> = {};
    try {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        scores = parsed.scores ?? {};
      }
    } catch (_e) {
      console.error("JSON parse error", rawContent);
      return new Response(JSON.stringify({ ok: false, reason: "parse_error" }), { headers: corsHeaders });
    }

    // Upsert each skill mastery silently
    const updates: Array<{ skill_id: string; new_p: number }> = [];
    for (const skillId of skill_ids) {
      if (skillId in scores) {
        const newP = Math.min(1.0, Math.max(existingMap[skillId] ?? 0.1, scores[skillId]));
        await supabaseService.rpc("upsert_skill_mastery", {
          _user_id: userId,
          _skill_id: skillId,
          _p_mastery: newP,
        });
        updates.push({ skill_id: skillId, new_p: newP });
      }
    }

    // Check if module skills all at 100% → signal for auto-attestation
    if (module_id && updates.length > 0) {
      const { data: allMastery } = await supabaseService
        .from("skill_mastery")
        .select("p_mastery")
        .eq("user_id", userId)
        .in("skill_id", skill_ids);

      const allAt100 = allMastery?.length === skill_ids.length &&
        allMastery.every((m: { p_mastery: number }) => m.p_mastery >= 0.99);

      return new Response(
        JSON.stringify({ ok: true, updates, all_mastered: allAt100 }),
        { headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ ok: true, updates }), { headers: corsHeaders });
  } catch (err) {
    console.error("score-utterance error", err);
    // Always return 200 to not block user
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: corsHeaders,
    });
  }
});
