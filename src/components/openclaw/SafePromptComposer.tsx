/**
 * SafePromptComposer
 * Composant sécurisé pour composer une mission OpenClaw.
 * - Sélection du runtime disponible
 * - Sélection du type de job (restreint aux profils autorisés)
 * - Composition du prompt avec aide contextuelle
 * - Affichage du niveau de risque estimé EN TEMPS RÉEL
 * - Aucun secret exposé, aucune exécution directe
 */
import { useState, useMemo } from "react";
import { useOpenClaw, type OpenClawRuntime, type JobType, type RiskLevel } from "@/hooks/useOpenClaw";
import { RuntimeStatusBadge, RiskLevelBadge } from "./OpenClawBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bot, Info, Shield } from "lucide-react";

const JOB_TYPE_LABELS: Record<JobType, string> = {
  tutor_search: "Recherche pédagogique (lecture seule)",
  browser_lab: "Lab navigateur (capture + extraction)",
  scheduled_coach: "Routine planifiée (coach IA)",
  custom: "Personnalisé",
};

const JOB_TYPE_DESCRIPTIONS: Record<JobType, string> = {
  tutor_search: "Recherche et synthèse de sources fiables sur un sujet. Aucune écriture, aucun envoi.",
  browser_lab: "Navigation réelle sur une URL, capture d'écran, extraction de contenu. Environnement isolé.",
  scheduled_coach: "Génère du contenu pédagogique planifiable. Aucun accès browser.",
  custom: "Mission personnalisée. Le niveau de risque sera calculé automatiquement.",
};

const HIGH_RISK_KEYWORDS = ["delete", "supprimer", "écrire dans", "modifier", "envoyer email", "submit", "post to", "publier"];
const MEDIUM_RISK_KEYWORDS = ["scrape", "crawler", "télécharger", "download", "external api", "api externe"];

function estimateRisk(jobType: JobType, prompt: string): { risk: RiskLevel; reasons: string[] } {
  const p = prompt.toLowerCase();
  const reasons: string[] = [];
  const highHits = HIGH_RISK_KEYWORDS.filter(k => p.includes(k));
  const medHits = MEDIUM_RISK_KEYWORDS.filter(k => p.includes(k));

  if (jobType === "browser_lab") {
    reasons.push("Le lab navigateur nécessite une validation manager.");
    return { risk: "high", reasons };
  }
  if (highHits.length > 0) {
    reasons.push(`Mots-clés à risque élevé détectés : ${highHits.join(", ")}`);
    return { risk: "high", reasons };
  }
  if (medHits.length > 0) {
    reasons.push(`Mots-clés à risque modéré détectés : ${medHits.join(", ")}`);
    return { risk: "medium", reasons };
  }
  return { risk: "low", reasons: [] };
}

interface SafePromptComposerProps {
  runtimes: OpenClawRuntime[];
  onSubmit: (params: {
    runtime_id: string;
    job_type: JobType;
    title: string;
    prompt: string;
    risk_level: RiskLevel;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function SafePromptComposer({ runtimes, onSubmit, isSubmitting }: SafePromptComposerProps) {
  const [runtimeId, setRuntimeId] = useState<string>("");
  const [jobType, setJobType] = useState<JobType>("tutor_search");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");

  const { risk, reasons } = useMemo(() => estimateRisk(jobType, prompt), [jobType, prompt]);

  const selectedRuntime = runtimes.find(r => r.id === runtimeId);
  const isValid = !!runtimeId && title.trim().length >= 3 && prompt.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    await onSubmit({ runtime_id: runtimeId, job_type: jobType, title: title.trim(), prompt: prompt.trim(), risk_level: risk });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Security notice */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
        <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Cadre sécurisé :</span> Votre mission sera envoyée au runtime via un backend sécurisé.
          Aucun secret n'est exposé au navigateur. Chaque exécution est tracée dans l'audit trail.
        </div>
      </div>

      {/* Runtime selector */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Runtime OpenClaw</Label>
        {runtimes.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Aucun runtime disponible. Contactez votre administrateur.
          </div>
        ) : (
          <Select value={runtimeId} onValueChange={setRuntimeId}>
            <SelectTrigger className="h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Sélectionner un runtime…" />
            </SelectTrigger>
            <SelectContent>
              {runtimes.map(rt => (
                <SelectItem key={rt.id} value={rt.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span>{rt.name}</span>
                    <RuntimeStatusBadge status={rt.status} />
                    <Badge variant="outline" className="text-xs capitalize">{rt.environment}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedRuntime && (
          <p className="text-xs text-muted-foreground">
            Profil : <span className="font-medium">{selectedRuntime.tool_profile}</span>
            {selectedRuntime.status === "offline" && (
              <span className="ml-2 text-destructive">⚠ Runtime hors ligne — le job sera refusé</span>
            )}
          </p>
        )}
      </div>

      {/* Job type */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Type de mission</Label>
        <Select value={jobType} onValueChange={(v) => setJobType(v as JobType)}>
          <SelectTrigger className="h-9 text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(JOB_TYPE_LABELS) as JobType[]).map(t => (
              <SelectItem key={t} value={t} className="text-xs">{JOB_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
          {JOB_TYPE_DESCRIPTIONS[jobType]}
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Titre du job</Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="ex: Synthèse IA et cybersécurité 2025"
          maxLength={200}
          className="h-9 text-xs bg-card border-border"
        />
        <p className="text-xs text-muted-foreground text-right">{title.length}/200</p>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Mission / Prompt</Label>
        <Textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Décrivez précisément la mission. ex: Recherche 5 sources fiables sur les attaques de phishing en 2025 et produis une synthèse pédagogique avec les points clés."
          maxLength={4000}
          rows={5}
          className="text-xs bg-card border-border resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{prompt.length}/4000</p>
      </div>

      {/* Risk estimation */}
      {prompt.length >= 10 && (
      <div className={`rounded-xl border p-4 space-y-2 ${
          risk === "high" ? "border-destructive/20 bg-destructive/5" :
          risk === "medium" ? "border-warning/20 bg-warning/5" :
          "border-primary/20 bg-primary/5"
        }`}>
          <div className="flex items-center gap-2">
            {risk === "high" && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
            <span className="text-xs font-medium text-foreground">Niveau de risque estimé :</span>
            <RiskLevelBadge level={risk} />
          </div>
          {reasons.length > 0 && (
            <ul className="space-y-0.5">
              {reasons.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground">• {r}</li>
              ))}
            </ul>
          )}
          {risk === "high" && (
            <p className="text-xs text-red-400">Ce job nécessitera une approbation manager avant exécution.</p>
          )}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={!isValid || isSubmitting || runtimes.length === 0}
        className="w-full gap-2 text-xs h-9"
      >
        <Bot className="w-3.5 h-3.5" />
        {isSubmitting ? "Création en cours…" : "Créer le job"}
      </Button>
    </form>
  );
}
