
-- ─── Table ai_budgets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_budgets (
  org_id       uuid        NOT NULL PRIMARY KEY
                           REFERENCES public.organizations(id) ON DELETE CASCADE,
  daily_limit  numeric     NOT NULL DEFAULT 5.00,
  used_today   numeric     NOT NULL DEFAULT 0.00,
  reset_date   date        NOT NULL DEFAULT CURRENT_DATE,
  is_blocked   boolean     NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_budgets"
  ON public.ai_budgets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers read own org ai_budget"
  ON public.ai_budgets FOR SELECT
  USING (public.is_manager_of_org(auth.uid(), org_id));

-- ─── Function: check_and_increment_ai_budget ──────────────────────────────
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_budget(
  _org_id      uuid,
  _cost_delta  numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec         record;
  _new_used    numeric;
BEGIN
  INSERT INTO public.ai_budgets (org_id)
  VALUES (_org_id)
  ON CONFLICT (org_id) DO NOTHING;

  UPDATE public.ai_budgets
  SET used_today = 0,
      is_blocked = false,
      reset_date = CURRENT_DATE,
      updated_at = now()
  WHERE org_id = _org_id
    AND reset_date < CURRENT_DATE;

  SELECT * INTO _rec FROM public.ai_budgets WHERE org_id = _org_id;

  IF _rec.is_blocked OR _rec.used_today >= _rec.daily_limit THEN
    UPDATE public.ai_budgets SET is_blocked = true, updated_at = now() WHERE org_id = _org_id;
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'budget_exceeded',
      'used_today', _rec.used_today, 'daily_limit', _rec.daily_limit, 'remaining', 0
    );
  END IF;

  IF _cost_delta > 0 THEN
    UPDATE public.ai_budgets
    SET used_today = used_today + _cost_delta,
        is_blocked = (used_today + _cost_delta >= daily_limit),
        updated_at = now()
    WHERE org_id = _org_id;
    SELECT used_today INTO _new_used FROM public.ai_budgets WHERE org_id = _org_id;
  ELSE
    _new_used := _rec.used_today;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'used_today', _new_used,
    'daily_limit', _rec.daily_limit,
    'remaining', GREATEST(_rec.daily_limit - _new_used, 0)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('allowed', true, 'error', SQLERRM);
END;
$$;

-- ─── Trigger: auto-seed ai_budgets on org creation ────────────────────────
CREATE OR REPLACE FUNCTION public.seed_ai_budget_for_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_budgets (org_id, daily_limit)
  VALUES (NEW.id, 5.00)
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_ai_budget
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.seed_ai_budget_for_org();

-- ─── Back-fill existing orgs ───────────────────────────────────────────────
INSERT INTO public.ai_budgets (org_id, daily_limit)
SELECT id, 5.00 FROM public.organizations
ON CONFLICT (org_id) DO NOTHING;
