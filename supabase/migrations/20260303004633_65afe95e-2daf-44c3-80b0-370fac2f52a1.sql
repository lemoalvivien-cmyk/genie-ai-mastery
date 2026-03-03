
-- 1. org_budgets table
CREATE TABLE IF NOT EXISTS public.org_budgets (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  daily_token_cap integer NOT NULL DEFAULT 500000,
  daily_cost_cap numeric(10,4) NOT NULL DEFAULT 5.0000,
  eco_mode_forced boolean NOT NULL DEFAULT false,
  eco_triggered_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage org_budgets"
  ON public.org_budgets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers read own org budget"
  ON public.org_budgets FOR SELECT
  USING (is_manager_of_org(auth.uid(), org_id));

-- 2. RPC check_budget — returns quota status for user + org, never throws
CREATE OR REPLACE FUNCTION public.check_budget(
  _user_id uuid,
  _org_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := CURRENT_DATE;
  _user_tokens_today integer := 0;
  _user_cost_today numeric := 0;
  _org_tokens_today integer := 0;
  _org_cost_today numeric := 0;
  _org_daily_cost_cap numeric := 5.0;
  _org_daily_token_cap integer := 500000;
  _eco_forced boolean := false;
  _user_token_cap integer := 50000;   -- default free user daily cap
  _user_cost_cap numeric := 0.10;     -- default free user daily cost cap
BEGIN
  -- User usage today
  SELECT
    COALESCE(SUM(tokens_in + tokens_out), 0),
    COALESCE(SUM(cost_estimate), 0)
  INTO _user_tokens_today, _user_cost_today
  FROM public.ai_usage_daily
  WHERE user_id = _user_id AND date = _today;

  -- Org usage + budget
  IF _org_id IS NOT NULL THEN
    SELECT
      COALESCE(SUM(tokens_in + tokens_out), 0),
      COALESCE(SUM(cost_estimate), 0)
    INTO _org_tokens_today, _org_cost_today
    FROM public.ai_usage_daily
    WHERE org_id = _org_id AND date = _today;

    SELECT daily_cost_cap, daily_token_cap, eco_mode_forced
    INTO _org_daily_cost_cap, _org_daily_token_cap, _eco_forced
    FROM public.org_budgets
    WHERE org_id = _org_id;

    -- Auto-trigger eco mode if budget exceeded
    IF NOT _eco_forced AND (
      _org_cost_today >= _org_daily_cost_cap OR
      _org_tokens_today >= _org_daily_token_cap
    ) THEN
      UPDATE public.org_budgets SET
        eco_mode_forced = true,
        eco_triggered_at = now(),
        updated_at = now()
      WHERE org_id = _org_id;
      _eco_forced := true;
    END IF;

    -- Orgs get higher user caps
    _user_token_cap := 200000;
    _user_cost_cap := 1.0;
  END IF;

  RETURN jsonb_build_object(
    'user_tokens_today', _user_tokens_today,
    'user_cost_today', _user_cost_today,
    'user_token_cap', _user_token_cap,
    'user_cost_cap', _user_cost_cap,
    'user_over_budget', (_user_cost_today >= _user_cost_cap OR _user_tokens_today >= _user_token_cap),
    'org_tokens_today', _org_tokens_today,
    'org_cost_today', _org_cost_today,
    'org_token_cap', _org_daily_token_cap,
    'org_cost_cap', _org_daily_cost_cap,
    'org_over_budget', (_org_id IS NOT NULL AND (_org_cost_today >= _org_daily_cost_cap OR _org_tokens_today >= _org_daily_token_cap)),
    'eco_mode', _eco_forced
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('eco_mode', false, 'user_over_budget', false, 'org_over_budget', false, 'error', SQLERRM);
END;
$$;

-- 3. Reset eco mode at midnight — RPC callable by admin
CREATE OR REPLACE FUNCTION public.reset_eco_mode(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) AND NOT is_manager_of_org(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  UPDATE public.org_budgets SET eco_mode_forced = false, eco_triggered_at = NULL, updated_at = now()
  WHERE org_id = _org_id;
END;
$$;

-- 4. Index for fast daily aggregation
CREATE INDEX IF NOT EXISTS ai_usage_daily_org_date_idx ON public.ai_usage_daily(org_id, date);
CREATE INDEX IF NOT EXISTS ai_usage_daily_user_date_idx ON public.ai_usage_daily(user_id, date);
