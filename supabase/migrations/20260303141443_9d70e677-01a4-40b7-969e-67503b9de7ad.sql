
-- Fix DEFINER_OR_RPC_BYPASS: add caller validation to check_budget, log_ai_usage_safe, can_execute

-- 1. check_budget: caller must own _user_id or be admin
CREATE OR REPLACE FUNCTION public.check_budget(_user_id uuid, _org_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _today date := CURRENT_DATE;
  _user_tokens_today integer := 0;
  _user_cost_today numeric := 0;
  _org_tokens_today integer := 0;
  _org_cost_today numeric := 0;
  _org_daily_cost_cap numeric := 5.0;
  _org_daily_token_cap integer := 500000;
  _eco_forced boolean := false;
  _user_token_cap integer := 50000;
  _user_cost_cap numeric := 0.10;
BEGIN
  -- Enforce: caller must be querying their own data or be an admin
  IF _user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: cannot query budget for another user';
  END IF;

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
$function$;

-- 2. log_ai_usage_safe: caller must own _user_id or be admin
--    (called from edge functions with service_role, so we allow service_role bypass via auth.uid() IS NULL)
CREATE OR REPLACE FUNCTION public.log_ai_usage_safe(
  _user_id uuid,
  _org_id uuid,
  _model text,
  _tokens_in integer,
  _tokens_out integer,
  _cost_estimate numeric,
  _date date DEFAULT CURRENT_DATE,
  _request_id text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _existing_id uuid;
BEGIN
  -- Enforce: caller must own _user_id, be admin, or be called from service role (auth.uid() IS NULL)
  IF auth.uid() IS NOT NULL
     AND _user_id != auth.uid()
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: cannot log usage for another user';
  END IF;

  BEGIN
    SELECT id INTO _existing_id
    FROM public.ai_usage_daily
    WHERE user_id = _user_id AND date = _date AND model_used = _model
    LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      UPDATE public.ai_usage_daily SET
        tokens_in = tokens_in + _tokens_in,
        tokens_out = tokens_out + _tokens_out,
        cost_estimate = cost_estimate + _cost_estimate
      WHERE id = _existing_id;
    ELSE
      INSERT INTO public.ai_usage_daily
        (user_id, org_id, tokens_in, tokens_out, cost_estimate, model_used, date)
      VALUES
        (_user_id, _org_id, _tokens_in, _tokens_out, _cost_estimate, _model, _date);
    END IF;

    RETURN jsonb_build_object('ok', true);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.ai_usage_buffer
        (user_id, org_id, model, tokens_in, tokens_out, cost_estimate, date, request_id)
      VALUES
        (_user_id, _org_id, _model, _tokens_in, _tokens_out, _cost_estimate, _date, _request_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      UPDATE public.app_metrics SET
        logging_errors = logging_errors + 1,
        last_logging_error_at = now(),
        updated_at = now()
      WHERE id = 1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN jsonb_build_object('ok', false, 'fallback', true);
  END;
END;
$function$;

-- 3. can_execute: caller must own _user_id or be admin
--    (allow service_role bypass: auth.uid() IS NULL)
CREATE OR REPLACE FUNCTION public.can_execute(_user_id uuid, _org_id uuid, _kind usage_kind)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _period_start  date := date_trunc('month', CURRENT_DATE)::date;
  _user_plan     text := 'free';
  _limit_col     text;
  _limit_val     int  := 0;
  _current_usage int  := 0;
  _counter       record;
  _limits        record;
BEGIN
  -- Enforce: caller must own _user_id, be admin, or be called from service role
  IF auth.uid() IS NOT NULL
     AND _user_id != auth.uid()
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: cannot check execution rights for another user';
  END IF;

  IF _org_id IS NOT NULL THEN
    SELECT COALESCE(o.plan::text, 'free') INTO _user_plan
    FROM public.organizations o WHERE o.id = _org_id;
  ELSE
    _user_plan := 'free';
  END IF;

  _limit_col := CASE _kind
    WHEN 'ai_tokens_out'  THEN 'ai_tokens_out_max'
    WHEN 'ai_tokens_in'   THEN 'ai_tokens_out_max'
    WHEN 'tts_seconds'    THEN 'tts_seconds_max'
    WHEN 'tts_characters' THEN 'tts_seconds_max'
    WHEN 'pdf_generated'  THEN 'pdf_max'
    WHEN 'labs_runs'      THEN 'labs_max'
    ELSE 'ai_tokens_out_max'
  END;

  EXECUTE format('SELECT %I FROM public.plan_limits WHERE plan = $1', _limit_col)
  INTO _limit_val USING _user_plan::public.plan_type;

  IF _limit_val IS NULL THEN _limit_val := 0; END IF;

  SELECT * INTO _counter
  FROM public.usage_counters
  WHERE user_id = _user_id AND period_start = _period_start
  LIMIT 1;

  IF _counter IS NOT NULL THEN
    EXECUTE format('SELECT ($1).%I', _kind) INTO _current_usage USING _counter;
  END IF;

  IF _current_usage IS NULL THEN _current_usage := 0; END IF;

  RETURN jsonb_build_object(
    'allowed',        _current_usage < _limit_val OR _limit_val = -1,
    'current_usage',  _current_usage,
    'limit',          _limit_val,
    'remaining',      GREATEST(_limit_val - _current_usage, 0),
    'plan',           _user_plan,
    'kind',           _kind
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('allowed', true, 'error', SQLERRM);
END;
$function$;
