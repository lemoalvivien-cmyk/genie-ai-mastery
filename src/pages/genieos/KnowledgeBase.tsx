import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Upload, Search, Trash2, FileText, Globe,
  Loader2, CheckCircle2, AlertCircle, Plus, X, Sparkles,
  ChevronRight, Database
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Document = {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  metadata: Record<string, unknown>;
  source_id: string | null;
};

type SearchResult = {
  content: string;
  title: string;
  similarity: number;
  document_id: string;
};

type IngestMode = "text" | "url" | "upload";

export default function KnowledgeBase() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [ingestMode, setIngestMode] = useState<IngestMode>("text");
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [inputName, setInputName] = useState("");

  // ── Fetch documents ──────────────────────────────────────────────────────────
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["knowledge_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Document[];
    },
  });

  // ── Ingest mutation ──────────────────────────────────────────────────────────
  const ingestMutation = useMutation({
    mutationFn: async (payload: { content: string; name: string; type: string; source_url?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/genieos-knowledge?action=ingest`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Ingestion failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Document indexé",
        description: `"${data.title}" — ${data.chunks} chunks, ${data.embedded} embeddings`,
      });
      qc.invalidateQueries({ queryKey: ["knowledge_documents"] });
      setShowAddPanel(false);
      setInputText("");
      setInputUrl("");
      setInputName("");
    },
    onError: () => {
      toast({ title: "Erreur d'indexation", description: "Impossible d'indexer le document.", variant: "destructive" });
    },
  });

  // ── Delete mutation ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/genieos-knowledge?action=delete`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ document_id: documentId }),
        }
      );
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document supprimé" });
      qc.invalidateQueries({ queryKey: ["knowledge_documents"] });
    },
  });

  // ── Search ────────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/genieos-knowledge?action=search`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: searchQuery, limit: 5 }),
        }
      );
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch (_e) {
      toast({ title: "Erreur de recherche", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // ── File upload ───────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setInputText(text);
    setInputName(file.name.replace(/\.[^.]+$/, ""));
    setIngestMode("text");
  };

  // ── Ingest submit ─────────────────────────────────────────────────────────────
  const handleIngest = () => {
    if (ingestMode === "text" && inputText.trim()) {
      ingestMutation.mutate({ content: inputText, name: inputName || "Document texte", type: "text" });
    } else if (ingestMode === "url" && inputUrl.trim()) {
      ingestMutation.mutate({
        content: `URL source: ${inputUrl}\n\nContenu à récupérer depuis: ${inputUrl}`,
        name: inputName || inputUrl,
        type: "url",
        source_url: inputUrl,
      });
    }
  };

  const statusColor = (status: string) => {
    if (status === "ready") return "text-emerald-400";
    if (status === "processing") return "text-yellow-400";
    return "text-muted-foreground";
  };

  const statusIcon = (status: string) => {
    if (status === "ready") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    if (status === "processing") return <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />;
    return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">

      {/* Sidebar: document list */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-card/50">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Base de connaissances</span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowAddPanel(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{documents.length}</div>
              <div className="text-xs text-muted-foreground">docs</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-400">
                {documents.filter(d => d.status === "ready").length}
              </div>
              <div className="text-xs text-muted-foreground">indexés</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {documents.reduce((acc, d) => acc + (Number((d.metadata as Record<string, unknown>)?.chunks ?? 0)), 0)}
              </div>
              <div className="text-xs text-muted-foreground">chunks</div>
            </div>
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && documents.length === 0 && (
            <div className="text-center py-8 px-4">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">Aucun document indexé</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs h-7" onClick={() => setShowAddPanel(true)}>
                <Plus className="w-3 h-3 mr-1" /> Ajouter
              </Button>
            </div>
          )}
          {documents.map((doc) => (
            <div key={doc.id} className="group flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="mt-0.5 flex-shrink-0">
                {statusIcon(doc.status)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.title || "Sans titre"}</p>
                <p className={cn("text-xs mt-0.5", statusColor(doc.status))}>
                  {doc.status === "ready" ? `${(doc.metadata as Record<string, unknown>)?.chunks ?? 0} chunks` : doc.status}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={() => deleteMutation.mutate(doc.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add button */}
        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setShowAddPanel(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Ajouter un document
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Search bar */}
        <div className="p-4 border-b border-border bg-card/30 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Rechercher dans votre base de connaissances..."
              className="pl-9 bg-background border-border"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()} className="shrink-0">
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="ml-2 hidden sm:inline">Rechercher</span>
          </Button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">{searchResults.length} résultats pour "{searchQuery}"</h3>
                <Button variant="ghost" size="sm" className="h-6 ml-auto text-xs" onClick={() => setSearchResults([])}>
                  <X className="w-3 h-3 mr-1" /> Effacer
                </Button>
              </div>
              <div className="space-y-3">
                {searchResults.map((r, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-medium text-foreground">{r.title}</span>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {(r.similarity * 100).toFixed(0)}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{r.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add panel */}
          {showAddPanel && (
            <div className="mb-8 rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Ajouter un document</h3>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowAddPanel(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Mode selector */}
              <div className="flex gap-2 mb-4">
              {(["text", "url", "upload"] as IngestMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setIngestMode(mode)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                      ingestMode === mode
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {mode === "text" && <><FileText className="w-3.5 h-3.5" />Texte</>}
                    {mode === "url" && <><Globe className="w-3.5 h-3.5" />URL</>}
                    {mode === "upload" && <><Upload className="w-3.5 h-3.5" />Fichier</>}
                  </button>
                ))}
              </div>

              {/* Name input */}
              <Input
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Nom du document (optionnel — généré automatiquement)"
                className="mb-3 bg-background border-border"
              />

              {/* Text mode */}
              {ingestMode === "text" && (
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Collez votre texte ici..."
                  className="min-h-36 bg-background border-border font-mono text-sm resize-none mb-3"
                />
              )}

              {/* URL mode */}
              {ingestMode === "url" && (
                <Input
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://exemple.com/article"
                  className="mb-3 bg-background border-border"
                />
              )}

              {/* Upload mode */}
              {ingestMode === "upload" && (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors mb-3"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Glissez un fichier ou cliquez</p>
                  <p className="text-xs text-muted-foreground mt-1">.txt, .md, .json supportés</p>
                  <input ref={fileRef} type="file" accept=".txt,.md,.json,.csv" className="hidden" onChange={handleFileUpload} />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleIngest}
                  disabled={ingestMutation.isPending || (ingestMode === "text" && !inputText.trim()) || (ingestMode === "url" && !inputUrl.trim())}
                  className="flex-1"
                >
                  {ingestMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Indexation...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Indexer le document</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowAddPanel(false)}>Annuler</Button>
              </div>
            </div>
          )}

          {/* Empty / intro state */}
          {!showAddPanel && searchResults.length === 0 && (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <Database className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">Base de connaissances IA</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Indexez vos documents, articles et contenus. Le chat IA et vos agents pourront automatiquement
                les utiliser pour des réponses contextualisées et précises.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
                {[
                  { icon: FileText, title: "Documents texte", desc: "Notes, articles, rapports, données structurées" },
                  { icon: Globe, title: "Sources web", desc: "URLs, pages web, articles en ligne" },
                  { icon: Sparkles, title: "RAG automatique", desc: "Contexte injecté automatiquement dans vos agents" },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-xl border border-border bg-card/50 p-4">
                    <Icon className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm font-medium text-foreground mb-1">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>

              <Button onClick={() => setShowAddPanel(true)} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter votre premier document
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
