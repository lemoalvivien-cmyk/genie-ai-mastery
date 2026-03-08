import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJarvisTriggers, type JarvisNudge as JarvisNudgeType } from "@/hooks/useJarvisTriggers";

const ACTION_ROUTES: Record<string, (id?: string) => string> = {
  quiz:     (id) => `/app/onboarding/quiz${id ? `?id=${id}` : ""}`,
  lab:      (id) => `/app/labs/${id ?? "cyber"}`,
  module:   (id) => id ? `/app/modules/${id}` : "/app/modules",
  chat:     ()   => "/app/jarvis",
  download: ()   => "#",
};

function getRoute(nudge: JarvisNudgeType): string {
  const fn = ACTION_ROUTES[nudge.action.type] ?? (() => "/app/jarvis");
  return fn(nudge.action.id);
}

/* ── Single nudge card ── */
function NudgeCard({
  nudge,
  onDismiss,
  onAction,
}: {
  nudge: JarvisNudgeType;
  onDismiss: (id: string) => void;
  onAction: (nudge: JarvisNudgeType) => void;
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)]",
      "rounded-2xl border border-border/60 bg-card shadow-2xl p-4",
      "animate-in slide-in-from-bottom-4 fade-in duration-300",
    )}>
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow mt-0.5">
        <Zap className="w-4 h-4 text-primary-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Label */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-1">
          KITT IA
        </p>
        {/* Message */}
        <p className="text-sm text-foreground leading-snug">{nudge.message}</p>

        {/* CTA */}
        <button
          onClick={() => onAction(nudge)}
          className={cn(
            "mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary",
            "hover:underline underline-offset-2 transition-all"
          )}
        >
          {nudge.action.label}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(nudge.id)}
        className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mt-0.5"
        aria-label="Fermer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ── Main provider + portal ── */
export function JarvisNudgeProvider() {
  const navigate = useNavigate();
  const [nudges, setNudges] = useState<JarvisNudgeType[]>([]);

  const handleNudge = useCallback((nudge: JarvisNudgeType) => {
    setNudges(prev => {
      // Don't stack — max 1 visible nudge at a time
      if (prev.some(n => n.id === nudge.id)) return prev;
      return [...prev.slice(-1), nudge]; // keep at most 2
    });

    // Auto-dismiss after 12s
    setTimeout(() => {
      setNudges(prev => prev.filter(n => n.id !== nudge.id));
    }, 12_000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNudges(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleAction = useCallback((nudge: JarvisNudgeType) => {
    dismiss(nudge.id);
    const route = getRoute(nudge);
    if (route !== "#") navigate(route);
  }, [dismiss, navigate]);

  useJarvisTriggers(handleNudge);

  if (nudges.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[60] flex flex-col gap-3 items-end pointer-events-none">
      {nudges.map(nudge => (
        <div key={nudge.id} className="pointer-events-auto">
          <NudgeCard
            nudge={nudge}
            onDismiss={dismiss}
            onAction={handleAction}
          />
        </div>
      ))}
    </div>
  );
}
