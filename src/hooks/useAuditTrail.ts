/**
 * useAuditTrail — invisible client-side event tracker.
 *
 * Each call inserts a row into audit_logs via the log_event RPC
 * (SECURITY DEFINER — authenticated users can only write their own events).
 *
 * Usage:
 *   const { logEvent } = useAuditTrail();
 *   logEvent("quiz_passed", { module_id: "...", score: 85 }, "quiz", moduleId);
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export type AuditEventType =
  | "module_viewed"
  | "module_started"
  | "quiz_passed"
  | "quiz_failed"
  | "lab_completed"
  | "attestation_generated"
  | "attestation_downloaded"
  | "login"
  | "first_login"
  | "settings_updated"
  | "compliance_dossier_exported";

interface LogEventParams {
  resourceType?: string;
  resourceId?: string;
  score?: number;         // 0–100
  durationMs?: number;    // elapsed time in ms
  device?: string;        // e.g. "desktop" | "mobile"
  sessionId?: string;
  details?: Record<string, unknown>;
}

export function useAuditTrail() {
  const user = useAuthStore((s) => s.user);

  const logEvent = useCallback(
    (eventType: AuditEventType, params: LogEventParams = {}) => {
      if (!user?.id) return;

      const {
        resourceType,
        resourceId,
        score,
        durationMs,
        device = /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
        sessionId,
        details = {},
      } = params;

      // Fire-and-forget — never block the user
      supabase.rpc("log_event", {
        _user_id: user.id,
        _event_type: eventType,
        _details: { ...details, user_agent: navigator.userAgent.slice(0, 100) },
        _resource_type: resourceType ?? null,
        _resource_id: resourceId ?? null,
        _score: score ?? null,
        _duration_ms: durationMs ?? null,
        _device: device,
        _session_id: sessionId ?? null,
      }).then(() => {}).catch(() => {});
    },
    [user?.id],
  );

  return { logEvent };
}
