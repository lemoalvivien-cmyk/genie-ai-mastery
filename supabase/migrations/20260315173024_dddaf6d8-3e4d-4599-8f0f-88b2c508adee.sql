
-- ── ai_jobs: async queue table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_type      text NOT NULL CHECK (job_type IN ('chat', 'pdf', 'brain')),
  payload       jsonb NOT NULL DEFAULT '{}',
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result        jsonb,
  error         text,
  provider_used text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status       ON public.ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id      ON public.ai_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_status  ON public.ai_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at   ON public.ai_jobs(created_at DESC);

CREATE TRIGGER ai_jobs_updated_at
  BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own jobs"
  ON public.ai_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create their own jobs"
  ON public.ai_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role updates jobs"
  ON public.ai_jobs FOR UPDATE
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_jobs;
