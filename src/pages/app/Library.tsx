/**
 * /app/library — Bibliothèque personnelle d'artefacts
 * Espace de capitalisation : tout ce que l'utilisateur a produit ou sauvegardé
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import {
  BookMarked,
  Search,
  FileText,
  Code,
  Award,
  Scroll,
  ListChecks,
  Brain,
  ChevronRight,
  Download,
  Trash2,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Artifact {
  id: string;
  title: string;
  type: string;
  content: string | null;
  created_at: string;
  signed_url: string | null;
  file_path: string | null;
  metadata: Record<string, unknown> | null;
}

// ── Config par type ───────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
  icon: React.FC<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
}> = {
  prompt:            { icon: Brain,      label: "Prompt",         color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
  reponse_amelioree: { icon: Sparkles,   label: "Réponse IA",     color: "text-primary",     bg: "bg-primary/10 border-primary/20" },
  checklist:         { icon: ListChecks, label: "Checklist",      color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  synthese:          { icon: FileText,   label: "Synthèse",       color: "text-sky-400",     bg: "bg-sky-500/10 border-sky-500/20" },
  analyse:           { icon: Brain,      label: "Analyse",        color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20" },
  pdf:               { icon: Scroll,     label: "Attestation",    color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  attestation:       { icon: Award,      label: "Certificat",     color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  code:              { icon: Code,       label: "Code",           color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  brief:             { icon: FileText,   label: "Brief",          color: "text-teal-400",    bg: "bg-teal-500/10 border-teal-500/20" },
  charte:            { icon: FileText,   label: "Charte IA",      color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20" },
  default:           { icon: FileText,   label: "Livrable",       color: "text-muted-foreground", bg: "bg-muted/20 border-border/30" },
};

const ALL_FILTERS = [
  { key: "all", label: "Tout" },
  { key: "prompt", label: "Prompts" },
  { key: "synthese", label: "Synthèses" },
  { key: "reponse_amelioree", label: "Réponses IA" },
  { key: "checklist", label: "Checklists" },
  { key: "attestation,pdf", label: "Certificats" },
  { key: "code,brief,charte", label: "Autres" },
];

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { locale: fr, addSuffix: true });
}

// ── Composant carte artefact ──────────────────────────────────────────────────

function ArtifactCard({
  artifact,
  onDelete,
}: {
  artifact: Artifact;
  onDelete: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[artifact.type] ?? TYPE_CONFIG.default;
  const Icon = cfg.icon;
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = artifact.signed_url ?? artifact.file_path;
  const hasContent = !!artifact.content;

  const handleCopy = async () => {
    if (!artifact.content) return;
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        cfg.bg,
        expanded ? "ring-1 ring-primary/20" : ""
      )}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => hasContent && setExpanded((v) => !v)}
        role={hasContent ? "button" : undefined}
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-background/50 border border-border/30")}>
          <Icon className={cn("w-4 h-4", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">{artifact.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</span>
            <span className="text-muted-foreground text-[10px]">·</span>
            <span className="text-muted-foreground text-[10px]">{timeAgo(artifact.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasContent && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="p-1.5 rounded-lg hover:bg-background/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Copier le contenu"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg hover:bg-background/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Télécharger"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(artifact.id); }}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {hasContent && (
            <ChevronRight
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                expanded && "rotate-90"
              )}
            />
          )}
        </div>
      </div>

      {/* Content panel */}
      {expanded && artifact.content && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-background/40 rounded-lg border border-border/30 p-3 max-h-64 overflow-y-auto">
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
              {artifact.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function Library() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: artifacts, isLoading, refetch } = useQuery({
    queryKey: ["library_artifacts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("artifacts") as any)
        .select("id, title, type, content, created_at, signed_url, file_path, metadata")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Artifact[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("artifacts").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: "Suppression échouée.", variant: "destructive" });
    } else {
      toast({ title: "Artefact supprimé" });
      refetch();
    }
  };

  // Filtrage
  const filtered = (artifacts ?? []).filter((a) => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (activeFilter === "all") return true;
    const keys = activeFilter.split(",");
    return keys.includes(a.type);
  });

  const total = artifacts?.length ?? 0;

  return (
    <div className="h-full flex flex-col" style={{ background: "#0C1014" }}>
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border/30"
           style={{ background: "#13151E" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: "rgba(82,87,216,0.15)", border: "1px solid rgba(82,87,216,0.3)" }}>
            <BookMarked className="w-5 h-5" style={{ color: "#5257D8" }} />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground">Ma bibliothèque</h1>
            <p className="text-xs text-muted-foreground">
              {total > 0 ? `${total} artefact${total > 1 ? "s" : ""} sauvegardé${total > 1 ? "s" : ""}` : "Vos productions et feedbacks sauvegardés"}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un artefact…"
            className="pl-9 bg-background/50 border-border/40 text-sm h-9"
          />
        </div>

        {/* Type filters */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {ALL_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all font-medium",
                activeFilter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/40 text-muted-foreground border-border/30 hover:border-primary/30 hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BookMarked className="w-7 h-7 text-primary/60" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {search ? "Aucun résultat" : "Bibliothèque vide"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  {search
                    ? "Essayez un autre terme de recherche."
                    : "Complétez des missions et sauvegardez les feedbacks pour construire votre capital de travail."}
                </p>
              </div>
              {!search && (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => window.location.href = "/app/today"}>
                  Commencer une mission →
                </Button>
              )}
            </div>
          ) : (
            filtered.map((a) => (
              <ArtifactCard key={a.id} artifact={a} onDelete={handleDelete} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
