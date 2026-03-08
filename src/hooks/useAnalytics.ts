/**
 * Analytics SDK — batch + debounce
 * Flushes up to 10 events every 3s or on page unload.
 * Zero-blocking: never throws, never awaits in the hot path.
 */
import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export type EventName =
  // Navigation
  | "page_view"
  // Acquisition
  | "pricing_viewed"
  | "checkout_started"
  | "checkout_success"
  // Auth & onboarding
  | "signup"
  | "login"
  | "onboarding_done"
  | "onboarding_step_done"
  | "access_code_redeemed"
  | "referral_applied"
  | "referral_shared"
  | "email_captured"
  // Activation
  | "first_mission_done"
  | "first_module_opened"
  | "first_chat_sent"
  // Engagement
  | "chat_sent"
  | "module_opened"
  | "module_completed"
  | "quiz_started"
  | "quiz_passed"
  | "quiz_failed"
  | "lab_completed"
  | "lab_run"
  | "pdf_generated"
  | "voice_used"
  | "mission_completed"
  | "quota_hit"
  // Paywall / Conversion
  | "paywall_shown"
  | "paywall_clicked"
  // Monetisation / Retention
  | "invoice_failed"
  | "churn"
  | "subscription_cancelled"
  | "subscription_reactivated"
  // Feature usage
  | "jarvis_used"
  | "panic_button_used"
  | "phishing_lab_started"
  | "attestation_verified"
  | "onboarding_quiz_done"
  | "onboarding_pdf_generated"
  | "onboarding_completed";

interface EventPayload {
  actor_user_id: string | null;
  org_id: string | null;
  event_name: string;
  properties: Record<string, unknown>;
  session_id: string | null;
}

// Module-level queue shared across hook instances
const queue: EventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const SESSION_ID = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const FLUSH_INTERVAL_MS = 3_000;
const BATCH_SIZE = 10;

async function flushQueue(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, BATCH_SIZE);
  try {
    // Cast through any to satisfy strict Json type — properties are always plain objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("analytics_events").insert(batch as any);
  } catch {
    // Silently discard — never block the UI
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushQueue();
  }, FLUSH_INTERVAL_MS);
}

// Flush on page unload (best-effort)
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushQueue();
  });
  window.addEventListener("beforeunload", () => flushQueue());
}

export function useAnalytics() {
  const { user, profile } = useAuthStore();
  const userIdRef = useRef(user?.id ?? null);
  const orgIdRef  = useRef(profile?.org_id ?? null);
  const personaRef = useRef(profile?.persona ?? null);

  useEffect(() => {
    userIdRef.current  = user?.id ?? null;
    orgIdRef.current   = profile?.org_id ?? null;
    personaRef.current = profile?.persona ?? null;
  }, [user?.id, profile?.org_id, profile?.persona]);

  const track = useCallback(
    (event: EventName, properties: Record<string, unknown> = {}) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queue.push({
        actor_user_id: userIdRef.current,
        org_id: orgIdRef.current,
        event_name: event,
        session_id: SESSION_ID,
        properties: {
          ...properties,
          persona: personaRef.current ?? null,
          ts: new Date().toISOString(),
          url: typeof window !== "undefined" ? window.location.pathname : null,
        },
      });
      scheduleFlush();
      // Immediate flush if batch is full
      if (queue.length >= BATCH_SIZE) flushQueue();
    },
    [],
  );

  return { track };
}
