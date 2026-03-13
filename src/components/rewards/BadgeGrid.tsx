/**
 * BadgeGrid — Neuro-rewards badge showcase with dopamine visual design
 * Shows earned badges + locked badges (with progress hints)
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { RARITY_CONFIG, type BadgeRarity } from "@/hooks/useNeuroRewards";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BadgeWithStatus {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  rarity: BadgeRarity;
  xp_reward: number;
  is_secret: boolean;
  earned: boolean;
  earnedAt?: string;
}

interface BadgeGridProps {
  badges: BadgeWithStatus[];
  showAll?: boolean;
  compact?: boolean;
}

function BadgeCard({ badge, compact }: { badge: BadgeWithStatus; compact?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const rarity = RARITY_CONFIG[badge.rarity];

  if (badge.is_secret && !badge.earned) {
    return (
      <div className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border bg-muted/20",
        compact ? "p-2 gap-1" : "p-4 gap-2",
        "border-border/30 opacity-50"
      )}>
        <Lock className={cn("text-muted-foreground/40", compact ? "w-5 h-5" : "w-7 h-7")} />
        {!compact && <p className="text-[10px] text-muted-foreground/40 font-mono">???</p>}
      </div>
    );
  }

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        "relative flex flex-col items-center rounded-xl border transition-all duration-300 cursor-default",
        compact ? "p-2 gap-1" : "p-4 gap-2",
        badge.earned
          ? cn(rarity.bg, rarity.border, rarity.glow)
          : "bg-muted/10 border-border/20 opacity-40 grayscale"
      )}
      whileHover={badge.earned ? { scale: 1.05, y: -2 } : {}}
    >
      {/* Legendary shimmer */}
      {badge.earned && badge.rarity === "legendary" && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
          />
        </div>
      )}

      <span className={cn(compact ? "text-xl" : "text-3xl")}>{badge.emoji}</span>

      {!compact && (
        <>
          <p className={cn("text-xs font-bold text-center leading-tight", rarity.color)}>
            {badge.name}
          </p>
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wide",
            rarity.color, rarity.bg, rarity.border
          )}>
            {rarity.label}
          </span>
        </>
      )}

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-50 w-44 p-3 rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-xl"
          >
            <p className="text-xs font-bold">{badge.emoji} {badge.name}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
            <div className="flex items-center justify-between mt-2">
              <span className={cn("text-[9px] font-semibold", rarity.color)}>{rarity.label}</span>
              <span className="text-[9px] text-primary font-semibold">+{badge.xp_reward} XP</span>
            </div>
            {badge.earned && badge.earnedAt && (
              <p className="text-[9px] text-muted-foreground/60 mt-1">
                Obtenu le {format(new Date(badge.earnedAt), "d MMM yyyy", { locale: fr })}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function BadgeGrid({ badges, showAll = false, compact = false }: BadgeGridProps) {
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  const filtered = badges.filter(b => {
    if (filter === "earned") return b.earned;
    if (filter === "locked") return !b.earned;
    return true;
  });

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">
            {earnedCount}/{badges.filter(b => !b.is_secret).length} badges
          </span>
        </div>
        {!compact && (
          <div className="flex gap-1">
            {(["all", "earned", "locked"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all",
                  filter === f
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40"
                )}
              >
                {f === "all" ? "Tous" : f === "earned" ? "Obtenus" : "Verrouillés"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Badge grid */}
      <div className={cn(
        "grid gap-2",
        compact
          ? "grid-cols-6 sm:grid-cols-8"
          : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
      )}>
        {filtered.map(badge => (
          <BadgeCard key={badge.id} badge={badge} compact={compact} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-8 text-center">
          <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Aucun badge dans cette catégorie</p>
        </div>
      )}
    </div>
  );
}
