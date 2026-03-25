/**
 * GhostTrainerFeedback — feedback structuré post-action
 * 5 sections : forces, faiblesses, amélioration, version améliorée, prochain défi
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ArrowRight,
  BookMarked,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSaveArtifact } from "@/hooks/useSaveArtifact";

export interface GhostFeedback {
  strengths: string;
  weaknesses: string;
  improvement_tip: string;
  improved_version: string;
  next_challenge: string;
  artifact_title?: string;
  artifact_type?: string;
}

interface GhostTrainerFeedbackProps {
  feedback: GhostFeedback;
  userInput?: string;
  missionTitle?: string;
  isLoading?: boolean;
  onNextChallenge?: () => void;
  className?: string;
}

const SECTIONS = [
  {
    key: "strengths" as const,
    icon: CheckCircle2,
    label: "Ce qui est bien",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10 border-emerald-500/20",
    iconBg: "bg-emerald-500/20",
  },
  {
    key: "weaknesses" as const,
    icon: AlertTriangle,
    label: "À améliorer",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10 border-amber-500/20",
    iconBg: "bg-amber-500/20",
  },
  {
    key: "improvement_tip" as const,
    icon: Lightbulb,
    label: "Comment progresser",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/10 border-blue-500/20",
    iconBg: "bg-blue-500/20",
  },
];

function FeedbackSection({
  icon: Icon,
  label,
  content,
  colorClass,
  bgClass,
  iconBg,
  delay,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  content: string;
  colorClass: string;
  bgClass: string;
  iconBg: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn("rounded-xl border p-3.5 space-y-1.5", bgClass)}
    >
      <div className="flex items-center gap-2">
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", iconBg)}>
          <Icon className={cn("w-3.5 h-3.5", colorClass)} />
        </div>
        <span className={cn("text-xs font-semibold uppercase tracking-wide", colorClass)}>{label}</span>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed pl-8">{content}</p>
    </motion.div>
  );
}

export function GhostTrainerFeedback({
  feedback,
  userInput,
  missionTitle,
  isLoading = false,
  onNextChallenge,
  className,
}: GhostTrainerFeedbackProps) {
  const { saveArtifact, isSaving } = useSaveArtifact();
  const [showImproved, setShowImproved] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const title = feedback.artifact_title ?? missionTitle ?? "Artefact";
    const type = feedback.artifact_type ?? "synthese";
    const content = [
      `# ${missionTitle ?? "Mission"}`,
      "",
      `## Ma réponse`,
      userInput ?? "",
      "",
      `## Feedback`,
      `**Forces :** ${feedback.strengths}`,
      `**À améliorer :** ${feedback.weaknesses}`,
      `**Conseil :** ${feedback.improvement_tip}`,
      "",
      `## Version améliorée`,
      feedback.improved_version,
      "",
      `## Prochain défi`,
      feedback.next_challenge,
    ].join("\n");

    const id = await saveArtifact({ title, type, content });
    if (id) setSaved(true);
  };

  if (isLoading) {
    return (
      <div className={cn("rounded-2xl border border-border/40 bg-card/60 p-5", className)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Ghost Trainer analyse…</p>
            <p className="text-xs text-muted-foreground">Feedback IA en cours de génération</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden", className)}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/30 flex items-center gap-3"
           style={{ background: "linear-gradient(135deg, rgba(82,87,216,0.08), transparent)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: "rgba(82,87,216,0.2)", border: "1px solid rgba(82,87,216,0.3)" }}>
          <Sparkles className="w-4.5 h-4.5" style={{ color: "#5257D8" }} />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Ghost Trainer</p>
          <p className="text-xs text-muted-foreground">Analyse personnalisée · Feedback immédiat</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 3 sections principales */}
        {SECTIONS.map((s, i) => (
          <FeedbackSection
            key={s.key}
            icon={s.icon}
            label={s.label}
            content={feedback[s.key]}
            colorClass={s.colorClass}
            bgClass={s.bgClass}
            iconBg={s.iconBg}
            delay={i * 0.08}
          />
        ))}

        {/* Version améliorée (accordéon) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden"
        >
          <button
            onClick={() => setShowImproved((v) => !v)}
            className="w-full flex items-center justify-between px-3.5 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">Version améliorée</span>
            </div>
            {showImproved ? (
              <ChevronUp className="w-4 h-4 text-primary/60" />
            ) : (
              <ChevronDown className="w-4 h-4 text-primary/60" />
            )}
          </button>
          <AnimatePresence>
            {showImproved && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-1">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-mono text-xs bg-black/20 rounded-lg p-3 border border-primary/10">
                    {feedback.improved_version}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Prochain défi */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5"
        >
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400 mb-1">Prochain mini-défi</p>
              <p className="text-sm text-foreground/90 leading-relaxed">{feedback.next_challenge}</p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-2 pt-1"
        >
          {!saved ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2 text-xs h-9 border-border/40 hover:border-primary/40"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BookMarked className="w-3.5 h-3.5" />
              )}
              Sauvegarder dans ma bibliothèque
            </Button>
          ) : (
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Sauvegardé dans votre bibliothèque</span>
            </div>
          )}
          {onNextChallenge && (
            <Button
              size="sm"
              className="gap-2 text-xs h-9"
              onClick={onNextChallenge}
            >
              Défi suivant
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
