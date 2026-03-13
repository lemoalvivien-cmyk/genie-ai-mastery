/**
 * HiveFeedbackWidget — Collective Intelligence feedback panel
 * Anonyme, éthique, gamifié — contribue au RAG de toute la communauté
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ThumbsUp, ThumbsDown, AlertTriangle, RefreshCw, Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHiveFeedback, type HiveFeedbackType } from "@/hooks/useHiveFeedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const FEEDBACK_OPTIONS: { type: HiveFeedbackType; emoji: string; label: string; cls: string }[] = [
  { type: "great",     emoji: "🔥", label: "Excellent",  cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" },
  { type: "helpful",   emoji: "👍", label: "Utile",      cls: "border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" },
  { type: "confusing", emoji: "😕", label: "Confus",     cls: "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" },
  { type: "outdated",  emoji: "⏳", label: "Obsolète",   cls: "border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20" },
  { type: "wrong",     emoji: "❌", label: "Incorrect",  cls: "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20" },
];

interface HiveFeedbackWidgetProps {
  moduleSlug: string;
  questionHash?: string;
  embeddingHint?: string;
  compact?: boolean;
  onContributed?: () => void;
}

export function HiveFeedbackWidget({
  moduleSlug,
  questionHash,
  embeddingHint,
  compact = false,
  onContributed,
}: HiveFeedbackWidgetProps) {
  const { submitFeedback, isSubmitting, submitted, setSubmitted } = useHiveFeedback();
  const [selected, setSelected] = useState<HiveFeedbackType | null>(null);
  const [score, setScore] = useState<number>(0);
  const [suggestedFix, setSuggestedFix] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    const ok = await submitFeedback({
      moduleSlug,
      feedbackType: selected,
      qualityScore: score || undefined,
      suggestedFix: suggestedFix.trim() || undefined,
      embeddingHint,
      questionHash,
    });
    if (ok) onContributed?.();
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-2 py-4 text-center"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-sm font-bold text-foreground">Contribution Hive enregistrée !</p>
        <p className="text-[11px] text-muted-foreground max-w-[200px]">
          Votre signal améliore l'IA pour toute la communauté. 🐝
        </p>
        <button
          onClick={() => { setSubmitted(false); setSelected(null); setSuggestedFix(""); setScore(0); }}
          className="text-[10px] text-primary hover:underline mt-1"
        >
          Donner un autre avis
        </button>
      </motion.div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Hive:</span>
        {FEEDBACK_OPTIONS.slice(0, 3).map(opt => (
          <button
            key={opt.type}
            onClick={() => { setSelected(opt.type); handleSubmit(); }}
            disabled={isSubmitting}
            className={cn(
              "text-sm px-1 py-0.5 rounded border transition-all",
              opt.cls,
              selected === opt.type && "ring-1 ring-current"
            )}
            title={opt.label}
          >
            {opt.emoji}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Users className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div>
          <p className="text-xs font-bold">Intelligence Collective Hive</p>
          <p className="text-[10px] text-muted-foreground">Votre avis améliore l'IA pour tous (anonyme)</p>
        </div>
      </div>

      {/* Feedback type buttons */}
      <div className="grid grid-cols-5 gap-1.5">
        {FEEDBACK_OPTIONS.map(opt => (
          <button
            key={opt.type}
            onClick={() => {
              setSelected(opt.type);
              if (["wrong", "confusing", "outdated"].includes(opt.type)) setShowDetails(true);
            }}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border transition-all text-center",
              opt.cls,
              selected === opt.type && "ring-1 ring-current scale-105"
            )}
          >
            <span className="text-base">{opt.emoji}</span>
            <span className="text-[9px] font-medium leading-none">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Quality stars */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">Qualité :</span>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(s => (
            <button
              key={s}
              onClick={() => setScore(s)}
              className={cn(
                "text-base transition-all",
                s <= score ? "text-amber-400 scale-110" : "text-muted-foreground/30 hover:text-amber-400/50"
              )}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Optional details for actionable feedback */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Textarea
              value={suggestedFix}
              onChange={e => setSuggestedFix(e.target.value)}
              placeholder="Suggestion d'amélioration (optionnel)…"
              rows={2}
              maxLength={500}
              className="text-xs resize-none bg-input/50 border-border/40"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <Button
        size="sm"
        className="w-full gap-2 h-8 text-xs"
        onClick={handleSubmit}
        disabled={!selected || isSubmitting}
      >
        {isSubmitting ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          <Send className="w-3 h-3" />
        )}
        Contribuer au Hive
      </Button>

      <p className="text-[9px] text-muted-foreground/50 text-center">
        🔒 Anonyme · Données agrégées · Améliore le RAG collectif
      </p>
    </div>
  );
}
