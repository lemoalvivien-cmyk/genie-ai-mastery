import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import {
  Store, Download, Star, DollarSign, Plus, Loader2,
  Package, TrendingUp, Users, Zap, Globe, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AgentListing = {
  id: string;
  name: string;
  description: string | null;
  economy: {
    id: string;
    price_eur: number;
    is_free: boolean;
    downloads: number;
    revenue_total: number;
    owner_id: string;
  } | null;
};

export default function AgentEconomy() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [priceEur, setPriceEur] = useState("0");

  // Get user agents
  const { data: myAgents = [] } = useQuery({
    queryKey: ["my_agents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("genieos_agents").select("id, name, description").eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Get published economy listings
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["agent_economy_public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_economy")
        .select(`
          id, price_eur, is_free, downloads, revenue_total, owner_id,
          agent:genieos_agents(id, name, description, status)
        `)
        .eq("is_published", true)
        .order("downloads", { ascending: false });
      return (data ?? []).map((item: any) => ({
        id: item.agent?.id ?? item.id,
        name: item.agent?.name ?? "Agent inconnu",
        description: item.agent?.description,
        economy: item,
      })) as AgentListing[];
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedAgent) throw new Error("Missing data");
      const price = parseFloat(priceEur) || 0;
      const { error } = await supabase.from("agent_economy").upsert({
        agent_id: selectedAgent,
        owner_id: user.id,
        price_eur: price,
        is_free: price === 0,
        is_published: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "agent_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent_economy_public"] });
      setPublishOpen(false);
      toast({ title: "Agent publié !", description: "Ton agent est maintenant dans l'économie." });
    },
  });

  const installMutation = useMutation({
    mutationFn: async (listing: AgentListing) => {
      if (!user?.id || !listing.economy) throw new Error("Missing data");
      // Record the sale/install
      await supabase.from("agent_sales").insert({
        agent_economy_id: listing.economy.id,
        buyer_id: user.id,
        seller_id: listing.economy.owner_id,
        amount_eur: listing.economy.price_eur,
        transaction_type: "install",
      });
      // Increment downloads
      await supabase.from("agent_economy")
        .update({ downloads: (listing.economy.downloads ?? 0) + 1 })
        .eq("id", listing.economy.id);
      // Clone agent to user
      await supabase.from("genieos_agents").insert({
        user_id: user.id,
        name: `[Clone] ${listing.name}`,
        description: listing.description,
        status: "active",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent_economy_public", "my_agents"] });
      toast({ title: "Agent installé !", description: "L'agent a été cloné dans ton espace." });
    },
  });

  const filtered = listings.filter((l) =>
    !search || l.name.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalDownloads = listings.reduce((s, l) => s + (l.economy?.downloads ?? 0), 0);
  const totalAgents = listings.length;

  return (
    <div className="h-full overflow-y-auto bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Store className="w-6 h-6 text-violet-400" />
              Agent Economy
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Publie, installe et monétise des agents IA</p>
          </div>
          <Button onClick={() => setPublishOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Publier un agent
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Agents publiés", value: totalAgents, icon: Package, color: "text-violet-400" },
            { label: "Téléchargements", value: totalDownloads, icon: Download, color: "text-blue-400" },
            { label: "Mes agents", value: myAgents.length, icon: Users, color: "text-green-400" },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl border border-border bg-card text-center">
              <stat.icon className={cn("w-5 h-5 mx-auto mb-1", stat.color)} />
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Rechercher un agent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {/* Listings */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">Aucun agent publié — sois le premier !</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((listing) => {
              const isOwn = listing.economy?.owner_id === user?.id;
              const isFree = listing.economy?.is_free ?? true;
              return (
                <div key={listing.id}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">{listing.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isFree
                            ? <Badge variant="outline" className="text-xs text-green-400 border-green-400/30"><Globe className="w-2.5 h-2.5 mr-1" />Gratuit</Badge>
                            : <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30"><Lock className="w-2.5 h-2.5 mr-1" />{listing.economy?.price_eur}€</Badge>
                          }
                          {isOwn && <Badge variant="secondary" className="text-xs">Le mien</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><Download className="w-3 h-3" />{listing.economy?.downloads ?? 0}</div>
                    </div>
                  </div>
                  {listing.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{listing.description}</p>
                  )}
                  <div className="flex gap-2">
                    {!isOwn && (
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1"
                        onClick={() => installMutation.mutate(listing)}
                        disabled={installMutation.isPending}>
                        {installMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        Installer
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="flex-1 text-xs h-7 gap-1">
                      <Star className="w-3 h-3" /> Voir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Publish Dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-violet-400" /> Publier un agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Choisir un agent</label>
              <select
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                value={selectedAgent ?? ""}
                onChange={(e) => setSelectedAgent(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {myAgents.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prix (€) — 0 = Gratuit</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={priceEur} onChange={(e) => setPriceEur(e.target.value)} type="number" min="0" step="0.5"
                  className="pl-8" />
              </div>
            </div>
            <Button className="w-full" disabled={!selectedAgent || publishMutation.isPending}
              onClick={() => publishMutation.mutate()}>
              {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
              Publier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
