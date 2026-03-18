import { useEffect, useState } from "react";
import { useOpenClaw } from "@/hooks/useOpenClaw";
import { RuntimeStatusBadge } from "@/components/openclaw/OpenClawBadges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Activity, Shield, Clock, Zap } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PROFILE_LABELS: Record<string, string> = {
  tutor_readonly: "Tuteur lecture seule",
  browser_lab: "Lab navigateur",
  scheduled_coach: "Coach planifié",
};

const PROFILE_TOOLS: Record<string, string[]> = {
  tutor_readonly: ["web_search", "knowledge_search", "ai_summarize"],
  browser_lab: ["browser_navigate", "browser_screenshot", "browser_extract"],
  scheduled_coach: ["ai_generate", "notification_send", "knowledge_search"],
};

export default function ManagerOpenClawPage() {
  const { runtimes, isLoadingRuntimes, fetchRuntimes, checkRuntimeHealth } = useOpenClaw();
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => { fetchRuntimes(); }, [fetchRuntimes]);

  const handleHealthCheck = async (runtimeId: string) => {
    setCheckingId(runtimeId);
    await checkRuntimeHealth(runtimeId);
    setCheckingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">Supervision OpenClaw</h1>
              <p className="text-xs text-muted-foreground">Runtimes agentiques de votre organisation</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchRuntimes()} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3 h-3 ${isLoadingRuntimes ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Banner: OpenClaw status */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
          <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Modèle de confiance :</span> Tous les appels agentiques transitent par le backend Formetoialia.
            Aucun secret n'est exposé au client. Chaque job est isolé par organisation et traçé dans l'audit trail.
          </div>
        </div>

        {/* Runtimes */}
        {isLoadingRuntimes && runtimes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : runtimes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Activity className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucun runtime OpenClaw configuré</p>
            <p className="text-xs text-muted-foreground/60 max-w-sm">
              Un runtime OpenClaw est un moteur d'exécution externe qui traite les missions agentiques.
              Contactez votre administrateur pour en configurer un.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runtimes.map(rt => (
              <div key={rt.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground text-sm">{rt.name}</h3>
                      <RuntimeStatusBadge status={rt.status} />
                      <Badge variant="outline" className="text-xs capitalize">{rt.environment}</Badge>
                      {rt.is_default && <Badge variant="secondary" className="text-xs">Par défaut</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {PROFILE_LABELS[rt.tool_profile] ?? rt.tool_profile}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 text-xs gap-1.5"
                    disabled={checkingId === rt.id}
                    onClick={() => handleHealthCheck(rt.id)}
                  >
                    {checkingId === rt.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Zap className="w-3.5 h-3.5" />}
                    Test santé
                  </Button>
                </div>

                {/* Tools */}
                <div className="flex flex-wrap gap-1">
                  {(PROFILE_TOOLS[rt.tool_profile] ?? []).map(tool => (
                    <span key={tool} className="px-2 py-0.5 rounded-full bg-muted/40 border border-border text-xs text-muted-foreground font-mono">
                      {tool}
                    </span>
                  ))}
                </div>

                {/* Last healthcheck */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                  <Clock className="w-3 h-3" />
                  {rt.last_healthcheck_at
                    ? `Dernier check: ${format(new Date(rt.last_healthcheck_at), "dd MMM HH:mm", { locale: fr })}`
                    : "Aucun check effectué"}
                </div>

                {/* URL (masked for security) */}
                <p className="text-xs text-muted-foreground/40 font-mono truncate">
                  {rt.base_url.replace(/^(https?:\/\/[^/]{3})[^/]*/,  "$1***")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
