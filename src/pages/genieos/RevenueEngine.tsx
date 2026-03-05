import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import {
  DollarSign, Send, Loader2, Sparkles, TrendingUp,
  Users, Target, BarChart2, CheckCircle2, Plus, Trash2,
  ArrowUpRight, RefreshCw, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; color: string }> = {
  new:         { label: "Nouveau",    color: "text-blue-400 border-blue-400/30" },
  contacted:   { label: "Contacté",   color: "text-yellow-400 border-yellow-400/30" },
  qualified:   { label: "Qualifié",   color: "text-green-400 border-green-400/30" },
  converted:   { label: "Converti",   color: "text-emerald-400 border-emerald-400/30" },
  lost:        { label: "Perdu",      color: "text-red-400 border-red-400/30" },
  identified:  { label: "Identifiée", color: "text-blue-400 border-blue-400/30" },
  validated:   { label: "Validée",    color: "text-green-400 border-green-400/30" },
  pursuing:    { label: "En cours",   color: "text-yellow-400 border-yellow-400/30" },
};

const QUICK_PROMPTS = [
  "Trouve 5 opportunités business IA pour PME françaises",
  "Génère des leads dans le marché de l'automatisation RH",
  "Analyse le marché SaaS de cybersécurité pour ETI",
  "Identifie des niches sous-exploitées dans l'IA générative B2B",
];

