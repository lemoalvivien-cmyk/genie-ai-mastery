/**
 * OnboardingResult — Étape 3 : Score + badge + mini-PDF
 * Mobile-first, tient en 1 écran
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Trophy, ShieldCheck, ShieldAlert, ShieldX, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/components/ui/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";

type RiskLevel = "faible" | "modere" | "eleve";

function getRiskLevel(score: number): RiskLevel {
  if (score >= 67) return "faible";
  if (score >= 34) return "modere";
  return "eleve";
}

const RISK_CONFIG: Record<RiskLevel, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  border: string;
  message: string;
}> = {
  faible: {
    icon: <ShieldCheck className="w-10 h-10" />,
    label: "Faible risque",
    color: "text-emerald-400",
    bg: "hsl(142 76% 36% / 0.12)",
    border: "hsl(142 76% 36% / 0.4)",
    message: "Bonne base ! Vous connaissez les signaux d'alerte. La formation va renforcer vos réflexes.",
  },
  modere: {
    icon: <ShieldAlert className="w-10 h-10" />,
    label: "Risque modéré",
    color: "text-yellow-400",
    bg: "hsl(45 93% 47% / 0.12)",
    border: "hsl(45 93% 47% / 0.4)",
    message: "Quelques angles morts détectés. JARVIS va cibler exactement ces vulnérabilités.",
  },
  eleve: {
    icon: <ShieldX className="w-10 h-10" />,
    label: "Risque élevé",
    color: "text-red-400",
    bg: "hsl(0 72% 51% / 0.12)",
    border: "hsl(0 72% 51% / 0.4)",
    message: "Pas de panique — la plupart des gens sont dans ce cas. C'est exactement pour ça que Formetoialia existe.",
  },
};

export default function OnboardingResult() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { getStoredScore, finishOnboarding } = useOnboarding();

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [confetti, setConfetti] = useState(false);

  const { score, correct, total } = getStoredScore();
  const risk = getRiskLevel(score);
  const cfg = RISK_CONFIG[risk];

  // Score counter animation
  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.ceil(score / 25));
    const timer = setInterval(() => {
      current = Math.min(current + step, score);
      setDisplayScore(current);
      if (current >= score) {
        clearInterval(timer);
        if (score >= 67) setTimeout(() => setConfetti(true), 200);
      }
    }, 35);
    return () => clearInterval(timer);
  }, [score]);

  const handleGeneratePdf = async () => {
    if (pdfLoading || pdfDone || !session) return;
    setPdfLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: {
          type: "checklist",
          base_url: window.location.origin,
          custom_title: "Mon Premier Bilan Cyber",
          custom_content: `Score phishing : ${score}% (${correct}/${total}) — Niveau : ${cfg.label}`,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error ?? "Erreur génération PDF");
      }

      track("onboarding_pdf_generated", { score, risk });
      setPdfDone(true);
      toast({ title: "✅ Bilan généré !", description: "Votre premier bilan cyber est prêt." });

      // Trigger download
      if (data.signed_url) {
        window.open(data.signed_url, "_blank");
      } else if (data.pdf_base64) {
        const byteChars = atob(data.pdf_base64);
        const bytes = new Uint8Array(byteChars.length).map((_, i) => byteChars.charCodeAt(i));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bilan-cyber-formetoialia.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      toast({
        title: "PDF non disponible",
        description: "Disponible avec Formetoialia Pro. Continuez votre parcours !",
        variant: "destructive",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Mon Bilan Cyber – Formetoialia</title></Helmet>

      {/* Confetti */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 36 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-8%",
                background: ["hsl(var(--primary))", "hsl(var(--accent))", "#22C55E", "#F59E0B", "#F97316"][i % 5],
                animation: `confettiFall ${1.2 + Math.random() * 1.8}s ease-in ${Math.random() * 1.2}s forwards`,
              }}
            />
          ))}
        </div>
      )}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(540deg); opacity: 0; }
        }
      `}</style>

      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-40 h-1">
        <div className="h-full w-3/4" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }} />
      </div>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">

          {/* Badge de risque */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: cfg.bg, border: `2px solid ${cfg.border}` }}
            >
              <span className={cfg.color}>{cfg.icon}</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Votre profil cyber
              </p>
              <h1 className="text-2xl font-black text-foreground">{cfg.label}</h1>
            </div>
          </div>

          {/* Score animé */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div className="text-5xl font-black font-mono mb-1" style={{ color: "hsl(var(--primary))" }}>
              {displayScore}%
            </div>
            <p className="text-sm text-muted-foreground">
              {correct} / {total} bonnes réponses
            </p>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${displayScore}%`,
                  background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                }}
              />
            </div>
          </div>

          {/* Message contextuel */}
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border)/0.6)" }}
          >
            <Trophy className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">{cfg.message}</p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleGeneratePdf}
              disabled={pdfLoading}
              variant="outline"
              className="w-full font-semibold gap-2"
            >
              {pdfLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FileText className="w-4 h-4" />
              }
              {pdfDone ? "✅ Bilan téléchargé !" : "Télécharger mon bilan PDF"}
            </Button>

            <Button
              onClick={() => finishOnboarding(false)}
              className="w-full font-black py-5 shadow-glow"
              style={{ background: "hsl(var(--accent))" }}
            >
              Voir comment débloquer tout →
            </Button>

            <button
              onClick={() => finishOnboarding(true)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Explorer d'abord — aller au dashboard
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
