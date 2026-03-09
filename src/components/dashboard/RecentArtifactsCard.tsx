/**
 * BLOC 4 — Evidence Layer
 * Affiche les derniers artifacts (livrables/preuves) de l'utilisateur
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { FileText, Download, ExternalLink, Award, Code, Scroll } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Artifact {
  id: string;
  title: string;
  type: string;
  created_at: string;
  signed_url: string | null;
  file_path: string | null;
}

const TYPE_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; label: string; color: string }> = {
  pdf:          { icon: Scroll,    label: "Attestation",     color: "text-amber-400" },
  attestation:  { icon: Award,     label: "Attestation",     color: "text-amber-400" },
  charte:       { icon: FileText,  label: "Charte IA",       color: "text-indigo-400" },
  code:         { icon: Code,      label: "Code généré",     color: "text-emerald-400" },
  brief:        { icon: FileText,  label: "Brief",           color: "text-cyan-400" },
  default:      { icon: FileText,  label: "Livrable",        color: "text-muted-foreground" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function RecentArtifactsCard() {
  const user = useAuthStore((s) => s.user);

  const { data: artifacts, isLoading } = useQuery({
    queryKey: ["recent_artifacts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("artifacts")
        .select("id, title, type, created_at, signed_url, file_path")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Artifact[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
      </div>
    );
  }

  if (!artifacts?.length) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5">
        <h3 className="font-bold text-sm mb-3 text-muted-foreground">Livrables & Preuves</h3>
        <div className="text-center py-4 space-y-1">
          <FileText className="w-8 h-8 mx-auto text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">Complétez des modules pour générer vos premiers livrables.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-sm">Livrables & Preuves</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
          {artifacts.length}
        </span>
      </div>

      <div className="p-3 space-y-1.5">
        {artifacts.map((artifact) => {
          const cfg = TYPE_CONFIG[artifact.type] ?? TYPE_CONFIG.default;
          const Icon = cfg.icon;
          const url = artifact.signed_url ?? artifact.file_path;

          return (
            <div
              key={artifact.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors group"
            >
              <div className={`w-8 h-8 rounded-lg bg-card/80 border border-border/50 flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{artifact.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cfg.color}>{cfg.label}</span>
                  <span>·</span>
                  <span>{formatDate(artifact.created_at)}</span>
                </div>
              </div>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-primary/10"
                  title="Ouvrir le livrable"
                  onClick={(e) => e.stopPropagation()}
                >
                  {url.endsWith(".pdf") ? (
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
