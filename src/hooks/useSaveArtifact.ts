/**
 * useSaveArtifact — sauvegarde un artefact dans la bibliothèque personnelle
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";

export interface ArtifactPayload {
  title: string;
  type: string;          // prompt | checklist | synthese | reponse_amelioree | analyse | pdf | code
  content: string;       // contenu textuel
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export function useSaveArtifact() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [isSaving, setIsSaving] = useState(false);

  const saveArtifact = async (payload: ArtifactPayload): Promise<string | null> => {
    if (!user?.id) {
      toast({ title: "Connexion requise", variant: "destructive" });
      return null;
    }
    setIsSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("artifacts") as any)
        .insert({
          user_id: user.id,
          org_id: profile?.org_id ?? null,
          title: payload.title.slice(0, 200),
          type: payload.type,
          content: payload.content,
          session_id: payload.sessionId ?? null,
          metadata: payload.metadata ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;

      toast({
        title: "✅ Sauvegardé dans votre bibliothèque",
        description: `"${payload.title.slice(0, 50)}" ajouté.`,
      });

      return data.id;
    } catch (err) {
      console.error("useSaveArtifact error:", err);
      toast({
        title: "Erreur de sauvegarde",
        description: "L'artefact n'a pas pu être sauvegardé.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveArtifact, isSaving };
}
