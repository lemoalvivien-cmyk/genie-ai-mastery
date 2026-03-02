import { useState, useCallback } from "react";
import { ShieldAlert, X, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import KittVisualizer, { KittState } from "@/components/chat/KittVisualizer";

type ProtocolKey = "lien" | "argent" | "compte" | "message" | "autre";

interface Protocol {
  steps: string[];
  conclusion: string;
}

const PROTOCOLS: Record<ProtocolKey, Protocol> = {
  lien: {
    steps: [
      "Ne clique plus sur rien. Ferme la page suspecte.",
      "Change le mot de passe du compte concerné. Maintenant.",
      "Active la double authentification si ce n'est pas fait.",
      "Vérifie tes derniers mouvements bancaires.",
    ],
    conclusion:
      "Tu as fait le nécessaire. Si tu remarques un mouvement bancaire suspect, appelle ta banque IMMÉDIATEMENT au numéro au dos de ta carte.",
  },
  argent: {
    steps: [
      "Ne paie RIEN. Jamais. Aucune urgence ne justifie un paiement immédiat.",
      "Si c'est par email ou SMS : c'est une arnaque à 99%. Bloque le numéro.",
      "Si c'est quelqu'un que tu connais : appelle-le sur son VRAI numéro pour vérifier.",
      "Signale sur signal-spam.fr ou internet-signalement.gouv.fr",
    ],
    conclusion:
      "Tu n'es pas seul. Les escrocs jouent sur la peur et l'urgence. Prends ton temps, tu as bien réagi.",
  },
  compte: {
    steps: [
      "Change ton mot de passe IMMÉDIATEMENT. Utilise un autre appareil si possible.",
      "Active la double authentification.",
      "Vérifie les connexions récentes : Paramètres > Sécurité > Sessions actives.",
      "Déconnecte toutes les autres sessions.",
      "Si c'est un compte bancaire : appelle ta banque MAINTENANT.",
    ],
    conclusion: "Ton compte est à nouveau sous contrôle. Bravo, tu as eu le bon réflexe.",
  },
  message: {
    steps: [
      "Ne rappelle pas le numéro. Ne réponds pas au message.",
      "Bloque le numéro.",
      "Signale sur 33700 (SMS) ou internet-signalement.gouv.fr",
    ],
    conclusion:
      "C'est réglé. Les arnaqueurs changent de numéro tous les jours, mais maintenant tu sais réagir.",
  },
  autre: { steps: [], conclusion: "" },
};

const SCENARIOS: { key: ProtocolKey; label: string; emoji: string }[] = [
  { key: "lien", label: "J'ai cliqué sur un lien bizarre", emoji: "📧" },
  { key: "argent", label: "On me demande de l'argent", emoji: "💰" },
  { key: "compte", label: "Mon compte semble piraté", emoji: "🔓" },
  { key: "message", label: "Message ou appel suspect", emoji: "📱" },
  { key: "autre", label: "Autre chose", emoji: "❓" },
];

export function PanicButton() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolKey | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const [kittState, setKittState] = useState<KittState>("idle");
  const [subtitle, setSubtitle] = useState("Pas de panique. Dis-moi ce qui se passe.");

  const { speak, getAnalyser } = useVoiceEngine({
    onTranscript: () => {},
    onStateChange: setKittState,
    voiceEnabled: true,
  });

  const speakAndShow = useCallback(
    async (text: string) => {
      setSubtitle(text);
      await speak(text);
    },
    [speak],
  );

  const openModal = useCallback(() => {
    setOpen(true);
    setSelectedProtocol(null);
    setCurrentStep(0);
    setDone(false);
    setKittState("listening");
    setSubtitle("Pas de panique. Dis-moi ce qui se passe.");
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setKittState("idle");
  }, []);

  const selectScenario = useCallback(
    async (key: ProtocolKey) => {
      if (key === "autre") {
        navigate("/app/chat?panic=autre");
        closeModal();
        return;
      }
      setSelectedProtocol(key);
      setCurrentStep(0);
      setKittState("speaking");
      await speakAndShow("OK, on va gérer ça ensemble. Première chose...");
      await new Promise((r) => setTimeout(r, 600));
      await speakAndShow(PROTOCOLS[key].steps[0]);

      if (session?.user?.id) {
        await supabase.from("audit_logs").insert({
          user_id: session.user.id,
          action: "panic_protocol",
          details: { type: key },
        });
      }
    },
    [session, speakAndShow, navigate, closeModal],
  );

  const handleNextStep = useCallback(async () => {
    if (!selectedProtocol) return;
    const protocol = PROTOCOLS[selectedProtocol];
    const next = currentStep + 1;
    if (next < protocol.steps.length) {
      setCurrentStep(next);
      await speakAndShow(protocol.steps[next]);
    } else {
      setDone(true);
      setKittState("speaking");
      await speakAndShow(protocol.conclusion);
    }
  }, [selectedProtocol, currentStep, speakAndShow]);

  const handleModuleLink = useCallback(() => {
    closeModal();
    navigate("/app/modules?domain=cyber");
  }, [closeModal, navigate]);

  // All hooks called — safe to early-return now
  const publicPaths = ['/', '/login', '/register', '/reset-password', '/pricing'];
  const isPublicPage = publicPaths.includes(location.pathname) || location.pathname.startsWith('/verify/');
  if (!session || isPublicPage) return null;

  if (!open) {
    return (
      <>
        <style>{`
          @keyframes panicPulse {
            0%, 96%, 100% { box-shadow: 0 4px 24px rgba(239,68,68,0.5); }
            97%, 99% { box-shadow: 0 4px 32px rgba(239,68,68,0.9), 0 0 0 8px rgba(239,68,68,0.2); }
          }
        `}</style>
        <button
          onClick={openModal}
          aria-label="J'ai un problème !"
          title="J'ai un problème !"
          className="fixed z-50 flex items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-destructive/70"
          style={{
            bottom: 80,
            right: 20,
            width: 56,
            height: 56,
            background: "hsl(0 84% 60%)",
            boxShadow: "0 4px 24px hsl(0 84% 60% / 0.5)",
            animation: "panicPulse 30s ease-in-out infinite",
          }}
        >
          <ShieldAlert className="w-6 h-6 text-white" />
        </button>
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-start pt-10 px-4 pb-8 overflow-y-auto"
      style={{ background: "hsl(222 47% 5% / 0.97)" }}
    >
      {/* Close */}
      <button
        onClick={closeModal}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      {/* KITT */}
      <div className="mb-6" style={{ transform: "scale(2)", transformOrigin: "center" }}>
        <KittVisualizer state={kittState} analyserNode={getAnalyser()} />
      </div>

      {/* Subtitle */}
      <p className="text-foreground text-center text-lg font-medium max-w-sm mb-8 mt-4 leading-relaxed">
        {subtitle}
      </p>

      {/* Scenario selection */}
      {!selectedProtocol && (
        <div className="w-full max-w-sm flex flex-col gap-3">
          {SCENARIOS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => selectScenario(key)}
              className="w-full min-h-[56px] flex items-center gap-3 px-5 py-4 rounded-2xl bg-card hover:bg-card/80 border border-border hover:border-destructive/50 text-foreground text-left text-sm font-medium transition-all"
            >
              <span className="text-xl">{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Protocol in progress */}
      {selectedProtocol && !done && (
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex gap-2">
            {PROTOCOLS[selectedProtocol].steps.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i <= currentStep ? "bg-destructive" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-foreground text-base leading-relaxed">
              {PROTOCOLS[selectedProtocol].steps[currentStep]}
            </p>
          </div>
          <button
            onClick={handleNextStep}
            className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-2xl font-semibold text-base transition-colors text-destructive-foreground"
            style={{ background: "hsl(0 84% 60%)" }}
          >
            Fait <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Done */}
      {done && (
        <div className="w-full max-w-sm flex flex-col items-center gap-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <button
            onClick={closeModal}
            className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-2xl bg-muted hover:bg-muted/80 text-foreground font-semibold transition-colors"
          >
            J'ai suivi les étapes ✓
          </button>
          <button
            onClick={handleModuleLink}
            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Apprendre à éviter ça à l'avenir <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
