
-- Table skill_mastery : probabilité bayésienne de maîtrise par skill
CREATE TABLE IF NOT EXISTS public.skill_mastery (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id     uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  p_mastery    numeric NOT NULL DEFAULT 0.1 CHECK (p_mastery >= 0 AND p_mastery <= 1),
  updated_at   timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_id)
);

ALTER TABLE public.skill_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mastery"
  ON public.skill_mastery FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own mastery"
  ON public.skill_mastery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own mastery"
  ON public.skill_mastery FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage skill_mastery"
  ON public.skill_mastery FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RPC silencieux pour upsert p_mastery depuis Edge Function (service role)
CREATE OR REPLACE FUNCTION public.upsert_skill_mastery(
  _user_id   uuid,
  _skill_id  uuid,
  _p_mastery numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.skill_mastery (user_id, skill_id, p_mastery)
  VALUES (_user_id, _skill_id, LEAST(1.0, GREATEST(0.0, _p_mastery)))
  ON CONFLICT (user_id, skill_id) DO UPDATE
    SET p_mastery  = LEAST(1.0, GREATEST(0.0, EXCLUDED.p_mastery)),
        updated_at = now();
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;
