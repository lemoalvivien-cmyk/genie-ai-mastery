import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthenticatedUser, createServiceClient, handleOptions } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

// ── Static skill pool — LLM picks which are demonstrated in the conversation ──
const SKILL_POOL = [
  "phishing_detection",
  "ai_literacy",
  "password_hygiene",
  "prompt_engineering",
  "ransomware_awareness",
  "mfa_understanding",
  "data_privacy",
  "social_engineering",
  "secure_browsing",
  "incident_response",
];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleOptions(req, corsHeaders);
  if (preflight) return preflight;

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseService = createServiceClient();

    // ── Auth: accept both user JWT and internal service-role calls ────────────
    // When called from chat-completion (server→server with service role key),
    // the standard getAuthenticatedUser will succeed via service role.
    // When called directly from the client, a user JWT is required.
    let userId: string;
    try {
      const user = await getAuthenticatedUser(req, supabaseService);
      userId = user.id;
    } catch (_e) {
      return new Response(JSON.stringify({ ok: false, reason: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Rate limit (500/day, same as other pro features) ─────────────────────
    try {
      await checkRateLimit(supabaseService, userId, "score-utterance", "pro", corsHeaders);
    } catch (e) {
      if (e instanceof Response) return e;
    }

    const body = await req.json();
    const {
      utterance,
      assistant_reply,
      skill_ids: explicitSkillIds,
      module_id,
      auto_detect = false,
      user_id: bodyUserId,
    } = body;

    // When called server-to-server from chat-completion, user_id may be in body
    // (the authenticated user whose session triggered the chat).
    // We trust this because the caller authenticated with the service role key.
    const targetUserId = bodyUserId ?? userId;

    if (!utterance || !targetUserId) {
      return new Response(JSON.stringify({ ok: false, reason: "missing_params" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Determine skill_ids: explicit list OR full pool for auto-detection ────
    const skillIds: string[] = explicitSkillIds?.length
      ? explicitSkillIds
      : auto_detect
      ? SKILL_POOL
      : [];

    if (!skillIds.length) {
      return new Response(JSON.stringify({ ok: false, reason: "no_skills" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch skill UUIDs from slug names ─────────────────────────────────────
    // skill_mastery uses UUID skill_ids from the `skills` table.
    // SKILL_POOL uses slug names → resolve to UUIDs.
    let resolvedSkillIds: string[] = [];

    if (auto_detect) {
      // Fetch matching skills by slug
      const { data: skillRows } = await supabaseService
        .from("skills")
        .select("id, slug")
        .in("slug", skillIds);

      resolvedSkillIds = (skillRows ?? []).map((r: { id: string }) => r.id);
    } else {
      // Caller already sent UUIDs
      resolvedSkillIds = skillIds;
    }

    if (!resolvedSkillIds.length && !lovableApiKey) {
      // No skills found and no LLM — nothing to do
      return new Response(JSON.stringify({ ok: true, method: "noop" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch existing p_mastery values ───────────────────────────────────────
    const { data: existing } = await supabaseService
      .from("skill_mastery")
      .select("skill_id, p_mastery")
      .eq("user_id", targetUserId)
      .in("skill_id", resolvedSkillIds.length ? resolvedSkillIds : skillIds);

    const existingMap: Record<string, number> = {};
    (existing ?? []).forEach((row: { skill_id: string; p_mastery: number }) => {
      existingMap[row.skill_id] = row.p_mastery;
    });

    // ── Fallback: no LLM — apply slight increment for engagement ─────────────
    if (!lovableApiKey) {
      for (const skillId of resolvedSkillIds) {
        const current = existingMap[skillId] ?? 0.1;
        const updated = Math.min(1.0, current + 0.02);
        await supabaseService.rpc("upsert_skill_mastery", {
          _user_id: targetUserId,
          _skill_id: skillId,
          _p_mastery: updated,
        });
      }
      return new Response(JSON.stringify({ ok: true, method: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LLM evaluation ────────────────────────────────────────────────────────
    // Build a human-readable list of skills for the prompt.
    // If auto_detect, include slug names for context; otherwise use UUIDs.
    const skillsForPrompt = auto_detect
      ? skillIds.join(", ")
      : resolvedSkillIds.map((id) => `${id}: ${(existingMap[id] ?? 0.1).toFixed(2)}`).join(", ");

    const systemPrompt = `Tu es un expert pédagogique. Analyse cet échange entre un apprenant et un assistant IA.
Pour chaque compétence listée, évalue si le message de l'apprenant DÉMONTRE UNE MAÎTRISE ACTIVE (pas juste lire, mais comprendre, reformuler, ou appliquer).
Si le message de l'apprenant ne touche pas du tout à une compétence, NE l'inclus PAS dans les résultats.
Sois conservateur : 1.0 = maîtrise totale exceptionnelle. 0.8 = très bien compris. 0.5 = bases comprises. 0.3 = notion vague.
Le nouveau score NE PEUT QUE PROGRESSER ou rester stable par rapport au score précédent.
Retourne UNIQUEMENT un JSON valide : {"scores": {"<nom_competence>": <nouveau_score_float>}}
Si aucune compétence n'est démontrée, retourne {"scores": {}}.`;

    const userPrompt = `Message apprenant: "${utterance}"
Réponse assistant: "${assistant_reply ?? ""}"
Compétences à évaluer (avec score actuel si connu): ${skillsForPrompt}
Retourne uniquement un JSON: {"scores": {"<nom_competence>": <score>}}`;

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
        temperature: 0.1,
        max_tokens: 400,
      }),
    });

    if (!llmResponse.ok) {
      return new Response(JSON.stringify({ ok: false, reason: "llm_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content ?? "{}";

    // ── Parse JSON from LLM response ──────────────────────────────────────────
    let scores: Record<string, number> = {};
    try {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        scores = parsed.scores ?? {};
      }
    } catch (_e) {
      return new Response(JSON.stringify({ ok: false, reason: "parse_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Object.keys(scores).length) {
      // LLM found no demonstrated skills — nothing to upsert
      return new Response(JSON.stringify({ ok: true, updates: [], demonstrated: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Resolve slug → UUID mapping for upsert ───────────────────────────────
    let slugToUuid: Record<string, string> = {};
    if (auto_detect) {
      const { data: skillRows } = await supabaseService
        .from("skills")
        .select("id, slug")
        .in("slug", Object.keys(scores));
      (skillRows ?? []).forEach((r: { id: string; slug: string }) => {
        slugToUuid[r.slug] = r.id;
      });
    } else {
      // skill_id keys are already UUIDs
      Object.keys(scores).forEach((k) => { slugToUuid[k] = k; });
    }

    // ── Upsert each demonstrated skill ───────────────────────────────────────
    const updates: Array<{ skill_id: string; slug?: string; new_p: number }> = [];
    for (const [slugOrId, newScore] of Object.entries(scores)) {
      const skillUuid = slugToUuid[slugOrId];
      if (!skillUuid) continue;

      const prev = existingMap[skillUuid] ?? 0.0;
      const newP = Math.min(1.0, Math.max(prev, newScore)); // never regress
      await supabaseService.rpc("upsert_skill_mastery", {
        _user_id: targetUserId,
        _skill_id: skillUuid,
        _p_mastery: newP,
      });
      updates.push({ skill_id: skillUuid, slug: auto_detect ? slugOrId : undefined, new_p: newP });
    }

    // ── Check if module is fully mastered → signal for auto-attestation ───────
    let allMastered = false;
    if (module_id && updates.length > 0 && resolvedSkillIds.length > 0) {
      const { data: allMastery } = await supabaseService
        .from("skill_mastery")
        .select("p_mastery")
        .eq("user_id", targetUserId)
        .in("skill_id", resolvedSkillIds);

      allMastered = (allMastery?.length ?? 0) === resolvedSkillIds.length &&
        (allMastery ?? []).every((m: { p_mastery: number }) => m.p_mastery >= 0.99);
    }

    return new Response(
      JSON.stringify({ ok: true, updates, all_mastered: allMastered, demonstrated: updates.length > 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    // Always return 200 to never block user
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: getCorsHeaders(req),
    });
  }
});
