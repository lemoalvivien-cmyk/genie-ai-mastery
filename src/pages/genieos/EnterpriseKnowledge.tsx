import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Upload, Search, Trash2, FileText, Globe, Shield,
  Loader2, CheckCircle2, AlertCircle, Plus, X, Sparkles,
  Database, Settings, RefreshCw, Rss, Zap, ChevronDown, ChevronRight,
  Lock, Edit3, Save, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// ── Types ──────────────────────────────────────────────────────────────────
type OrgDoc = {
  id: string; title: string; status: string; category: string | null;
  source_type: string; is_auto: boolean; created_at: string;
  metadata: Record<string, unknown>;
};

type WorldWatchEntry = {
  id: string; entry_id: string; title: string; summary: string | null;
  severity: string | null; source: string; url: string | null;
  published_at: string | null; tags: string[]; is_ingested: boolean;
};

type SearchResult = {
  content: string; title: string; similarity: number;
  category: string; source_type: string;
};

// ── Default enterprise prompt template ───────────────────────────────────
const DEFAULT_PROMPT_TEMPLATE = `Tu es l'assistant IA de {company_name}, une entreprise du secteur {industry}.

CONTEXTE ENTREPRISE :
- Cadre réglementaire : {compliance_frameworks}
- Politique de sécurité interne : applique les standards définis dans la base de connaissances.
- Confidentialité : toutes les données discutées sont propriété de {company_name}.

RÈGLES SPÉCIFIQUES À L'ORGANISATION :
- Utilise TOUJOURS le contexte documentaire fourni avant de répondre.
- Si la réponse concerne une politique interne, cite le document source.
- Adapte ton niveau technique au profil : {user_level}.
- Langue officielle : {language}.

PRIORITÉS DE RÉPONSE :
1. Documents internes de l'organisation (base RAG)
2. CVE / menaces récentes du WorldWatch
3. Tes connaissances générales (en dernier recours, indique que c'est une connaissance générale)`;

// ── Fetch helper ──────────────────────────────────────────────────────────
async function callRAG(action: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enterprise-rag?action=${action}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Severity badge ────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string | null }) {
  const color =
    severity === "critical" ? "text-red-400 border-red-400/40 bg-red-400/10" :
    severity === "high"     ? "text-orange-400 border-orange-400/40 bg-orange-400/10" :
    severity === "medium"   ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" :
                              "text-muted-foreground border-border/50 bg-card";
  return (
    <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border", color)}>
      {severity ?? "info"}
    </span>
  );
}

// ── Doc status icon ───────────────────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
  if (status === "ready")      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (status === "processing") return <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin shrink-0" />;
  return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
}

