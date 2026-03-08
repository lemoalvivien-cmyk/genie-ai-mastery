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
  skill_mastery: Record<string, number>;  // slug → p_mastery 0-1
  last_module: { id: string; title: string; domain: string; progress_pct: number } | null;
  completed_modules: number;
  total_modules: number;
  persona: string;
  level: number;
  streak: number;
  last_quiz_score: number | null;
  top_gap: { name: string; domain: string; score: number } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useKITTContext() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  return useQuery<KITTUserContext>({
    queryKey: ["kitt_context", user?.id],
    queryFn: async (): Promise<KITTUserContext> => {
      if (!user?.id) throw new Error("Not authenticated");

      const [masteryRes, progressRes, streakRes] = await Promise.all([
        // skill mastery with skill name/slug
        supabase
          .from("skill_mastery")
          .select("p_mastery, skill_id")
          .eq("user_id", user.id)
          .order("p_mastery", { ascending: false })
          .limit(20),

        // last touched module progress
        supabase
          .from("progress")
          .select("module_id, status, score, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(10),

        // streak
        supabase
          .from("user_streaks")
          .select("current_streak")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      // Resolve skill slugs for mastery map
      const masteryData = (masteryRes.data ?? []) as { p_mastery: number; skill_id: string }[];
      const skillIds = masteryData.map((m) => m.skill_id);
      let skillSlugsMap: Record<string, string> = {};
      let topGap: KITTUserContext["top_gap"] = null;
      if (skillIds.length) {
        const { data: skillRows } = await supabase
          .from("skills")
          .select("id, slug, name, domain")
          .in("id", skillIds);
        if (skillRows) {
          skillRows.forEach((s: { id: string; slug: string; name: string; domain: string }) => {
            skillSlugsMap[s.id] = s.slug;
          });
          // Find top gap (lowest mastery skill)
          const sorted = masteryData.slice().sort((a, b) => a.p_mastery - b.p_mastery);
          if (sorted.length) {
            const gapSkillId = sorted[0].skill_id;
            const gapSkill = skillRows.find((s: { id: string; slug: string; name: string; domain: string }) => s.id === gapSkillId);
            if (gapSkill) {
              topGap = { name: gapSkill.name, domain: gapSkill.domain, score: Math.round(sorted[0].p_mastery * 100) };
            }
          }
        }
      }

      const skill_mastery: Record<string, number> = {};
      masteryData.forEach((m) => {
        const slug = skillSlugsMap[m.skill_id] ?? m.skill_id;
        skill_mastery[slug] = m.p_mastery;
      });

      // Resolve last module info
      const progressData = (progressRes.data ?? []) as { module_id: string; status: string; score: number | null; updated_at: string }[];
      const completedModules = progressData.filter((p) => p.status === "completed").length;
      let lastModuleInfo: KITTUserContext["last_module"] = null;
      const inProgressEntry = progressData.find((p) => p.status === "in_progress");
      const lastEntry = inProgressEntry ?? progressData[0];

      if (lastEntry?.module_id) {
        const { data: modRow } = await supabase
          .from("modules")
          .select("id, title, domain")
          .eq("id", lastEntry.module_id)
          .maybeSingle();
        if (modRow) {
          lastModuleInfo = {
            id: modRow.id,
            title: modRow.title,
            domain: modRow.domain,
            progress_pct: lastEntry.status === "completed" ? 100 : 50,
          };
        }
      }

      const lastQuizScore = progressData.find((p) => p.score != null)?.score ?? null;

      return {
        skill_mastery,
        last_module: lastModuleInfo,
        completed_modules: completedModules,
        total_modules: 24,
        persona: (profile as { persona?: string })?.persona ?? "salarie",
        level: (profile as { level?: number })?.level ?? 1,
        streak: (streakRes.data as { current_streak?: number } | null)?.current_streak ?? 0,
        last_quiz_score: lastQuizScore,
        top_gap: topGap,
      };
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}
