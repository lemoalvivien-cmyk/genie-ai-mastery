import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOpenClaw, type OpenClawJob, type OpenClawJobEvent, type OpenClawArtifact } from "@/hooks/useOpenClaw";
import { JobStatusBadge, RiskLevelBadge, JobEventTimeline, ArtifactList } from "@/components/openclaw/OpenClawBadges";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Play, Ban, RefreshCw, Info, Activity, Paperclip, FileText, Server, Clock, Zap, AlertCircle, CheckCircle2, Timer } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function AgentJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, runtimes, fetchJobs, fetchRuntimes, fetchJobEvents, fetchJobArtifacts, dispatchJob, cancelJob, isDispatching } = useOpenClaw();
  const [job, setJob] = useState<OpenClawJob | null>(null);
  const [events, setEvents] = useState<OpenClawJobEvent[]>([]);
  const [artifacts, setArtifacts] = useState<OpenClawArtifact[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

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

  // Auto-refresh events while job is running
  useEffect(() => {
    const currentJob = jobs.find(j => j.id === id);
    if (!currentJob || (currentJob.status !== "running" && currentJob.status !== "queued")) return;
    const timer = setInterval(async () => {
      if (!id) return;
      await fetchJobs();
      const [evts, arts] = await Promise.all([fetchJobEvents(id), fetchJobArtifacts(id)]);
      setEvents(evts);
      setArtifacts(arts);
    }, 2000);
    return () => clearInterval(timer);
  }, [id, jobs, fetchJobs, fetchJobEvents, fetchJobArtifacts]);

  useEffect(() => {
    if (id) setJob(jobs.find(j => j.id === id) ?? null);
  }, [jobs, id]);

  const runtime = runtimes.find(r => r.id === job?.runtime_id);
  const isDevHarness = runtime?.base_url.includes("openclaw-dev-harness") ?? false;

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    await fetchJobs();
    const [evts, arts] = await Promise.all([fetchJobEvents(id), fetchJobArtifacts(id)]);
    setEvents(evts);
    setArtifacts(arts);
  }, [id, fetchJobs, fetchJobEvents, fetchJobArtifacts]);

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
    : job.started_at && job.status === "running"
    ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
    : null;

  const isRunning = job.status === "running";
  const lastEvent = events[events.length - 1];

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
              {isDevHarness && (
                <Badge variant="outline" className="text-xs border-warning/30 text-warning">DEV_ONLY</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{job.id}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-1.5 text-xs">
              <RefreshCw className={cn("w-3.5 h-3.5", isRunning && "animate-spin")} />
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

      {/* Live execution banner */}
      {isRunning && (
        <div className="flex-shrink-0 px-6 py-2 border-b border-border flex items-center gap-2 bg-card">
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />
          <p className="text-xs text-primary flex-1">
            Exécution en cours
            {duration !== null && ` — ${duration}s`}
            {lastEvent && ` · ${lastEvent.message.slice(0, 80)}`}
          </p>
          <span className="text-xs text-muted-foreground">{events.length} événement{events.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* DEV ONLY warning */}
      {isDevHarness && (
        <div className="flex-shrink-0 px-6 py-2 border-b border-border flex items-center gap-2 bg-card">
          <AlertCircle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
          <p className="text-xs text-warning">
            DEV_ONLY_OPENCLAW_RUNTIME — Les résultats sont simulés. Brancher un runtime réel pour des exécutions authentiques.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
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
            {/* Execution summary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetricCard icon={<Timer className="w-3.5 h-3.5" />} label="Durée" value={duration !== null ? `${duration}s` : "—"} active={isRunning} />
              <MetricCard icon={<Activity className="w-3.5 h-3.5" />} label="Événements" value={String(events.length)} />
              <MetricCard icon={<Paperclip className="w-3.5 h-3.5" />} label="Artefacts" value={String(artifacts.length)} />
              <MetricCard
                icon={job.status === "succeeded" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                label="Statut"
                value={job.status}
                className="capitalize"
              />
            </div>

            {/* Runtime panel */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Panneau Runtime</span>
                {isDevHarness && <Badge variant="outline" className="text-xs border-yellow-400/30 text-yellow-400">DEV_ONLY</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <RuntimeField label="Nom" value={runtime?.name ?? job.runtime_id.slice(0, 8)} />
                <RuntimeField label="Environnement" value={runtime?.environment ?? "—"} capitalize />
                <RuntimeField label="Profil outils" value={runtime?.tool_profile ?? "—"} mono />
                <RuntimeField label="Statut runtime" value={runtime?.status ?? "—"} capitalize />
              </div>
              {runtime?.last_healthcheck_at && (
                <p className="text-xs text-muted-foreground/60">
                  Dernier healthcheck : {formatDistanceToNow(new Date(runtime.last_healthcheck_at), { addSuffix: true, locale: fr })}
                </p>
              )}
              {!runtime && (
                <p className="text-xs text-destructive/70">⚠ Runtime introuvable — il a peut-être été supprimé</p>
              )}
            </div>

            {/* Timeline details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Type de job", value: job.job_type.replace("_", " "), capitalize: true },
                { label: "Risque", value: job.risk_level, capitalize: true },
                { label: "Créé", value: format(new Date(job.created_at), "dd MMM yyyy HH:mm", { locale: fr }) },
                { label: "Dispatch (started_at)", value: job.started_at ? format(new Date(job.started_at), "dd MMM HH:mm:ss", { locale: fr }) : "—" },
                { label: "Terminé (completed_at)", value: job.completed_at ? format(new Date(job.completed_at), "dd MMM HH:mm:ss", { locale: fr }) : "—" },
                { label: "Approbation", value: job.approval_required ? (job.approved_by ? "Approuvé" : "En attente") : "Non requise" },
              ].map(({ label, value, capitalize }) => (
                <div key={label} className="rounded-lg border border-border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn("text-sm font-medium text-foreground mt-0.5", capitalize && "capitalize")}>{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Prompt</p>
              <p className="text-sm text-foreground leading-relaxed">{job.prompt}</p>
            </div>

            {job.error_message && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                  <p className="text-xs font-medium text-destructive">Erreur structurée</p>
                </div>
                <p className="text-sm text-destructive/80 font-mono text-xs leading-relaxed">{job.error_message}</p>
              </div>
            )}

            {job.approval_required && !job.approved_by && (
              <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-4">
                <p className="text-xs font-medium text-yellow-400 mb-1">⚠ Approbation requise</p>
                <p className="text-xs text-muted-foreground">Ce job a un niveau de risque élevé et nécessite une validation manager avant exécution.</p>
              </div>
            )}

            {/* If runtime offline */}
            {runtime?.status === "offline" && job.status === "queued" && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-xs font-medium text-destructive mb-1">Runtime hors ligne</p>
                <p className="text-xs text-muted-foreground">Le runtime est actuellement hors ligne. Le job ne peut pas être dispatché. Vérifiez la configuration depuis la page Supervision OpenClaw.</p>
              </div>
            )}
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="p-6">
            {isRunning && (
              <div className="mb-3 text-xs text-blue-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Mise à jour automatique toutes les 2s…
              </div>
            )}
            <JobEventTimeline events={events} />
          </TabsContent>

          {/* ARTIFACTS */}
          <TabsContent value="artifacts" className="p-6">
            <ArtifactList artifacts={artifacts} />
          </TabsContent>

          {/* RESULT */}
          {job.result_summary && (
            <TabsContent value="result" className="p-6 space-y-4">
              {isDevHarness && (
                <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400">Ce résultat est généré par le DEV_ONLY_OPENCLAW_RUNTIME. Il ne reflète pas une exécution réelle.</p>
                </div>
              )}
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-xs font-medium text-emerald-400">Résultat OpenClaw</p>
                  {duration !== null && (
                    <span className="text-xs text-emerald-400/60 ml-auto flex items-center gap-1">
                      <Zap className="w-3 h-3" />{duration}s
                    </span>
                  )}
                </div>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{job.result_summary}</div>
              </div>
              {job.result_json && (
                <details className="mt-2">
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

function MetricCard({
  icon, label, value, active, className
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card/50 p-3 space-y-1", active && "border-blue-500/30 bg-blue-500/5")}>
      <div className={cn("flex items-center gap-1.5", active ? "text-blue-400" : "text-muted-foreground")}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={cn("text-sm font-bold text-foreground", className)}>{value}</p>
    </div>
  );
}

function RuntimeField({ label, value, capitalize, mono }: { label: string; value: string; capitalize?: boolean; mono?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground/60">{label}: </span>
      <span className={cn("font-medium text-foreground", capitalize && "capitalize", mono && "font-mono")}>{value}</span>
    </div>
  );
}
