
-- Credit balance table
CREATE TABLE IF NOT EXISTS public.credit_balance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own credit balance" ON public.credit_balance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own credit balance" ON public.credit_balance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts credit balance" ON public.credit_balance FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'refund', 'bonus')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts transactions" ON public.credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions (created_at DESC);

-- Usage limits per plan
CREATE TABLE IF NOT EXISTS public.genieos_usage_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan TEXT NOT NULL UNIQUE,
  agents_max INTEGER NOT NULL DEFAULT 1,
  actions_per_day INTEGER NOT NULL DEFAULT 10,
  autopilot_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_watch_enabled BOOLEAN NOT NULL DEFAULT false,
  multi_agent_enabled BOOLEAN NOT NULL DEFAULT false,
  data_engine_enabled BOOLEAN NOT NULL DEFAULT false,
  revenue_engine_enabled BOOLEAN NOT NULL DEFAULT false,
  api_access_enabled BOOLEAN NOT NULL DEFAULT false,
  white_label_enabled BOOLEAN NOT NULL DEFAULT false,
  analytics_enabled BOOLEAN NOT NULL DEFAULT false,
  credits_per_month INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.genieos_usage_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view usage limits" ON public.genieos_usage_limits FOR SELECT USING (true);

-- Agent revenue tracking (commissions)
CREATE TABLE IF NOT EXISTS public.agent_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  agent_id UUID,
  sale_amount_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.2000,
  commission_amount_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_amount_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  transaction_type TEXT NOT NULL DEFAULT 'agent_sale',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.agent_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers view own revenue" ON public.agent_revenue FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "System inserts revenue" ON public.agent_revenue FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE INDEX IF NOT EXISTS idx_agent_revenue_seller_id ON public.agent_revenue (seller_id);
CREATE INDEX IF NOT EXISTS idx_agent_revenue_created_at ON public.agent_revenue (created_at DESC);
