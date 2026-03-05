/**
 * GENIE OS — Internal Event Bus
 * Lightweight pub/sub for cross-module communication.
 * Events are dispatched as native CustomEvents on window.
 */

export type GenieOSEventType =
  | "agent_created"
  | "agent_started"
  | "agent_completed"
  | "agent_failed"
  | "revenue_generated"
  | "opportunity_found"
  | "lead_generated"
  | "job_queued"
  | "job_completed"
  | "job_failed"
  | "memory_updated"
  | "knowledge_indexed"
  | "ai_watch_alert"
  | "autopilot_triggered"
  | "system_error"
  | "credit_spent"
  | "credit_earned";

export interface GenieOSEvent<T = unknown> {
  type: GenieOSEventType;
  payload: T;
  timestamp: number;
  source?: string;
}

const PREFIX = "genieos:";

/** Emit an event on the bus */
export function emit<T = unknown>(
  type: GenieOSEventType,
  payload: T,
  source?: string
): void {
  const event = new CustomEvent<GenieOSEvent<T>>(PREFIX + type, {
    detail: { type, payload, timestamp: Date.now(), source },
    bubbles: false,
  });
  window.dispatchEvent(event);
}

/** Subscribe to an event; returns an unsubscribe function */
export function subscribe<T = unknown>(
  type: GenieOSEventType,
  handler: (event: GenieOSEvent<T>) => void
): () => void {
  const listener = (e: Event) => {
    handler((e as CustomEvent<GenieOSEvent<T>>).detail);
  };
  window.addEventListener(PREFIX + type, listener);
  return () => window.removeEventListener(PREFIX + type, listener);
}

/** React hook: subscribe to one or more events, auto-cleanup on unmount */
import { useEffect } from "react";

export function useEventBus<T = unknown>(
  types: GenieOSEventType | GenieOSEventType[],
  handler: (event: GenieOSEvent<T>) => void
): void {
  useEffect(() => {
    const arr = Array.isArray(types) ? types : [types];
    const unsubs = arr.map((t) => subscribe<T>(t, handler));
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Job Queue helper — enqueue a job via Supabase */
import { supabase } from "@/integrations/supabase/client";

export interface JobPayload {
  job_type: string;
  payload?: Record<string, unknown>;
  priority?: number;
  scheduled_at?: string;
}

export async function enqueueJob(
  userId: string,
  job: JobPayload
): Promise<string | null> {
  const { data, error } = await supabase
    .from("job_queue")
    .insert({
      user_id: userId,
      job_type: job.job_type,
      payload: job.payload ?? {},
      priority: job.priority ?? 5,
      scheduled_at: job.scheduled_at ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) return null;

  emit("job_queued", { job_id: data.id, job_type: job.job_type }, "job_queue");
  return data.id;
}

/** Log a system event */
export async function logSystem(
  userId: string | null,
  module: string,
  event: string,
  message: string,
  level: "debug" | "info" | "warn" | "error" | "fatal" = "info",
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabase.from("system_logs").insert({
    user_id: userId,
    module,
    event,
    message,
    level,
    metadata: metadata ?? {},
  });
}
