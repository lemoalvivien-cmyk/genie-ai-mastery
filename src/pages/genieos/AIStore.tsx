import { useState, useEffect } from "react";
import { Store, Star, Download, Search, Bot, Zap, BarChart2, Code2, Headphones, TrendingUp, Filter, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: string;
  use_cases: string[];
  icon: string;
  tags: string[];
  install_count: number;
  rating_avg: number;
  rating_count: number;
  is_official: boolean;
  author_name: string;
  version: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  "megaphone": Zap,
  "target": TrendingUp,
  "search": Search,
  "code": Code2,
  "trending-up": TrendingUp,
  "headphones": Headphones,
  "bar-chart-2": BarChart2,
  "bot": Bot,
};

const CATEGORY_COLORS: Record<string, string> = {
  marketing:   "bg-pink-500/10 text-pink-400 border-pink-500/20",
  sales:       "bg-orange-500/10 text-orange-400 border-orange-500/20",
  research:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  development: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  finance:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  support:     "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  analytics:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  general:     "bg-muted text-muted-foreground border-border",
};

const CATEGORIES = ["Tous", "marketing", "sales", "research", "development", "finance", "support", "analytics"];

export default function AIStore() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [installs, setInstalls] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");
  const [selected, setSelected] = useState<StoreItem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStore();
  }, []);

  async function loadStore() {
    setLoading(true);
    const { data: storeData } = await supabase
      .from("agent_store_items")
      .select("*")
      .eq("is_public", true)
      .order("install_count", { ascending: false });

    const { data: installData } = await supabase
      .from("agent_store_installs")
      .select("item_id");

    setItems(storeData ?? []);
    setInstalls(new Set(installData?.map((i) => i.item_id) ?? []));
    setLoading(false);
  }

  async function installAgent(item: StoreItem) {
    if (installs.has(item.id)) return;
    setInstalling(item.id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInstalling(null); return; }

    // Create agent in genieos_agents
    const { data: agent, error: agentErr } = await supabase
      .from("genieos_agents")
      .insert({
        user_id: user.id,
        name: item.name,
        description: item.description,
        system_prompt: `You are ${item.name}. ${item.description}`,
        tools: item.tags,
        status: "active",
        metadata: { store_item_id: item.id, category: item.category },
      })
      .select()
      .single();

    if (agentErr) {
      toast({ title: "Erreur", description: "Impossible d'installer l'agent.", variant: "destructive" });
      setInstalling(null);
      return;
    }

    // Record install
    await supabase.from("agent_store_installs").insert({
      user_id: user.id,
      item_id: item.id,
      agent_id: agent.id,
    });

    // Increment install count
    await supabase.from("agent_store_items")
      .update({ install_count: item.install_count + 1 })
      .eq("id", item.id);

    setInstalls((prev) => new Set([...prev, item.id]));
    setInstalling(null);
    toast({ title: "✅ Agent installé", description: `${item.name} est maintenant disponible dans vos agents.` });
  }

  const filtered = items.filter((item) => {
    const matchCat = category === "Tous" || item.category === category;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const StarRating = ({ value, count }: { value: number; count: number }) => (
    <div className="flex items-center gap-1">
      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      <span className="text-xs font-medium text-foreground">{value.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Main list */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Store className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">AI App Store</h1>
                <p className="text-xs text-muted-foreground">{items.length} agents disponibles</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un agent..."
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Category filters */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-all flex-shrink-0",
                  category === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {cat === "Tous" ? `Tous (${items.length})` : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                  <div className="flex gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded mb-1" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? Bot;
                const catColor = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.general;
                const isInstalled = installs.has(item.id);
                const isInstalling = installing === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelected(selected?.id === item.id ? null : item)}
                    className={cn(
                      "rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm",
                      selected?.id === item.id ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0", catColor)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                          {item.is_official && (
                            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">✓</span>
                          )}
                        </div>
                        <StarRating value={item.rating_avg} count={item.rating_count} />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Download className="w-3 h-3" />
                        <span>{item.install_count.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); installAgent(item); }}
                        disabled={isInstalled || isInstalling}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                          isInstalled
                            ? "bg-muted text-muted-foreground cursor-default"
                            : isInstalling
                              ? "bg-primary/50 text-primary-foreground cursor-wait"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {isInstalled ? (
                          <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Installé</span>
                        ) : isInstalling ? "..." : (
                          <span className="flex items-center gap-1"><Download className="w-3 h-3" /> Installer</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex items-start gap-3 mb-3">
              {(() => {
                const Icon = ICON_MAP[selected.icon] ?? Bot;
                const catColor = CATEGORY_COLORS[selected.category] ?? CATEGORY_COLORS.general;
                return (
                  <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0", catColor)}>
                    <Icon className="w-6 h-6" />
                  </div>
                );
              })()}
              <div>
                <h2 className="text-sm font-bold text-foreground">{selected.name}</h2>
                <p className="text-xs text-muted-foreground">par {selected.author_name}</p>
                <div className="mt-1"><StarRating value={selected.rating_avg} count={selected.rating_count} /></div>
              </div>
            </div>
            <button
              onClick={() => installAgent(selected)}
              disabled={installs.has(selected.id) || installing === selected.id}
              className={cn(
                "w-full py-2 rounded-lg text-sm font-medium transition-all",
                installs.has(selected.id)
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {installs.has(selected.id) ? "✓ Installé" : "Installer l'agent"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Cas d'usage</p>
              <div className="space-y-1">
                {selected.use_cases.map((uc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {uc}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {selected.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{selected.install_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Installations</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-bold text-foreground">v{selected.version}</p>
                <p className="text-xs text-muted-foreground">Version</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
