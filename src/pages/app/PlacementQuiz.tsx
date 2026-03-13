/**
 * PlacementQuiz — BLOC 1 — Benchmark d'entrée réel
 * 8 questions couvrant les 4 domaines (2 par domaine)
 * Écrit les résultats dans placement_quiz_results + seed skill_mastery
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";

interface PlacementQuestion {
  id: string;
  domain: "ia_pro" | "ia_perso" | "cyber" | "vibe_coding";
  question: string;
  options: string[];
  correct_index: number;
  skill_slug: string;
}

// 8 questions — 2 par domaine — niveau calibrage
const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // IA Pro
  {
    id: "ia1",
    domain: "ia_pro",
    question: "Qu'est-ce qu'un 'prompt' en intelligence artificielle ?",
    options: [
      "Un logiciel de traduction automatique",
      "Une instruction ou question envoyée à un modèle IA",
      "Un fichier d'entraînement du modèle",
      "Un protocole de sécurité réseau",
    ],
    correct_index: 1,
    skill_slug: "ia-prompting-pro",
  },
  {
    id: "ia2",
    domain: "ia_pro",
    question: "Parmi ces outils, lequel est une IA générative ?",
    options: ["Excel", "ChatGPT", "Google Maps", "Antivirus Windows Defender"],
    correct_index: 1,
    skill_slug: "ia-generative-metier",
  },
  // IA Perso
  {
    id: "ip1",
    domain: "ia_perso",
    question: "Quelle information est dangereux de partager avec une IA publique ?",
    options: [
      "Le nom d'un film que vous aimez",
      "Votre numéro de sécurité sociale",
      "La météo de votre ville",
      "Le nom de votre couleur préférée",
    ],
    correct_index: 1,
    skill_slug: "ia-vie-privee",
  },
  {
    id: "ip2",
    domain: "ia_perso",
    question: "Comment l'IA peut-elle vous aider au quotidien ?",
    options: [
      "En remplaçant totalement votre jugement",
      "En rédigeant des emails, en résumant des textes et en suggérant des idées",
      "En gérant vos comptes bancaires sans supervision",
      "En prenant des décisions médicales à votre place",
    ],
    correct_index: 1,
    skill_slug: "ia-quotidien",
  },
  // Cyber
  {
    id: "c1",
    domain: "cyber",
    question: "Qu'est-ce qu'un email de phishing ?",
    options: [
      "Un email de newsletter légitime",
      "Un email frauduleux imitant une entité de confiance pour voler vos données",
      "Un email de confirmation de commande",
      "Un email de mise à jour logicielle",
    ],
    correct_index: 1,
    skill_slug: "cyber-phishing",
  },
  {
    id: "c2",
    domain: "cyber",
    question: "Un bon mot de passe doit être :",
    options: [
      "Court et facile à retenir (ex: 'soleil')",
      "Long, unique, avec lettres, chiffres et symboles",
      "Le même pour tous vos comptes pour simplifier",
      "La date de naissance pour ne pas l'oublier",
    ],
    correct_index: 1,
    skill_slug: "cyber-passwords",
  },
  // Vibe Coding
  {
    id: "vc1",
    domain: "vibe_coding",
    question: "Le 'vibe coding' consiste à :",
    options: [
      "Programmer en musique pour mieux se concentrer",
      "Créer des applications avec des instructions en langage naturel grâce à l'IA",
      "Coder uniquement la nuit pour être plus créatif",
      "Utiliser un clavier spécial pour développeurs",
    ],
    correct_index: 1,
    skill_slug: "vibe-coding-basics",
  },
  {
    id: "vc2",
    domain: "vibe_coding",
    question: "Quel outil permet de créer une app web en décrivant ce qu'on veut ?",
    options: ["Microsoft Word", "Lovable.dev", "Adobe Photoshop", "Google Sheets"],
    correct_index: 1,
    skill_slug: "vibe-coding-basics",
  },
];

const DOMAIN_LABELS: Record<string, string> = {
  ia_pro: "🤖 IA Pro",
  ia_perso: "💡 IA Perso",
  cyber: "🛡️ Cyber",
  vibe_coding: "⚡ Vibe Coding",
};

const DOMAIN_COLORS: Record<string, string> = {
  ia_pro: "text-indigo-400",
  ia_perso: "text-cyan-400",
  cyber: "text-amber-400",
  vibe_coding: "text-emerald-400",
};

export default function PlacementQuiz() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<"quiz" | "done">("quiz");
  const [results, setResults] = useState<Record<string, number>>({});

  const current = PLACEMENT_QUESTIONS[currentIdx];
  const total = PLACEMENT_QUESTIONS.length;
  const progress = ((currentIdx) / total) * 100;

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
  };

  const handleNext = async () => {
    if (selected === null) return;
    const newAnswers = { ...answers, [current.id]: selected };
    setAnswers(newAnswers);

    if (currentIdx < total - 1) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
    } else {
      // Compute domain scores
      const domainCorrect: Record<string, { correct: number; total: number }> = {};
      PLACEMENT_QUESTIONS.forEach((q) => {
        if (!domainCorrect[q.domain]) domainCorrect[q.domain] = { correct: 0, total: 0 };
        domainCorrect[q.domain].total += 1;
        if (newAnswers[q.id] === q.correct_index) domainCorrect[q.domain].correct += 1;
      });

      const scores: Record<string, number> = {};
      let totalCorrect = 0;
      Object.entries(domainCorrect).forEach(([domain, { correct, total: t }]) => {
        scores[domain] = Math.round((correct / t) * 100);
        totalCorrect += correct;
      });
      const totalScore = Math.round((totalCorrect / total) * 100);
      setResults(scores);

      setSaving(true);
      try {
        if (user?.id) {
          // Save placement results
          await supabase.from("placement_quiz_results").insert({
            user_id: user.id,
            answers: newAnswers,
            scores,
            total_score: totalScore,
          });

          // Seed skill_mastery for each domain's skills
          const { data: skills } = await supabase
            .from("skills")
            .select("id, slug, domain");

          if (skills) {
            const masteryRows = skills.map((skill) => ({
              user_id: user.id,
              skill_id: skill.id,
              // Convert domain % score to 0-1 mastery
              p_mastery: (scores[skill.domain] ?? 0) / 100,
            }));
            await supabase.rpc("upsert_skill_mastery", {
              _user_id: user.id,
              _skill_id: masteryRows[0]?.skill_id,
              _p_mastery: masteryRows[0]?.p_mastery ?? 0,
            });
            // Batch via individual calls (upsert_skill_mastery is per-skill)
            await Promise.all(
              masteryRows.map((row) =>
                supabase.rpc("upsert_skill_mastery", {
                  _user_id: row.user_id,
                  _skill_id: row.skill_id,
                  _p_mastery: row.p_mastery,
                })
              )
            );
          }

          // Mark placement done
          await supabase
            .from("profiles")
            .update({ placement_done: true })
            .eq("id", user.id);
        }
      } catch (e) {
        console.error("Placement save error:", e);
      } finally {
        setSaving(false);
        setPhase("done");
      }
    }
  };

  const isCorrect = selected !== null && selected === current?.correct_index;

  if (phase === "done") {
    return (
      <>
        <Helmet><title>Résultat benchmark — Formetoialia</title></Helmet>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center space-y-2">
              <div className="text-5xl">🎯</div>
              <h1 className="text-2xl font-black">Votre profil de départ</h1>
              <p className="text-muted-foreground text-sm">Votre parcours est maintenant personnalisé.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(results).map(([domain, score]) => (
                <div
                  key={domain}
                  className="p-4 rounded-2xl border border-border/50 bg-card/60"
                >
                  <div className={`text-sm font-semibold mb-2 ${DOMAIN_COLORS[domain]}`}>
                    {DOMAIN_LABELS[domain]}
                  </div>
                  <div className="text-2xl font-black">{score}%</div>
                  <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${score}%`,
                        background: score < 40
                          ? "hsl(var(--destructive))"
                          : score < 70
                          ? "hsl(40 95% 55%)"
                          : "hsl(var(--emerald))",
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {score < 40 ? "À renforcer" : score < 70 ? "En progression" : "Maîtrisé"}
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-14 gradient-primary text-primary-foreground font-semibold text-base shadow-glow"
              onClick={() => navigate("/app/dashboard")}
            >
              Voir mon parcours personnalisé →
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Benchmark de positionnement – GENIE IA</title></Helmet>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-border/30">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
          }}
        />
      </div>

      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">

          {/* Header */}
          <div className="text-center space-y-1">
            <div className={`text-sm font-semibold ${DOMAIN_COLORS[current.domain]}`}>
              {DOMAIN_LABELS[current.domain]}
            </div>
            <div className="text-xs text-muted-foreground">
              Question {currentIdx + 1} / {total}
            </div>
          </div>

          {/* Question */}
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 space-y-5">
            <p className="text-lg font-semibold leading-snug">{current.question}</p>

            <div className="space-y-3">
              {current.options.map((opt, i) => {
                let cls = "w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ";
                if (selected === null) {
                  cls += "border-border/50 bg-card/40 hover:border-primary/50 hover:bg-primary/5";
                } else if (i === current.correct_index) {
                  cls += "border-emerald-500/60 bg-emerald-500/10 text-emerald-400";
                } else if (i === selected) {
                  cls += "border-destructive/60 bg-destructive/10 text-destructive";
                } else {
                  cls += "border-border/30 bg-card/20 opacity-50";
                }
                return (
                  <button key={i} className={cls} onClick={() => handleSelect(i)}>
                    {opt}
                  </button>
                );
              })}
            </div>

            {selected !== null && (
              <div className={`p-3 rounded-xl text-sm ${
                isCorrect
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
              }`}>
                {isCorrect ? "✅ Bonne réponse !" : `💡 La bonne réponse était : ${current.options[current.correct_index]}`}
              </div>
            )}
          </div>

          {selected !== null && (
            <Button
              className="w-full h-14 gradient-primary text-primary-foreground font-semibold text-base shadow-glow"
              onClick={handleNext}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : currentIdx < total - 1 ? (
                <span className="flex items-center gap-2">
                  Suivant <ChevronRight className="w-4 h-4" />
                </span>
              ) : (
                "Voir mon profil →"
              )}
            </Button>
          )}

          <button
            onClick={() => navigate("/app/dashboard")}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Passer le benchmark
          </button>
        </div>
      </div>
    </>
  );
}
