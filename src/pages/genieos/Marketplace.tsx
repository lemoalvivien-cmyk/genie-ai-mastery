import { useState, useEffect, useCallback } from "react";
import {
  Store, Star, Download, Plus, X, Search, Filter,
  Bot, Zap, Code2, FileText, Loader2, Heart, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

// Use typed any to bypass missing generated types for new tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type ItemType = "agent" | "workflow" | "prompt" | "template";

interface MarketplaceItem {
  id: string;
  user_id: string;
  type: ItemType;
  name: string;
  description: string;
  content: Record<string, unknown>;
  tags: string[];
  category: string;
  is_public: boolean;
  usage_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

const TYPE_CONFIG: Record<ItemType, { icon: React.ElementType; color: string; label: string }> = {
  agent:    { icon: Bot,      color: "text-emerald-400",  label: "Agent IA" },
  workflow: { icon: Zap,      color: "text-yellow-400",   label: "Workflow" },
  prompt:   { icon: FileText, color: "text-blue-400",     label: "Prompt" },
  template: { icon: Code2,    color: "text-purple-400",   label: "Template" },
};

const CATEGORIES = ["Tous", "Marketing", "Dev", "Data", "Support", "Ventes", "RH", "Finance"];
const TYPES: Array<{ value: ItemType | "all"; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "agent", label: "Agents" },
  { value: "workflow", label: "Workflows" },
  { value: "prompt", label: "Prompts" },
  { value: "template", label: "Templates" },
];

interface PublishForm {
  type: ItemType;
  name: string;
  description: string;
  category: string;
  tags: string;
  content: string;
}

const EMPTY_FORM: PublishForm = {
  type: "agent", name: "", description: "", category: "général", tags: "", content: "{}",
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={cn("w-3 h-3", i <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
      ))}
      <span className="text-xs text-muted-foreground ml-0.5">({count})</span>
    </div>
  );
}

