import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/config/features";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sparkles, X, ChevronRight, Bot, DollarSign, Zap,
  TrendingUp, Brain, Eye, Loader2, Lightbulb, Rocket,
} from "lucide-react";

interface Suggestion {
  id: string;
  label: string;
  detail: string;
  action: string;
  to: string;
  icon: React.ElementType;
  color: string;
  priority: "urgent" | "high" | "normal";
}

function useCopilotSuggestions() {
  const user = useAuthStore((s) => s.user);

  const { data: executions = [] } = useQuery({
    queryKey: ["copilot_execs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_executions")
        .select("status")
        .eq("user_id", user!.id)
        .eq("status", "running")
        .limit(5);
      return data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 20000,
  });

  const { data: unreadUpdates = [] } = useQuery({
    queryKey: ["copilot_updates", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("data_updates")
        .select("id, title, importance")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .limit(3);
      return data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["copilot_leads", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_leads")
        .select("id, status")
        .eq("user_id", user!.id)
        .eq("status", "new")
        .limit(5);
      return data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const { data: opps = [] } = useQuery({
    queryKey: ["copilot_opps", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_opportunities")
        .select("id, status")
        .eq("user_id", user!.id)
        .eq("status", "new")
        .limit(3);
      return data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const suggestions: Suggestion[] = [];

  if ((executions as any[]).length > 0) {
    suggestions.push({
      id: "running_agents",
      label: `${executions.length} agent(s) en cours`,
      detail: "Des agents tournent en arrière-plan",
      action: "Voir",
      to: "/os/agents-runtime",
      icon: Bot,
      color: "text-emerald-400",
      priority: "urgent",
    });
  }

  if ((unreadUpdates as any[]).length > 0) {
    suggestions.push({
      id: "unread_updates",
      label: `${unreadUpdates.length} signal(s) IA non lus`,
      detail: (unreadUpdates[0] as any)?.title ?? "Nouvelles tendances détectées",
      action: "Lire",
      to: "/os/ai-watch",
      icon: Eye,
      color: "text-amber-400",
      priority: "high",
    });
  }

  if ((leads as any[]).length > 0) {
    suggestions.push({
      id: "new_leads",
      label: `${leads.length} nouveau(x) lead(s)`,
      detail: "Des prospects sont en attente de qualification",
      action: "Qualifier",
      to: "/os/revenue",
      icon: DollarSign,
      color: "text-green-400",
      priority: "high",
    });
  }

  if ((opps as any[]).length > 0) {
    suggestions.push({
      id: "new_opps",
      label: `${opps.length} opportunité(s) détectée(s)`,
      detail: "Le Revenue Engine a trouvé des opportunités",
      action: "Analyser",
      to: "/os/revenue",
      icon: TrendingUp,
      color: "text-yellow-400",
      priority: "high",
    });
  }

  // Static suggestions when no dynamic data
  if (suggestions.length === 0) {
    suggestions.push(
      {
        id: "run_revenue",
        label: "Trouver des opportunités",
        detail: "Le Revenue Engine peut analyser votre marché",
        action: "Lancer",
        to: "/os/revenue",
        icon: Zap,
        color: "text-primary",
        priority: "normal",
      },
      {
        id: "build_agent",
        label: "Créer votre premier agent",
        detail: "Automatisez vos tâches avec un agent IA",
        action: "Créer",
        to: "/os/agents",
        icon: Rocket,
        color: "text-orange-400",
        priority: "normal",
      },
      {
        id: "skill_up",
        label: "Améliorer vos compétences IA",
        detail: "Votre Skill Graph attend des données",
        action: "Explorer",
        to: "/os/skills",
        icon: Brain,
        color: "text-purple-400",
        priority: "normal",
      }
    );
  }

  return suggestions.slice(0, 4);
}

/* ── Floating CopilotPanel ── */
export function CopilotPanel() {
  const [open, setOpen] = useState(false);
  if (!FEATURES.genieOS) return null;
  const [dismissed, setDismissed] = useState<string[]>([]);
  const suggestions = useCopilotSuggestions();
  const visible = suggestions.filter((s) => !dismissed.includes(s.id));

  const urgentCount = visible.filter((s) => s.priority === "urgent" || s.priority === "high").length;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg transition-all duration-200",
          "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.97]",
          open && "opacity-0 pointer-events-none"
        )}
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-semibold">Copilot</span>
        {urgentCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
            {urgentCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Copilot IA</span>
              {urgentCount > 0 && (
                <Badge className="h-4 text-xs px-1.5 bg-primary/20 text-primary border-primary/30">
                  {urgentCount}
                </Badge>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Suggestions */}
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="py-6 text-center">
                <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Tout est à jour — je surveille en permanence</p>
              </div>
            ) : (
              visible.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border transition-all",
                    s.priority === "urgent"
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card/50"
                  )}
                >
                  <s.icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", s.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{s.detail}</p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Link to={s.to} onClick={() => setOpen(false)}>
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1">
                        {s.action} <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                    <button
                      onClick={() => setDismissed((prev) => [...prev, s.id])}
                      className="text-xs text-muted-foreground hover:text-foreground text-center"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border bg-card/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Mise à jour en temps réel</span>
            <Link to="/os/control" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-primary">
                Dashboard <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
