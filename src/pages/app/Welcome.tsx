import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import KittVisualizer, { KittState } from "@/components/chat/KittVisualizer";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// ─── Mission steps per persona ──────────────────────────────────────────────
const MISSIONS: Record<string, { intro: string; steps: string[] }> = {
  dirigeant: {
    intro: "On va vérifier la sécurité de ton email pro.",
    steps: [
      "Va sur haveibeenpwned.com. Tape ton email. On vérifie ensemble si tu as été concerné par une fuite.",
      "Si ton email apparaît : change le mot de passe du service concerné. Maintenant, pendant qu'on y pense.",
      "Active la double authentification sur ton email pro. Va dans Paramètres > Sécurité > Vérification en deux étapes.",
    ],
  },
  manager: {
    intro: "On va vérifier la sécurité de ton email pro.",
    steps: [
      "Va sur haveibeenpwned.com. Tape ton email. On vérifie ensemble si tu as été concerné par une fuite.",
      "Si ton email apparaît : change le mot de passe du service concerné. Maintenant, pendant qu'on y pense.",
      "Active la double authentification sur ton email pro. Va dans Paramètres > Sécurité > Vérification en deux étapes.",
    ],
  },
  salarie: {
    intro: "On va vérifier ton mot de passe principal.",
    steps: [
      "Pense à ton mot de passe le plus important (email, banque). Est-ce qu'il fait au moins 12 caractères ?",
      "Est-ce que tu utilises le même mot de passe sur plusieurs sites ? Si oui, c'est un risque majeur.",
      "Installe un gestionnaire de mots de passe gratuit comme Bitwarden. Ça prend 3 minutes et ça change tout.",
    ],
  },
  parent: {
    intro: "On va voir si tes enfants sont protégés en ligne.",
    steps: [
      "Sur le téléphone de ton enfant, active le contrôle parental. Sur iPhone : Paramètres > Temps d'écran. Sur Android : Family Link de Google.",
      "Vérifie les applications installées. Supprime celles que tu ne connais pas.",
      "Parle à ton enfant : explique-lui de ne jamais donner son prénom ou son école à un inconnu en ligne.",
    ],
  },
  senior: {
    intro: "On va sécuriser ton téléphone ensemble.",
    steps: [
      "Assure-toi que ton téléphone se verrouille automatiquement. Va dans Paramètres > Écran > Verrouillage automatique. Choisis 1 minute.",
      "Active les mises à jour automatiques. Elles corrigent les failles de sécurité. Paramètres > Général > Mise à jour automatique.",
      "Note le numéro d'urgence de ta banque quelque part de sûr (pas dans le téléphone). En cas de fraude, tu peux appeler tout de suite.",
    ],
  },
  etudiant: {
    intro: "On va créer ton premier truc avec l'IA.",
    steps: [
      "Va sur lovable.dev. Crée un compte gratuit en 30 secondes.",
      "Dans la zone de texte, tape : 'Crée une page avec mon prénom en grand, mes hobbies en liste, et un bouton Contactez-moi.'",
      "Regarde ce que l'IA génère ! Clique sur 'Publish' pour avoir un vrai lien à partager.",
    ],
  },
  jeune: {
    intro: "On va créer ton premier truc avec l'IA.",
    steps: [
      "Va sur lovable.dev. Crée un compte gratuit en 30 secondes.",
      "Dans la zone de texte, tape : 'Crée une page avec mon prénom en grand, mes hobbies en liste, et un bouton Contactez-moi.'",
      "Regarde ce que l'IA génère ! Clique sur 'Publish' pour avoir un vrai lien à partager.",
    ],
  },
  independant: {
    intro: "On va vérifier la sécurité de ton email pro.",
    steps: [
      "Va sur haveibeenpwned.com. Tape ton email. On vérifie ensemble si tu as été concerné par une fuite.",
      "Active la double authentification sur ton email pro. Va dans Paramètres > Sécurité > Vérification en deux étapes.",
      "Installe Bitwarden (gratuit) pour gérer tes mots de passe clients et fournisseurs en sécurité.",
    ],
  },
};

type Phase = "intro" | "cta" | "mission" | "done";

