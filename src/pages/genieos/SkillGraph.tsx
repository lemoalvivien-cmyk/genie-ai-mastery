import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import {
  Brain, Zap, Code2, BarChart2, TrendingUp, Shield,
  Star, Target, ChevronUp, Sparkles, BookOpen, ArrowRight
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { label: string; icon: typeof Brain; color: string; bg: string }> = {
  ai:           { label: "Intelligence Artificielle", icon: Brain,    color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
  automation:   { label: "Automation",                icon: Zap,      color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20" },
  coding:       { label: "Coding",                    icon: Code2,    color: "text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
  business:     { label: "Business",                  icon: BarChart2,color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/20" },
  marketing:    { label: "Marketing",                 icon: TrendingUp,color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  cybersecurity:{ label: "Cybersécurité",             icon: Shield,   color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
};

const LEVEL_LABELS = ["Débutant", "Novice", "Intermédiaire", "Avancé", "Expert", "Master"];
const getLevelLabel = (level: number) => LEVEL_LABELS[Math.floor(level / 20)] ?? "Master";
const getLevelColor = (level: number) =>
  level < 20 ? "text-muted-foreground" :
  level < 40 ? "text-blue-400" :
  level < 60 ? "text-green-400" :
  level < 80 ? "text-yellow-400" : "text-purple-400";

export default function SkillGraph() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [training, setTraining] = useState<string | null>(null);

  const { data: skills = [] } = useQuery({
    queryKey: ["skill_graph"],
    queryFn: async () => {
      const { data, error } = await supabase.from("skill_graph")
        .select("id, name, category, description, icon")
        .order("category")
        .limit(200);
      if (error) throw error;
    },
  });

  const { data: userLevels = [] } = useQuery({
    queryKey: ["user_skill_levels", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_skill_levels")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const trainMutation = useMutation({
    mutationFn: async (skillId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const existing = userLevels.find((ul: any) => ul.skill_id === skillId);
      const newLevel = Math.min(100, (existing?.level ?? 0) + 5);
      const newXp = (existing?.xp ?? 0) + 25;
      await supabase.from("user_skill_levels").upsert({
        user_id: user.id,
        skill_id: skillId,
        level: newLevel,
        xp: newXp,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,skill_id" });
      // Log to memory timeline
      await supabase.from("memory_timeline").insert({
        user_id: user.id,
        event_type: "skill_up",
        title: `Entraînement compétence`,
        summary: `+5 XP gagné`,
        importance: "normal",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_skill_levels"] });
      setTraining(null);
    },
  });

  const getUserLevel = (skillId: string) =>
    (userLevels as any[]).find((ul) => ul.skill_id === skillId) ?? { level: 0, xp: 0 };

  const categories = Object.keys(CATEGORY_META);
  const filteredSkills = activeCategory
    ? skills.filter((s: any) => s.category === activeCategory)
    : skills;

  // Compute overall score per category
  const categoryScores = categories.map((cat) => {
    const catSkills = skills.filter((s: any) => s.category === cat);
    if (!catSkills.length) return { cat, avg: 0 };
    const total = catSkills.reduce((sum: number, s: any) => sum + getUserLevel(s.id).level, 0);
    return { cat, avg: Math.round(total / catSkills.length) };
  });

  const totalXp = (userLevels as any[]).reduce((sum, ul) => sum + (ul.xp ?? 0), 0);
  const overallLevel = Math.round(categoryScores.reduce((s, c) => s + c.avg, 0) / categories.length);

  return (
    <div className="h-full overflow-y-auto bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400" />
              AI Skill Graph
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Cartographie de tes compétences IA & Tech
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{totalXp.toLocaleString()} XP</div>
            <div className="text-xs text-muted-foreground">Niveau global · {overallLevel}%</div>
          </div>
        </div>

        {/* Category overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categoryScores.map(({ cat, avg }) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(isActive ? null : cat)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  isActive ? meta.bg + " border-2" : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("w-4 h-4", meta.color)} />
                  <span className="text-xs font-medium text-foreground truncate">{meta.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={avg} className="h-1.5 flex-1" />
                  <span className={cn("text-xs font-bold", getLevelColor(avg))}>{avg}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Skills list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {activeCategory ? CATEGORY_META[activeCategory]?.label : "Toutes les compétences"}
            </h2>
            {activeCategory && (
              <Button variant="ghost" size="sm" onClick={() => setActiveCategory(null)}
                className="text-xs h-7">Tout afficher</Button>
            )}
          </div>

          <div className="grid gap-2">
            {filteredSkills.map((skill: any) => {
              const ul = getUserLevel(skill.id);
              const meta = CATEGORY_META[skill.category];
              const Icon = meta?.icon ?? Brain;
              const isTraining = training === skill.id;

              return (
                <div key={skill.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors group">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", meta?.bg ?? "bg-muted")}>
                    <Icon className={cn("w-4 h-4", meta?.color ?? "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{skill.name}</span>
                      <Badge variant="outline" className={cn("text-xs px-1.5 py-0", getLevelColor(ul.level))}>
                        {getLevelLabel(ul.level)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={ul.level} className="h-1 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{ul.level}% · {ul.xp ?? 0} XP</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isTraining}
                    onClick={async () => {
                      setTraining(skill.id);
                      await trainMutation.mutateAsync(skill.id);
                    }}
                  >
                    {isTraining ? <Sparkles className="w-3 h-3 animate-spin" /> : <ChevronUp className="w-3 h-3" />}
                    {isTraining ? "..." : "+XP"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gaps & Recommendations */}
        {userLevels.length > 0 && (
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              Lacunes détectées & Recommandations
            </h3>
            <div className="space-y-2">
              {filteredSkills
                .filter((s: any) => getUserLevel(s.id).level < 30)
                .slice(0, 4)
                .map((s: any) => {
                  const meta = CATEGORY_META[s.category];
                  return (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <ArrowRight className={cn("w-3 h-3", meta?.color)} />
                      <span className="text-muted-foreground">
                        <span className="text-foreground font-medium">{s.name}</span> — niveau faible ({getUserLevel(s.id).level}%)
                      </span>
                    </div>
                  );
                })}
              {filteredSkills.filter((s: any) => getUserLevel(s.id).level < 30).length === 0 && (
                <p className="text-sm text-muted-foreground">🎉 Aucune lacune critique — continue ton évolution !</p>
              )}
            </div>
          </div>
        )}

        {userLevels.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Commence à t'entraîner pour construire ton Skill Graph</p>
          </div>
        )}
      </div>
    </div>
  );
}