// ── Category chip ─────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  policy:     "bg-blue-500/15 text-blue-400 border-blue-500/20",
  procedure:  "bg-purple-500/15 text-purple-400 border-purple-500/20",
  standard:   "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  worldwatch: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  cve:        "bg-red-500/15 text-red-400 border-red-500/20",
  custom:     "bg-muted/50 text-muted-foreground border-border/40",
};
function CatBadge({ cat }: { cat: string | null }) {
  const c = cat ?? "custom";
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", CAT_COLORS[c] ?? CAT_COLORS.custom)}>
      {c}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function EnterpriseKnowledge() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"docs" | "worldwatch" | "prompt" | "search">("docs");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Upload form
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadCat, setUploadCat] = useState("custom");
  const [uploadMode, setUploadMode] = useState<"text" | "file">("text");

  // Prompt editor
  const [promptText, setPromptText] = useState(DEFAULT_PROMPT_TEMPLATE);
  const [promptVars, setPromptVars] = useState<Record<string, string>>({
    company_name: profile?.full_name?.split(" ")[0] ?? "Mon Entreprise",
    industry: "Technologie",
    compliance_frameworks: "ISO 27001, RGPD",
    language: "Français",
    user_level: "intermédiaire",
  });
  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [isPromptSaved, setIsPromptSaved] = useState(false);

  // WorldWatch expand
  const [expandedWW, setExpandedWW] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: docs = [], isLoading: docsLoading } = useQuery<OrgDoc[]>({
    queryKey: ["org_knowledge_docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_knowledge_documents")
        .select("id, title, status, category, source_type, is_auto, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as OrgDoc[];
    },
  });

  const { data: wwEntries = [], isLoading: wwLoading, refetch: refetchWW } = useQuery<WorldWatchEntry[]>({
    queryKey: ["worldwatch_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worldwatch_entries")
        .select("id, entry_id, title, summary, severity, source, url, published_at, tags, is_ingested")
        .order("fetched_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as WorldWatchEntry[];
    },
  });

  const { data: promptData } = useQuery({
    queryKey: ["org_system_prompt"],
    queryFn: async () => {
      const json = await callRAG("get_prompt");
      return json.prompt ?? null;
    },
    onSuccess: (data) => {
      if (data?.prompt_text) setPromptText(data.prompt_text);
      if (data?.variables)   setPromptVars(data.variables as Record<string, string>);
    },
  } as Parameters<typeof useQuery>[0]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const ingestMut = useMutation({
    mutationFn: (payload: { content: string; name: string; category: string }) =>
      callRAG("ingest_doc", { ...payload, source_type: "upload" }),
    onSuccess: (d) => {
      toast({ title: "Document indexé ✅", description: `${d.chunks} chunks, ${d.embedded} embeddings` });
      qc.invalidateQueries({ queryKey: ["org_knowledge_docs"] });
      setShowUpload(false); setUploadText(""); setUploadName("");
    },
    onError: () => toast({ title: "Erreur d'indexation", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => callRAG("delete_doc", { document_id: id }),
    onSuccess: () => {
      toast({ title: "Document supprimé" });
      qc.invalidateQueries({ queryKey: ["org_knowledge_docs"] });
    },
  });

  const wwFetchMut = useMutation({
    mutationFn: () => callRAG("worldwatch_fetch"),
    onSuccess: (d) => {
      toast({ title: `WorldWatch mis à jour`, description: `${d.stored} nouvelles entrées` });
      refetchWW();
    },
  });

  const wwIngestMut = useMutation({
    mutationFn: () => callRAG("worldwatch_ingest"),
    onSuccess: (d) => {
      toast({ title: `${d.ingested} menaces intégrées à la base RAG` });
      qc.invalidateQueries({ queryKey: ["org_knowledge_docs"] });
      refetchWW();
    },
  });

  const savePromptMut = useMutation({
    mutationFn: () => callRAG("upsert_prompt", { prompt_text: promptText, variables: promptVars }),
    onSuccess: () => {
      toast({ title: "Prompt système sauvegardé ✅" });
      setIsPromptSaved(true);
      setTimeout(() => setIsPromptSaved(false), 3000);
      qc.invalidateQueries({ queryKey: ["org_system_prompt"] });
    },
  });

  // ── File upload handler ───────────────────────────────────────────────────
  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadText(text);
    setUploadName(file.name.replace(/\.[^.]+$/, ""));
    setUploadMode("text");
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const data = await callRAG("search", { query: searchQuery, limit: 6 });
      setSearchResults(data.results ?? []);
      if ((data.results ?? []).length === 0) toast({ title: "Aucun résultat trouvé" });
    } catch (_e) {
      toast({ title: "Erreur de recherche", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, toast]);

  // ── Resolved prompt preview ───────────────────────────────────────────────
  const resolvedPrompt = promptText.replace(
    /\{(\w+)\}/g,
    (_, k) => promptVars[k] ?? `{${k}}`
  );

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalDocs    = docs.length;
  const readyDocs    = docs.filter(d => d.status === "ready").length;
  const totalChunks  = docs.reduce((a, d) => a + (Number(d.metadata?.chunks ?? 0)), 0);
  const autoDocs     = docs.filter(d => d.is_auto).length;
  const criticalWW   = wwEntries.filter(e => e.severity === "critical" && !e.is_ingested).length;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">Enterprise RAG</h1>
              <p className="text-[10px] text-muted-foreground">Base de connaissances org + WorldWatch CVE</p>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 text-xs">
            {[
              { label: "Documents", val: readyDocs, total: totalDocs, color: "text-emerald-400" },
              { label: "Chunks RAG", val: totalChunks, color: "text-primary" },
              { label: "Auto (CVE)", val: autoDocs, color: "text-orange-400" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={cn("font-bold text-sm", s.color)}>{s.val}{s.total ? `/${s.total}` : ""}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex flex-col h-full">
          <TabsList className="flex-shrink-0 mx-4 mt-3 h-9 bg-muted/50">
            <TabsTrigger value="docs" className="flex-1 text-xs gap-1.5">
              <Database className="w-3.5 h-3.5" />Documents
            </TabsTrigger>
            <TabsTrigger value="worldwatch" className="flex-1 text-xs gap-1.5 relative">
              <Rss className="w-3.5 h-3.5" />WorldWatch
              {criticalWW > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold flex items-center justify-center text-white">
                  {criticalWW}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="prompt" className="flex-1 text-xs gap-1.5">
              <Settings className="w-3.5 h-3.5" />Prompt Sys.
            </TabsTrigger>
            <TabsTrigger value="search" className="flex-1 text-xs gap-1.5">
              <Search className="w-3.5 h-3.5" />Test RAG
            </TabsTrigger>
          </TabsList>

          {/* ── DOCUMENTS TAB ────────────────────────────────────────────── */}
          <TabsContent value="docs" className="flex-1 overflow-y-auto px-4 pb-4 mt-3 space-y-3">
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-1.5 gradient-primary border-0 shadow-glow-sm h-8" onClick={() => setShowUpload(true)}>
                <Plus className="w-3.5 h-3.5" />Ajouter
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border"
                onClick={() => { fileRef.current?.click(); setShowUpload(true); }}>
                <Upload className="w-3.5 h-3.5" />Fichier
              </Button>
              <input ref={fileRef} type="file" accept=".txt,.md,.json,.csv,.pdf" className="hidden" onChange={handleFile} />
            </div>

            {/* Upload panel */}
            {showUpload && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">Nouveau document</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowUpload(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <Input value={uploadName} onChange={e => setUploadName(e.target.value)}
                  placeholder="Nom du document" className="bg-background border-border text-sm" />

                {/* Category */}
                <div className="flex flex-wrap gap-1.5">
                  {["policy","procedure","standard","custom"].map(c => (
                    <button key={c} onClick={() => setUploadCat(c)}
                      className={cn("text-xs px-2.5 py-1 rounded-full border transition-all",
                        uploadCat === c ? "border-primary/60 bg-primary/15 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/30"
                      )}>
                      {c}
                    </button>
                  ))}
                </div>

                <Textarea value={uploadText} onChange={e => setUploadText(e.target.value)}
                  placeholder="Collez le contenu du document (politique de sécurité, procédure, charte…)"
                  className="min-h-32 bg-background border-border font-mono text-xs resize-none" />

                <Button onClick={() => ingestMut.mutate({ content: uploadText, name: uploadName || "Document", category: uploadCat })}
                  disabled={!uploadText.trim() || ingestMut.isPending}
                  className="w-full gradient-primary border-0">
                  {ingestMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Indexation…</> : <><Zap className="w-4 h-4 mr-2" />Indexer et embed</>}
                </Button>
              </div>
            )}

            {/* Document list */}
            {docsLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
            {!docsLoading && docs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">Aucun document</p>
                <p className="text-xs opacity-70 mt-1">Ajoutez des politiques, procédures, standards…</p>
              </div>
            )}
            {docs.filter(d => !d.is_auto).map(doc => (
              <div key={doc.id} className="group flex items-start gap-2.5 p-3 rounded-lg border border-border/50 bg-card/60 hover:bg-card transition-colors">
                <StatusIcon status={doc.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">{doc.title}</span>
                    <CatBadge cat={doc.category} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {doc.status === "ready" ? `${doc.metadata?.chunks ?? 0} chunks · ${doc.metadata?.embedded ?? 0} embeddings` : doc.status}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => deleteMut.mutate(doc.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}

            {/* Auto docs summary */}
            {autoDocs > 0 && (
              <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 flex items-center gap-2 text-xs">
                <Rss className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="text-muted-foreground">{autoDocs} documents auto-ingérés (WorldWatch CVE)</span>
              </div>
            )}
          </TabsContent>

          {/* ── WORLDWATCH TAB ───────────────────────────────────────────── */}
          <TabsContent value="worldwatch" className="flex-1 overflow-y-auto px-4 pb-4 mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => wwFetchMut.mutate()} disabled={wwFetchMut.isPending}>
                {wwFetchMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Actualiser flux CVE
              </Button>
              <Button size="sm" className="gap-1.5 gradient-primary border-0 shadow-glow-sm h-8"
                onClick={() => wwIngestMut.mutate()} disabled={wwIngestMut.isPending}>
                {wwIngestMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Intégrer au RAG
              </Button>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5 p-2.5 rounded-lg bg-muted/30 border border-border/40">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Sources : NVD (NIST) + CISA KEV. Les menaces critiques sont automatiquement intégrées dans la base RAG de votre organisation.
            </div>

            {wwLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
            {wwEntries.map(entry => (
              <div key={entry.id} className={cn(
                "rounded-lg border bg-card/60 transition-all",
                entry.severity === "critical" ? "border-red-500/30" :
                entry.severity === "high" ? "border-orange-500/30" : "border-border/50"
              )}>
                <button className="w-full flex items-start gap-2.5 p-3 text-left"
                  onClick={() => setExpandedWW(expandedWW === entry.id ? null : entry.id)}>
                  <SeverityBadge severity={entry.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{entry.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-muted-foreground uppercase">{entry.source}</span>
                      {entry.is_ingested && <span className="text-[10px] text-emerald-400">✓ RAG</span>}
                    </div>
                  </div>
                  {expandedWW === entry.id
                    ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  }
                </button>
                {expandedWW === entry.id && (
                  <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-1.5 animate-fade-in">
                    <p className="text-xs text-muted-foreground leading-relaxed">{entry.summary}</p>
                    {entry.url && (
                      <a href={entry.url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-1">
                        <Globe className="w-3 h-3" />Voir sur {entry.source.toUpperCase()}
                      </a>
                    )}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(entry.tags ?? []).filter(Boolean).map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/30">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!wwLoading && wwEntries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucune entrée WorldWatch</p>
                <p className="text-xs opacity-70 mt-1">Cliquez "Actualiser flux CVE" pour récupérer les dernières menaces</p>
              </div>
            )}
          </TabsContent>

          {/* ── SYSTEM PROMPT TAB ────────────────────────────────────────── */}
          <TabsContent value="prompt" className="flex-1 overflow-y-auto px-4 pb-4 mt-3 space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
              Ce prompt est injecté en tête de chaque conversation de votre organisation, avant le contexte RAG.
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-primary" />Variables de l'organisation
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(promptVars).map(([k, v]) => (
                  <div key={k} className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{`{${k}}`}</label>
                    <Input
                      value={v}
                      onChange={e => setPromptVars(prev => ({ ...prev, [k]: e.target.value }))}
                      className="h-7 text-xs bg-background border-border"
                      placeholder={k}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt editor */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />Template du prompt système
              </p>
              <Textarea
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                className="min-h-48 bg-background border-border font-mono text-xs resize-none"
                placeholder="Prompt système enterprise…"
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />Aperçu résolu
              </p>
              <div className="bg-muted/30 border border-border/40 rounded-lg p-3 text-xs text-muted-foreground font-mono leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                {resolvedPrompt}
              </div>
            </div>

            <Button
              onClick={() => savePromptMut.mutate()}
              disabled={savePromptMut.isPending}
              className={cn("w-full gap-2", isPromptSaved ? "bg-emerald-600 hover:bg-emerald-600" : "gradient-primary border-0")}
            >
              {savePromptMut.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Sauvegarde…</>
                : isPromptSaved
                ? <><CheckCircle2 className="w-4 h-4" />Sauvegardé !</>
                : <><Save className="w-4 h-4" />Sauvegarder le prompt</>
              }
            </Button>
          </TabsContent>

          {/* ── TEST RAG TAB ─────────────────────────────────────────────── */}
          <TabsContent value="search" className="flex-1 overflow-y-auto px-4 pb-4 mt-3 space-y-3">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Testez une requête RAG : ex. 'politique de mots de passe'"
                className="bg-background border-border text-sm"
              />
              <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()} className="shrink-0 h-9">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Simule la récupération de contexte que l'IA injectera dans ses réponses (hybrid search : sémantique + FTS).
            </p>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">{searchResults.length} chunks trouvés</p>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSearchResults([])}>
                    <X className="w-3 h-3 mr-1" />Effacer
                  </Button>
                </div>
                {searchResults.map((r, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium text-foreground">{r.title}</span>
                        <CatBadge cat={r.category} />
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {(r.similarity * 100).toFixed(0)}% match
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{r.content}</p>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && !isSearching && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Testez votre base RAG</p>
                <p className="text-xs opacity-70 mt-1">Les résultats montrent exactement ce que l'IA va utiliser pour répondre</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