export default function RevenueEngine() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamOutput, setStreamOutput] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "leads" | "opportunities">("search");
  const abortRef = useRef<AbortController | null>(null);

  /* Leads */
  const { data: leads = [] } = useQuery({
    queryKey: ["revenue_leads", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("revenue_leads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  /* Opportunities */
  const { data: opportunities = [] } = useQuery({
    queryKey: ["revenue_opportunities", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("revenue_opportunities")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from("revenue_leads").update({ status }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenue_leads"] }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("revenue_leads").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenue_leads"] }),
  });

  async function runRevenueAgent() {
    if (!query.trim() || !user) return;
    setLoading(true);
    setStreamOutput("");

    abortRef.current = new AbortController();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/genieos-revenue-agent`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ query, user_id: user.id }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "token") setStreamOutput((p) => p + evt.text);
            if (evt.type === "leads_saved" || evt.type === "opps_saved") {
              qc.invalidateQueries({ queryKey: ["revenue_leads", "revenue_opportunities"] });
              toast({ title: evt.type === "leads_saved" ? "Leads générés !" : "Opportunités trouvées !" });
            }
          } catch {}
        }
      }

      qc.invalidateQueries({ queryKey: ["revenue_leads"] });
      qc.invalidateQueries({ queryKey: ["revenue_opportunities"] });
      // Log memory
      await supabase.from("memory_timeline").insert({
        user_id: user.id,
        event_type: "opportunity",
        title: `Revenue Agent: ${query.slice(0, 60)}`,
        summary: streamOutput.slice(0, 150),
        importance: "high",
      });
    } catch (e: any) {
      if (e.name !== "AbortError") toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const totalPipeline = (opportunities as any[]).reduce((s, o) => s + (o.estimated_value_eur ?? 0), 0);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Revenue Engine</h1>
              <p className="text-xs text-muted-foreground">Agent IA spécialisé en génération de leads & opportunités</p>
            </div>
          </div>
          {/* Stats */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="text-center">
              <div className="font-bold text-foreground">{leads.length}</div>
              <div className="text-muted-foreground">Leads</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-foreground">{opportunities.length}</div>
              <div className="text-muted-foreground">Opps</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-400">
                {totalPipeline.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
              </div>
              <div className="text-muted-foreground">Pipeline</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {(["search", "leads", "opportunities"] as const).map((tab) => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                activeTab === tab ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
              )}>
              {tab === "search" ? "🔍 Recherche" : tab === "leads" ? `👥 Leads (${leads.length})` : `🎯 Opportunités (${opportunities.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* SEARCH TAB */}
        {activeTab === "search" && (
          <div className="space-y-4 max-w-3xl">
            {/* Quick prompts */}
            {!streamOutput && !loading && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Requêtes rapides</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button key={p} onClick={() => setQuery(p)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stream output */}
            {(streamOutput || loading) && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  {loading ? <Loader2 className="w-4 h-4 text-green-400 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  <span className="text-sm font-semibold text-foreground">
                    {loading ? "Revenue Agent en cours d'analyse..." : "Analyse terminée"}
                  </span>
                </div>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {streamOutput}
                  {loading && <span className="animate-pulse">▌</span>}
                </div>
                {!loading && (
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5 text-xs"
                    onClick={() => { setStreamOutput(""); setQuery(""); }}>
                    <RefreshCw className="w-3 h-3" /> Nouvelle recherche
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* LEADS TAB */}
        {activeTab === "leads" && (
          <div className="space-y-3 max-w-3xl">
            {leads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Lance le Revenue Agent pour générer des leads</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setActiveTab("search")}>
                  <Zap className="w-3 h-3 mr-1.5" /> Lancer l'agent
                </Button>
              </div>
            ) : (
              (leads as any[]).map((lead) => {
                const s = STATUS_META[lead.status] ?? STATUS_META.new;
                return (
                  <div key={lead.id} className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-foreground">
                          {lead.company_name || lead.contact_name || "Lead sans nom"}
                        </div>
                        {lead.industry && <div className="text-xs text-muted-foreground">{lead.industry}</div>}
                        {lead.pain_point && <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{lead.pain_point}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className={cn("text-sm font-bold", lead.opportunity_score >= 70 ? "text-green-400" : "text-yellow-400")}>
                            {lead.opportunity_score}%
                          </div>
                          <div className="text-xs text-muted-foreground">score</div>
                        </div>
                        <button onClick={() => deleteLead.mutate(lead.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-xs", s.color)}>{s.label}</Badge>
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-0.5 hover:underline">
                          Site <ArrowUpRight className="w-2.5 h-2.5" />
                        </a>
                      )}
                      <div className="ml-auto flex gap-1">
                        {["contacted", "qualified", "converted"].map((s) => (
                          <button key={s} onClick={() => updateLeadStatus.mutate({ id: lead.id, status: s })}
                            className="text-xs px-2 py-0.5 rounded border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                            {STATUS_META[s]?.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* OPPORTUNITIES TAB */}
        {activeTab === "opportunities" && (
          <div className="space-y-3 max-w-3xl">
            {opportunities.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucune opportunité identifiée</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setActiveTab("search")}>
                  <Sparkles className="w-3 h-3 mr-1.5" /> Analyser le marché
                </Button>
              </div>
            ) : (
              <>
                <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/10 text-center">
                  <div className="text-xl font-bold text-green-400">
                    {totalPipeline.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-muted-foreground">Pipeline total estimé</div>
                </div>
                {(opportunities as any[]).map((opp) => {
                  const s = STATUS_META[opp.status] ?? STATUS_META.identified;
                  return (
                    <div key={opp.id} className="p-4 rounded-xl border border-border bg-card">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-semibold text-sm text-foreground">{opp.title}</div>
                          {opp.market && <div className="text-xs text-muted-foreground">{opp.market}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-green-400">
                            {Number(opp.estimated_value_eur).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-xs text-muted-foreground">{opp.probability}% proba</div>
                        </div>
                      </div>
                      {opp.description && <p className="text-xs text-foreground/70 mb-2 line-clamp-2">{opp.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-xs", s.color)}>{s.label}</Badge>
                        {(opp.tags ?? []).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border p-3 bg-card">
        <div className="flex gap-2 max-w-3xl">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Trouve 5 opportunités business IA pour PME, génère des leads dans la cybersécurité..."
            className="flex-1 min-h-[52px] max-h-[100px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runRevenueAgent(); }
            }}
          />
          <Button onClick={runRevenueAgent} disabled={loading || !query.trim()} className="self-end h-9 px-4 gap-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /><Send className="w-3.5 h-3.5" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}
