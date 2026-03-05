
-- GENIE OS: Revenue Engine tables

-- 1. REVENUE LEADS
CREATE TABLE IF NOT EXISTS public.revenue_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_name TEXT,
  contact_name TEXT,
  email TEXT,
  website TEXT,
  industry TEXT,
  pain_point TEXT,
  opportunity_score INTEGER DEFAULT 0 CHECK (opportunity_score BETWEEN 0 AND 100),
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'
  source TEXT DEFAULT 'ai_agent', -- 'ai_agent', 'manual', 'autopilot'
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.revenue_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rl_owner_select" ON public.revenue_leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rl_owner_insert" ON public.revenue_leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rl_owner_update" ON public.revenue_leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rl_owner_delete" ON public.revenue_leads FOR DELETE USING (auth.uid() = user_id);

-- 2. REVENUE OPPORTUNITIES
CREATE TABLE IF NOT EXISTS public.revenue_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  market TEXT,
  estimated_value_eur NUMERIC(12,2) DEFAULT 0,
  probability INTEGER DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  status TEXT DEFAULT 'identified', -- 'identified', 'analyzing', 'validated', 'pursuing', 'closed'
  source TEXT DEFAULT 'ai_agent',
  tags TEXT[] DEFAULT '{}',
  action_plan JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.revenue_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ro_owner_select" ON public.revenue_opportunities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ro_owner_insert" ON public.revenue_opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ro_owner_update" ON public.revenue_opportunities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ro_owner_delete" ON public.revenue_opportunities FOR DELETE USING (auth.uid() = user_id);

-- 3. REVENUE REPORTS
CREATE TABLE IF NOT EXISTS public.revenue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  report_type TEXT NOT NULL, -- 'market_analysis', 'lead_generation', 'opportunity_scan', 'growth_loop'
  title TEXT NOT NULL,
  summary TEXT,
  data JSONB DEFAULT '{}',
  leads_generated INTEGER DEFAULT 0,
  opportunities_found INTEGER DEFAULT 0,
  estimated_pipeline_eur NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.revenue_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_owner_select" ON public.revenue_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rr_owner_insert" ON public.revenue_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rr_owner_delete" ON public.revenue_reports FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_revenue_leads_user ON public.revenue_leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_opps_user ON public.revenue_opportunities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_reports_user ON public.revenue_reports(user_id, created_at DESC);
