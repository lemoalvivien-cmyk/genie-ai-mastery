-- Atomic increment function for access_codes (prevents race condition)
CREATE OR REPLACE FUNCTION public.increment_access_code_uses(_code_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.access_codes
  SET current_uses = current_uses + 1
  WHERE id = _code_id;
END;
$$;

-- Backfill plan_source for orgs that redeemed access codes but never got plan_source set
-- Cast plan::text to compare with string literals (plan is an enum)
UPDATE public.organizations
SET plan_source = 'access_code'
WHERE plan::text IN ('pro', 'business', 'enterprise', 'launch')
  AND (plan_source IS NULL OR plan_source = '');