import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2, ChevronRight, RotateCcw, Trophy, Download,
  Loader2, Star, Sparkles, FileText, CheckCircle2,
  Brain, Target, AlignLeft, Layout,
} from "lucide-react";

// ─── Contexts ─────────────────────────────────────────────────────────────────

interface PromptContext {
  id: string;
  role: string;
  task: string;
  hint: string;
  example: string;
}

const PROMPT_CONTEXTS: PromptContext[] = [
  {
    id: "hr_job_posting",
    role: "Responsable RH",
    task: "Rédigez un prompt pour générer une fiche de poste pour un développeur Full Stack senior.",
    hint: "Pensez au contexte (type d'entreprise), au format attendu (sections), et aux contraintes (ton, longueur).",
    example: "Génère une fiche de poste pour un développeur Full Stack senior dans une startup SaaS B2B de 50 personnes. Inclure : missions clés, stack technique, soft skills, avantages. Ton : dynamique et humain. Longueur : 400 mots.",
  },
  {
    id: "marketing_email",
    role: "Responsable Marketing",
    task: "Rédigez un prompt pour générer un email de relance client après 30 jours d'inactivité.",
    hint: "Précisez le ton, le produit, le segment client, la CTA et la longueur maximale.",
    example: "Écris un email de relance pour des clients B2B d'un logiciel de gestion RH inactifs depuis 30 jours. Ton : chaleureux et utile (pas commercial). CTA : reprendre leur essai gratuit. Maximum 120 mots. Objet accrocheur inclus.",
  },
  {
    id: "data_analysis",
    role: "Analyste Data",
    task: "Rédigez un prompt pour obtenir une analyse de données de ventes mensuelle au format structuré.",
    hint: "Spécifiez les données d'entrée, le format de sortie (tableau, bullet points), les KPIs voulus.",
    example: "Analyse ces données de ventes mensuelles [données]. Fournis : 1) Top 3 tendances, 2) Anomalies détectées, 3) Recommandations actionnables. Format : 3 sections avec titre, bullet points, et une conclusion en 2 phrases.",
  },
];

// ─── Evaluation parsing ────────────────────────────────────────────────────────

interface Evaluation {
  score: number;
  strengths: string[];
  improved: string;
  raw: string;
}

