
-- Table org_weekly_reports: stores compiled weekly stats per organization
CREATE TABLE IF NOT EXISTS public.org_weekly_reports (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  week_start      date NOT NULL,
  completion_rate numeric NOT NULL DEFAULT 0,
  avg_score       numeric,
  at_risk_count   integer NOT NULL DEFAULT 0,
  inactive_count  integer NOT NULL DEFAULT 0,
  top_gaps        jsonb NOT NULL DEFAULT '[]'::jsonb,
  at_risk_users   jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_learners  integer NOT NULL DEFAULT 0,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (org_id, week_start)
);

ALTER TABLE public.org_weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage org_weekly_reports"
  ON public.org_weekly_reports FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers view own org reports"
  ON public.org_weekly_reports FOR SELECT
  USING (is_manager_of_org(auth.uid(), org_id));

CREATE INDEX IF NOT EXISTS idx_org_weekly_reports_org_week
  ON public.org_weekly_reports(org_id, week_start DESC);

-- Add read_only flag on organizations for subscription downgrade
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_read_only boolean NOT NULL DEFAULT false;
