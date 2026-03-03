
-- ── nudges table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nudges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delay_days integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own nudge"
  ON public.nudges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own nudge"
  ON public.nudges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own nudge"
  ON public.nudges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage nudges"
  ON public.nudges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ── Function: check if user's org is blocked from attestation ─────────────────
-- Returns true when ANY member of the org has delay_days > 7
CREATE OR REPLACE FUNCTION public.org_attestation_blocked(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.nudges n
    JOIN public.profiles p ON p.id = n.user_id
    WHERE p.org_id = _org_id
      AND n.delay_days > 7
  );
$$;

-- ── Trigger: auto-update nudges.delay_days from progress table ───────────────
-- When a progress row is updated/inserted, compare updated_at vs created_at
-- to compute delay in days for "in_progress" modules still not completed.
CREATE OR REPLACE FUNCTION public.sync_nudge_delay()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _delay integer;
BEGIN
  -- Calculate delay: days since creation with no completion
  IF NEW.status IN ('not_started', 'in_progress') THEN
    _delay := GREATEST(0, EXTRACT(DAY FROM (now() - NEW.created_at))::integer);
  ELSE
    _delay := 0; -- completed or failed → reset delay
  END IF;

  INSERT INTO public.nudges (user_id, delay_days, updated_at)
  VALUES (NEW.user_id, _delay, now())
  ON CONFLICT (user_id) DO UPDATE
    SET delay_days = GREATEST(nudges.delay_days, EXCLUDED.delay_days),
        updated_at  = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_nudge_delay
AFTER INSERT OR UPDATE ON public.progress
FOR EACH ROW
EXECUTE FUNCTION public.sync_nudge_delay();
