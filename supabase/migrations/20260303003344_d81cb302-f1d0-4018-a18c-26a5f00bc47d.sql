
-- 1. app_metrics (singleton row)
CREATE TABLE IF NOT EXISTS public.app_metrics (
  id integer PRIMARY KEY DEFAULT 1,
  logging_errors integer NOT NULL DEFAULT 0,
  last_logging_error_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.app_metrics (id, logging_errors) VALUES (1, 0) ON CONFLICT DO NOTHING;

ALTER TABLE public.app_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage app_metrics"
  ON public.app_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role read app_metrics"
  ON public.app_metrics FOR SELECT
  USING (true);

-- 2. ai_usage_buffer (fallback)
CREATE TABLE IF NOT EXISTS public.ai_usage_buffer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  org_id uuid,
  model text,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  cost_estimate numeric(10,6) NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_buffer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_usage_buffer"
  ON public.ai_usage_buffer FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. RPC log_ai_usage_safe — never throws
CREATE OR REPLACE FUNCTION public.log_ai_usage_safe(
  _user_id uuid,
  _org_id uuid,
  _model text,
  _tokens_in integer,
  _tokens_out integer,
  _cost_estimate numeric,
  _date date DEFAULT CURRENT_DATE,
  _request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_id uuid;
BEGIN
  -- Try upsert into ai_usage_daily
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
    -- Fallback: write to buffer
    BEGIN
      INSERT INTO public.ai_usage_buffer
        (user_id, org_id, model, tokens_in, tokens_out, cost_estimate, date, request_id)
      VALUES
        (_user_id, _org_id, _model, _tokens_in, _tokens_out, _cost_estimate, _date, _request_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Increment error counter
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
$$;

-- 4. RPC flush_usage_buffer — reprocesses buffer rows into ai_usage_daily (batch 200)
CREATE OR REPLACE FUNCTION public.flush_usage_buffer()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _processed integer := 0;
  _failed integer := 0;
  _existing_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR _row IN
    SELECT * FROM public.ai_usage_buffer
    ORDER BY created_at ASC
    LIMIT 200
  LOOP
    BEGIN
      SELECT id INTO _existing_id
      FROM public.ai_usage_daily
      WHERE user_id = _row.user_id AND date = _row.date AND model_used = _row.model
      LIMIT 1;

      IF _existing_id IS NOT NULL THEN
        UPDATE public.ai_usage_daily SET
          tokens_in = tokens_in + _row.tokens_in,
          tokens_out = tokens_out + _row.tokens_out,
          cost_estimate = cost_estimate + _row.cost_estimate
        WHERE id = _existing_id;
      ELSE
        INSERT INTO public.ai_usage_daily
          (user_id, org_id, tokens_in, tokens_out, cost_estimate, model_used, date)
        VALUES
          (_row.user_id, _row.org_id, _row.tokens_in, _row.tokens_out, _row.cost_estimate, _row.model, _row.date);
      END IF;

      DELETE FROM public.ai_usage_buffer WHERE id = _row.id;
      _processed := _processed + 1;
    EXCEPTION WHEN OTHERS THEN
      _failed := _failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', _processed, 'failed', _failed);
END;
$$;
