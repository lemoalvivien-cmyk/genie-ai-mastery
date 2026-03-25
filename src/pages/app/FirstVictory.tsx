/**
 * FirstVictory v2 — première action concrète en < 2 minutes
 *
 * Adapté au BESOIN choisi à l'onboarding (needId dans l'URL ou profil persona).
 * + Emergency Mode intégré pour les cas urgents
 * + Tracking first_victory_completed
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, MessageSquare, BookOpen, CheckCircle2, Zap } from "lucide-react";
import { EmergencyMode } from "@/components/emergency/EmergencyMode";

// ── Mission par persona / besoin ─────────────────────────────────────────────
interface PersonaMission {
  headline: string;
  subline: string;
  chatPrompt: string;
  chatLabel: string;
  whatYouGet: string[];
}

const MISSIONS: Record<string, PersonaMission> = {
  dirigeant: {
    headline: "Évaluez la maturité IA de votre équipe en 3 minutes",
    subline: "Posez ces questions à votre copilote IA. Vous repartez avec un diagnostic concret.",
    chatPrompt: "Je dirige une équipe. Donne-moi 5 questions pour évaluer leur niveau de maîtrise de l'IA au quotidien, avec les réponses attendues et un plan d'action.",
    chatLabel: "Obtenir mon diagnostic équipe →",
    whatYouGet: [
      "5 questions de diagnostic prêtes à l'emploi",
      "Les réponses attendues par niveau",
      "Un plan d'action pour les 30 prochains jours",
    ],
  },
  independant: {
    headline: "Créez une proposition commerciale percutante en 3 minutes",
    subline: "Une mission concrète. Un résultat que vous pouvez envoyer dès aujourd'hui.",
    chatPrompt: "Je suis consultant indépendant. Aide-moi à rédiger une proposition commerciale percutante en 1 page pour un prospect PME : problème identifié, solution proposée, livrables, tarif et garantie.",
    chatLabel: "Générer ma proposition →",
    whatYouGet: [
      "Proposition commerciale complète en 1 page",
      "Structure réutilisable",
      "Formulations qui convertissent",
    ],
  },
  salarie: {
    headline: "Rédigez un email difficile en 30 secondes",
    subline: "Votre copilote IA rédige à votre place. Vous choisissez le ton, vous envoyez.",
    chatPrompt: "Je dois envoyer un email à mon manager pour refuser poliment une tâche hors de mon périmètre. Rédige 3 versions : ferme, neutre, conciliant.",
    chatLabel: "Rédiger mon email maintenant →",
    whatYouGet: [
      "3 versions d'email prêtes à envoyer",
      "Explication de la méthode",
      "Modèle réutilisable",
    ],
  },
  parent: {
    headline: "Protégez votre famille des arnaques en ligne ce soir",
    subline: "L'IA vous donne le script de conversation. Vous faites la discussion.",
    chatPrompt: "Comment expliquer à un enfant de 10 ans ce qu'est le phishing ? Donne-moi un script de conversation de 5 minutes avec des exemples concrets et un quiz de vérification.",
    chatLabel: "Obtenir le script familial →",
    whatYouGet: [
      "Script de conversation simple et concret",
      "Exemples adaptés à l'âge",
      "Quiz rapide pour vérifier la compréhension",
    ],
  },
  senior: {
    headline: "Apprenez à détecter un faux email en 2 minutes",
    subline: "L'IA vous explique simplement. Pas de jargon. Pas de technique.",
    chatPrompt: "Explique-moi comment reconnaître un email frauduleux avec des exemples simples. Donne-moi une liste de 5 points à vérifier avant de cliquer.",
    chatLabel: "Apprendre à me protéger →",
    whatYouGet: [
      "5 points de contrôle à mémoriser",
      "Exemples concrets d'emails frauduleux",
      "Que faire si vous avez cliqué",
    ],
  },
  jeune: {
    headline: "Créez votre CV avec l'IA en 3 minutes",
    subline: "Pas besoin d'expérience. L'IA transforme ce que vous avez en atouts.",
    chatPrompt: "Je suis étudiant. Aide-moi à rédiger un CV percutant qui met en valeur mes compétences (sport, bénévolat, projets) même sans expérience professionnelle. Inclus lettre de motivation.",
    chatLabel: "Créer mon CV avec l'IA →",
    whatYouGet: [
      "CV structuré et percutant",
      "Formulations qui valorisent vos atouts",
      "Lettre de motivation associée",
    ],
  },
};

// Mapping needId → mission
const NEED_TO_MISSION: Record<string, string> = {
  time: "salarie",
  write: "independant",
  understand: "salarie",
  present: "independant",
  team: "dirigeant",
};

const DEFAULT_MISSION = MISSIONS["salarie"];

export default function FirstVictory() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { track } = useAnalytics();
  const [welcomed, setWelcomed] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  // Resolve mission from need param or persona
  const needId = searchParams.get("need") ?? null;
  const missionKey = needId
    ? (NEED_TO_MISSION[needId] ?? profile?.persona ?? "salarie")
    : (profile?.persona ?? "salarie");
  const mission = MISSIONS[missionKey] ?? DEFAULT_MISSION;
  const firstName = profile?.full_name?.split(" ")[0] ?? null;

  // Mark welcome complete + track
  useEffect(() => {
    if (!session?.user?.id || welcomed) return;
    setWelcomed(true);
    track("first_victory_completed", { need: needId, persona: profile?.persona });
    supabase
      .from("profiles")
      .update({ has_completed_welcome: true })
      .eq("id", session.user.id)
      .then(() => {});
  }, [session?.user?.id, welcomed, track, needId, profile?.persona]);

  const handleChat = () => {
    const encoded = encodeURIComponent(mission.chatPrompt);
    navigate(`/app/chat?q=${encoded}`);
  };

  return (
    <>
      <Helmet><title>Votre première victoire – Formetoialia</title></Helmet>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-6">

          {/* Header */}
          <div className="text-center space-y-2">
            {firstName && (
              <p className="text-sm text-muted-foreground font-medium">
                Bienvenue, {firstName} 👋
              </p>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-1">
              <Zap className="w-3 h-3" />
              Première victoire en moins de 3 minutes
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">
              {mission.headline}
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              {mission.subline}
            </p>
          </div>

          {/* Ce que vous obtenez */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--primary) / 0.25)",
              boxShadow: "0 0 24px hsl(var(--primary) / 0.06)",
            }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ce que vous allez obtenir
            </p>
            {mission.whatYouGet.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-foreground leading-snug">{item}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button
              onClick={handleChat}
              size="lg"
              className="w-full font-black text-base py-5 shadow-glow gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              {mission.chatLabel}
            </Button>

            <Button
              onClick={() => navigate("/app/today")}
              variant="outline"
              size="lg"
              className="w-full font-semibold gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Mission du jour →
            </Button>
          </div>

          {/* Emergency Mode toggle */}
          {!showEmergency ? (
            <div className="pt-2">
              <button
                onClick={() => setShowEmergency(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                Besoin d'un résultat <span className="font-semibold text-foreground">maintenant</span> ?
              </button>
            </div>
          ) : (
            <div className="pt-2 rounded-2xl border border-border/50 p-4 bg-card/60">
              <EmergencyMode onClose={() => setShowEmergency(false)} />
            </div>
          )}

          {/* Skip */}
          <div className="text-center">
            <button
              onClick={() => navigate("/app/dashboard", { replace: true })}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Passer — aller au tableau de bord
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
