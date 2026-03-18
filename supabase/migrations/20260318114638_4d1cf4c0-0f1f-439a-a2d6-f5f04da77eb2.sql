-- =====================================================================
-- FIX 1: org_invoices — Remove dangerous service_role policies applied
--         to public role (auth.uid() IS NULL = anonymous access possible)
-- =====================================================================
DROP POLICY IF EXISTS "service_role_insert_invoices" ON public.org_invoices;
DROP POLICY IF EXISTS "service_role_update_invoices" ON public.org_invoices;

-- =====================================================================
-- FIX 2: ai_jobs — Remove the 'auth.uid() IS NULL' branch that allows
--         any anonymous caller to overwrite any AI job record
-- =====================================================================
DROP POLICY IF EXISTS "Service role updates jobs" ON public.ai_jobs;
CREATE POLICY "Authenticated users update own jobs"
  ON public.ai_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- FIX 3: worldwatch_entries — Remove ALL-command public policy
--         that grants anonymous CRUD on threat intelligence records
-- =====================================================================
DROP POLICY IF EXISTS "Service manage worldwatch" ON public.worldwatch_entries;

-- =====================================================================
-- FIX 4: org_knowledge_documents — Remove UPDATE policy with USING(true)
--         that allows any anonymous user to overwrite org documents
-- =====================================================================
DROP POLICY IF EXISTS "Service update org docs" ON public.org_knowledge_documents;

-- =====================================================================
-- FIX 5: org_knowledge_chunks — Remove INSERT policy with CHECK(true)
--         that allows any anonymous user to inject knowledge chunks
-- =====================================================================
DROP POLICY IF EXISTS "Service insert chunks" ON public.org_knowledge_chunks;

-- =====================================================================
-- FIX 6: login_attempts — Remove ALL policy with auth.uid() IS NULL
--         that exposes all login attempt records to anonymous users
-- =====================================================================
DROP POLICY IF EXISTS "login_attempts_service_only" ON public.login_attempts;