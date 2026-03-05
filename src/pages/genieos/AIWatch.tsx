import { useState, useRef } from "react";
import { Cpu, RefreshCw, Rss, Sparkles, TrendingUp, Zap, BookOpen, Bot, Globe, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface WatchItem {
  source: string;
  category: string;
  title: string;
  summary: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  models:    { label: "Modèles",     color: "text-blue-400 bg-blue-400/10 border-blue-400/20",    icon: Cpu },
  tools:     { label: "Outils",      color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: Zap },
  frameworks:{ label: "Frameworks",  color: "text-purple-400 bg-purple-400/10 border-purple-400/20", icon: BookOpen },
  research:  { label: "Recherche",   color: "text-orange-400 bg-orange-400/10 border-orange-400/20", icon: TrendingUp },
  agents:    { label: "Agents",      color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",    icon: Bot },
  ai_news:   { label: "Actualités",  color: "text-pink-400 bg-pink-400/10 border-pink-400/20",    icon: Globe },
};

const QUICK_SEARCHES = [
  { label: "Nouveaux LLMs", category: "models" },
  { label: "Outils No-Code IA", category: "tools" },
  { label: "Agents autonomes", category: "agents" },
  { label: "Frameworks 2025", category: "frameworks" },
];

export default function AIWatch() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [digest, setDigest] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function runWatch() {
    if (loading) {
      abortRef.current?.abort();
      return;
    }
    setLoading(true);
    setItems([]);
    setDigest("");
    setProgress("Initialisation...");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";

    abortRef.current = new AbortController();

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/genieos-data-engine`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mode: "ai_watch" }),
          signal: abortRef.current.signal,
        }
      );

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "progress") setProgress(parsed.message);
            if (parsed.type === "done") {
              setItems(parsed.items ?? []);
              setDigest(parsed.digest ?? "");
              setProgress("");
            }
            if (parsed.type === "error") {
              setProgress(`Erreur: ${parsed.message}`);
            }
          } catch (_e) { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setProgress("Erreur de connexion au Data Engine");
      }
    } finally {
      setLoading(false);
    }
  }

  const filtered = activeFilter
    ? items.filter((i) => i.category === activeFilter)
    : items;

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Rss className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">AI Watch</h1>
              <p className="text-xs text-muted-foreground">Veille IA en temps réel</p>
            </div>
          </div>
          <button
            onClick={runWatch}
            disabled={false}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              loading
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            {loading ? "Arrêter" : "Lancer la veille"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quick searches */}
        {!loading && items.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Suggestions de veille :</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_SEARCHES.map((s) => {
                const cfg = CATEGORY_CONFIG[s.category];
                const Icon = cfg?.icon ?? Sparkles;
                return (
                  <button
                    key={s.label}
                    onClick={runWatch}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-sm text-left transition-colors"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground truncate">{s.label}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Rss className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Lancez une veille</p>
              <p className="text-xs text-muted-foreground mt-1">
                Le Data Engine va scraper les sources IA et générer un digest intelligent.
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        {loading && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              <p className="text-sm text-primary font-medium">{progress || "Analyse en cours..."}</p>
            </div>
            <div className="mt-3 h-1 bg-primary/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter(null)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                !activeFilter
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              Tout ({items.length})
            </button>
            {categories.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const count = items.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                    activeFilter === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {cfg?.label ?? cat} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Items grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((item, i) => {
              const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.ai_news;
              const Icon = cfg.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0", cfg.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", cfg.color)}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{item.source}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{item.summary}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Digest */}
        {digest && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Digest IA — Synthèse intelligente</h3>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/90 leading-relaxed">
              {digest.split("\n").map((line, i) => {
                if (line.startsWith("## ")) return <h3 key={i} className="text-base font-bold text-foreground mt-3 mb-1">{line.slice(3)}</h3>;
                if (line.startsWith("### ")) return <h4 key={i} className="text-sm font-semibold text-foreground mt-2 mb-1">{line.slice(4)}</h4>;
                if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-foreground">{line.slice(2, -2)}</p>;
                if (line.startsWith("- ") || line.startsWith("• ")) return <li key={i} className="text-muted-foreground ml-4">{line.slice(2)}</li>;
                if (line.trim() === "") return <br key={i} />;
                return <p key={i} className="text-muted-foreground">{line}</p>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
