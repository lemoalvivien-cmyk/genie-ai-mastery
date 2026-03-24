import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────
type ExerciseType = "quiz" | "lab" | "ransomware_sim" | "phishing_text" | "code_audit";

interface Exercise {
  id: string;
  type: ExerciseType;
  difficulty: "debutant" | "intermediaire" | "expert" | "apex";
  question: string;
  options?: string[]; // for quiz / phishing
  correct?: number | string; // index for quiz, text for open
  explanation: string;
  sarcasm_comment: string;
  ttp_reference: string; // MITRE ATT&CK TTP
  time_limit_seconds: number;
  apex_predator_mode: boolean;
  chain_of_thought: {
    module_context: string;
    stress_level: string;
    current_ttps: string;
    feedback_angle: string;
  };
}

interface ScoredResult {
  exercise_id: string;
  score: number; // 0-100
  is_correct: boolean;
  explanation: string;
  sarcasm_comment: string;
  joke: string;
  skill_delta: number; // +/- mastery delta
  next_step: string;
}

// ── AI call ───────────────────────────────────────────────────────────────────
async function callAI(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 1000,
): Promise<string> {
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content ?? "";
}

function parseJSON<T>(raw: string): T | null {
  try {
    const c = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
    return JSON.parse(c) as T;
  } catch {
    return null;
  }
}

// ── Exercise generation ───────────────────────────────────────────────────────
async function generateExercise(
  moduleTitle: string,
  moduleDomain: string,
  userLevel: number,
  pastErrors: string[],
  exerciseType: ExerciseType,
  apexMode: boolean,
): Promise<Exercise> {
  const stressEmoji = userLevel >= 4 ? "🔥" : userLevel >= 2 ? "⚡" : "🌱";
  const difficulty = apexMode ? "apex" : userLevel <= 1 ? "debutant" : userLevel <= 3 ? "intermediaire" : "expert";

  const systemPrompt = `Tu es l'Agent Adversarial Exercise Generator de Formetoialia — style Tony Stark + Deadpool.
Tu génères des exercices de cybersécurité / IA réalistes basés sur des TTPs MITRE réels.

CHAÎNE DE PENSÉE OBLIGATOIRE :
1. MODULE CONTEXT : Analyse le module et son domaine
2. STRESS LEVEL : Adapte la difficulté au niveau de stress ${stressEmoji} (niveau ${userLevel}/5)  
3. CURRENT TTPs : Injecte les vraies tactiques d'attaque du moment (MITRE ATT&CK 2024-2025)
4. FEEDBACK POSITIF : Prépare un commentaire sarcastique mais bienveillant

${apexMode ? "⚠️ MODE APEX PREDATOR ACTIVÉ : Difficulté maximale. Aucune pitié. Exercice inspiré d'une vraie attaque APT récente." : ""}

TYPES D'EXERCICES :
- quiz : QCM 4 options sur concept cyber/IA
- lab : Étape pratique guidée avec instructions précises
- ransomware_sim : Scénario d'incident ransomware à résoudre
- phishing_text : Analyser un email/SMS suspect (texte fourni dans la question)
- code_audit : Analyser un snippet de code pour trouver la vulnérabilité

FORMAT : JSON valide UNIQUEMENT (sans markdown) :
{
  "id": "ex_[timestamp]",
  "type": "${exerciseType}",
  "difficulty": "${difficulty}",
  "question": "...",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct": 0,
  "explanation": "...",
  "sarcasm_comment": "commentaire style Deadpool bienveillant...",
  "ttp_reference": "T1566.001 — Spearphishing Attachment",
  "time_limit_seconds": 60,
  "apex_predator_mode": ${apexMode},
  "chain_of_thought": {
    "module_context": "...",
    "stress_level": "...",
    "current_ttps": "...",
    "feedback_angle": "..."
  }
}

Pour ransomware_sim et lab : "options" = étapes ordonnées à choisir, "correct" = index de la meilleure première action.
Pour phishing_text : inclure dans "question" un vrai email de phishing simulé complet.`;

  const userMsg = `Module : "${moduleTitle}" (domaine: ${moduleDomain})
Niveau utilisateur : ${userLevel}/5
Erreurs passées : ${pastErrors.length > 0 ? pastErrors.join(", ") : "aucune erreur récente"}
Type d'exercice demandé : ${exerciseType}
Mode Apex Predator : ${apexMode}

Génère l'exercice adversarial maintenant.`;

  const raw = await callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMsg },
  ]);

  const ex = parseJSON<Exercise>(raw);
  if (!ex || !ex.question) throw new Error("Invalid exercise from AI");

  return {
    ...ex,
    id: `ex_${Date.now()}`,
    apex_predator_mode: apexMode,
  };
}

