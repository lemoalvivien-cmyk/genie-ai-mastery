import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";

export interface JarvisNudge {
  id: string;
  message: string;
  action: { type: "quiz" | "lab" | "module" | "chat" | "download"; label: string; id?: string };
}

interface TriggerContext {
  lastQuizScore: number | null;
  sessionCount: number;
  idleSeconds: number;
  hasInteracted: boolean;
  justCompletedModule: boolean;
  lastActivityDaysAgo: number;
}

interface Trigger {
  id: string;
  condition: (ctx: TriggerContext) => boolean;
  message: string;
  action: JarvisNudge["action"];
}

const TRIGGERS: Trigger[] = [
  {
    id: "quiz_failed",
    condition: (ctx) => ctx.lastQuizScore !== null && ctx.lastQuizScore < 60,
    message: "Je vois que tu as eu des difficultés sur ce quiz. On peut revoir les points clés ensemble ! 💪",
    action: { type: "quiz", label: "Revoir les points clés", id: "phishing" },
  },
  {
    id: "first_login",
    condition: (ctx) => ctx.sessionCount === 1,
    message: "Bienvenue ! Commençons par évaluer ton niveau en 2 minutes — pas de pression 😊",
    action: { type: "lab", label: "Quiz de positionnement", id: "cyber" },
  },
  {
    id: "inactivity_45s",
    condition: (ctx) => ctx.idleSeconds > 45 && !ctx.hasInteracted,
    message: "Tu veux qu'on attaque un cas concret ? Une simulation phishing prend 3 minutes.",
    action: { type: "lab", label: "Simulation phishing", id: "phishing" },
  },
  {
    id: "module_completed",
    condition: (ctx) => ctx.justCompletedModule,
    message: "Excellent ! Module terminé 🎉 Prêt pour valider tes acquis ?",
    action: { type: "quiz", label: "Passer l'attestation", id: "onboarding" },
  },
  {
    id: "streak_at_risk",
    condition: (ctx) => ctx.lastActivityDaysAgo === 2,
    message: "Ta série est en danger ⚡ 5 minutes suffisent pour la maintenir !",
    action: { type: "module", label: "Module rapide", id: "modules" },
  },
];

/** Per-session fired set — survives re-renders, resets on page reload */
const firedThisSession = new Set<string>();

type NudgeHandler = (nudge: JarvisNudge) => void;

export function useJarvisTriggers(onNudge: NudgeHandler) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  // Context state refs (mutable without re-render)
  const ctxRef = useRef<TriggerContext>({
    lastQuizScore: null,
    sessionCount: 0,
    idleSeconds: 0,
    hasInteracted: false,
    justCompletedModule: false,
    lastActivityDaysAgo: 0,
  });

  const onNudgeRef = useRef(onNudge);
  onNudgeRef.current = onNudge;

  /** Fire a trigger if not already fired this session */
  const fire = useCallback((trigger: Trigger) => {
    if (firedThisSession.has(trigger.id)) return;
    firedThisSession.add(trigger.id);
    onNudgeRef.current({ id: trigger.id, message: trigger.message, action: trigger.action });
  }, []);

  /** Evaluate all triggers against current context */
  const evaluate = useCallback(() => {
    const ctx = ctxRef.current;
    for (const trigger of TRIGGERS) {
      if (!firedThisSession.has(trigger.id) && trigger.condition(ctx)) {
        fire(trigger);
        break; // fire at most one nudge at a time
      }
    }
  }, [fire]);

  // ── Load initial context from DB ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    async function loadContext() {
      // Session count (profiles.session_count or fallback to 1)
      const sessionCount = Number(
        (profile as unknown as Record<string, unknown>)?.session_count ?? 1
      );
      ctxRef.current.sessionCount = sessionCount;

      // Last quiz score — quiz_attempts may not be in generated types, use any cast
      try {
        const { data: lastAttempt } = await (supabase as any)
          .from("quiz_attempts")
          .select("score")
          .eq("user_id", user!.id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastAttempt?.score != null) ctxRef.current.lastQuizScore = lastAttempt.score;
      } catch { /* non-fatal */ }

      // Last activity days ago (via user_streaks)
      const { data: streakRow } = await supabase
        .from("user_streaks")
        .select("last_completed_date")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (streakRow?.last_completed_date) {
        const last = new Date(streakRow.last_completed_date);
        const now = new Date();
        const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        ctxRef.current.lastActivityDaysAgo = diff;
      }

      // Module just completed (sessionStorage flag set by modules)
      const justCompleted = sessionStorage.getItem("jarvis_module_just_completed") === "1";
      if (justCompleted) {
        ctxRef.current.justCompletedModule = true;
        sessionStorage.removeItem("jarvis_module_just_completed");
      }

      evaluate();
    }

    loadContext();
  }, [user?.id, profile, evaluate]);

  // ── Idle timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const tick = setInterval(() => {
      ctxRef.current.idleSeconds += 1;
      evaluate();
    }, 1000);

    const resetIdle = () => {
      ctxRef.current.idleSeconds = 0;
      ctxRef.current.hasInteracted = true;
    };

    window.addEventListener("mousemove", resetIdle, { passive: true });
    window.addEventListener("keydown", resetIdle, { passive: true });
    window.addEventListener("touchstart", resetIdle, { passive: true });
    window.addEventListener("click", resetIdle, { passive: true });

    return () => {
      clearInterval(tick);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("touchstart", resetIdle);
      window.removeEventListener("click", resetIdle);
    };
  }, [user?.id, evaluate]);
}

/** Call from module completion to set the sessionStorage flag */
export function markModuleCompleted() {
  sessionStorage.setItem("jarvis_module_just_completed", "1");
}
