
-- Job Queue table
CREATE TABLE IF NOT EXISTS public.job_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  org_id UUID,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'retrying')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own jobs" ON public.job_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own jobs" ON public.job_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own jobs" ON public.job_queue FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_job_queue_user_id ON public.job_queue (user_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON public.job_queue (status);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority ON public.job_queue (priority DESC, scheduled_at ASC);

-- Job Results table
CREATE TABLE IF NOT EXISTS public.job_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.job_queue(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  result JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own job results" ON public.job_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own job results" ON public.job_results FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_job_results_job_id ON public.job_results (job_id);

-- System Logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  module TEXT NOT NULL,
  event TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own system logs" ON public.system_logs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert system logs" ON public.system_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs (level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_module ON public.system_logs (module);

-- Agent Logs table
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID,
  execution_id UUID,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  step TEXT,
  message TEXT NOT NULL,
  input JSONB,
  output JSONB,
  duration_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own agent logs" ON public.agent_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own agent logs" ON public.agent_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id ON public.agent_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON public.agent_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON public.agent_logs (created_at DESC);

-- Error Logs table (extended from existing edge_errors, user-facing)
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  source TEXT NOT NULL DEFAULT 'client',
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own error logs" ON public.error_logs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users insert error logs" ON public.error_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs (resolved);

-- Auto-update job_queue updated_at
CREATE OR REPLACE FUNCTION public.update_job_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_job_queue_updated_at
BEFORE UPDATE ON public.job_queue
FOR EACH ROW EXECUTE FUNCTION public.update_job_queue_updated_at();