function ItemCard({ item, onUse, onRate }: { item: MarketplaceItem; onUse: (item: MarketplaceItem) => void; onRate: (item: MarketplaceItem, rating: number) => void }) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.prompt;
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl border border-border bg-card hover:border-primary/20 hover:bg-primary/5 transition-all group">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0", `${cfg.color} border-current/20 bg-current/5`)}>
            <Icon className={cn("w-4 h-4", cfg.color)} />
          </div>
          <span className={cn("text-xs px-2 py-0.5 rounded-full border", `${cfg.color} border-current/20 bg-current/5`)}>
            {cfg.label}
          </span>
        </div>
        <h3 className="font-semibold text-foreground text-sm mb-1 truncate">{item.name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{item.description}</p>

        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">#{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <StarRating rating={item.rating_avg} count={item.rating_count} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Download className="w-3 h-3" />
            {item.usage_count}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center gap-2 border-t border-border/50 pt-3">
        <Button
          size="sm"
          onClick={() => onUse(item)}
          className="flex-1 gradient-primary text-white text-xs h-8"
        >
          Utiliser <ArrowUpRight className="w-3 h-3 ml-1" />
        </Button>
        <div className="flex gap-1">
          {[4,5].map(r => (
            <button key={r} onClick={() => onRate(item, r)} className="p-1.5 rounded hover:bg-muted/50 transition-colors">
              <Star className="w-3.5 h-3.5 text-muted-foreground hover:text-yellow-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { session } = useAuth();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [activeType, setActiveType] = useState<ItemType | "all">("all");
  const [showPublish, setShowPublish] = useState(false);
  const [form, setForm] = useState<PublishForm>(EMPTY_FORM);
  const [isPublishing, setIsPublishing] = useState(false);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = db.from("marketplace_items")
        .select("*")
        .eq("is_public", true)
        .order("usage_count", { ascending: false })
        .limit(50);

      if (activeType !== "all") query = query.eq("type", activeType);
      if (activeCategory !== "Tous") query = query.eq("category", activeCategory.toLowerCase());

      const { data } = await query;
      if (data) setItems(data);
    } catch (_e) {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [activeType, activeCategory]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const filteredItems = search
    ? items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase()) ||
        i.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : items;

  const handlePublish = async () => {
    if (!session?.user?.id || !form.name.trim()) return;
    setIsPublishing(true);
    try {
      let parsedContent = {};
      try { parsedContent = JSON.parse(form.content); } catch (_e) { parsedContent = { raw: form.content }; }

      const { error } = await db.from("marketplace_items").insert({
        user_id: session.user.id,
        type: form.type,
        name: form.name,
        description: form.description,
        category: form.category || "général",
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        content: parsedContent,
        is_public: true,
      });

      if (error) throw error;
      toast({ title: "Publié !", description: `"${form.name}" est maintenant disponible sur le marketplace.` });
      setForm(EMPTY_FORM);
      setShowPublish(false);
      loadItems();
    } catch (_e) {
      toast({ title: "Erreur", description: "Impossible de publier. Réessaie.", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUse = async (item: MarketplaceItem) => {
    if (!session?.user?.id) return;
    await db.from("marketplace_usage").insert({ item_id: item.id, user_id: session.user.id });
    await db.rpc("increment_marketplace_usage", { _item_id: item.id });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, usage_count: i.usage_count + 1 } : i));
    toast({ title: `${item.name} importé !`, description: `Le ${TYPE_CONFIG[item.type]?.label ?? "item"} a été ajouté à tes ressources.` });
  };

  const handleRate = async (item: MarketplaceItem, rating: number) => {
    if (!session?.user?.id) return;
    await db.from("marketplace_ratings").upsert(
      { item_id: item.id, user_id: session.user.id, rating },
      { onConflict: "item_id,user_id" }
    );
    toast({ title: "Note enregistrée !", description: `Tu as noté "${item.name}" ${rating}/5.` });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Store className="w-6 h-6 text-orange-400" /> Marketplace
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {items.length} ressource{items.length !== 1 ? "s" : ""} disponible{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          {!showPublish && (
            <Button
              onClick={() => setShowPublish(true)}
              className="bg-orange-400/10 text-orange-400 border border-orange-400/20 hover:bg-orange-400/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Publier
            </Button>
          )}
        </div>

        {/* Publish form */}
        {showPublish && (
          <div className="mb-8 p-5 rounded-xl border border-orange-400/20 bg-orange-400/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-sm">Publier une ressource</h3>
              <button onClick={() => setShowPublish(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {(Object.entries(TYPE_CONFIG) as [ItemType, typeof TYPE_CONFIG[ItemType]][]).map(([type, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setForm(f => ({ ...f, type }))}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border text-sm transition-all",
                      form.type === type
                        ? "border-primary/30 bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              <Input placeholder="Nom *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-background border-border" />
              <Textarea placeholder="Description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-background border-border resize-none" rows={2} />
              <Input placeholder="Catégorie (marketing, dev, data...)" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="bg-background border-border" />
              <Input placeholder="Tags (séparés par virgules)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="bg-background border-border" />
              <Textarea
                placeholder='Contenu JSON (ex: {"system_prompt":"...","steps":[...]})'
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                className="bg-background border-border resize-none font-mono text-xs"
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={handlePublish} disabled={!form.name.trim() || isPublishing} className="gradient-primary text-white" size="sm">
                  {isPublishing ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Publication...</> : "Publier"}
                </Button>
                <Button variant="outline" onClick={() => { setShowPublish(false); setForm(EMPTY_FORM); }} size="sm">Annuler</Button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher agents, workflows, prompts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setActiveType(t.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
                  activeType === t.value
                    ? "bg-primary/20 text-foreground border border-primary/30"
                    : "text-muted-foreground border border-border hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
            <div className="w-px bg-border mx-1 flex-shrink-0" />
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
                  activeCategory === cat
                    ? "bg-orange-400/20 text-orange-400 border border-orange-400/30"
                    : "text-muted-foreground border border-border hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Items grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <ItemCard key={item.id} item={item} onUse={handleUse} onRate={handleRate} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center mb-4">
              <Store className="w-7 h-7 text-orange-400" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Marketplace vide</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-xs">
              {search ? `Aucun résultat pour "${search}"` : "Sois le premier à publier une ressource !"}
            </p>
            {!search && (
              <Button onClick={() => setShowPublish(true)} className="bg-orange-400/10 text-orange-400 border border-orange-400/20 hover:bg-orange-400/20">
                <Plus className="w-4 h-4 mr-2" /> Publier maintenant
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
