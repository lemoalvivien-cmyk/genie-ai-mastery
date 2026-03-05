import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "react-router-dom";
import {
  Bot, Zap, TrendingUp, Eye, Activity, Sparkles, Plane,
  Clock, ChevronRight, Loader2, CheckCircle2, AlertCircle,
  DollarSign, Target, Brain, ArrowUpRight, Rocket, Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { DailyDigest } from "@/components/genieos/DailyDigest";

/* ── 3 Hero Actions ── */
const HERO_ACTIONS = [
  {
    label: "Créer un agent",
    desc: "Configurez un agent IA personnalisé",
    to: "/os/agents",
    icon: Bot,
    gradient: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
    borderColor: "border-primary/30",
  },
  {
    label: "Trouver une opportunité",
    desc: "Laissez l'IA analyser votre marché",
    to: "/os/revenue",
    icon: DollarSign,
    gradient: "from-green-500/20 to-green-500/5",
    iconColor: "text-green-400",
    borderColor: "border-green-500/30",
  },
  {
    label: "Construire un produit",
    desc: "Générez une architecture complète",
    to: "/os/builder",
    icon: Rocket,
    gradient: "from-orange-500/20 to-orange-500/5",
    iconColor: "text-orange-400",
    borderColor: "border-orange-500/30",
  },
];

/* ── Widget: Agent Activity ── */
function AgentActivityWidget() {
  const user = useAuthStore((s) => s.user);
  const { data: executions = [], isLoading } = useQuery({
    queryKey: ["cmd_agent_execs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_executions")
        .select("id, objective, status, started_at, completed_at")
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-foreground">Agents Actifs</span>
        </div>
        <Link to="/os/agents-runtime">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 text-muted-foreground">
            Voir <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
      ) : executions.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground mb-2">Aucune exécution récente</p>
          <Link to="/os/agents">
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1">
              <Plus className="w-3 h-3" /> Créer un agent
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(executions as any[]).map((ex) => (
            <div key={ex.id} className="flex items-center gap-2">
              {ex.status === "completed"
                ? <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                : ex.status === "running"
                ? <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
                : <AlertCircle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              }
              <span className="text-xs text-foreground truncate flex-1">{ex.objective || "Agent run"}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {ex.started_at ? formatDistanceToNow(new Date(ex.started_at), { addSuffix: true, locale: fr }) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Widget: Opportunities ── */
function OpportunityWidget() {
  const user = useAuthStore((s) => s.user);
  const { data: opps = [], isLoading } = useQuery({
    queryKey: ["cmd_revenue_opps", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_opportunities")
        .select("id, title, market, estimated_value_eur, probability, status")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const totalPipeline = (opps as any[]).reduce((s, o) => s + (o.estimated_value_eur ?? 0), 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-foreground">Opportunités</span>
        </div>
        <Link to="/os/revenue">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 text-muted-foreground">
            Revenue <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
      ) : opps.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground">Aucune opportunité — lance le Revenue Engine</p>
          <Link to="/os/revenue">
            <Button size="sm" variant="outline" className="mt-2 h-6 text-xs gap-1">
              <Zap className="w-3 h-3" /> Lancer
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="text-lg font-bold text-foreground mb-2">
            {totalPipeline.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            <span className="text-xs font-normal text-muted-foreground ml-1">pipeline total</span>
          </div>
          <div className="space-y-1.5">
            {(opps as any[]).map((opp) => (
              <div key={opp.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">{opp.title}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{opp.probability}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Widget: AI Watch ── */
function AIWatchWidget() {
  const user = useAuthStore((s) => s.user);
  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["cmd_data_updates", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("data_updates")
        .select("id, title, summary, importance, created_at, is_read")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const unread = (updates as any[]).filter((u) => !u.is_read).length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-foreground">AI Watch</span>
          {unread > 0 && (
            <Badge className="h-4 text-xs px-1.5 bg-amber-500/20 text-amber-400 border-amber-500/30">{unread}</Badge>
          )}
        </div>
        <Link to="/os/ai-watch">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 text-muted-foreground">
            Voir <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
      ) : updates.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Lance la veille IA pour recevoir des signaux</p>
      ) : (
        <div className="space-y-2">
          {(updates as any[]).map((u) => (
            <div key={u.id} className={cn("flex items-start gap-2", u.is_read && "opacity-60")}>
              <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{u.title}</p>
                {u.summary && <p className="text-xs text-muted-foreground line-clamp-1">{u.summary}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Widget: Autopilot Status ── */
function AutopilotWidget() {
  const user = useAuthStore((s) => s.user);
  const { data: timeline = [] } = useQuery({
    queryKey: ["cmd_timeline_autopilot", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("memory_timeline")
        .select("id, title, summary, event_type, created_at")
        .eq("user_id", user!.id)
        .eq("event_type", "agent_run")
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold text-foreground">Autopilot</span>
        </div>
        <Link to="/os/autopilot">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 text-muted-foreground">
            Configurer <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
      {timeline.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Aucune tâche autopilot récente</p>
      ) : (
        <div className="space-y-2">
          {(timeline as any[]).map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-sky-400 flex-shrink-0" />
              <span className="text-xs text-foreground truncate flex-1">{t.title}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Widget: Skill Progress ── */
function SkillWidget() {
  const user = useAuthStore((s) => s.user);
  const { data: levels = [] } = useQuery({
    queryKey: ["cmd_skill_levels", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_skill_levels")
        .select("level, skill:skill_graph(name, category)")
        .eq("user_id", user!.id)
        .order("level", { ascending: false })
        .limit(4);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const totalXP = (levels as any[]).reduce((s, l) => s + (l.level ?? 0), 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-foreground">Skill Graph</span>
        </div>
        <Link to="/os/skills">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 text-muted-foreground">
            Voir <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
      {levels.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Commence à t'entraîner pour voir ta progression</p>
      ) : (
        <>
          <div className="text-lg font-bold text-foreground mb-2">
            {totalXP}<span className="text-xs font-normal text-muted-foreground ml-1">pts cumulés</span>
          </div>
          <div className="space-y-1.5">
            {(levels as any[]).map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-purple-400" style={{ width: `${l.level ?? 0}%` }} />
                </div>
                <span className="text-xs text-muted-foreground truncate">{(l.skill as any)?.name ?? "—"}</span>
                <span className="text-xs text-purple-400 ml-auto">{l.level}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Widget: Revenue Summary ── */
function RevenueSummaryWidget() {
  const user = useAuthStore((s) => s.user);
  const { data: leads = [] } = useQuery({
    queryKey: ["cmd_leads_summary", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_leads")
        .select("id, status, opportunity_score")
        .eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const totalLeads = leads.length;
  const qualifiedLeads = (leads as any[]).filter((l) => l.status === "qualified" || l.status === "converted").length;
  const avgScore = totalLeads > 0
    ? Math.round((leads as any[]).reduce((s, l) => s + (l.opportunity_score ?? 0), 0) / totalLeads)
    : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-foreground">Revenue Engine</span>
        </div>
        <Link to="/os/revenue">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 text-muted-foreground">
            Détails <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Leads", value: totalLeads, color: "text-foreground" },
          { label: "Qualifiés", value: qualifiedLeads, color: "text-green-400" },
          { label: "Score moy.", value: `${avgScore}%`, color: "text-yellow-400" },
        ].map((s) => (
          <div key={s.label}>
            <div className={cn("text-xl font-bold", s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Memory Preview ── */
function MemoryPreview() {
  const user = useAuthStore((s) => s.user);
  const { data: events = [] } = useQuery({
    queryKey: ["cmd_recent_memory", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("memory_timeline")
        .select("id, title, event_type, importance, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const TYPE_COLORS: Record<string, string> = {
    chat: "bg-blue-500", build: "bg-orange-500", agent_run: "bg-green-500",
    skill_up: "bg-purple-500", opportunity: "bg-yellow-500", insight: "bg-pink-500",
  };

  if (!events.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-foreground">Activité Récente</span>
        </div>
        <Link to="/os/timeline">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 text-muted-foreground">
            Timeline complète <ArrowUpRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
      <div className="space-y-2">
        {(events as any[]).map((e) => (
          <div key={e.id} className="flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", TYPE_COLORS[e.event_type] ?? "bg-muted")} />
            <span className="text-xs text-foreground flex-1 truncate">{e.title}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Secondary quick links ── */
const SECONDARY_LINKS = [
  { label: "Co-Founder IA", to: "/os/cofounder", icon: TrendingUp, color: "text-emerald-400" },
  { label: "Autopilot", to: "/os/autopilot", icon: Plane, color: "text-sky-400" },
  { label: "Timeline", to: "/os/timeline", icon: Clock, color: "text-indigo-400" },
  { label: "Skills", to: "/os/skills", icon: Brain, color: "text-purple-400" },
  { label: "AI Watch", to: "/os/ai-watch", icon: Eye, color: "text-amber-400" },
  { label: "Chat IA", to: "/os", icon: Activity, color: "text-primary" },
];

/* ── Main Command Center ── */
export default function CommandCenter() {
  const user = useAuthStore((s) => s.user);

  const { data: timelineCount = 0 } = useQuery({
    queryKey: ["cmd_timeline_count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("memory_timeline")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="h-full overflow-y-auto bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Command Center
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {timelineCount > 0
                ? `${timelineCount} événements en mémoire — votre IA vous suit en permanence`
                : "Votre cockpit central intelligent"}
            </p>
          </div>
          <Link to="/os/start">
            <Button variant="outline" size="sm" className="gap-1.5 hidden md:flex">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Personnaliser
            </Button>
          </Link>
        </div>

        {/* 3 Hero Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {HERO_ACTIONS.map(({ label, desc, to, icon: Icon, gradient, iconColor, borderColor }) => (
            <Link key={to} to={to}>
              <div className={cn(
                "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:scale-[1.02] cursor-pointer",
                `bg-gradient-to-br ${gradient}`,
                borderColor
              )}>
                <div className={cn("w-10 h-10 rounded-xl bg-background/40 flex items-center justify-center mb-3", )}>
                  <Icon className={cn("w-5 h-5", iconColor)} />
                </div>
                <p className="text-sm font-bold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                <ChevronRight className={cn("absolute top-4 right-4 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", iconColor)} />
              </div>
            </Link>
          ))}
        </div>

        {/* Main grid: widgets + digest */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Left col: widgets */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <AgentActivityWidget />
              <OpportunityWidget />
              <AIWatchWidget />
              <AutopilotWidget />
              <SkillWidget />
              <RevenueSummaryWidget />
            </div>
            <MemoryPreview />
          </div>

          {/* Right col: Daily Digest */}
          <div className="space-y-4">
            <DailyDigest />

            {/* Secondary links */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Accès rapide
              </p>
              <div className="space-y-1">
                {SECONDARY_LINKS.map(({ label, to, icon: Icon, color }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", color)} />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
