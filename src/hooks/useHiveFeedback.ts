/**
 * useHiveFeedback — Collective Intelligence Hive
 *
 * Chaîne de pensée (Swarm effect):
 *  1. Feedback anonyme (user_id_hash = SHA-256) → privacy by design
 *  2. Agrège les signaux collectifs → améliore RAG/embedding pour TOUS
 *  3. Récompense la contribution Hive → badge "Neurone Collectif"
 *
 * Format JSON output:
 * { id, module_slug, feedback_type, quality_score, hive_weight, upvotes, processed_at }
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type HiveFeedbackType = "helpful" | "confusing" | "outdated" | "wrong" | "great";

export interface HiveFeedbackPayload {
  moduleSlug: string;
  feedbackType: HiveFeedbackType;
  qualityScore?: number; // 1-5
  suggestedFix?: string;
  embeddingHint?: string; // keyword for RAG vector update
  questionHash?: string;  // SHA-256 of the question for dedup
}

export interface HiveStats {
  module_slug: string;
  avg_quality: number;
  feedback_count: number;
  dominant_type: string;
}

// ─── Privacy: one-way hash of user_id ────────────────────────────────────────
async function hashUserId(userId: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(userId + "fti-hive-salt");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "anon";
  }
}

export function useHiveFeedback() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = useCallback(async (payload: HiveFeedbackPayload): Promise<boolean> => {
    if (!userId) return false;
    setIsSubmitting(true);
    try {
      const userIdHash = await hashUserId(userId);

      const { error } = await supabase.from("hive_feedback").insert({
        module_slug:    payload.moduleSlug,
        feedback_type:  payload.feedbackType,
        quality_score:  payload.qualityScore ?? null,
        suggested_fix:  payload.suggestedFix ?? null,
        embedding_hint: payload.embeddingHint ?? null,
        question_hash:  payload.questionHash ?? null,
        hive_weight:    computeHiveWeight(payload),
        user_id_hash:   userIdHash,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("🐝 Contribution Hive envoyée !", {
        description: "Votre feedback améliore l'IA pour toute la communauté.",
        duration: 3500,
      });
      return true;
    } catch {
      toast.error("Erreur Hive", { description: "Impossible d'envoyer le feedback." });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId]);

  // Fetch aggregate stats for a module (public, anonymous)
  const fetchModuleStats = useCallback(async (moduleSlug: string): Promise<HiveStats | null> => {
    try {
      const { data } = await supabase
        .from("hive_feedback")
        .select("feedback_type, quality_score")
        .eq("module_slug", moduleSlug)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data?.length) return null;

      const avgQuality = data.reduce((s, r) => s + (r.quality_score ?? 3), 0) / data.length;
      const typeCounts = data.reduce<Record<string, number>>((acc, r) => {
        acc[r.feedback_type] = (acc[r.feedback_type] ?? 0) + 1;
        return acc;
      }, {});
      const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "helpful";

      return {
        module_slug:    moduleSlug,
        avg_quality:    Math.round(avgQuality * 10) / 10,
        feedback_count: data.length,
        dominant_type:  dominantType,
      };
    } catch {
      return null;
    }
  }, []);

  return { submitFeedback, fetchModuleStats, isSubmitting, submitted, setSubmitted };
}

// ─── Hive weight computation (crowd signal strength) ─────────────────────────
function computeHiveWeight(payload: HiveFeedbackPayload): number {
  let weight = 1.0;
  // Constructive types weighted higher
  if (payload.feedbackType === "great")      weight += 0.2;
  if (payload.feedbackType === "confusing")  weight += 0.3; // actionable signal
  if (payload.feedbackType === "wrong")      weight += 0.5; // critical signal
  if (payload.feedbackType === "outdated")   weight += 0.4;
  // Bonus for providing a suggested fix
  if (payload.suggestedFix && payload.suggestedFix.length > 20) weight += 0.3;
  // Bonus for embedding hint (helps RAG)
  if (payload.embeddingHint) weight += 0.1;
  return Math.min(weight, 2.0);
}
