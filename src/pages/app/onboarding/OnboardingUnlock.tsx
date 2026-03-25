/**
 * OnboardingUnlock — Étape 4 : CTA vers pricing
 * Mobile-first, une seule action principale
 */
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Check, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";

const PRO_PERKS = [
  "Copilote KITT — 500 échanges/jour",
  "Playbooks complets et missions illimitées",
  "Attestations PDF vérifiables",
  "Streaks et progression mesurable",
  "25 sièges équipe inclus",
  "Sans engagement — résiliation en 2 clics",
];

export default function OnboardingUnlock() {
  const navigate = useNavigate();
  const { getStoredScore } = useOnboarding();
  const { score } = getStoredScore();

  return (
    <>
      <Helmet><title>Débloquez Formetoialia Pro — 59€ TTC/mois</title></Helmet>

      {/* Top progress bar — complete */}
      <div className="fixed top-0 left-0 right-0 z-40 h-1">
        <div
          className="h-full w-full"
          style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }}
        />
      </div>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">

          {/* Hero */}
          <div className="text-center space-y-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "hsl(var(--accent) / 0.15)" }}
            >
              <Zap className="w-7 h-7" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <h1 className="text-2xl font-black text-foreground leading-tight">
              Votre bilan est prêt.
              <br />
              <span style={{ color: "hsl(var(--accent))" }}>Passez à l'action.</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {score < 67
                ? "Formetoialia a identifié vos vulnérabilités. Laissez l'IA les corriger pour vous."
                : "Bonne base ! Formetoialia va renforcer et automatiser vos bonnes pratiques."}
            </p>
          </div>

          {/* Prix */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "hsl(var(--card))",
              border: "2px solid hsl(var(--primary))",
              boxShadow: "0 0 24px hsl(var(--primary) / 0.15)",
            }}
          >
            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl font-black text-foreground">59€</span>
              <span className="text-muted-foreground text-sm mb-1.5">TTC/mois</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              par organisation · 25 sièges · essai 14 jours gratuit
            </p>

            <ul className="space-y-2.5 mb-4">
              {PRO_PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-sm text-foreground">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  {p}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => navigate("/pricing")}
              className="w-full font-black py-5 text-base shadow-glow flex items-center justify-center gap-2"
              style={{ background: "hsl(var(--accent))" }}
            >
              Commencer l'essai gratuit
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              14 jours d'essai gratuit — aucune facturation immédiate. Annulation sans conditions.
            </p>
          </div>

          {/* Fallback */}
          <button
            onClick={() => navigate("/app/dashboard", { replace: true })}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Continuer avec la version gratuite →
          </button>
        </div>
      </div>
    </>
  );
}
