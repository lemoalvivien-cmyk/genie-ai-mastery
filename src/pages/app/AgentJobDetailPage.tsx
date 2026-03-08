import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOpenClaw, type OpenClawJob, type OpenClawJobEvent, type OpenClawArtifact } from "@/hooks/useOpenClaw";
import { JobStatusBadge, RiskLevelBadge, JobEventTimeline, ArtifactList } from "@/components/openclaw/OpenClawBadges";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Play, Ban, RefreshCw, Info, Activity, Paperclip, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function AgentJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, runtimes, fetchJobs, fetchRuntimes, fetchJobEvents, fetchJobArtifacts, dispatchJob, cancelJob, isDispatching } = useOpenClaw();
  const [job, setJob] = useState<OpenClawJob | null>(null);
  const [events, setEvents] = useState<OpenClawJobEvent[]>([]);
  const [artifacts, setArtifacts] = useState<OpenClawArtifact[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);

  useEffect(() => {
    if (!id) return;
    const loadAll = async () => {
      setIsLoadingDetail(true);
      await Promise.all([fetchJobs(), fetchRuntimes()]);
      const [evts, arts] = await Promise.all([fetchJobEvents(id), fetchJobArtifacts(id)]);
      setEvents(evts);
      setArtifacts(arts);
      setIsLoadingDetail(false);
    };
    loadAll();
  }, [id, fetchJobs, fetchRuntimes, fetchJobEvents, fetchJobArtifacts]);

  useEffect(() => {
    if (id) setJob(jobs.find(j => j.id === id) ?? null);
  }, [jobs, id]);

  const runtime = runtimes.find(r => r.id === job?.runtime_id);

  const handleRefresh = async () => {
    if (!id) return;
    await fetchJobs();
    const [evts, arts] = await Promise.all([fetchJobEvents(id), fetchJobArtifacts(id)]);
    setEvents(evts);
    setArtifacts(arts);
  };

  if (isLoadingDetail) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-muted-foreground">Job introuvable</p>
        <Button size="sm" variant="outline" onClick={() => navigate("/app/agent-jobs")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Retour
        </Button>
      </div>
    );
  }

  const duration = job.started_at && job.completed_at
    ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
    : null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/agent-jobs")} className="gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Retour
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-foreground text-sm truncate">{job.title}</h1>
              <JobStatusBadge status={job.status} />
              <RiskLevelBadge level={job.risk_level} />
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{job.id}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            {job.status === "queued" && !job.approval_required && (
              <Button size="sm" disabled={isDispatching} onClick={() => dispatchJob(job.id)} className="gap-1.5 text-xs">
                {isDispatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Lancer
              </Button>
            )}
            {(job.status === "queued" || job.status === "running") && (
              <Button variant="outline" size="sm" onClick={() => cancelJob(job.id)} className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
                <Ban className="w-3.5 h-3.5" /> Annuler
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="info" className="flex flex-col h-full">
          <div className="px-6 pt-4 border-b border-border flex-shrink-0">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="info" className="text-xs gap-1.5"><Info className="w-3 h-3" />Infos</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs gap-1.5">
                <Activity className="w-3 h-3" />Timeline
                {events.length > 0 && <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">{events.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="artifacts" className="text-xs gap-1.5">
                <Paperclip className="w-3 h-3" />Artefacts
                {artifacts.length > 0 && <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">{artifacts.length}</span>}
              </TabsTrigger>
              {job.result_summary && (
                <TabsTrigger value="result" className="text-xs gap-1.5"><FileText className="w-3 h-3" />Résultat</TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* INFO */}
          <TabsContent value="info" className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Type", value: job.job_type },
                { label: "Runtime", value: runtime?.name ?? job.runtime_id.slice(0, 8) },
                { label: "Environnement", value: runtime?.environment ?? "—" },
                { label: "Profil outils", value: runtime?.tool_profile ?? "—" },
                { label: "Créé", value: format(new Date(job.created_at), "dd MMM yyyy HH:mm", { locale: fr }) },
                { label: "Durée", value: duration !== null ? `${duration}s` : "—" },
                { label: "Approbation", value: job.approval_required ? (job.approved_by ? "Approuvé" : "En attente") : "Non requise" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5 capitalize">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Prompt</p>
              <p className="text-sm text-foreground leading-relaxed">{job.prompt}</p>
            </div>

            {job.error_message && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-xs font-medium text-destructive mb-1">Erreur</p>
                <p className="text-sm text-destructive/80">{job.error_message}</p>
              </div>
            )}

            {job.approval_required && !job.approved_by && (
              <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-4">
                <p className="text-xs font-medium text-yellow-400 mb-1">⚠ Approbation requise</p>
                <p className="text-xs text-muted-foreground">Ce job a un niveau de risque élevé et nécessite une validation manager avant exécution.</p>
              </div>
            )}
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="p-6">
            <JobEventTimeline events={events} />
          </TabsContent>

          {/* ARTIFACTS */}
          <TabsContent value="artifacts" className="p-6">
            <ArtifactList artifacts={artifacts} />
          </TabsContent>

          {/* RESULT */}
          {job.result_summary && (
            <TabsContent value="result" className="p-6">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5">
                <p className="text-xs font-medium text-emerald-400 mb-3">Résultat OpenClaw</p>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{job.result_summary}</div>
              </div>
              {job.result_json && (
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Données brutes (JSON)</summary>
                  <pre className={cn("mt-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-x-auto max-h-48")}>
                    {JSON.stringify(job.result_json, null, 2)}
                  </pre>
                </details>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
