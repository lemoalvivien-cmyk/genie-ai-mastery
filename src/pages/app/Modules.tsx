import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { Brain, LogOut, BookOpen, Filter, Search, Loader2, ChevronDown, Code2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useModules, useUserProgress } from "@/hooks/useModules";
import { ModuleCard } from "@/components/modules/ModuleCard";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallOverlay } from "@/components/PaywallOverlay";

const DOMAINS = [
  { id: "", label: "Tous" },
  { id: "ia_pro", label: "IA Pro" },
  { id: "ia_perso", label: "IA Perso" },
  { id: "cyber", label: "Cyber" },
  { id: "vibe_coding", label: "Vibe Coding", icon: Code2, color: "emerald" },
];

const LEVELS = [
  { id: "", label: "Tous niveaux" },
  { id: "debutant", label: "Débutant" },
  { id: "intermediaire", label: "Intermédiaire" },
  { id: "avance", label: "Avancé" },
];

export default function Modules() {
  const { signOut } = useAuth();
  const { data: sub } = useSubscription();
  const isPro = sub?.plan === "pro";
  const [searchParams] = useSearchParams();
  const [domain, setDomain] = useState(() => searchParams.get("domain") ?? "");
  const [level, setLevel] = useState("");
  const [search, setSearch] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useModules({ domain: domain || undefined, level: level || undefined });

  const allModules = data?.pages.flatMap((p) => p.data) ?? [];
  const moduleIds = allModules.map((m) => m.id);
  const { data: progressMap } = useUserProgress(moduleIds.length ? moduleIds : undefined);

  // Filter by search
  const filtered = allModules.filter((m) =>
    !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.subtitle?.toLowerCase().includes(search.toLowerCase())
  );

  // Infinite scroll observer
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

  return (
    <>
      <Helmet>
        <title>Modules – GENIE IA</title>
        <meta name="description" content="Explorez tous les modules de formation IA et cybersécurité." />
      </Helmet>

      <div className="min-h-screen gradient-hero">
        {/* Navbar */}
        <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold hidden sm:block">GENIE <span className="text-gradient">IA</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/app/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Déconnexion">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
              <h1 className="text-2xl font-bold">Bibliothèque de modules</h1>
            </div>
            <p className="text-muted-foreground">Choisissez votre prochain module d'apprentissage</p>
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-3">
            {/* Domain tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrer par domaine">
              {DOMAINS.map((d) => {
                const isActive = domain === d.id;
                const isVibe = d.id === "vibe_coding";
                return (
                  <button
                    key={d.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setDomain(d.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 border focus-ring flex items-center gap-1.5 ${
                      isActive
                        ? isVibe
                          ? "bg-emerald-500 text-white border-transparent shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                          : "gradient-primary text-primary-foreground border-transparent shadow-glow"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card/40"
                    }`}
                  >
                    {isVibe && <Code2 className="w-3.5 h-3.5 shrink-0" />}
                    {d.label}
                    {isVibe && (
                      <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                        NEW
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sub-filters row */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un module..."
                  aria-label="Rechercher un module"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card/60 border border-border/60 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                />
              </div>
              {/* Level select */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  aria-label="Filtrer par niveau"
                  className="pl-10 pr-8 py-2.5 rounded-xl bg-card/60 border border-border/60 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all appearance-none cursor-pointer min-w-[180px]"
                >
                  {LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Count */}
          {!isLoading && (
            <p className="text-sm text-muted-foreground mb-4" aria-live="polite">
              {filtered.length} module{filtered.length !== 1 ? "s" : ""} trouvé{filtered.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 rounded-2xl bg-card/40 border border-border/30 animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Erreur lors du chargement. Réessayez.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun module trouvé avec ces filtres.</p>
            </div>
          ) : (
            <>
              {/* Vibe Coding domain locked for free users */}
              {domain === "vibe_coding" && !isPro ? (
                <PaywallOverlay feature="Vibe Coding — Débloquez avec GENIE Pro" className="rounded-2xl min-h-[300px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pointer-events-none">
                    {filtered.slice(0, 3).map((mod) => (
                      <ModuleCard key={mod.id} module={mod} progress={progressMap?.[mod.id]} />
                    ))}
                  </div>
                </PaywallOverlay>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((mod, idx) => {
                    // Lock modules beyond the first 3 per domain for free users
                    const isLocked = !isPro && idx >= 3;
                    if (isLocked) {
                      return (
                        <PaywallOverlay key={mod.id} className="rounded-2xl">
                          <ModuleCard module={mod} progress={progressMap?.[mod.id]} />
                        </PaywallOverlay>
                      );
                    }
                    return <ModuleCard key={mod.id} module={mod} progress={progressMap?.[mod.id]} />;
                  })}
                </div>
              )}
            </>
          )}

          {/* Load more sentinel */}
          <div ref={loadMoreRef} className="h-8 flex items-center justify-center mt-6">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>
        </main>
      </div>
    </>
  );
}
