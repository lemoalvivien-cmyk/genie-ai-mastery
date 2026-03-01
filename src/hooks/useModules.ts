import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export interface Module {
  id: string;
  domain: "ia_pro" | "ia_perso" | "cyber";
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  content_json: {
    sections: Array<{
      title: string;
      body: string;
      examples?: Array<{ title: string; content: string }>;
      key_points?: string[];
      warning?: string;
    }>;
  };
  persona_variant: string;
  level: "debutant" | "intermediaire" | "avance";
  duration_minutes: number;
  icon_name: string | null;
  order_index: number;
  sources: Array<{ url: string; title: string; date?: string; confidence?: number }>;
  confidence_score: number;
  is_gold: boolean;
  is_published: boolean;
  deliverables: Array<{ type: string; title: string }>;
  created_at: string;
  updated_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  module_id: string;
  status: "not_started" | "in_progress" | "completed" | "failed";
  score: number | null;
  quiz_answers: Record<string, number> | null;
  time_spent_seconds: number;
  attempts: number;
  completed_at: string | null;
}

export interface Quiz {
  id: string;
  module_id: string;
  questions: Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }>;
  passing_score: number;
  time_limit_seconds: number | null;
}

const PAGE_SIZE = 12;

interface ModuleFilters {
  domain?: string;
  level?: string;
  status?: string;
}

export function useModules(filters: ModuleFilters = {}) {
  const profile = useAuthStore((s) => s.profile);

  return useInfiniteQuery({
    queryKey: ["modules", filters, profile?.persona],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("modules")
        .select("*")
        .eq("is_published", true)
        .order("order_index")
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (filters.domain) query = query.eq("domain", filters.domain as "ia_pro" | "ia_perso" | "cyber");
      if (filters.level) query = query.eq("level", filters.level as "debutant" | "intermediaire" | "avance");

      const { data, error } = await query;
      if (error) throw error;

      // Filter by persona client-side
      const filtered = (data as unknown as Module[]).filter((m) => {
        if (m.persona_variant === "universal") return true;
        return m.persona_variant === profile?.persona;
      });

      return { data: filtered, nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined };

    },
    getNextPageParam: (last) => last.nextPage,
    staleTime: 5 * 60 * 1000,
    initialPageParam: 0,
  });
}

export function useModule(slug: string) {
  return useQuery({
    queryKey: ["module", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();
      if (error) throw error;
      return data as unknown as Module;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useModuleQuiz(moduleId: string) {
  return useQuery({
    queryKey: ["quiz", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("module_id", moduleId)
        .single();
      if (error) throw error;
      return data as unknown as Quiz;
    },
    enabled: !!moduleId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUserProgress(moduleIds?: string[]) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["progress", user?.id, moduleIds],
    queryFn: async () => {
      let query = supabase.from("progress").select("*").eq("user_id", user!.id);
      if (moduleIds?.length) query = query.in("module_id", moduleIds);
      const { data, error } = await query;
      if (error) throw error;
      return (data as Progress[]).reduce(
        (acc, p) => ({ ...acc, [p.module_id]: p }),
        {} as Record<string, Progress>
      );
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}

export function useSaveProgress() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (payload: {
      module_id: string;
      status: Progress["status"];
      score?: number;
      quiz_answers?: Record<string, number>;
      time_spent_seconds?: number;
    }) => {
      const { error } = await supabase.from("progress").upsert(
        {
          user_id: user!.id,
          module_id: payload.module_id,
          status: payload.status,
          score: payload.score ?? null,
          quiz_answers: payload.quiz_answers ?? null,
          time_spent_seconds: payload.time_spent_seconds ?? 0,
          completed_at: payload.status === "completed" ? new Date().toISOString() : null,
          attempts: 1,
        },
        { onConflict: "user_id,module_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}
