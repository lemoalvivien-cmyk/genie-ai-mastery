/**
 * XPProgressBar — Animated XP progress with level system + dopamine feedback
 * Level thresholds: designed with spacing that creates anticipation (near-miss effect)
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Zap, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Level XP thresholds — widening gaps create sense of progression difficulty
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 900, 1500, 2400, 3700, 5500, 8000, 11500,
  16000, 22000, 30000, 40000, 55000, 75000, 100000,
];

export function getLevel(xp: number): { level: number; currentXP: number; nextXP: number; progress: number } {
  let level = 0;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i;
    else {
      const currentXP = xp - LEVEL_THRESHOLDS[level];
      const nextXP    = LEVEL_THRESHOLDS[i] - LEVEL_THRESHOLDS[level];
      return { level, currentXP, nextXP, progress: currentXP / nextXP };
    }
  }
  return { level: LEVEL_THRESHOLDS.length - 1, currentXP: xp, nextXP: xp, progress: 1 };
}

const LEVEL_TITLES = [
  "Néophyte", "Curieux", "Apprenti", "Initié", "Analyste",
  "Expert", "Vecteur d'Attaque", "Architecte Neural",
  "Chasseur d'Élite", "Maître Formetoialia", "Légende",
  "Titan Cyber", "Omniscient", "Transcendant", "Absolu",
  "Mythique", "Divin", "Formetoialia Elite",
];

interface XPProgressBarProps {
  totalXP: number;
  compact?: boolean;
  showTitle?: boolean;
  xpDelta?: number; // latest gain (for animation flash)
}

export function XPProgressBar({ totalXP, compact = false, showTitle = true, xpDelta }: XPProgressBarProps) {
  const { level, currentXP, nextXP, progress } = getLevel(totalXP);
  const title = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)];
  const [showFlash, setShowFlash] = useState(false);
  const prevDelta = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (xpDelta && xpDelta !== prevDelta.current) {
      prevDelta.current = xpDelta;
      setShowFlash(true);
      const t = setTimeout(() => setShowFlash(false), 1500);
      return () => clearTimeout(t);
    }
  }, [xpDelta]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">{level}</span>
        </div>
        <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">{totalXP} XP</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      {/* XP flash on gain */}
      {showFlash && xpDelta && (
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -20 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute -top-6 right-0 text-xs font-bold text-primary pointer-events-none"
        >
          +{xpDelta} XP ⚡
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_8px_hsl(var(--primary)/0.3)]">
            <span className="text-xs font-bold text-primary">{level}</span>
          </div>
          {showTitle && (
            <div>
              <p className="text-xs font-bold text-foreground">{title}</p>
              <p className="text-[10px] text-muted-foreground">Niveau {level}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <TrendingUp className="w-3 h-3 text-primary" />
          <span className="font-semibold text-foreground">{totalXP.toLocaleString("fr")}</span>
          <span>XP</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-muted/40 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            style={{
              background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 1.0, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
            />
          </motion.div>
          {/* Near-miss marker at 90% — creates tension */}
          <div className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: "90%" }} />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>{currentXP.toLocaleString("fr")} / {nextXP.toLocaleString("fr")} XP</span>
          <div className="flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5 text-primary" />
            <span>Niveau {level + 1} : {title !== LEVEL_TITLES[level + 1] ? LEVEL_TITLES[Math.min(level + 1, LEVEL_TITLES.length - 1)] : "Max"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
