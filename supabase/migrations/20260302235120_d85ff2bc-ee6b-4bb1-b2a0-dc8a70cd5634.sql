-- AI usage daily tracking + kill switch
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  cost_estimate numeric(10,6) NOT NULL DEFAULT 0,
  model_used text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, model_used)
);

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_usage_daily"
  ON public.ai_usage_daily FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ai_usage_daily_date ON public.ai_usage_daily(date DESC);
CREATE INDEX idx_ai_usage_daily_user ON public.ai_usage_daily(user_id, date DESC);
CREATE INDEX idx_ai_usage_daily_org ON public.ai_usage_daily(org_id, date DESC);

-- Kill switch: app_settings kv store
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage app_settings"
  ON public.app_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read app_settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Insert default kill switch value
INSERT INTO public.app_settings (key, value) VALUES ('ai_kill_switch', '{"disabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;