// ── Scoring / Feedback ────────────────────────────────────────────────────────
async function scoreAnswer(
  exercise: Exercise,
  userAnswer: string | number,
  timeTaken: number,
): Promise<ScoredResult> {
  const isCorrect = String(userAnswer) === String(exercise.correct);
  const timeBonus = timeTaken < exercise.time_limit_seconds * 0.5 ? 10 : 0;
  const baseScore = isCorrect ? 80 + timeBonus : 20;

  // Ask AI for personalized feedback + joke
  const feedbackPrompt = `L'utilisateur a répondu "${userAnswer}" à cet exercice.
Réponse correcte : "${exercise.correct}"
C'est ${isCorrect ? "CORRECT ✅" : "INCORRECT ❌"}.
Exercice : ${exercise.question}
Explication : ${exercise.explanation}

Génère en JSON :
{
  "feedback": "explication pédagogique en 2 phrases max",
  "joke": "blague légère style Deadpool en rapport avec le sujet (max 1 phrase)",
  "next_step": "quelle compétence travailler ensuite (1 phrase)"
}`;

  const raw = await callAI([{ role: "user", content: feedbackPrompt }], 400);
  const feedback = parseJSON<{ feedback: string; joke: string; next_step: string }>(raw) ?? {
    feedback: exercise.explanation,
    joke: isCorrect
      ? "Même Tony Stark t'envierait. Presque."
      : "JARVIS dit : erreur enregistrée. On va corriger ça ensemble.",
    next_step: "Continuer sur ce module",
  };

  return {
    exercise_id: exercise.id,
    score: Math.min(100, Math.max(0, baseScore)),
    is_correct: isCorrect,
    explanation: feedback.feedback,
    sarcasm_comment: exercise.sarcasm_comment,
    joke: feedback.joke,
    skill_delta: isCorrect ? 0.05 : -0.02,
    next_step: feedback.next_step,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const {
    action = "generate",
    module_title = "Introduction à la cybersécurité IA",
    module_domain = "cyber",
    module_slug,
    exercise_type = "quiz" as ExerciseType,
    apex_mode = false,
    exercise, // for scoring action
    user_answer,
    time_taken = 30,
  } = body as {
    action?: "generate" | "score";
    module_title?: string;
    module_domain?: string;
    module_slug?: string;
    exercise_type?: ExerciseType;
    apex_mode?: boolean;
    exercise?: Exercise;
    user_answer?: string | number;
    time_taken?: number;
  };

  // ── Fetch user context in parallel ───────────────────────────────────────
  const [profileRes, errorsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("level, persona")
      .eq("id", user.id)
      .maybeSingle(),

    // Past errors from quiz progress with low scores
    supabase
      .from("progress")
      .select("score, modules(title, domain)")
      .eq("user_id", user.id)
      .lt("score", 60)
      .not("score", "is", null)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const userLevel = (profileRes.data?.level as number) ?? 1;
  const pastErrors = (errorsRes.data ?? [])
    .map((p) => (p.modules as { title?: string } | null)?.title ?? "")
    .filter(Boolean)
    .slice(0, 3);

  if (action === "generate") {
    try {
      const ex = await generateExercise(
        module_title,
        module_domain,
        userLevel,
        pastErrors,
        exercise_type,
        apex_mode,
      );

      // Log brain event
      supabase.from("brain_events").insert({
        user_id: user.id,
        event_type: "adversarial_exercise_generated",
        metadata: {
          exercise_type,
          module_slug: module_slug ?? null,
          difficulty: ex.difficulty,
          apex_mode,
        },
      }).then(() => {});

      return new Response(JSON.stringify(ex), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (action === "score" && exercise && user_answer !== undefined) {
    try {
      const result = await scoreAnswer(exercise, user_answer, time_taken);

      // Update skill mastery if skill data available
      if (module_slug) {
        await supabase.rpc("log_event", {
          _user_id: user.id,
          _event_type: "adversarial_exercise_scored",
          _details: {
            module_slug,
            score: result.score,
            is_correct: result.is_correct,
            exercise_type: exercise.type,
          },
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
