import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sunrise, Eye, DollarSign, Zap, ChevronRight, Loader2, Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function DailyDigest() {
  const user = useAuthStore((s) => s.user);

  const { data: updates = [], isLoading: loadingUpdates } = useQuery({
    queryKey: ["digest_updates", user?.id],
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("data_updates")
        .select("id, title, summary, importance, created_at")
        .eq("user_id", user!.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const { data: opps = [], isLoading: loadingOpps } = useQuery({
    queryKey: ["digest_opps", user?.id],
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("revenue_opportunities")
        .select("id, title, estimated_value_eur, probability, status")
        .eq("user_id", user!.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["digest_timeline", user?.id],
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("memory_timeline")
        .select("id, title, event_type, created_at")
        .eq("user_id", user!.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const isLoading = loadingUpdates || loadingOpps;
  const hasContent = updates.length > 0 || opps.length > 0 || timeline.length > 0;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <Sunrise className="w-4 h-4 text-amber-400" />
          <div>
            <span className="text-sm font-bold text-foreground">Daily Digest</span>
            <p className="text-xs text-muted-foreground capitalize">{today}</p>
          </div>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="p-4 space-y-4">
        {!hasContent && !isLoading ? (
          <div className="py-6 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Aucune activité aujourd'hui — vos agents démarrent bientôt
            </p>
            <Link to="/os/autopilot">
              <Button size="sm" variant="outline" className="gap-1 mt-1">
                <Zap className="w-3 h-3" /> Activer l'Autopilot
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Signaux IA */}
            {updates.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Veille IA
                    </span>
                  </div>
                  <Link to="/os/ai-watch">
                    <Button variant="ghost" size="sm" className="h-5 text-xs px-1.5 gap-1 text-muted-foreground">
                      Voir <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {(updates as any[]).map((u) => (
                    <div key={u.id} className="flex items-start gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5",
                        u.importance === "high" || u.importance === "critical"
                          ? "bg-amber-400"
                          : "bg-muted-foreground"
                      )} />
                      <p className="text-xs text-foreground line-clamp-2">{u.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunités du jour */}
            {opps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Opportunités
                    </span>
                  </div>
                  <Link to="/os/revenue">
                    <Button variant="ghost" size="sm" className="h-5 text-xs px-1.5 gap-1 text-muted-foreground">
                      Voir <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {(opps as any[]).map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                      <span className="text-xs text-foreground flex-1 truncate">{o.title}</span>
                      {o.estimated_value_eur && (
                        <span className="text-xs text-green-400 whitespace-nowrap">
                          {Number(o.estimated_value_eur).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activité du jour */}
            {timeline.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Actions suggérées
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(timeline as any[]).map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-xs text-foreground flex-1 truncate">{t.title}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
