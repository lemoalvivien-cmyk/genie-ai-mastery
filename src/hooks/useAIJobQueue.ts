/**
 * useAIJobQueue — Hook for enqueuing AI jobs and polling for completion
 * via Supabase Realtime on ai_jobs table.
 *
 * Usage:
 *   const { enqueue, jobStatus, result, isLoading } = useAIJobQueue();
 *   const jobId = await enqueue("chat", { messages, model });
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";

const POLL_TIMEOUT_MS = 60_000; // 1 minute max wait
const POLL_INTERVAL_MS = 2_000;  // 2s polling fallback

export type JobStatus = "idle" | "queued" | "processing" | "completed" | "failed";

interface JobResult {
  job_id: string;
  status: JobStatus;
  result?: Record<string, unknown> | null;
  error?: string | null;
  provider_used?: string | null;
}

export function useAIJobQueue() {
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [providerUsed, setProviderUsed] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleJobDone = useCallback((job: JobResult) => {
    cleanup();
    setJobStatus(job.status);
    setResult(job.result ?? null);
    setError(job.error ?? null);
    setProviderUsed(job.provider_used ?? null);
  }, [cleanup]);

  const subscribeRealtime = useCallback((id: string) => {
    const channel = supabase
      .channel(`ai_job_${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ai_jobs",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as JobResult & { status: JobStatus };
          if (row.status === "completed" || row.status === "failed") {
            handleJobDone(row);
          } else {
            setJobStatus(row.status);
          }
        },
      )
      .subscribe();
    channelRef.current = channel;
  }, [handleJobDone]);

  const pollStatus = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("ai_jobs")
      .select("id, status, result, error, provider_used")
      .eq("id", id)
      .single();

    if (data && (data.status === "completed" || data.status === "failed")) {
      handleJobDone({ job_id: data.id, ...data } as JobResult);
      return true;
    }
    if (data) setJobStatus(data.status as JobStatus);
    return false;
  }, [handleJobDone]);

  const enqueue = useCallback(async (
    jobType: "chat" | "pdf" | "brain",
    payload: Record<string, unknown>,
  ): Promise<string | null> => {
    cleanup();
    setJobStatus("queued");
    setResult(null);
    setError(null);
    setJobId(null);
    setProviderUsed(null);

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-queue-enqueue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ job_type: jobType, payload }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Enqueue failed" }));
        throw new Error(errData.error ?? `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const id = data.job_id as string;
      setJobId(id);
      setJobStatus("queued");

      // Subscribe via realtime
      subscribeRealtime(id);

      // Fallback polling (in case realtime misses update)
      pollRef.current = setInterval(async () => {
        const done = await pollStatus(id);
        if (done && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, POLL_INTERVAL_MS);

      // Hard timeout
      timeoutRef.current = setTimeout(() => {
        cleanup();
        setJobStatus("failed");
        setError("Timeout — job took too long");
        toast({ title: "Délai dépassé", description: "Le job IA a pris trop de temps.", variant: "destructive" });
      }, POLL_TIMEOUT_MS);

      return id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setJobStatus("failed");
      setError(msg);
      toast({ title: "Erreur de queue", description: msg, variant: "destructive" });
      return null;
    }
  }, [cleanup, subscribeRealtime, pollStatus]);

  const reset = useCallback(() => {
    cleanup();
    setJobStatus("idle");
    setResult(null);
    setError(null);
    setJobId(null);
    setProviderUsed(null);
  }, [cleanup]);

  return {
    enqueue,
    reset,
    jobId,
    jobStatus,
    result,
    error,
    providerUsed,
    isLoading: jobStatus === "queued" || jobStatus === "processing",
  };
}
