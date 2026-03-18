-- Ajout de politiques SELECT pour org_knowledge_chunks et org_knowledge_documents
-- pour les membres authentifiés de l'organisation, remplaçant les anciennes
-- politiques trop permissives maintenant supprimées.

-- Authentifiés peuvent lire leurs propres chunks d'org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'org_knowledge_chunks' 
    AND policyname = 'Members can read own org chunks'
  ) THEN
    CREATE POLICY "Members can read own org chunks"
      ON public.org_knowledge_chunks FOR SELECT
      TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Authentifiés peuvent lire leurs propres documents d'org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'org_knowledge_documents' 
    AND policyname = 'Members can read own org documents'
  ) THEN
    CREATE POLICY "Members can read own org documents"
      ON public.org_knowledge_documents FOR SELECT
      TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;