import { useState, useCallback } from "react";
import { FileText, Download, Loader2, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

export type PdfType = "attestation" | "charte" | "sop" | "checklist";

interface PdfDownloadButtonProps {
  type: PdfType;
  label: string;
  moduleId?: string;
  orgName?: string;
  disabled?: boolean;
  locked?: boolean; // show lock icon instead
  variant?: "outline" | "card";
}

function triggerDownload(base64: string, filename: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
  const byteArray = new Uint8Array(byteNumbers);
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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: sub } = useSubscription();
  const isPro = sub?.isActive ?? false;

  // If not pro, show locked-to-pro button
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

  const handleClick = useCallback(async () => {
    if (locked || disabled || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: {
          type,
          module_id: moduleId,
          org_name: orgName,
          base_url: window.location.origin,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error ?? error?.message ?? "Erreur de génération");
      }

      if (data.signed_url) {
        window.open(data.signed_url, "_blank");
      } else if (data.pdf_base64) {
        triggerDownload(data.pdf_base64, data.filename);
      }

      if (type === "attestation" && data.attestation_id) {
        toast({
          title: "Attestation générée !",
          description: `Lien de vérification : ${window.location.origin}/verify/${data.attestation_id}`,
        });
      } else {
        toast({ title: "PDF téléchargé !", description: data.filename });
      }
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de générer le PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [type, moduleId, orgName, locked, disabled, loading, toast]);

  if (variant === "outline") {
    return (
      <button
        onClick={handleClick}
        disabled={disabled || locked || loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || locked || loading}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-card/60 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed"
      aria-label={locked ? `${label} — disponible après validation du quiz` : `Télécharger ${label}`}
    >
      {loading
        ? <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
        : <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        <div className="text-xs text-muted-foreground">
          {locked ? "Disponible après quiz" : loading ? "Génération…" : "Cliquer pour télécharger"}
        </div>
      </div>
      {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
    </button>
  );
}
