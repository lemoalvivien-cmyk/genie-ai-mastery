/**
 * QuickStartModal — shown after 2nd message in normal mode to nudge Palantir activation.
 * 60-second guided demo with one-click activation.
 */
import { useState, useEffect } from "react";
import { Brain, Sword, Shield, Eye, BarChart3, Zap, X, PlayCircle, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBrainTracker } from "@/hooks/useBrainTracker";

const QUICK_START_KEY = "formetoialia_quickstart_shown_v1";

interface Props {
  onActivate: () => void;
  onDismiss: () => void;
  sessionId: string;
}

const DEMO_PROMPTS = [
  "Comment se protéger contre le phishing en entreprise ?",
  "Explique les attaques par injection SQL",
  "Qu'est-ce que le Zero Trust et comment l'implémenter ?",
];

const AGENTS = [
  { icon: Sword, label: "Attaquant", desc: "Simule une vraie attaque", color: "#EF4444" },
  { icon: Shield, label: "Défenseur", desc: "Contre-mesures live", color: "#3B82F6" },
  { icon: Brain, label: "Tuteur", desc: "Pédagogie adaptée", color: "#5257D8" },
  { icon: Eye, label: "Predictor", desc: "Prédit votre prochain échec", color: "#8B5CF6" },
  { icon: BarChart3, label: "Analyst", desc: "Dashboard Palantir", color: "#10B981" },
];

export function QuickStartModal({ onActivate, onDismiss, sessionId }: Props) {
  const [animStep, setAnimStep] = useState(0);
  const { trackBrain } = useBrainTracker();

  // Animate agents appearing one by one
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimStep(s => s < AGENTS.length ? s + 1 : s);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const handleActivate = (prompt?: string) => {
    localStorage.setItem(QUICK_START_KEY, "1");
    trackBrain("palantir_activated", {
      session_id: sessionId,
      metadata: { source: "quick_start_modal", demo_prompt: prompt ?? null },
    });
    onActivate();
    if (prompt) {
      // Dispatch custom event to pre-fill chat input
      window.dispatchEvent(new CustomEvent("formetoialia:prefill_chat", { detail: { text: prompt } }));
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(QUICK_START_KEY, "1");
    trackBrain("palantir_deactivated", {
      session_id: sessionId,
      metadata: { action: "quick_start_dismissed" },
    });
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl"
        style={{
          background: "#13151E",
          borderColor: "rgba(82,87,216,0.5)",
          boxShadow: "0 0 80px rgba(82,87,216,0.3)",
          animation: "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
        {/* Glow top bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #5257D8, #8B5CF6, #10B981)" }} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div>
                <div className="font-black text-sm text-foreground">Quick Start — Mode Palantir</div>
                <div className="text-[10px] text-muted-foreground">Activation en 10 secondes</div>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Insight nudge */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5 mb-4">
            <TrendingDown className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-bold">Le Mode Normal ne prédit pas vos lacunes.</span>
              {" "}Avec Palantir, le swarm de 5 agents détecte votre prochain échec 24h avant qu'il arrive.
            </div>
          </div>

          {/* Agent swarm animation */}
          <div className="mb-4">
            <div className="text-[11px] text-muted-foreground font-medium mb-2">Swarm qui s'active…</div>
            <div className="flex gap-2">
              {AGENTS.map(({ icon: Icon, label, color }, i) => (
                <div key={label}
                  className="flex-1 flex flex-col items-center gap-1 transition-all duration-300"
                  style={{
                    opacity: i < animStep ? 1 : 0.2,
                    transform: i < animStep ? "translateY(0)" : "translateY(4px)",
                  }}>
                  <div className="w-9 h-9 rounded-lg border flex items-center justify-center"
                    style={{
                      background: i < animStep ? `${color}20` : "transparent",
                      borderColor: i < animStep ? `${color}50` : "hsl(var(--border))",
                      boxShadow: i < animStep ? `0 0 8px ${color}30` : "none",
                      transition: "all 0.4s",
                    }}>
                    <Icon className="w-4 h-4" style={{ color: i < animStep ? color : "hsl(var(--muted-foreground))" }} />
                  </div>
                  <span className="text-[8px] text-center leading-tight text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Demo prompts */}
          <div className="mb-4">
            <div className="text-[11px] text-muted-foreground font-medium mb-2">Essayez avec un exemple :</div>
            <div className="space-y-1.5">
              {DEMO_PROMPTS.map((prompt) => (
                <button key={prompt}
                  onClick={() => handleActivate(prompt)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border/50 bg-card/30 hover:bg-primary/5 hover:border-primary/40 transition-all text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <PlayCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Stats proof */}
          <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            {[
              { val: "247ms", label: "vs 47s humain" },
              { val: "0%", label: "d'erreurs" },
              { val: "24/7", label: "disponible" },
            ].map(({ val, label }) => (
              <div key={val} className="flex-1 text-center">
                <div className="text-sm font-black text-emerald-400">{val}</div>
                <div className="text-[9px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          {/* Main CTA */}
          <Button onClick={() => handleActivate()} className="w-full h-11 gap-2 font-black text-sm"
            style={{ background: "linear-gradient(135deg, #5257D8, #8B5CF6)", boxShadow: "0 0 24px rgba(82,87,216,0.4)" }}>
            <Brain className="w-4 h-4" />
            ⚡ Activer le Mode Palantir — Gratuit
          </Button>

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Aucune configuration requise · Activable/désactivable à tout moment
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** Returns true if user hasn't seen quick start modal */
export function shouldShowQuickStart(): boolean {
  return !localStorage.getItem(QUICK_START_KEY);
}
