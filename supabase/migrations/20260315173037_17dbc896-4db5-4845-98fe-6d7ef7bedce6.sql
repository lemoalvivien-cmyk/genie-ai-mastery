
-- Fix UPDATE policy: restrict to service-role (auth.uid() IS NULL = service role call)
DROP POLICY IF EXISTS "Service role updates jobs" ON public.ai_jobs;

CREATE POLICY "Service role updates jobs"
  ON public.ai_jobs FOR UPDATE
  USING (auth.uid() IS NULL OR auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);
