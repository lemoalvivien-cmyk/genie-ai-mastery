/**
 * Page Playbooks — catalogue orienté résultats par catégorie métier
 * Remplace la logique "bibliothèque de cours" par "système de production"
 */
import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { BookOpen, Search, Loader2, Zap, TrendingUp, Users, BarChart2, Layout, Briefcase, Grid, Mail } from "lucide-react";
import { useModules, useUserProgress } from "@/hooks/useModules";
import { PlaybookCard } from "@/components/modules/PlaybookCard";
import { ModuleCard } from "@/components/modules/ModuleCard";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallOverlay } from "@/components/PaywallOverlay";
import { BUSINESS_CATEGORIES, DEMO_PLAYBOOKS, getPlaybookMeta } from "@/data/playbooks";

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  "": Grid,
  communication: Mail,
  vente: TrendingUp,
  rh: Users,
  productivite: Zap,
  analyse: BarChart2,
  presentation: Layout,
  direction: Briefcase,
};

const LEVELS = [
  { id: "", label: "Tous" },
  { id: "debutant", label: "Débutant" },
  { id: "intermediaire", label: "Intermédiaire" },
  { id: "avance", label: "Avancé" },
];

// Map business categories to module domains for DB filtering
const CATEGORY_TO_DOMAIN: Record<string, string> = {
  communication: "ia_pro",
  vente: "ia_pro",
  rh: "ia_perso",
  productivite: "ia_perso",
  analyse: "ia_pro",
  presentation: "ia_pro",
  direction: "ia_pro",
};

export default function Modules() {
  const { data: sub } = useSubscription();
  const isPro = sub?.plan === "pro";
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [level, setLevel] = useState("");
  const [search, setSearch] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Map business category to domain for API query
  const domainFilter = category ? (CATEGORY_TO_DOMAIN[category] ?? undefined) : undefined;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useModules({ domain: domainFilter, level: level || undefined });

  const allModules = data?.pages.flatMap((p) => p.data) ?? [];
  const moduleIds = allModules.map((m) => m.id);
  const { data: progressMap } = useUserProgress(moduleIds.length ? moduleIds : undefined);

  const filtered = allModules.filter((m) =>
    !search ||
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.subtitle?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Stats for header
  const totalDone = Object.values(progressMap ?? {}).filter((p) => p.status === "completed").length;
  const totalInProgress = Object.values(progressMap ?? {}).filter((p) => p.status === "in_progress").length;

  return (
    <>
      <Helmet>
        <title>Playbooks — Formetoialia</title>
        <meta name="description" content="Vos playbooks d'exécution IA pour produire des résultats concrets." />
      </Helmet>

      <div className="min-h-full" style={{ background: "#0C1014" }}>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
              <h1 className="text-2xl font-black bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #5257D8, #FE2C40)" }}>
                Vos playbooks
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Chaque playbook résout un vrai problème et génère un livrable réel
            </p>
            {(totalDone > 0 || totalInProgress > 0) && (
              <div className="flex items-center gap-3 mt-3">
                {totalDone > 0 && (
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                    ✓ {totalDone} terminé{totalDone > 1 ? "s" : ""}
                  </span>
                )}
                {totalInProgress > 0 && (
                  <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full font-medium">
                    ⟳ {totalInProgress} en cours
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Category filters — business oriented */}
          <div className="mb-6 space-y-3">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par catégorie métier">
              {BUSINESS_CATEGORIES.map((cat) => {
                const isActive = category === cat.id;
                const Icon = CATEGORY_ICONS[cat.id] ?? Grid;
                return (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setCategory(cat.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={
                      isActive
                        ? {
                            background: "#5257D8",
                            color: "#fff",
                            boxShadow: "0 0 14px rgba(82,87,216,0.5)",
                            border: "1px solid transparent",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            color: "hsl(var(--muted-foreground))",
                            border: "1px solid #2A2D3A",
                          }
                    }
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Level + search row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un playbook ou un problème..."
                  aria-label="Rechercher un playbook"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none transition-all focus:ring-2 focus:ring-primary/50"
                  style={{
                    background: "#1A1D2E",
                    border: "1px solid #2A2D3A",
                    color: "hsl(var(--foreground))",
                  }}
                />
              </div>
              <div className="flex gap-1.5">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLevel(l.id)}
                    className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={
                      level === l.id
                        ? { background: "#5257D8", color: "#fff" }
                        : { background: "rgba(255,255,255,0.04)", color: "hsl(var(--muted-foreground))", border: "1px solid #2A2D3A" }
                    }
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Demo playbooks header (shown when no DB results or for discovery) */}
          {!isLoading && filtered.length === 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-xs text-muted-foreground font-medium px-2">PLAYBOOKS DE DÉMONSTRATION</span>
                <div className="h-px flex-1 bg-border/30" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {DEMO_PLAYBOOKS
                  .filter((p) => !category || p.category === category)
                  .filter((p) => !search || p.problem.toLowerCase().includes(search.toLowerCase()) || p.deliverable.toLowerCase().includes(search.toLowerCase()))
                  .map((demo, idx) => {
                    // Create a synthetic module shape for demo cards
                    const syntheticModule = {
                      id: demo.slug,
                      domain: "ia_pro" as const,
                      slug: demo.slug,
                      title: demo.deliverable,
                      subtitle: demo.problem,
                      description: demo.result,
                      content_json: { sections: [] },
                      persona_variant: "universal",
                      level: "debutant" as const,
                      duration_minutes: demo.estimated_minutes,
                      icon_name: "BookOpen",
                      order_index: idx,
                      sources: [],
                      confidence_score: 0.95,
                      is_gold: false,
                      is_published: true,
                      deliverables: [{ type: demo.deliverable_type, title: demo.deliverable }],
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };
                    const isLocked = !isPro && idx >= 3;
                    if (isLocked) {
                      return (
                        <PaywallOverlay key={demo.slug} className="rounded-2xl">
                          <PlaybookCard module={syntheticModule} meta={demo} />
                        </PaywallOverlay>
                      );
                    }
                    return <PlaybookCard key={demo.slug} module={syntheticModule} meta={demo} />;
                  })}
              </div>
            </div>
          )}

          {/* Count */}
          {!isLoading && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground mb-4" aria-live="polite">
              {filtered.length} playbook{filtered.length !== 1 ? "s" : ""} trouvé{filtered.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #2A2D3A" }} />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Erreur lors du chargement. Réessayez.</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((mod, idx) => {
                const meta = getPlaybookMeta(mod.slug);
                const isLocked = !isPro && idx >= 3;
                if (isLocked) {
                  return (
                    <PaywallOverlay key={mod.id} className="rounded-2xl">
                      <PlaybookCard module={mod} progress={progressMap?.[mod.id]} meta={meta} />
                    </PaywallOverlay>
                  );
                }
                return <PlaybookCard key={mod.id} module={mod} progress={progressMap?.[mod.id]} meta={meta} />;
              })}
            </div>
          ) : null}

          {/* Load more sentinel */}
          <div ref={loadMoreRef} className="h-8 flex items-center justify-center mt-6">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>
        </main>
      </div>
    </>
  );
}
