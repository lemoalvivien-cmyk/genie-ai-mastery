import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { BookOpen, Search, Loader2, Code2 } from "lucide-react";
import { useModules, useUserProgress } from "@/hooks/useModules";
import { ModuleCard } from "@/components/modules/ModuleCard";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallOverlay } from "@/components/PaywallOverlay";

const DOMAINS = [
  { id: "", label: "Tous" },
  { id: "ia_pro", label: "IA Pro" },
  { id: "ia_perso", label: "IA Perso" },
  { id: "cyber", label: "Cybersécurité" },
  { id: "vibe_coding", label: "Vibe Coding", icon: Code2 },
];

const LEVELS = [
  { id: "", label: "Tous" },
  { id: "debutant", label: "Débutant" },
  { id: "intermediaire", label: "Intermédiaire" },
  { id: "avance", label: "Avancé" },
];

export default function Modules() {
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

  const filtered = allModules.filter((m) =>
    !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.subtitle?.toLowerCase().includes(search.toLowerCase())
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

  return (
    <>
      <Helmet>
        <title>Playbooks — Formetoialia</title>
        <meta name="description" content="Explorez tous les playbooks d'exécution IA et cybersécurité." />
      </Helmet>

      <div className="min-h-full page-enter" style={{ background: "#0C1014" }}>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5" style={{ color: "#5257D8" }} aria-hidden="true" />
              <h1
                className="text-2xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #5257D8, #FE2C40)" }}
              >
                Vos playbooks
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">Choisissez votre prochaine exécution guidée</p>
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-3">
            {/* Domain toggle */}
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par domaine">
              {DOMAINS.map((d) => {
                const isActive = domain === d.id;
                const isVibe = d.id === "vibe_coding";
                return (
                  <button
                    key={d.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setDomain(d.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none"
                    style={
                      isActive
                        ? {
                            background: isVibe ? "#10B981" : "#5257D8",
                            color: "#fff",
                            boxShadow: isVibe
                              ? "0 0 12px rgba(16,185,129,0.45)"
                              : "0 0 14px rgba(82,87,216,0.5)",
                            border: "1px solid transparent",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            color: "hsl(var(--muted-foreground))",
                            border: "1px solid #2A2D3A",
                          }
                    }
                  >
                    {isVibe && <Code2 className="w-3.5 h-3.5 shrink-0" />}
                    {d.label}
                    {isVibe && (
                      <span
                        className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                        style={{ background: "rgba(16,185,129,0.2)", color: "#10B981", border: "1px solid rgba(16,185,129,0.4)" }}
                      >
                        NEW
                      </span>
                    )}
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
                  placeholder="Rechercher un playbook..."
                  aria-label="Rechercher un playbook"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none transition-all"
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

          {/* Count */}
          {!isLoading && (
            <p className="text-xs text-muted-foreground mb-4" aria-live="polite">
              {filtered.length} playbook{filtered.length !== 1 ? "s" : ""} trouvé{filtered.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #2A2D3A" }} />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Erreur lors du chargement. Réessayez.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun playbook trouvé avec ces filtres.</p>
            </div>
          ) : (
            <>
              {domain === "vibe_coding" && !isPro ? (
                <PaywallOverlay feature="Vibe Coding — Débloquez avec Formetoialia Pro" className="rounded-2xl min-h-[300px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pointer-events-none">
                    {filtered.slice(0, 3).map((mod) => (
                      <ModuleCard key={mod.id} module={mod} progress={progressMap?.[mod.id]} />
                    ))}
                  </div>
                </PaywallOverlay>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((mod, idx) => {
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
            {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#5257D8" }} />}
          </div>
        </main>
      </div>
    </>
  );
}
