import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import {
  Clock, MessageSquare, Wand2, Bot, TrendingUp, Brain,
  Lightbulb, Pin, Trash2, Filter, Loader2, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const EVENT_META: Record<string, { label: string; icon: typeof MessageSquare; color: string; bg: string }> = {
  chat:        { label: "Chat",        icon: MessageSquare, color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  build:       { label: "Build",       icon: Wand2,         color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  agent_run:   { label: "Agent",       icon: Bot,           color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  skill_up:    { label: "Skill",       icon: Brain,         color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  opportunity: { label: "Opportunité", icon: TrendingUp,    color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  insight:     { label: "Insight",     icon: Lightbulb,     color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20" },
};

const IMPORTANCE_COLORS: Record<string, string> = {
  low:      "text-muted-foreground",
  normal:   "text-foreground",
  high:     "text-yellow-400",
  critical: "text-red-400",
};

export default function MemoryTimeline() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showPinned, setShowPinned] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["memory_timeline", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("memory_timeline")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      await supabase.from("memory_timeline").update({ is_pinned: !pinned }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memory_timeline"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("memory_timeline").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memory_timeline"] }),
  });

  const filtered = events.filter((e: any) => {
    if (showPinned && !e.is_pinned) return false;
    if (filterType && e.event_type !== filterType) return false;
    return true;
  });

  const eventTypes = Array.from(new Set(events.map((e: any) => e.event_type)));

  // Group by date
  const grouped = filtered.reduce((acc: Record<string, any[]>, e: any) => {
    const date = new Date(e.created_at).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long"
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(e);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto bg-background p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-400" />
              Memory Timeline
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Historique chronologique de ton activité IA</p>
          </div>
          <Badge variant="outline" className="text-xs">
            <Activity className="w-3 h-3 mr-1" />{events.length} événements
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={showPinned ? "default" : "outline"}
            className="h-7 text-xs gap-1"
            onClick={() => setShowPinned(!showPinned)}
          >
            <Pin className="w-3 h-3" /> Épinglés
          </Button>
          <div className="w-px h-4 bg-border" />
          <Button
            size="sm"
            variant={filterType === null ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setFilterType(null)}
          >
            Tous
          </Button>
          {eventTypes.map((type) => {
            const meta = EVENT_META[type] ?? { label: type, color: "text-foreground" };
            return (
              <Button
                key={type}
                size="sm"
                variant={filterType === type ? "default" : "outline"}
                className={cn("h-7 text-xs", filterType === type && "")}
                onClick={() => setFilterType(filterType === type ? null : type)}
              >
                {meta.label}
              </Button>
            );
          })}
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">
              Aucun événement — commence à utiliser GENIE OS pour construire ta mémoire
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dateEvents]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground px-2 capitalize">{date}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2 pl-4 border-l-2 border-border/50">
                  {(dateEvents as any[]).map((event) => {
                    const meta = EVENT_META[event.event_type] ?? EVENT_META.insight;
                    const Icon = meta.icon;
                    const timeAgo = formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: fr });

                    return (
                      <div key={event.id}
                        className={cn(
                          "relative flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors group -ml-4",
                          event.is_pinned && "border-primary/30 bg-primary/5"
                        )}>
                        {/* Timeline dot */}
                        <div className={cn("absolute -left-[17px] top-4 w-3 h-3 rounded-full border-2 border-background", event.is_pinned ? "bg-primary" : "bg-border")} />

                        <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0", meta.bg)}>
                          <Icon className={cn("w-4 h-4", meta.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={cn("text-sm font-medium", IMPORTANCE_COLORS[event.importance ?? "normal"])}>
                                {event.title}
                              </span>
                              {event.summary && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.summary}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={() => pinMutation.mutate({ id: event.id, pinned: event.is_pinned })}
                                className={cn("p-1 rounded hover:bg-muted transition-colors", event.is_pinned ? "text-primary" : "text-muted-foreground")}
                              >
                                <Pin className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteMutation.mutate(event.id)}
                                className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={cn("text-xs", meta.color)}>{meta.label}</Badge>
                            <span className="text-xs text-muted-foreground">{timeAgo}</span>
                            {event.importance === "high" && <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">Important</Badge>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
