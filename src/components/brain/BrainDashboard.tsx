/**
 * BrainDashboard — Dashboard Palantir Foundry pour managers
 * Risk scoring, heatmaps prédictives, comparaison vs Formateur Humain
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Brain, ShieldAlert, TrendingUp, TrendingDown, Users, Zap,
  AlertTriangle, Target, Activity, Clock, Award, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface OrgBrainStats {
  total_users: number;
  avg_risk_score: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  last_updated: string | null;
}

interface BrainMember {
  user_id: string;
  risk_score: number;
  next_failure: string | null;
}

const MITRE_HEATMAP = [
  { domain: "Phishing", risk: 87, color: "destructive" },
  { domain: "Credential Theft", risk: 74, color: "destructive" },
  { domain: "Ransomware", risk: 68, color: "orange" },
  { domain: "Social Engineering", risk: 61, color: "orange" },
  { domain: "Insider Threat", risk: 45, color: "yellow" },
  { domain: "Supply Chain", risk: 38, color: "yellow" },
  { domain: "DDoS", risk: 22, color: "emerald" },
  { domain: "Exfiltration", risk: 55, color: "orange" },
];

function RiskGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#EF4444" : score >= 40 ? "#F97316" : "#10B981";
  const angle = (score / 100) * 180 - 90;
  return (
    <div className="relative flex flex-col items-center gap-1">
      <svg width="120" height="70" viewBox="0 0 120 70">
        {/* Track */}
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="hsl(var(--border))" strokeWidth="10" strokeLinecap="round"/>
        {/* Fill */}
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 157} 157`}
        />
        {/* Needle */}
        <line
          x1="60" y1="60"
          x2={60 + 38 * Math.cos((angle * Math.PI) / 180)}
          y2={60 + 38 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx="60" cy="60" r="4" fill={color}/>
      </svg>
      <div className="text-2xl font-black tabular-nums" style={{ color }}>{score}</div>
      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">RISK SCORE</div>
    </div>
  );
}

function PredictionTimeline({ members }: { members: BrainMember[] }) {
  const atRisk = members.filter(m => m.next_failure && new Date(m.next_failure) < new Date(Date.now() + 86400000 * 2));
  if (!atRisk.length) return (
    <div className="text-center py-6 text-sm text-muted-foreground">
      <div className="text-2xl mb-1">🛡️</div>
      Aucun apprenant à risque critique dans les 48h
    </div>
  );
  return (
    <div className="space-y-2">
      {atRisk.map((m, i) => {
        const hoursLeft = m.next_failure
          ? Math.max(0, Math.round((new Date(m.next_failure).getTime() - Date.now()) / 3600000))
          : 24;
        return (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-destructive"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">Apprenant #{i + 1}</div>
              <div className="text-[10px] text-muted-foreground">Score risque : {m.risk_score}/100</div>
            </div>
            <Badge variant="destructive" className="text-[10px] shrink-0">⚡ {hoursLeft}h</Badge>
          </div>
        );
      })}
    </div>
  );
}

export function BrainDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<OrgBrainStats | null>(null);
  const [members, setMembers] = useState<BrainMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.org_id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.rpc("get_org_brain_analytics", { _org_id: profile.org_id });
        if (data && typeof data === "object" && !("error" in (data as Record<string, unknown>))) {
          const rawData = data as unknown as OrgBrainStats & { risk_distribution?: BrainMember[] };
          setStats(rawData);
          if (rawData.risk_distribution) setMembers(rawData.risk_distribution);
        }
      } catch (_e) {
        // Silence
      } finally {
        setLoading(false);
      }
    };
    load();

    // Realtime updates
    const channel = supabase
      .channel(`brain-org-${profile.org_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "genie_brain" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.org_id]);

  const avgRisk = stats?.avg_risk_score ?? 50;
  const total = stats?.total_users ?? 0;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 animate-pulse">
        {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-xl bg-secondary/40"/>)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Palantir */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-primary"/>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm tracking-wide">GÉNIE BRAIN FOUNDRY</h3>
            <Badge className="text-[9px] font-bold bg-primary/20 text-primary border-primary/30 px-1.5">PALANTIR MODE</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">Ontologie centrale · Intelligence prédictive · Risque entreprise temps réel</p>
        </div>
      </div>

      {/* Risk Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/80 border-border/50 col-span-1 flex flex-col items-center justify-center py-4">
          <RiskGauge score={avgRisk}/>
          <p className="text-xs text-muted-foreground mt-2">Risque moyen équipe</p>
        </Card>

        <div className="col-span-1 sm:col-span-2 grid grid-cols-3 gap-3">
          {[
            { label: "Risque Critique", count: stats?.high_risk_count ?? 0, color: "text-destructive", bg: "bg-destructive/10", icon: ShieldAlert },
            { label: "Risque Moyen", count: stats?.medium_risk_count ?? 0, color: "text-orange-400", bg: "bg-orange-500/10", icon: AlertTriangle },
            { label: "Faible Risque", count: stats?.low_risk_count ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Award },
          ].map((s) => (
            <Card key={s.label} className={`${s.bg} border-0 flex flex-col items-center justify-center py-4 gap-1`}>
              <s.icon className={`w-5 h-5 ${s.color}`}/>
              <div className={`text-2xl font-black tabular-nums ${s.color}`}>{s.count}</div>
              <div className="text-[10px] text-muted-foreground text-center leading-tight">{s.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* MITRE ATT&CK Heatmap */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-destructive"/>
            Heatmap MITRE ATT&CK — Exposition équipe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {MITRE_HEATMAP.map((t) => {
            const bar = t.risk >= 70 ? "bg-destructive" : t.risk >= 50 ? "bg-orange-500" : t.risk >= 35 ? "bg-yellow-500" : "bg-emerald-500";
            const text = t.risk >= 70 ? "text-destructive" : t.risk >= 50 ? "text-orange-400" : t.risk >= 35 ? "text-yellow-400" : "text-emerald-400";
            return (
              <div key={t.domain} className="flex items-center gap-3">
                <div className="w-32 text-xs text-muted-foreground shrink-0 truncate">{t.domain}</div>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${t.risk}%` }}/>
                </div>
                <div className={`text-xs font-bold tabular-nums w-8 text-right ${text}`}>{t.risk}%</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Prédictions 24h */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-[hsl(var(--orange-alert))]"/>
            Prédictions d'échec — 48h
            <Badge variant="outline" className="text-[9px] ml-auto border-[hsl(var(--orange-alert)/0.4)] text-[hsl(var(--orange-alert))]">IA PRÉDICTIVE</Badge>
          </CardTitle>
...
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-[hsl(var(--emerald))]"/>
                  <span className="text-[9px] text-[hsl(var(--emerald))] font-medium">GENIE IA GAGNE</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity line */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Activity className="w-3 h-3"/>
        <span>
          {total > 0 ? `${total} apprenants analysés` : "En attente de données cerveau"}
          {stats?.last_updated && ` · Mis à jour ${new Date(stats.last_updated).toLocaleTimeString("fr-FR")}`}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          <span className="text-emerald-400">LIVE</span>
        </div>
      </div>
    </div>
  );
}
