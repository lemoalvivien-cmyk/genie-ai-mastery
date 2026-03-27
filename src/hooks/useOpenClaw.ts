/**
 * useOpenClaw — hook central pour interagir avec l'architecture OpenClaw
 * Gère jobs, runtimes, events, artifacts. Zéro logique simulée.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SUPABASE_URL } from "@/lib/env";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type RiskLevel = "low" | "medium" | "high";
export type RuntimeStatus = "healthy" | "degraded" | "offline" | "unknown";
export type ToolProfile = "tutor_readonly" | "browser_lab" | "scheduled_coach";
export type JobType = "tutor_search" | "browser_lab" | "scheduled_coach" | "custom";

export interface OpenClawRuntime {
  id: string;
  org_id: string;
  name: string;
  environment: "dev" | "staging" | "prod";
  base_url: string;
  tool_profile: ToolProfile;
  status: RuntimeStatus;
  is_default: boolean;
  last_healthcheck_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpenClawJob {
  id: string;
  org_id: string;
  user_id: string;
  runtime_id: string;
  job_type: JobType;
  title: string;
  prompt: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  risk_level: RiskLevel;
  approval_required: boolean;
  approved_by: string | null;
  approved_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  result_summary: string | null;
  result_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OpenClawJobEvent {
  id: string;
  job_id: string;
  event_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OpenClawArtifact {
  id: string;
  job_id: string;
  artifact_type: "text" | "json" | "screenshot" | "pdf" | "html" | "log";
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateJobParams {
  runtime_id: string;
  job_type: JobType;
  title: string;
  prompt: string;
  payload?: Record<string, unknown>;
  risk_level?: RiskLevel;
}



export function useOpenClaw() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [runtimes, setRuntimes] = useState<OpenClawRuntime[]>([]);
  const [jobs, setJobs] = useState<OpenClawJob[]>([]);
  const [isLoadingRuntimes, setIsLoadingRuntimes] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  /**
   * BLQ-4 : fetchRuntimes filtre sur l'org_id du profil pour empêcher
   * toute fuite cross-tenant. Si l'utilisateur n'a pas d'org, liste vide.
   */
  const fetchRuntimes = useCallback(async () => {
    if (!user) return;
    setIsLoadingRuntimes(true);
    try {
      // Récupérer l'org_id depuis le profil pour le filtre RLS
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      const orgId = profile?.org_id;

      const query = supabase
        .from("openclaw_runtimes")
        .select("*")
        .order("created_at", { ascending: false });

      // Filtre org_id explicite en plus du RLS
      if (orgId) {
        const { data, error } = await query.eq("org_id", orgId);
        if (error) throw error;
        setRuntimes((data ?? []) as OpenClawRuntime[]);
      } else {
        // Pas d'org = pas de runtimes
        setRuntimes([]);
      }
    } catch (err) {
      toast({ title: "Erreur", description: String(err), variant: "destructive" });
    } finally {
      setIsLoadingRuntimes(false);
    }
  }, [user, toast]);

  const fetchJobs = useCallback(async (limit = 50) => {
    if (!user) return;
    setIsLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from("openclaw_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      setJobs((data ?? []) as OpenClawJob[]);
    } catch (err) {
      toast({ title: "Erreur", description: String(err), variant: "destructive" });
    } finally {
      setIsLoadingJobs(false);
    }
  }, [user, toast]);

  const fetchJobEvents = useCallback(async (job_id: string): Promise<OpenClawJobEvent[]> => {
    const { data, error } = await supabase
      .from("openclaw_job_events")
      .select("*")
      .eq("job_id", job_id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as OpenClawJobEvent[];
  }, []);

  const fetchJobArtifacts = useCallback(async (job_id: string): Promise<OpenClawArtifact[]> => {
    const { data, error } = await supabase
      .from("openclaw_artifacts")
      .select("*")
      .eq("job_id", job_id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as OpenClawArtifact[];
  }, []);

  const createJob = useCallback(async (params: CreateJobParams): Promise<OpenClawJob | null> => {
    if (!user) {
      toast({ title: "Non connecté", variant: "destructive" });
      return null;
    }
    setIsCreatingJob(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/openclaw-create-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      const result = await resp.json();

      if (!resp.ok) {
        throw new Error(result.error ?? `HTTP ${resp.status}`);
      }

      toast({
        title: result.approval_required ? "Job créé — approbation requise" : "Job créé",
        description: result.message,
      });

      await fetchJobs();
      // Return basic job structure (full data via DB)
      const { data: job } = await supabase
        .from("openclaw_jobs")
        .select("*")
        .eq("id", result.job_id)
        .single();
      return (job ?? null) as OpenClawJob | null;
    } catch (err) {
      toast({ title: "Erreur création job", description: String(err), variant: "destructive" });
      return null;
    } finally {
      setIsCreatingJob(false);
    }
  }, [user, toast, fetchJobs]);

  const dispatchJob = useCallback(async (job_id: string): Promise<boolean> => {
    setIsDispatching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/openclaw-dispatch-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id }),
      });

      const result = await resp.json();

      if (!resp.ok || !result.success) {
        toast({
          title: "Dispatch échoué",
          description: result.message ?? result.error ?? `HTTP ${resp.status}`,
          variant: "destructive",
        });
        await fetchJobs();
        return false;
      }

      toast({
        title: "Job dispatché",
        description: result.message ?? "Exécution en cours",
      });
      await fetchJobs();
      return true;
    } catch (err) {
      toast({ title: "Erreur dispatch", description: String(err), variant: "destructive" });
      return false;
    } finally {
      setIsDispatching(false);
    }
  }, [toast, fetchJobs]);

  const checkRuntimeHealth = useCallback(async (runtime_id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/openclaw-runtime-health`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ runtime_id }),
      });

      const result = await resp.json();

      if (resp.ok) {
        toast({
          title: `Runtime: ${result.status}`,
          description: result.reason ?? `Dernier check: ${new Date().toLocaleTimeString("fr-FR")}`,
        });
        await fetchRuntimes();
      } else {
        toast({ title: "Healthcheck échoué", description: result.error, variant: "destructive" });
      }
      return result;
    } catch (err) {
      toast({ title: "Erreur healthcheck", description: String(err), variant: "destructive" });
      return null;
    }
  }, [toast, fetchRuntimes]);

  /**
   * BLQ-1 : cancelJob passe maintenant par une Edge Function sécurisée.
   * Vérification JWT + ownership stricte côté serveur.
   * Aucune mise à jour directe depuis le client.
   */
  const cancelJob = useCallback(async (job_id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/openclaw-cancel-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id }),
      });

      const result = await resp.json();

      if (!resp.ok || !result.success) {
        toast({
          title: "Annulation échouée",
          description: result.error ?? `HTTP ${resp.status}`,
          variant: "destructive",
        });
        return;
      }

      await fetchJobs();
      toast({ title: "Job annulé" });
    } catch (err) {
      toast({ title: "Erreur annulation", description: String(err), variant: "destructive" });
    }
  }, [fetchJobs, toast]);

  // Auto-poll running jobs every 5s
  useEffect(() => {
    const runningJobs = jobs.filter(j => j.status === "running" || j.status === "queued");
    if (runningJobs.length === 0) return;
    const interval = setInterval(() => fetchJobs(), 5000);
    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  return {
    runtimes,
    jobs,
    isLoadingRuntimes,
    isLoadingJobs,
    isCreatingJob,
    isDispatching,
    fetchRuntimes,
    fetchJobs,
    fetchJobEvents,
    fetchJobArtifacts,
    createJob,
    dispatchJob,
    checkRuntimeHealth,
    cancelJob,
  };
}
