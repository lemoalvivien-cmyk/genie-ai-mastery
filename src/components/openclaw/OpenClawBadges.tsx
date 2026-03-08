import { cn } from "@/lib/utils";
import type { JobStatus, RiskLevel, RuntimeStatus } from "@/hooks/useOpenClaw";
import { CheckCircle2, XCircle, Loader2, Clock, Ban, AlertTriangle, Wifi, WifiOff, Activity } from "lucide-react";

// ── RuntimeStatusBadge ────────────────────────────────────────
export function RuntimeStatusBadge({ status }: { status: RuntimeStatus }) {
  const config = {
    healthy: { label: "En ligne", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", Icon: Wifi },
    degraded: { label: "Dégradé", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", Icon: Activity },
    offline: { label: "Hors ligne", color: "text-red-400 bg-red-400/10 border-red-400/20", Icon: WifiOff },
    unknown: { label: "Inconnu", color: "text-muted-foreground bg-muted/40 border-border", Icon: Activity },
  }[status] ?? { label: status, color: "text-muted-foreground bg-muted/40 border-border", Icon: Activity };

  const { label, color, Icon } = config;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium", color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── JobStatusBadge ────────────────────────────────────────────
export function JobStatusBadge({ status }: { status: JobStatus }) {
  const config = {
    queued: { label: "En attente", color: "text-muted-foreground bg-muted/40 border-border", Icon: Clock },
    running: { label: "En cours", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", Icon: Loader2, spin: true },
    succeeded: { label: "Terminé", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", Icon: CheckCircle2 },
    failed: { label: "Échec", color: "text-red-400 bg-red-400/10 border-red-400/20", Icon: XCircle },
    cancelled: { label: "Annulé", color: "text-muted-foreground bg-muted/40 border-border", Icon: Ban },
  }[status] ?? { label: status, color: "text-muted-foreground bg-muted/40 border-border", Icon: Clock };

  const { label, color, Icon, spin } = config as typeof config & { spin?: boolean };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium", color)}>
      <Icon className={cn("w-3 h-3", spin && "animate-spin")} />
      {label}
    </span>
  );
}

// ── RiskLevelBadge ────────────────────────────────────────────
export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const config = {
    low: { label: "Risque faible", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    medium: { label: "Risque modéré", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    high: { label: "Risque élevé", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: <AlertTriangle className="w-3 h-3" /> },
  }[level] ?? { label: level, color: "text-muted-foreground bg-muted/40 border-border" };

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium", config.color)}>
      {(config as typeof config & { icon?: React.ReactNode }).icon}
      {config.label}
    </span>
  );
}

// ── JobEventTimeline ──────────────────────────────────────────
import type { OpenClawJobEvent } from "@/hooks/useOpenClaw";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const EVENT_ICONS: Record<string, string> = {
  created: "🆕", dispatch_started: "🚀", dispatch_accepted: "✅", dispatch_failed: "❌",
  dispatch_blocked: "🚫", status_change: "🔄", progress: "⏳", completed: "✅",
  failed: "❌", artifact: "📎", scheduled_created: "📅", dispatch_error: "⚠️",
};

export function JobEventTimeline({ events }: { events: OpenClawJobEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Aucun événement pour ce job</p>;
  }
  return (
    <div className="space-y-2">
      {events.map((ev, idx) => (
        <div key={ev.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-muted/50 border border-border flex items-center justify-center text-xs flex-shrink-0">
              {EVENT_ICONS[ev.event_type] ?? "•"}
            </div>
            {idx < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="pb-3 min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">{ev.message}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(ev.created_at), "HH:mm:ss", { locale: fr })}
              <span className="ml-2 text-muted-foreground/60 font-mono">{ev.event_type}</span>
            </p>
            {Object.keys(ev.metadata ?? {}).length > 0 && (
              <details className="mt-1">
                <summary className="text-xs text-muted-foreground/60 cursor-pointer hover:text-muted-foreground">Métadonnées</summary>
                <pre className="text-xs text-muted-foreground/80 mt-1 bg-muted/30 rounded p-2 overflow-x-auto max-h-24">
                  {JSON.stringify(ev.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ArtifactList ──────────────────────────────────────────────
import type { OpenClawArtifact } from "@/hooks/useOpenClaw";
import { FileText, Image, File, Code } from "lucide-react";

const ARTIFACT_ICONS: Record<string, React.ElementType> = {
  text: FileText, json: Code, screenshot: Image, pdf: File, html: Code, log: FileText,
};

export function ArtifactList({ artifacts }: { artifacts: OpenClawArtifact[] }) {
  if (artifacts.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Aucun artefact</p>;
  }
  return (
    <div className="space-y-2">
      {artifacts.map(art => {
        const Icon = ARTIFACT_ICONS[art.artifact_type] ?? File;
        return (
          <div key={art.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground capitalize">{art.artifact_type}</p>
              {art.size_bytes && (
                <p className="text-xs text-muted-foreground">{(art.size_bytes / 1024).toFixed(1)} KB</p>
              )}
              {art.mime_type && (
                <p className="text-xs text-muted-foreground/60 font-mono">{art.mime_type}</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {format(new Date(art.created_at), "HH:mm", { locale: fr })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
