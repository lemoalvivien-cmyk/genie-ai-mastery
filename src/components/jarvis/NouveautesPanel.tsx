import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  RefreshCw, ShieldAlert, Bot, Code2, Globe,
  AlertTriangle, CheckCircle2, ExternalLink, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";

interface Brief {
  id: string;
  domain: string;
  title: string;
  kid_summary: string;
  action_plan: string[];
  sources: { title: string; url: string }[];
  source_count: number;
  confidence: number;
  is_verified: boolean;
  created_at: string;
}

const DOMAIN_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ia_pro:       { label: "IA Pro",       icon: Bot,        color: "text-primary border-primary/30 bg-primary/5" },
  ia_perso:     { label: "IA Perso",     icon: Globe,      color: "text-secondary border-secondary/30 bg-secondary/5" },
  cyber:        { label: "Cyber",        icon: ShieldAlert, color: "text-destructive border-destructive/30 bg-destructive/5" },
  vibe_coding:  { label: "Vibe Coding",  icon: Code2,      color: "text-accent border-accent/30 bg-accent/5" },
  general:      { label: "Général",      icon: Globe,      color: "text-muted-foreground border-border/30 bg-muted/5" },
};

// Which domains are most relevant per persona
const PERSONA_DOMAIN_PRIORITY: Record<string, string[]> = {
  dirigeant:    ["cyber", "ia_pro", "ia_perso", "vibe_coding"],
  salarie:      ["cyber", "ia_perso", "ia_pro", "vibe_coding"],
  independant:  ["cyber", "ia_pro", "vibe_coding", "ia_perso"],
  jeune:        ["ia_perso", "vibe_coding", "ia_pro", "cyber"],
  parent:       ["cyber", "ia_perso", "ia_pro", "vibe_coding"],
  senior:       ["cyber", "ia_perso", "ia_pro", "vibe_coding"],
};

function ConfidenceBadge({ value, isVerified }: { value: number; isVerified: boolean }) {
  const color =
    value >= 70 ? "text-green-600 bg-green-500/10 border-green-500/30"
    : value >= 50 ? "text-yellow-600 bg-yellow-500/10 border-yellow-500/30"
    : "text-destructive bg-destructive/10 border-destructive/30";

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${color}`}>
      {value < 50 ? (
        <AlertTriangle className="w-2.5 h-2.5" />
      ) : (
        <CheckCircle2 className="w-2.5 h-2.5" />
      )}
      {value}% confiance
      {value < 50 && <span className="ml-0.5">· à vérifier</span>}
      {isVerified && value >= 70 && <span className="ml-0.5">· vérifié</span>}
    </div>
  );
}

function BriefCard({ brief }: { brief: Brief }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = DOMAIN_CONFIG[brief.domain] ?? DOMAIN_CONFIG.general;
  const Icon = cfg.icon;
  const date = new Date(brief.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className={`rounded-2xl border p-3.5 space-y-2.5 transition-all ${cfg.color}`}>
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{cfg.label}</span>
            <ConfidenceBadge value={brief.confidence} isVerified={brief.is_verified} />
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-tight">{brief.title}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{date}</p>
        </div>
      </div>

      <p className="text-xs text-foreground/80 leading-relaxed">{brief.kid_summary}</p>

      {(brief.action_plan?.length > 0 || brief.sources?.length > 0) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Réduire" : `Plan d'action + ${brief.sources?.length ?? 0} source(s)`}
        </button>
      )}

      {expanded && (
        <div className="space-y-2.5 pt-1 border-t border-current/10">
          {brief.action_plan?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Plan d'action
              </p>
              <ol className="space-y-1">
                {brief.action_plan.map((action, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground/80">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-current/10 flex items-center justify-center text-[9px] font-bold">
                      {i + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {brief.sources?.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Sources ({brief.sources.length})
              </p>
              <div className="space-y-1">
                {brief.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                  >
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    {src.title}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-destructive/80">
              <AlertTriangle className="w-3 h-3" />
              <span>Aucune source — informations à vérifier indépendamment</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const FILTER_DOMAINS = ["all", "cyber", "ia_pro", "ia_perso", "vibe_coding"] as const;
type FilterDomain = (typeof FILTER_DOMAINS)[number];

export function NouveautesPanel() {
  const { profile } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterDomain>("all");

  const persona = (profile?.persona as string | null) ?? null;

  const loadBriefs = useCallback(async () => {
    const { data, error } = await supabase
      .from("briefs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return;
    }

    setBriefs(
      (data ?? []).map((b) => ({
        ...b,
        action_plan: Array.isArray(b.action_plan) ? (b.action_plan as string[]) : [],
        sources: Array.isArray(b.sources) ? (b.sources as { title: string; url: string }[]) : [],
      }))
    );
  }, []);

  useEffect(() => {
    loadBriefs().finally(() => setLoading(false));
  }, [loadBriefs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { error: fetchError } = await supabase.functions.invoke("fetch-sources");
      if (fetchError) throw fetchError;
      const { error: briefError } = await supabase.functions.invoke("generate-briefs");
      if (briefError) throw briefError;
      await loadBriefs();
      toast({ title: "🔄 Nouveautés mises à jour !", description: "Sources refetchées + briefs générés." });
    } catch (err) {
      toast({
        title: "Erreur de refresh",
        description: err instanceof Error ? err.message : "Réessaie dans quelques minutes.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Sort by persona-priority when showing "all"
  const sortedBriefs = (() => {
    if (filter !== "all" || !persona) return briefs;
    const priority = PERSONA_DOMAIN_PRIORITY[persona] ?? [];
    return [...briefs].sort((a, b) => {
      const ai = priority.indexOf(a.domain);
      const bi = priority.indexOf(b.domain);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  })();

  const filtered = filter === "all" ? sortedBriefs : sortedBriefs.filter((b) => b.domain === filter);
  // Top 5 shown by default (show all if a domain filter is active)
  const displayed = filter === "all" ? filtered.slice(0, 5) : filtered;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            🗞️ Nouveautés
            <span className="text-[10px] font-normal text-muted-foreground">
              — no source, no claim
            </span>
          </h3>
          {persona && (
            <p className="text-[10px] text-muted-foreground">
              Triées pour ton profil <strong>{persona}</strong>
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {refreshing ? "Mise à jour…" : "Rafraîchir"}
        </Button>
      </div>

      {/* Domain filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_DOMAINS.map((d) => {
          const cfg = d === "all" ? null : DOMAIN_CONFIG[d];
          const count = d === "all" ? briefs.length : briefs.filter((b) => b.domain === d).length;
          return (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                filter === d
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border/40 text-muted-foreground hover:border-border"
              }`}
            >
              {d === "all" ? "Tout" : cfg?.label ?? d}
              {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Briefs list */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement…
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/40 p-6 text-center space-y-2">
          <p className="text-muted-foreground text-xs">Aucun brief disponible.</p>
          <p className="text-muted-foreground text-[10px]">
            Clique "Rafraîchir" pour récupérer les dernières actualités.
          </p>
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Récupérer les actualités
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-0.5 scrollbar-thin">
          {displayed.map((brief) => (
            <BriefCard key={brief.id} brief={brief} />
          ))}
          {filter === "all" && filtered.length > 5 && (
            <button
              onClick={() => setFilter("all")}
              className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground py-1 transition-colors"
            >
              + {filtered.length - 5} autres nouveautés — utilise les filtres pour voir tout
            </button>
          )}
        </div>
      )}
    </div>
  );
}
