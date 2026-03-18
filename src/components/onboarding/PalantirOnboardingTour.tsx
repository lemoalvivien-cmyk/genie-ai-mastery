/**
 * PalantirOnboardingTour — 3-step interactive tour
 * Shows once per user (localStorage key). Skippable. Tracked in brain_events.
 * Steps: 1) Formetoialia Brain intro 2) Swarm 5 agents 3) Activate Palantir CTA
 */
import { useState, useEffect } from "react";
import { Brain, Sword, Shield, Eye, BarChart3, Zap, ChevronRight, X, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrainTracker } from "@/hooks/useBrainTracker";

const TOUR_KEY = "formetoialia_palantir_tour_v1_done";

interface Props {
  onComplete: () => void;
  onActivatePalantir: () => void;
}

const STEPS = [
  {
    id: "brain",
    icon: Brain,
    iconColor: "text-primary",
    iconBg: "bg-primary/20 border-primary/40",
    badge: "FORMETOIALIA BRAIN",
    badgeColor: "bg-primary/20 text-primary border-primary/30",
    title: "Votre IA de niveau entreprise est prête",
    desc: "Formetoialia Brain fusionne en temps réel tout ce que vous avez appris — vos lacunes, vos risques cyber, vos scores — dans une ontologie intelligente. Exactement comme Palantir Foundry, mais pour votre formation.",
    visual: (
      <div className="relative flex items-center justify-center h-28">
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" style={{ animationDuration: "3s" }} />
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Brain className="w-10 h-10 text-primary" />
        </div>
        {[
          { label: "Risque", val: "73", color: "#EF4444", angle: -60 },
          { label: "Score", val: "85", color: "#10B981", angle: 60 },
          { label: "Prédiction", val: "24h", color: "#8B5CF6", angle: 180 },
        ].map(({ label, val, color, angle }) => (
          <div key={label}
            className="absolute text-center"
            style={{
              transform: `rotate(${angle}deg) translateX(52px) rotate(${-angle}deg)`,
              transformOrigin: "center",
            }}>
            <div className="text-xs font-black" style={{ color }}>{val}</div>
            <div className="text-[9px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "swarm",
    icon: Zap,
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-400/20 border-yellow-400/40",
    badge: "SWARM 5 AGENTS",
    badgeColor: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
    title: "5 agents IA travaillent en parallèle",
    desc: "Chaque message déclenche un swarm complet : l'Attaquant simule des cyberattaques réelles, le Défenseur vous protège, le Tuteur explique, le Predictor prédit votre prochain échec 24h avant, l'Analyst génère vos rapports Palantir.",
    visual: (
      <div className="grid grid-cols-5 gap-2 py-2">
        {[
          { icon: Sword, label: "Attaquant", color: "#EF4444", emoji: "🗡️" },
          { icon: Shield, label: "Défenseur", color: "#3B82F6", emoji: "🛡️" },
          { icon: Brain, label: "Tuteur", color: "#5257D8", emoji: "🎓" },
          { icon: Eye, label: "Predictor", color: "#8B5CF6", emoji: "🔮" },
          { icon: BarChart3, label: "Analyst", color: "#10B981", emoji: "📊" },
        ].map(({ icon: Icon, label, color, emoji }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-lg border flex items-center justify-center animate-pulse"
              style={{ background: `${color}15`, borderColor: `${color}40`, animationDelay: `${Math.random() * 0.5}s` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "activate",
    icon: Rocket,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-400/20 border-emerald-400/40",
    badge: "TIME TO VALUE : 60s",
    badgeColor: "bg-emerald-400/20 text-emerald-400 border-emerald-400/30",
    title: "Activez le Mode Palantir maintenant",
    desc: "Cliquez sur \"⚡ Activer Mode Palantir\" dans le chat, posez n'importe quelle question cyber ou IA — les 5 agents répondent en parallèle avec votre score de risque, une prédiction d'échec et un module correctif auto-généré.",
    visual: (
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="px-4 py-2 rounded-full border-2 border-primary/60 bg-primary/15 flex items-center gap-2 text-sm font-black text-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
          <Brain className="w-4 h-4 animate-pulse" />
          ⚡ MODE PALANTIR ACTIF
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/30 border border-primary/40">5 AGENTS</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />MITRE ATT&CK live</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />Prédiction 24h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />Module auto</span>
        </div>
      </div>
    ),
  },
];

export function PalantirOnboardingTour({ onComplete, onActivatePalantir }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const { trackBrain } = useBrainTracker();

  useEffect(() => {
    // Small delay so the chat renders first, then tour slides in
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleSkip = () => {
    localStorage.setItem(TOUR_KEY, "1");
    trackBrain("palantir_deactivated", { metadata: { action: "tour_skipped", step } });
    onComplete();
  };

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(TOUR_KEY, "1");
      trackBrain("swarm_completed", { metadata: { action: "tour_completed" } });
      onActivatePalantir();
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-sm rounded-2xl border overflow-hidden shadow-2xl"
        style={{
          background: "#13151E",
          borderColor: "rgba(82,87,216,0.4)",
          boxShadow: "0 0 60px rgba(82,87,216,0.25)",
          animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
        {/* Progress bar */}
        <div className="h-0.5 bg-border/40">
          <div className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Step dots */}
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => i < step && setStep(i)}
                  className={`transition-all duration-300 rounded-full ${
                    i === step ? "w-6 h-2 bg-primary" :
                    i < step ? "w-2 h-2 bg-primary/60" : "w-2 h-2 bg-border/60"
                  }`} />
              ))}
              <span className="text-[10px] text-muted-foreground ml-1">{step + 1}/{STEPS.length}</span>
            </div>
            <button onClick={handleSkip}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors text-xs flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Passer
            </button>
          </div>

          {/* Badge */}
          <div className="mb-3">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${current.badgeColor}`}>
              {current.badge}
            </span>
          </div>

          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${current.iconBg}`}>
            <current.icon className={`w-5 h-5 ${current.iconColor}`} />
          </div>

          {/* Content */}
          <h2 className="font-black text-lg text-foreground leading-tight mb-2">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{current.desc}</p>

          {/* Visual */}
          <div className="rounded-xl border border-border/40 bg-background/40 px-4 mb-5">
            {current.visual}
          </div>

          {/* CTA */}
          {isLast ? (
            <Button onClick={handleNext} className="w-full gap-2 font-black text-sm h-11"
              style={{ background: "#5257D8", boxShadow: "0 0 20px rgba(82,87,216,0.5)" }}>
              <Brain className="w-4 h-4" />
              ⚡ Activer le Mode Palantir maintenant
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleNext} className="flex-1 gap-2 font-bold text-sm">
                Suivant <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** Returns true if user has not seen the tour yet */
export function shouldShowTour(): boolean {
  return !localStorage.getItem(TOUR_KEY);
}