function parseEvaluation(raw: string): Evaluation {
  // Extract score /20
  const scoreMatch = raw.match(/(?:score|note)\s*[:=]?\s*(\d+)\s*\/\s*20/i) ||
    raw.match(/(\d+)\s*\/\s*20/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

  // Extract strengths (look for points forts section)
  const strengthsMatch = raw.match(/points?\s+forts?\s*[:]\s*([\s\S]*?)(?=version\s+am[eé]lior[eé]e|amélioration|$)/i);
  let strengths: string[] = [];
  if (strengthsMatch) {
    strengths = strengthsMatch[1]
      .split(/\n|[-–•]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, 4);
  }

  // Extract improved prompt
  const improvedMatch = raw.match(/version\s+am[eé]lior[eé]e\s*[:]\s*([\s\S]*?)(?=\n\n|$)/i) ||
    raw.match(/prompt\s+am[eé]lior[eé]\s*[:]\s*([\s\S]*?)(?=\n\n|$)/i);
  const improved = improvedMatch ? improvedMatch[1].trim() : "";

  return { score, strengths, improved, raw };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PromptLab() {
  const { profile } = useAuth();
  const [contextIndex, setContextIndex] = useState(0);
  const [userPrompt, setUserPrompt] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [proofSaved, setProofSaved] = useState(false);

  const currentContext = PROMPT_CONTEXTS[contextIndex];

  // ── Evaluate prompt ────────────────────────────────────────────────────────

  const handleEvaluate = useCallback(async () => {
    if (!userPrompt.trim() || isEvaluating) return;
    setIsEvaluating(true);
    setEvaluation(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const systemPrompt = `Tu es un expert en prompt engineering. Évalue le prompt suivant selon 4 critères :
1. Clarté (est-ce que la demande est claire ?)
2. Spécificité (est-ce suffisamment précis et contextualisé ?)
3. Contexte (l'environnement/rôle/persona est-il précisé ?)
4. Format (la sortie attendue est-elle décrite ?)

Réponds EXACTEMENT dans ce format :
Score : X/20

Points forts :
- [point 1]
- [point 2]
- [point 3]

Version améliorée : [prompt amélioré complet]

Sois constructif et précis. Maximum 300 mots au total.`;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Contexte du prompt : "${currentContext.task}"\n\nPrompt soumis :\n"${userPrompt}"\n\nÉvalue ce prompt.`,
              },
            ],
            user_profile: { mode: "expert", persona: "prompt_engineer" },
            request_type: "lab_evaluation",
            session_id: `prompt_lab_${Date.now()}`,
          }),
        }
      );

      const data = await resp.json();

      if (!resp.ok || data.error) {
        const errMsg = data.error || "Erreur lors de l'évaluation";
        if (resp.status === 429 || data.quota_exceeded) {
          toast({ title: "Quota atteint", description: "Vous avez atteint votre limite quotidienne de requêtes IA.", variant: "destructive" });
        } else {
          toast({ title: "Erreur", description: errMsg, variant: "destructive" });
        }
        setIsEvaluating(false);
        return;
      }

      const rawContent = data.content ?? data.message ?? data.choices?.[0]?.message?.content ?? "";
      const parsed = parseEvaluation(rawContent);
      if (!parsed.score && rawContent.length > 50) {
        parsed.score = 12; // fallback if parsing fails
      }
      setEvaluation(parsed);

      // Save proof
      if (profile && !proofSaved) {
        await supabase.from("proofs").insert({
          user_id: profile.id,
          type: "prompt_lab",
          score: Math.round((parsed.score / 20) * 100),
          metadata: {
            context_id: currentContext.id,
            original_prompt: userPrompt.slice(0, 200),
            score_20: parsed.score,
          },
        });
        setProofSaved(true);
      }
    } catch (e) {
      toast({ title: "Erreur réseau", description: "Impossible de contacter le service IA.", variant: "destructive" });
    }
    setIsEvaluating(false);
  }, [userPrompt, currentContext, isEvaluating, profile, proofSaved]);

  // ── Download PDF ───────────────────────────────────────────────────────────

  const handleDownloadPdf = useCallback(async () => {
    if (!evaluation || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            type: "checklist",
            artifact_title: "Fiche Prompt Pro — Prompt Lab",
            checklist_items: [
              { text: `Contexte : ${currentContext.task}`, checked: true },
              { text: `Votre prompt : "${userPrompt.slice(0, 120)}..."`, checked: true },
              { text: `Score obtenu : ${evaluation.score}/20`, checked: true },
              ...evaluation.strengths.map((s) => ({ text: `✓ ${s}`, checked: true })),
              { text: `Prompt amélioré : "${evaluation.improved.slice(0, 200)}..."`, checked: true },
            ],
            score: Math.round((evaluation.score / 20) * 100),
            full_name: profile?.full_name ?? "Utilisateur",
          }),
        }
      );

      const data = await resp.json();
      if (data.pdf_base64) {
        const bytes = Uint8Array.from(atob(data.pdf_base64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "fiche-prompt-pro.pdf";
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "PDF téléchargé !", description: "Votre Fiche Prompt Pro est prête." });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de générer le PDF.", variant: "destructive" });
    }
    setDownloadingPdf(false);
  }, [evaluation, downloadingPdf, currentContext, userPrompt, profile]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setUserPrompt("");
    setEvaluation(null);
    setProofSaved(false);
  };

  const scoreColor = (s: number) =>
    s >= 16 ? "text-green-500" : s >= 12 ? "text-yellow-500" : s >= 8 ? "text-orange-500" : "text-destructive";

  const scoreLabel = (s: number) =>
    s >= 16 ? "Excellent" : s >= 12 ? "Bon" : s >= 8 ? "À améliorer" : "Insuffisant";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>Prompt Lab — GENIE IA</title>
        <meta name="description" content="Entraînez-vous au prompt engineering. Soumettez vos prompts, obtenez une évaluation IA et téléchargez votre Fiche Prompt Pro." />
      </Helmet>

      <div className="min-h-screen bg-background px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Wand2 className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Prompt Lab</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Maîtrisez le Prompt Engineering</h1>
          <p className="text-sm text-muted-foreground mt-1">Écrivez · Évaluez · Améliorez · Prouvez</p>
        </div>

        {/* Context selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4">
          {PROMPT_CONTEXTS.map((ctx, i) => (
            <button
              key={ctx.id}
              onClick={() => { setContextIndex(i); handleReset(); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                contextIndex === i
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-card border-border/40 text-muted-foreground hover:border-border"
              }`}
            >
              {i === 0 && <Brain className="w-3.5 h-3.5" />}
              {i === 1 && <Target className="w-3.5 h-3.5" />}
              {i === 2 && <AlignLeft className="w-3.5 h-3.5" />}
              {ctx.role}
            </button>
          ))}
        </div>

        {/* Scenario card */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden mb-4">
          <div className="bg-primary/5 border-b border-primary/10 px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Contexte</span>
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">{currentContext.task}</p>
          </div>

          <div className="px-5 py-4">
            {/* Hint */}
            <div className="rounded-xl bg-muted/30 border border-border/30 px-3 py-2 mb-4">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">💡 Conseil : </span>
                {currentContext.hint}
              </p>
            </div>

            {/* Textarea */}
            <label className="block text-xs font-semibold text-foreground mb-2">Votre prompt :</label>
            <Textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={`Ex : "${currentContext.example.slice(0, 60)}..."`}
              className="min-h-[120px] text-sm resize-none mb-3"
              disabled={isEvaluating}
            />

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleEvaluate}
                disabled={!userPrompt.trim() || isEvaluating || userPrompt.trim().length < 10}
              >
                {isEvaluating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Évaluation en cours...</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" />Évaluer avec KITT</>
                )}
              </Button>
              {evaluation && (
                <Button variant="outline" size="icon" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>

            {userPrompt.trim().length > 0 && userPrompt.trim().length < 10 && (
              <p className="text-xs text-muted-foreground text-center mt-2">Votre prompt doit faire au moins 10 caractères</p>
            )}
          </div>
        </div>

        {/* Evaluation results */}
        {evaluation && (
          <div className="space-y-3">
            {/* Score header */}
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-bold ${
                  evaluation.score >= 16 ? "border-green-500 text-green-500" :
                  evaluation.score >= 12 ? "border-yellow-500 text-yellow-500" :
                  evaluation.score >= 8 ? "border-orange-500 text-orange-500" :
                  "border-destructive text-destructive"
                }`}>
                  {evaluation.score}/20
                </div>
                <div>
                  <p className={`text-lg font-bold ${scoreColor(evaluation.score)}`}>{scoreLabel(evaluation.score)}</p>
                  <p className="text-xs text-muted-foreground">Score prompt engineering</p>
                  {proofSaved && <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">✅ Preuve enregistrée</p>}
                </div>
              </div>

              {/* 4 criteria visual */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: "Clarté", icon: AlignLeft },
                  { label: "Spécificité", icon: Target },
                  { label: "Contexte", icon: Brain },
                  { label: "Format", icon: Layout },
                ].map((c) => {
                  const Icon = c.icon;
                  const ratio = evaluation.score / 20;
                  const itemScore = Math.round(ratio * 5);
                  return (
                    <div key={c.label} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1">{c.label}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`w-1.5 h-3 rounded-sm ${i < itemScore ? "bg-primary" : "bg-border"}`} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Strengths */}
              {evaluation.strengths.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-foreground mb-2">✨ Points forts</p>
                  <div className="space-y-1.5">
                    {evaluation.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improved prompt */}
              {evaluation.improved && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                  <p className="text-xs font-semibold text-primary mb-2">🚀 Version améliorée par KITT</p>
                  <p className="text-sm text-foreground/90 leading-relaxed italic">"{evaluation.improved}"</p>
                </div>
              )}
            </div>

            {/* Download CTA */}
            <Button
              className="w-full"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Génération PDF...</>
              ) : (
                <><FileText className="w-4 h-4 mr-2" />Télécharger ma Fiche Prompt Pro</>
              )}
            </Button>

            {/* Try example */}
            <div className="rounded-xl border border-border/40 bg-card p-4">
              <p className="text-xs font-semibold text-foreground mb-1">📖 Exemple de prompt expert</p>
              <p className="text-xs text-muted-foreground leading-relaxed italic">"{currentContext.example}"</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-7 text-xs"
                onClick={() => { setUserPrompt(currentContext.example); setEvaluation(null); setProofSaved(false); }}
              >
                Utiliser cet exemple <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
