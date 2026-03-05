import { useState, useEffect } from "react";
import { Brain, Target, Zap, RefreshCw, Plus, Trash2, TrendingUp, BookOpen, Star, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BrainProfile {
  expertise_level: string;
  work_domain: string;
  top_skills: string[];
  interests: string[];
  personality: Record<string, number>;
  summary: string;
  last_analyzed_at: string | null;
}

interface Goal {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: number;
  progress: number;
}

const EXPERTISE_CONFIG: Record<string, { label: string; color: string }> = {
  beginner:     { label: "Débutant",      color: "text-muted-foreground bg-muted border-border" },
  intermediate: { label: "Intermédiaire", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  advanced:     { label: "Avancé",        color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  expert:       { label: "Expert",        color: "text-primary bg-primary/10 border-primary/20" },
};

const PERSONALITY_TRAITS = [
  { key: "curiosity",    label: "Curiosité",    icon: BookOpen },
  { key: "autonomy",     label: "Autonomie",    icon: Zap },
  { key: "creativity",   label: "Créativité",   icon: Star },
  { key: "analytical",   label: "Analytique",   icon: TrendingUp },
];

export default function PersonalBrain() {
  const [profile, setProfile] = useState<BrainProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [tab, setTab] = useState<"profile" | "goals" | "activity">("profile");
  const { toast } = useToast();

  useEffect(() => {
    loadBrain();
  }, []);

  async function loadBrain() {
    setLoading(true);
    const [{ data: profileData }, { data: goalsData }] = await Promise.all([
      supabase.from("user_brain_profile").select("*").single(),
      supabase.from("user_goals").select("*").eq("status", "active").order("priority", { ascending: false }),
    ]);
    setProfile(profileData ? { ...profileData, personality: (profileData.personality as Record<string, number>) ?? {} } : null);
    setGoals(goalsData ?? []);
    setLoading(false);
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setProgress("Analyse en cours...");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/genieos-auto-builder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mode: "brain_analyze" }),
        }
      );

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "progress") setProgress(parsed.message);
            if (parsed.type === "done") {
              await loadBrain();
              setProgress("");
              toast({ title: "✅ Profil mis à jour", description: "Votre AI Brain a été analysé et mis à jour." });
            }
          } catch (_e) { /* ignore */ }
        }
      }
    } catch (_e) {
      toast({ title: "Erreur", description: "Impossible d'analyser le profil.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }

  async function addGoal() {
    if (!newGoal.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("user_goals").insert({
      user_id: user.id,
      title: newGoal.trim(),
      category: "growth",
    }).select().single();
    if (data) {
      setGoals((prev) => [data, ...prev]);
      setNewGoal("");
    }
  }

  async function deleteGoal(id: string) {
    await supabase.from("user_goals").delete().eq("id", id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const expertise = profile?.expertise_level ?? "intermediate";
  const expertiseCfg = EXPERTISE_CONFIG[expertise] ?? EXPERTISE_CONFIG.intermediate;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Personal AI Brain</h1>
              <p className="text-xs text-muted-foreground">Profil cognitif & objectifs personnalisés</p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", analyzing && "animate-spin")} />
            {analyzing ? "Analyse..." : "Analyser"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {(["profile", "goals", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {t === "profile" ? "Profil" : t === "goals" ? "Objectifs" : "Activité"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {analyzing && (
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
              <p className="text-sm text-primary">{progress}</p>
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div className="space-y-5">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                ))}
              </div>
            ) : !profile ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Profil non analysé</p>
                <p className="text-xs text-muted-foreground mt-1">Cliquez sur "Analyser" pour créer votre AI Brain.</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground">Profil Cognitif</h3>
                    <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", expertiseCfg.color)}>
                      {expertiseCfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{profile.summary || "Profil en cours de construction..."}</p>
                  {profile.work_domain && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Domaine principal : <span className="text-foreground font-medium">{profile.work_domain}</span>
                    </p>
                  )}
                </div>

                {/* Skills */}
                {profile.top_skills?.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-bold text-foreground mb-3">Top Compétences</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.top_skills.map((skill) => (
                        <span key={skill} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {profile.interests?.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-bold text-foreground mb-3">Centres d'intérêt</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest) => (
                        <span key={interest} className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personality */}
                {profile.personality && Object.keys(profile.personality).length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-bold text-foreground mb-4">Traits de Personnalité</h3>
                    <div className="space-y-3">
                      {PERSONALITY_TRAITS.map(({ key, label, icon: Icon }) => {
                        const val = (profile.personality[key] ?? 5) as number;
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground w-24">{label}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${val * 10}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-foreground w-6 text-right">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {profile.last_analyzed_at && (
                  <p className="text-xs text-muted-foreground text-center">
                    Dernière analyse : {new Date(profile.last_analyzed_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── GOALS TAB ── */}
        {tab === "goals" && (
          <div className="space-y-4">
            {/* Add goal */}
            <div className="flex gap-2">
              <input
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addGoal(); }}
                placeholder="Ajouter un objectif..."
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={addGoal}
                disabled={!newGoal.trim()}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-40 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-foreground font-medium">Aucun objectif</p>
                <p className="text-xs text-muted-foreground mt-1">Ajoutez vos objectifs pour personnaliser votre AI Brain.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {goals.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card group hover:border-primary/30 transition-all">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <p className="flex-1 text-sm text-foreground">{goal.title}</p>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{goal.category}</span>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
        {tab === "activity" && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Activité IA</p>
            <p className="text-xs text-muted-foreground mt-1">
              Votre historique d'utilisation sera analysé automatiquement pour enrichir votre profil.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
