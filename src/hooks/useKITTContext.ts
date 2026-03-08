// ─── KITTContext hook — 3 appels parallèles avec colonnes explicites (Passe H)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

// ─── KITT modes ───────────────────────────────────────────────────────────────
export type KITTMode =
  | "diagnostic"   // 1. assess baseline
  | "coaching"     // 2. guided explanation + next step
  | "quiz"         // 3. active recall challenge
  | "lab"          // 4. launch hands-on mission
  | "correction"   // 5. rubric-based feedback on an answer
  | "remediation"  // 6. detected gap → fill it now
  | "synthesis"    // 7. recap + manager-ready summary

export const KITT_MODES: { id: KITTMode; label: string; icon: string; desc: string }[] = [
  { id: "diagnostic",  icon: "🎯", label: "Diagnostic",  desc: "Évaluer ton niveau actuel" },
  { id: "coaching",    icon: "🧠", label: "Coaching",    desc: "Apprendre le prochain concept" },
  { id: "quiz",        icon: "⚡", label: "Quiz",        desc: "Tester ta compréhension" },
  { id: "lab",         icon: "🔬", label: "Mission",     desc: "Pratiquer en situation réelle" },
  { id: "correction",  icon: "✏️", label: "Correction",  desc: "Analyser ta réponse avec rubric" },
  { id: "remediation", icon: "🔁", label: "Remédiation", desc: "Corriger une lacune détectée" },
  { id: "synthesis",   icon: "📋", label: "Synthèse",    desc: "Résumé de progression" },
];

export interface KITTUserContext {
  skill_mastery: Record<string, number>;
  last_module: { id: string; title: string; domain: string; progress_pct: number } | null;
  completed_modules: number;
  total_modules: number;
  persona: string;
  level: number;
  streak: number;
  last_quiz_score: number | null;
  top_gap: { name: string; domain: string; score: number } | null;
}

export function useKITTContext() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  return useQuery<KITTUserContext>({
    queryKey: ["kitt_context", user?.id],
    queryFn: async (): Promise<KITTUserContext> => {
      if (!user?.id) throw new Error("Not authenticated");

      // Passe H : 4 appels parallèles — colonnes explicites, total_modules dynamique
      // 4 appels parallèles — colonnes explicites, total_modules dynamique
      const [masteryRes, progressRes, streakRes, modulesCountRes] = await Promise.all([
        // JOIN direct skill_mastery → skills (évite 2nd round-trip)
        supabase
          .from("skill_mastery")
          .select("p_mastery, skill_id, skills(id, slug, name, domain)")
          .eq("user_id", user.id)
          .order("p_mastery", { ascending: false })
          .limit(20),

        // progress avec JOIN module intégré
        supabase
          .from("progress")
          .select("module_id, status, score, updated_at, modules(id, title, domain)")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(10),

        // streak
        supabase
          .from("user_streaks")
          .select("current_streak")
          .eq("user_id", user.id)
          .maybeSingle(),

        // count total published modules — évite la valeur hardcodée 24
        supabase
          .from("modules")
          .select("id", { count: "exact", head: true })
          .eq("is_published", true),
      ]);

      // Build skill mastery map from JOIN result
      type MasteryRow = { p_mastery: number; skill_id: string; skills: { id: string; slug: string; name: string; domain: string } | null };
      const masteryData = (masteryRes.data ?? []) as MasteryRow[];

      const skill_mastery: Record<string, number> = {};
      let topGap: KITTUserContext["top_gap"] = null;

      if (masteryData.length) {
        masteryData.forEach((m) => {
          const slug = m.skills?.slug ?? m.skill_id;
          skill_mastery[slug] = m.p_mastery;
        });

        // Top gap = lowest mastery
        const sorted = [...masteryData].sort((a, b) => a.p_mastery - b.p_mastery);
        const gap = sorted[0];
        if (gap?.skills) {
          topGap = { name: gap.skills.name, domain: gap.skills.domain, score: Math.round(gap.p_mastery * 100) };
        }
      }

      // Build last module from JOIN result
      type ProgressRow = { module_id: string; status: string; score: number | null; updated_at: string; modules: { id: string; title: string; domain: string } | null };
      const progressData = (progressRes.data ?? []) as ProgressRow[];
      const completedModules = progressData.filter((p) => p.status === "completed").length;

      let lastModuleInfo: KITTUserContext["last_module"] = null;
      const inProgressEntry = progressData.find((p) => p.status === "in_progress");
      const lastEntry = inProgressEntry ?? progressData[0];

      if (lastEntry?.modules) {
        lastModuleInfo = {
          id: lastEntry.modules.id,
          title: lastEntry.modules.title,
          domain: lastEntry.modules.domain,
          progress_pct: lastEntry.status === "completed" ? 100 : 50,
        };
      }

      const lastQuizScore = progressData.find((p) => p.score != null)?.score ?? null;

      // Count dynamique via la 4e requête parallèle
      const totalModulesCount = modulesCountRes.count ?? 0;

      return {
        skill_mastery,
        last_module: lastModuleInfo,
        completed_modules: completedModules,
        total_modules: totalModulesCount,
        persona: profile?.persona ?? "salarie",
        level: profile?.level ?? 1,
        streak: (streakRes.data as { current_streak?: number } | null)?.current_streak ?? 0,
        last_quiz_score: lastQuizScore,
        top_gap: topGap,
      };
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}
