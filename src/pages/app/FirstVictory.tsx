/**
 * FirstVictory — Première action concrète en < 2 minutes
 *
 * Remplace l'ancienne version multi-étapes avec chrono et confettis.
 * Objectif : UN seul CTA principal adapté au profil, action immédiate,
 * feedback IA après l'action.
 *
 * Logique :
 * - Le contenu de la mission s'adapte au persona et au niveau
 * - 1 seul bouton principal → ouvre le chat avec un prompt pré-rempli
 * - Bouton secondaire → accès aux modules
 * - Lien discret → passer au dashboard
 *
 * Ce composant sette has_completed_welcome = true au montage
 * pour garantir qu'il n'y a pas de loop si l'utilisateur revient.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, MessageSquare, BookOpen, CheckCircle2 } from "lucide-react";

// ── Mission par persona ────────────────────────────────────────────────────────
interface PersonaMission {
  headline: string;
  subline: string;
  chatPrompt: string;
  chatLabel: string;
  moduleLabel: string;
  whatYouGet: string[];
}

const MISSION_BY_PERSONA: Record<string, PersonaMission> = {
  dirigeant: {
    headline: "Évaluez le niveau de maturité IA de votre équipe",
    subline: "Posez cette question à votre assistant IA. Vous aurez un diagnostic en 30 secondes.",
    chatPrompt: "Je dirige une équipe de 10 personnes. Donne-moi 5 questions pour évaluer leur niveau de maîtrise de l'IA au quotidien, avec les réponses attendues.",
    chatLabel: "Obtenir mon diagnostic équipe →",
    moduleLabel: "Voir les modules pour managers",
    whatYouGet: [
      "5 questions de diagnostic prêtes à l'emploi",
      "Les réponses attendues par niveau",
      "Un plan d'action personnalisé",
    ],
  },
  salarie: {
    headline: "Rédigez un email difficile en 30 secondes avec l'IA",
    subline: "Posez cette question à votre assistant. Vous verrez immédiatement ce que l'IA peut faire pour vous.",
    chatPrompt: "Je dois envoyer un email à mon manager pour refuser poliment une tâche hors de mon périmètre, sans froisser la relation. Rédige-le en 3 versions : ferme, neutre, conciliant.",
    chatLabel: "Rédiger mon email maintenant →",
    moduleLabel: "Voir les modules productivité IA",
    whatYouGet: [
      "3 versions d'email prêtes à envoyer",
      "Explication de la méthode",
      "Modèle réutilisable pour l'avenir",
    ],
  },
  independant: {
    headline: "Créez votre première proposition commerciale avec l'IA",
    subline: "Une mission concrète. Un résultat immédiat que vous pouvez réutiliser demain.",
    chatPrompt: "Je suis consultant indépendant. Aide-moi à rédiger une proposition commerciale percutante en 1 page pour un prospect PME, en incluant : problème identifié, solution proposée, livrables, tarif et garantie.",
    chatLabel: "Générer ma proposition →",
    moduleLabel: "Voir les modules pour indépendants",
    whatYouGet: [
      "Proposition commerciale complète en 1 page",
      "Structure réutilisable",
      "Formulations qui convertissent",
    ],
  },
  parent: {
    headline: "Expliquez le risque du phishing à votre enfant",
    subline: "L'IA vous donne les bons mots. Vous faites la conversation ce soir.",
    chatPrompt: "Comment expliquer simplement à un enfant de 10 ans ce qu'est le phishing et comment ne pas se faire piéger ? Donne-moi un script de conversation de 5 minutes avec des exemples concrets.",
    chatLabel: "Obtenir le script familial →",
    moduleLabel: "Voir les modules cybersécurité famille",
    whatYouGet: [
      "Script de conversation simple et concret",
      "Exemples adaptés à l'âge",
      "Quiz rapide pour vérifier la compréhension",
    ],
  },
  senior: {
    headline: "Apprenez à détecter un faux email en 2 minutes",
    subline: "L'IA vous explique simplement. Pas de jargon.",
    chatPrompt: "Explique-moi comment reconnaître un email frauduleux ou une tentative d'escroquerie, avec des exemples simples et concrets. Donne-moi une liste de 5 points à vérifier avant de cliquer.",
    chatLabel: "Apprendre à me protéger →",
    moduleLabel: "Voir les modules sécurité",
    whatYouGet: [
      "5 points de contrôle à mémoriser",
      "Exemples concrets d'emails frauduleux",
      "Que faire si vous avez cliqué",
    ],
  },
  jeune: {
    headline: "Créez votre CV avec l'IA en 3 minutes",
    subline: "Pas besoin d'expérience. L'IA transforme ce que vous savez en atouts.",
    chatPrompt: "Je suis lycéen/étudiant et je cherche un stage ou un job d'été. Je n'ai pas beaucoup d'expérience mais j'ai des compétences comme [sport, bénévolat, projets personnels]. Aide-moi à rédiger un CV percutant qui met ça en valeur.",
    chatLabel: "Créer mon CV avec l'IA →",
    moduleLabel: "Voir les modules pour étudiants",
    whatYouGet: [
      "CV structuré et percutant",
      "Formulations qui valorisent vos atouts",
      "Lettre de motivation associée",
    ],
  },
};

const DEFAULT_MISSION = MISSION_BY_PERSONA["salarie"];

export default function FirstVictory() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const [welcomed, setWelcomed] = useState(false);

  const persona = profile?.persona ?? "salarie";
  const firstName = profile?.full_name?.split(" ")[0] ?? null;
  const mission = MISSION_BY_PERSONA[persona] ?? DEFAULT_MISSION;

  // Garantit que has_completed_welcome est true au montage
  useEffect(() => {
    if (!session?.user?.id || welcomed) return;
    setWelcomed(true);
    supabase
      .from("profiles")
      .update({ has_completed_welcome: true })
      .eq("id", session.user.id)
      .then(() => {});
  }, [session?.user?.id, welcomed]);

  const handleChat = () => {
    const encoded = encodeURIComponent(mission.chatPrompt);
    navigate(`/app/chat?q=${encoded}`);
  };

  const handleModules = () => {
    navigate("/app/modules");
  };

  const handleSkip = () => {
    navigate("/app/dashboard", { replace: true });
  };

  return (
    <>
      <Helmet><title>Votre première mission – Formetoialia</title></Helmet>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">

          {/* Header */}
          <div className="text-center space-y-2">
            {firstName && (
              <p className="text-sm text-muted-foreground font-medium">
                Bienvenue, {firstName} 👋
              </p>
            )}
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
              onClick={handleModules}
              variant="outline"
              size="lg"
              className="w-full font-semibold gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {mission.moduleLabel}
            </Button>
          </div>

          {/* Skip */}
          <div className="text-center">
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Passer — aller au dashboard
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
