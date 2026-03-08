import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthenticatedUser, createServiceClient, handleOptions } from "../_shared/auth.ts";
import { requireProPlan } from "../_shared/subscription.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleOptions(req, corsHeaders);
  if (preflight) return preflight;

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabaseService = createServiceClient();
    const user = await getAuthenticatedUser(req, supabaseService);
    const userId = user.id;

    // ── Plan check: skill scoring is Pro-only ─────────────────────────────────
    try {
      await requireProPlan(supabaseService, userId, corsHeaders);
    } catch (e) {
      if (e instanceof Response) return e;
      throw e;
    }

    const { utterance, assistant_reply, skill_ids, module_id } = await req.json();

    if (!utterance || !skill_ids?.length || !userId) {
      return new Response(JSON.stringify({ ok: false, reason: "missing_params" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Already created above with service role

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
    // Always return 200 to not block user
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: getCorsHeaders(req),
    });
  }
});
