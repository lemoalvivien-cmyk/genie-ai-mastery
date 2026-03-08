
-- ── Table: function_calls_daily ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.function_calls_daily (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL,
  fn          text        NOT NULL,
  date        date        NOT NULL DEFAULT CURRENT_DATE,
  call_count  integer     NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fn, date)
);

ALTER TABLE public.function_calls_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily call counts"
  ON public.function_calls_daily
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fn_calls_daily_date
  ON public.function_calls_daily (date);
CREATE INDEX IF NOT EXISTS idx_fn_calls_daily_user_fn_date
  ON public.function_calls_daily (user_id, fn, date);

-- ── RPC: increment_ai_usage ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id uuid,
  p_function text,
  p_date     date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.function_calls_daily (user_id, fn, date, call_count)
  VALUES (p_user_id, p_function, p_date, 1)
  ON CONFLICT (user_id, fn, date)
  DO UPDATE SET
    call_count = function_calls_daily.call_count + 1,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;
