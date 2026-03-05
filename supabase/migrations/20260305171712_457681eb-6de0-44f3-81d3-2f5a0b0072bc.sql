
CREATE TABLE public.action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.genieos_agents(id) ON DELETE SET NULL,
  execution_id UUID REFERENCES public.agent_executions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'simulation',
  status TEXT NOT NULL DEFAULT 'pending',
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error TEXT,
  duration_ms INTEGER,
  confirmed_by_user BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own action logs"
  ON public.action_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action logs"
  ON public.action_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action logs"
  ON public.action_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all action logs"
  ON public.action_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_action_logs_updated_at
  BEFORE UPDATE ON public.action_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_action_logs_user_id ON public.action_logs(user_id);
CREATE INDEX idx_action_logs_created_at ON public.action_logs(created_at DESC);
CREATE INDEX idx_action_logs_action_type ON public.action_logs(action_type);