export default function Welcome() {
  const { profile, session, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const [kittState, setKittState] = useState<KittState>("idle");
  const [phase, setPhase] = useState<Phase>("intro");
  const [subtitle, setSubtitle] = useState("");
  const [missionStep, setMissionStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [voiceEnabled] = useState(true);

  const firstName = profile?.full_name?.split(" ")[0] ?? "toi";
  const persona = profile?.persona ?? "salarie";
  const mission = MISSIONS[persona] ?? MISSIONS["salarie"];

  // ── Redirection automatique vers le quiz si onboarding non complété ──
  useEffect(() => {
    if (!profile) return;
    if (profile.onboarding_completed === false) {
      navigate("/app/onboarding/quiz", { replace: true });
    }
  }, [profile?.id, profile?.onboarding_completed, navigate]);

  const { speak, getAnalyser } = useVoiceEngine({
    onTranscript: () => {},
    onStateChange: setKittState,
    voiceEnabled,
  });

  const speakAndShow = useCallback(async (text: string) => {
    setSubtitle(text);
    setKittState("speaking");
    await speak(text);
  }, [speak]);

  // Auto-play intro sequence
  useEffect(() => {
    if (!profile) return;
    const run = async () => {
      await new Promise(r => setTimeout(r, 800));
      await speakAndShow(`Salut ${firstName} ! Moi c'est Genie, ton assistant. Je suis là pour t'accompagner tous les jours. Pas de blabla, que de l'action.`);
      await new Promise(r => setTimeout(r, 1200));
      await speakAndShow("Pour commencer, on va faire un truc rapide ensemble. Ça prend 2 minutes. Tu es prêt ?");
      setPhase("cta");
      setKittState("idle");
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const handleYes = useCallback(async () => {
    setPhase("mission");
    setMissionStep(0);
    await speakAndShow(mission.intro);
    await new Promise(r => setTimeout(r, 500));
    await speakAndShow(mission.steps[0]);
  }, [mission, speakAndShow]);

  const handleLater = () => {
    navigate("/app/dashboard?welcome_pending=true");
  };

  const handleStepDone = useCallback(async () => {
    const nextStep = missionStep + 1;
    if (nextStep < mission.steps.length) {
      setMissionStep(nextStep);
      await speakAndShow(mission.steps[nextStep]);
    } else {
      // Mission complete
      setPhase("done");
      setShowConfetti(true);
      await speakAndShow("Bravo ! Tu viens de faire ta première action. On se retrouve demain pour la suite.");
      // Mark welcome complete
      if (session?.user?.id) {
        await supabase.from("profiles").update({ has_completed_welcome: true }).eq("id", session.user.id);
        await refetchProfile();
      }
    }
  }, [missionStep, mission.steps, speakAndShow, session, refetchProfile]);

  const handleDiscover = () => {
    navigate("/app/dashboard");
  };

  return (
    <>
      <Helmet><title>Bienvenue – Formetoialia</title></Helmet>

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                background: ["#6366F1", "#EF4444", "#F97316", "#22C55E", "#F59E0B"][i % 5],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 py-12">
        {/* KITT large */}
        <div className="mb-8" style={{ transform: "scale(2.5)", transformOrigin: "center" }}>
          <KittVisualizer state={kittState} analyserNode={getAnalyser()} />
        </div>

        {/* Subtitle */}
        <div className="min-h-[80px] max-w-lg text-center mt-8 mb-10">
          {subtitle && (
            <p className="text-white text-lg leading-relaxed animate-fade-in font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* CTAs */}
        {phase === "cta" && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <Button
              onClick={handleYes}
              className="px-8 py-4 text-lg font-bold gradient-primary shadow-glow min-h-[56px]"
              size="lg"
            >
              Oui, on y va ! 🚀
            </Button>
            <button
              onClick={handleLater}
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Plus tard
            </button>
          </div>
        )}

        {/* Mission steps */}
        {phase === "mission" && (
          <div className="flex flex-col items-center gap-6 animate-fade-in max-w-md w-full">
            <div className="flex gap-2 mb-2">
              {mission.steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-1.5 rounded-full transition-all ${i <= missionStep ? "bg-primary" : "bg-slate-700"}`}
                />
              ))}
            </div>
            <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center">
              <p className="text-white text-base leading-relaxed">{mission.steps[missionStep]}</p>
            </div>
            <Button
              onClick={handleStepDone}
              className="px-8 py-4 text-base font-semibold gradient-primary shadow-glow min-h-[52px]"
            >
              Fait ! ✓
            </Button>
          </div>
        )}

        {/* Done — PDF CTA (Time-to-Value) */}
        {phase === "done" && (
          <div className="flex flex-col items-center gap-4 animate-fade-in w-full max-w-sm">
            <div className="text-4xl">🎉</div>
            <p className="text-white/80 text-sm text-center">
              Ta première action est faite ! Génère ton mini-rapport PDF pour le partager.
            </p>
            <Button
              onClick={() => navigate("/app/chat?action=pdf_rapport")}
              className="w-full px-8 py-4 text-base font-bold gradient-primary shadow-glow min-h-[52px]"
            >
              📄 Générer mon rapport PDF →
            </Button>
            <button
              onClick={handleDiscover}
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Passer — aller au dashboard
            </button>
          </div>
        )}
      </div>
    </>
  );
}
