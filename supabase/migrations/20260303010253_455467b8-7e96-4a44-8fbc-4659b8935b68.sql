
-- 1. IP rate limits table for demo/verify endpoints
CREATE TABLE public.ip_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ip_hash, endpoint)
);

ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) can manage ip_rate_limits
CREATE POLICY "Service role manages ip_rate_limits"
  ON public.ip_rate_limits FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ip_rate_limits_ip_endpoint ON public.ip_rate_limits(ip_hash, endpoint);
CREATE INDEX idx_ip_rate_limits_window ON public.ip_rate_limits(window_start);

-- 2. Abuse flags table (richer than a single score column)
CREATE TABLE public.abuse_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_hash text,
  flag_type text NOT NULL, -- 'spam_loop', 'jailbreak_attempt', 'rate_exceeded', 'scrape_detected', 'pattern_abuse'
  details jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.abuse_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage abuse_flags"
  ON public.abuse_flags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_abuse_flags_user_id ON public.abuse_flags(user_id);
CREATE INDEX idx_abuse_flags_created_at ON public.abuse_flags(created_at DESC);
CREATE INDEX idx_abuse_flags_flag_type ON public.abuse_flags(flag_type);

-- 3. Add abuse_score to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS abuse_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS abuse_blocked_until timestamptz;

-- 4. Helper function: check and increment IP rate limit (used by edge functions via service role)
CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(
  _ip_hash text,
  _endpoint text,
  _max_requests integer DEFAULT 5,
  _window_hours integer DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec record;
  _window_start timestamptz := now() - (_window_hours || ' hours')::interval;
BEGIN
  SELECT * INTO _rec
  FROM public.ip_rate_limits
  WHERE ip_hash = _ip_hash AND endpoint = _endpoint;

  -- If blocked
  IF _rec IS NOT NULL AND _rec.blocked_until IS NOT NULL AND now() < _rec.blocked_until THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'blocked_until', _rec.blocked_until,
      'count', _rec.request_count
    );
  END IF;

  -- If window expired or no record: reset
  IF _rec IS NULL OR _rec.window_start < _window_start THEN
    INSERT INTO public.ip_rate_limits (ip_hash, endpoint, request_count, window_start)
    VALUES (_ip_hash, _endpoint, 1, now())
    ON CONFLICT (ip_hash, endpoint) DO UPDATE SET
      request_count = 1,
      window_start = now(),
      blocked_until = NULL,
      updated_at = now();
    RETURN jsonb_build_object('allowed', true, 'count', 1, 'limit', _max_requests);
  END IF;

  -- Increment counter
  UPDATE public.ip_rate_limits SET
    request_count = request_count + 1,
    updated_at = now(),
    blocked_until = CASE
      WHEN request_count + 1 > _max_requests * 3
      THEN now() + interval '24 hours' -- hard block for extreme abuse
      ELSE NULL
    END
  WHERE ip_hash = _ip_hash AND endpoint = _endpoint
  RETURNING * INTO _rec;

  IF _rec.request_count > _max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_exceeded',
      'count', _rec.request_count,
      'limit', _max_requests
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'count', _rec.request_count, 'limit', _max_requests);
END;
$$;

-- 5. Helper function: record abuse flag + update user score
CREATE OR REPLACE FUNCTION public.record_abuse(
  _user_id uuid,
  _ip_hash text,
  _flag_type text,
  _severity text DEFAULT 'low',
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _score_delta integer;
  _block_duration interval;
BEGIN
  -- Score delta by severity
  _score_delta := CASE _severity
    WHEN 'low'      THEN 5
    WHEN 'medium'   THEN 15
    WHEN 'high'     THEN 30
    WHEN 'critical' THEN 60
    ELSE 5
  END;

  INSERT INTO public.abuse_flags (user_id, ip_hash, flag_type, severity, details)
  VALUES (_user_id, _ip_hash, _flag_type, _severity, _details);

  IF _user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      abuse_score = LEAST(abuse_score + _score_delta, 100),
      abuse_blocked_until = CASE
        WHEN abuse_score + _score_delta >= 80
        THEN now() + interval '24 hours'
        WHEN abuse_score + _score_delta >= 60
        THEN now() + interval '1 hour'
        ELSE abuse_blocked_until
      END,
      updated_at = now()
    WHERE id = _user_id;
  END IF;
END;
$$;

-- 6. Cleanup function for old ip_rate_limits entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_ip_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ip_rate_limits
  WHERE window_start < now() - interval '48 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
END;
$$;
