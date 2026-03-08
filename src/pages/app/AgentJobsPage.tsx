import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOpenClaw, type OpenClawJob } from "@/hooks/useOpenClaw";
import { JobStatusBadge, RiskLevelBadge } from "@/components/openclaw/OpenClawBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, ExternalLink, Bot } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["all", "queued", "running", "succeeded", "failed", "cancelled"] as const;

export default function AgentJobsPage() {
  const navigate = useNavigate();
  const { jobs, isLoadingJobs, fetchJobs, fetchRuntimes, runtimes } = useOpenClaw();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchJobs();
    fetchRuntimes();
  }, [fetchJobs, fetchRuntimes]);

  const filtered = jobs.filter(j => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.prompt.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getRuntimeName = (id: string) => runtimes.find(r => r.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">Exécutions OpenClaw</h1>
              <p className="text-xs text-muted-foreground">Jobs agentiques — traçabilité complète</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => fetchJobs()} className="gap-1.5 text-xs">
              <RefreshCw className={cn("w-3 h-3", isLoadingJobs && "animate-spin")} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => navigate("/app/agent-jobs/new")} className="gap-1.5 text-xs">
              <Plus className="w-3 h-3" />
              Nouveau job
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4">
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-xs max-w-48 bg-card border-border"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-36 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(s => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s === "all" ? "Tous les statuts" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} job{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoadingJobs && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center">
              <Bot className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">Aucun job trouvé</p>
            <p className="text-xs text-muted-foreground/60">Lancez votre premier job depuis le bouton "Nouveau job"</p>
            <Button size="sm" onClick={() => navigate("/app/agent-jobs/new")} className="mt-2 gap-1.5 text-xs">
              <Plus className="w-3 h-3" /> Créer un job
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(job => (
              <JobRow key={job.id} job={job} runtimeName={getRuntimeName(job.runtime_id)} onOpen={() => navigate(`/app/agent-jobs/${job.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JobRow({ job, runtimeName, onOpen }: { job: OpenClawJob; runtimeName: string; onOpen: () => void }) {
  const duration = job.started_at && job.completed_at
    ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
    : null;

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-4 p-3.5 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{job.title}</span>
          <JobStatusBadge status={job.status} />
          <RiskLevelBadge level={job.risk_level} />
          {job.approval_required && !job.approved_by && (
            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">Approbation requise</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate max-w-xl">{job.prompt}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-muted-foreground/60 font-mono">
            {format(new Date(job.created_at), "dd MMM HH:mm", { locale: fr })}
          </span>
          <span className="text-xs text-muted-foreground/60">· {runtimeName}</span>
          <span className="text-xs text-muted-foreground/60 capitalize">· {job.job_type}</span>
          {duration !== null && <span className="text-xs text-muted-foreground/60">· {duration}s</span>}
        </div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary flex-shrink-0 transition-colors" />
    </button>
  );
}
