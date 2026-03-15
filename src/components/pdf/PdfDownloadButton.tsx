import { useState, useCallback, useEffect } from "react";
import { FileText, Download, Loader2, Lock, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAIJobQueue } from "@/hooks/useAIJobQueue";

export type PdfType = "attestation" | "charte" | "sop" | "checklist";

interface PdfDownloadButtonProps {
  type: PdfType;
  label: string;
  moduleId?: string;
  orgName?: string;
  disabled?: boolean;
  locked?: boolean;
  variant?: "outline" | "card";
}

function triggerDownload(base64: string, filename: string) {
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArray], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PdfDownloadButton({
  type, label, moduleId, orgName, disabled, locked, variant = "card",
}: PdfDownloadButtonProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: sub } = useSubscription();
  const { track } = useAnalytics();
  const isPro = sub?.isActive ?? false;

  const { enqueue, jobStatus, result, error, reset } = useAIJobQueue();

  const isLoading = jobStatus === "queued" || jobStatus === "processing";
  const isDone = jobStatus === "completed";
  const isFailed = jobStatus === "failed";

  // Handle job completion side-effects declaratively
  useEffect(() => {
    if (!isDone || !result) return;
    track("pdf_generated", { type, is_attestation: type === "attestation" });

    if (result.signed_url) {
      window.open(result.signed_url as string, "_blank");
    } else if (result.pdf_base64) {
      triggerDownload(result.pdf_base64 as string, (result.filename as string) ?? `${type}.pdf`);
    }

    if (type === "attestation" && result.attestation_id) {
      toast({
        title: "✅ Attestation générée !",
        description: `Vérification : ${window.location.origin}/verify/${result.attestation_id}`,
      });
    } else {
      toast({ title: "✅ PDF téléchargé !", description: (result.filename as string) ?? label });
    }

    const t = setTimeout(reset, 3000);
    return () => clearTimeout(t);
  }, [isDone, result, type, label, track, toast, reset]);

  useEffect(() => {
    if (!isFailed || !error) return;
    toast({ title: "Erreur PDF", description: error, variant: "destructive" });
    const t = setTimeout(reset, 4000);
    return () => clearTimeout(t);
  }, [isFailed, error, toast, reset]);

  const handleClick = useCallback(async () => {
    if (locked || disabled || isLoading) return;
    const referralCode = localStorage.getItem("ref_code") ?? undefined;
    await enqueue("pdf", {
      type,
      module_id: moduleId,
      org_name: orgName,
      base_url: window.location.origin,
      referral_code: referralCode,
    });
  }, [type, moduleId, orgName, locked, disabled, isLoading, enqueue]);

  if (!isPro) {
    const cls = variant === "outline"
      ? "flex items-center gap-2 px-4 py-2 rounded-xl border border-border/40 text-muted-foreground text-sm font-medium opacity-60 cursor-pointer hover:opacity-80 transition-all"
      : "w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 text-left opacity-60 cursor-pointer hover:opacity-80 transition-all";
    return (
      <button className={cls} onClick={() => navigate("/pricing")} title="PDF — Débloquez avec GENIE Pro">
        <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{label}</div>
          <div className="text-xs text-muted-foreground">PDF — GENIE Pro</div>
        </div>
      </button>
    );
  }

  const statusIcon = () => {
    if (isLoading) return <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />;
    if (isDone) return <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />;
    if (isFailed) return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
    return variant === "outline"
      ? <Download className="w-4 h-4 flex-shrink-0" />
      : <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />;
  };

  const statusLabel = () => {
    if (jobStatus === "queued") return "En file d'attente…";
    if (jobStatus === "processing") return "Génération en cours…";
    if (isDone) return "Téléchargement…";
    if (isFailed) return "Erreur — cliquer pour réessayer";
    if (locked) return "Disponible après quiz";
    return "Cliquer pour télécharger";
  };

  if (variant === "outline") {
    return (
      <button
        onClick={handleClick}
        disabled={disabled || locked || isLoading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {statusIcon()}
        {label}
        {isLoading && <Clock className="w-3 h-3 text-muted-foreground ml-1" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || locked || isLoading}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-card/60 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed"
      aria-label={locked ? `${label} — disponible après validation du quiz` : `Télécharger ${label}`}
    >
      {statusIcon()}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        <div className="text-xs text-muted-foreground">{statusLabel()}</div>
      </div>
      {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
      {isLoading && !locked && (
        <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
          {jobStatus === "queued" ? "⏳" : "⚙️"}
        </span>
      )}
    </button>
  );
}
