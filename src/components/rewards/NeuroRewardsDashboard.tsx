/**
 * NeuroRewardsDashboard — Full gamification dashboard
 * Système de points, streaks, badges neuro-scientifiques + Hive Intelligence
 *
 * Intégration dans /app :
 *   import NeuroRewardsDashboard from "@/components/rewards/NeuroRewardsDashboard";
 *   <NeuroRewardsDashboard />
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Trophy, Zap, Star, TrendingUp,
  Brain, Users, ChevronRight, Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNeuroRewards, RARITY_CONFIG } from "@/hooks/useNeuroRewards";
import { useStreak } from "@/hooks/useStreak";
import { BadgeGrid } from "@/components/rewards/BadgeGrid";
import { XPProgressBar } from "@/components/rewards/XPProgressBar";
import { HiveFeedbackWidget } from "@/components/rewards/HiveFeedbackWidget";

type Tab = "progression" | "badges" | "hive";

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "progression", icon: TrendingUp, label: "Progression" },
  { id: "badges",      icon: Trophy,     label: "Badges" },
  { id: "hive",        icon: Users,      label: "Hive" },
];

// Streak fire display
function StreakFlame({ streak }: { streak: number }) {
  const size = streak >= 30 ? "legendary" : streak >= 14 ? "epic" : streak >= 7 ? "rare" : streak >= 3 ? "uncommon" : "common";
  const colors = {
    common: "text-orange-400", uncommon: "text-amber-400",
    rare: "text-yellow-300", epic: "text-red-400", legendary: "text-pink-400",
  };
  return (
    <div className="flex items-center gap-1">
      <Flame className={cn("w-5 h-5", colors[size], streak > 0 && "animate-pulse")} />
      <span className={cn("text-xl font-black font-mono", colors[size])}>{streak}</span>
      <span className="text-xs text-muted-foreground">jours</span>
    </div>
  );
}

// Recent reward event row
function RewardRow({ ev, badgeName, badgeEmoji }: {
  ev: { event_type: string; xp_delta: number; badge_id?: string; multiplier: number; is_surprise: boolean; created_at: string };
  badgeName?: string;
  badgeEmoji?: string;
}) {
  const isSurprise = ev.is_surprise;
  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all",
      isSurprise ? "border-primary/30 bg-primary/5" : "border-border/30 bg-muted/10"
    )}>
      <span className="text-lg shrink-0">
        {ev.event_type === "badge_earned" ? (badgeEmoji ?? "🏆")
          : isSurprise ? "⚡" : "✨"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">
          {ev.event_type === "badge_earned"
            ? `Badge : ${badgeName ?? ev.badge_id}`
            : isSurprise ? `Bonus × ${ev.multiplier.toFixed(1)} !`
            : "XP gagné"
          }
        </p>
        <p className="text-[10px] text-muted-foreground">
          +{ev.xp_delta} XP{isSurprise && " 🎯 Surprise"}
        </p>
      </div>
      {isSurprise && (
        <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary font-semibold">
          BONUS
        </span>
      )}
    </div>
  );
}

export default function NeuroRewardsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("progression");
  const { streak } = useStreak();
  const {
    badgesWithStatus,
    recentRewards,
    totalXP,
    isLoading,
    checkBadges,
  } = useNeuroRewards();

  const currentStreak  = streak?.current_streak  ?? 0;
  const longestStreak  = streak?.longest_streak  ?? 0;
  const earnedCount    = badgesWithStatus.filter(b => b.earned).length;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Top stats row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Streak */}
        <div className="rounded-xl border border-border/40 bg-card/50 p-3 flex flex-col gap-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Streak</p>
          <StreakFlame streak={currentStreak} />
          <p className="text-[10px] text-muted-foreground">Record : {longestStreak}j</p>
        </div>

        {/* Total XP */}
        <div className="rounded-xl border border-border/40 bg-card/50 p-3 flex flex-col gap-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">XP Total</p>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xl font-black text-primary font-mono">{totalXP.toLocaleString("fr")}</span>
          </div>
          <XPProgressBar totalXP={totalXP} compact showTitle={false} />
        </div>

        {/* Badges */}
        <div className="rounded-xl border border-border/40 bg-card/50 p-3 flex flex-col gap-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Badges</p>
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xl font-black text-amber-400 font-mono">{earnedCount}</span>
            <span className="text-xs text-muted-foreground">/ {badgesWithStatus.filter(b => !b.is_secret).length}</span>
          </div>
          {/* Last 3 earned badges preview */}
          <div className="flex gap-1 mt-0.5">
            {badgesWithStatus.filter(b => b.earned).slice(0, 3).map(b => (
              <span key={b.id} className="text-base" title={b.name}>{b.emoji}</span>
            ))}
            {earnedCount === 0 && <span className="text-[10px] text-muted-foreground">Aucun encore</span>}
          </div>
        </div>
      </div>

      {/* ── XP Progress full bar ──────────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-4">
        <XPProgressBar totalXP={totalXP} showTitle />
      </div>

      {/* ── Tab navigation ───────────────────────────────────────── */}
      <div className="flex gap-1 bg-muted/20 rounded-xl p-1 border border-border/30">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === tab.id
                ? "bg-card border border-border/50 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "progression" && (
            <div className="space-y-3">
              {/* Recent rewards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-primary" />
                    Dernières récompenses
                  </p>
                  <button
                    onClick={checkBadges}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    <ChevronRight className="w-3 h-3" />
                    Vérifier badges
                  </button>
                </div>

                {recentRewards.length === 0 ? (
                  <div className="py-6 text-center">
                    <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Complétez des modules pour gagner des récompenses</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {recentRewards.slice(0, 8).map(ev => {
                      const badge = badgesWithStatus.find(b => b.id === ev.badge_id);
                      return (
                        <RewardRow
                          key={ev.id}
                          ev={ev}
                          badgeName={badge?.name}
                          badgeEmoji={badge?.emoji}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rarity legend */}
              <div className="rounded-xl border border-border/30 bg-card/30 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Raretés</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(RARITY_CONFIG) as [string, typeof RARITY_CONFIG[keyof typeof RARITY_CONFIG]][]).map(([key, cfg]) => (
                    <span key={key} className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full border font-semibold",
                      cfg.color, cfg.bg, cfg.border
                    )}>
                      {cfg.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "badges" && (
            <div className={isLoading ? "opacity-60 pointer-events-none" : ""}>
              <BadgeGrid badges={badgesWithStatus} showAll />
            </div>
          )}

          {activeTab === "hive" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-3">
                <Users className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Intelligence Collective</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Vos feedbacks anonymes améliorent le RAG IA pour toute la communauté.
                    Chaque signal collectif renforce l'apprentissage du swarm.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl border border-border/30 bg-card/30">
                <Award className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-xs font-semibold">Badges Hive disponibles</p>
                  <div className="flex gap-1 mt-1">
                    {badgesWithStatus.filter(b => b.category === "hive").map(b => (
                      <span key={b.id} className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                        b.earned ? "text-amber-400 bg-amber-500/10 border-amber-500/30" : "text-muted-foreground bg-muted/20 border-border/30"
                      )}>
                        {b.emoji} {b.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <HiveFeedbackWidget
                moduleSlug="general"
                embeddingHint="general feedback"
                onContributed={checkBadges}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
