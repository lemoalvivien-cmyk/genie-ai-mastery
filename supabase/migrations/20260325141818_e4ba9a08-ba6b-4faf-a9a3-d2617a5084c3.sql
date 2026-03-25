
-- ============================================================
-- Fix 1: Restrict audit_logs INSERT policy — no anonymous forgery
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

-- ============================================================
-- Fix 2: Add caller-identity guard to log_event (exact existing signature)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_event(
  _user_id       uuid,
  _event_type    text,
  _details       jsonb    DEFAULT '{}',
  _resource_type text     DEFAULT NULL,
  _resource_id   uuid     DEFAULT NULL,
  _score         integer  DEFAULT NULL,
  _duration_ms   integer  DEFAULT NULL,
  _device        text     DEFAULT NULL,
  _session_id    text     DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller-identity guard: only the user themselves (or an admin) may log events
  IF auth.uid() IS NULL
     OR (auth.uid() != _user_id AND NOT has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN;
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    event_type,
    action,
    details,
    resource_type,
    resource_id,
    score,
    duration_ms,
    device,
    session_id
  ) VALUES (
    _user_id,
    _event_type,
    _event_type,
    COALESCE(_details, '{}'),
    _resource_type,
    _resource_id::text,
    _score,
    _duration_ms,
    _device,
    _session_id
  );
END;
$$;

-- Restrict EXECUTE to authenticated users only
REVOKE ALL ON FUNCTION public.log_event(uuid, text, jsonb, text, uuid, integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_event(uuid, text, jsonb, text, uuid, integer, integer, text, text) TO authenticated;

-- ============================================================
-- Fix 3: Add caller-identity guard to log_ai_usage_safe (exact existing signature)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_ai_usage_safe(
  _user_id       uuid,
  _org_id        uuid,
  _model         text,
  _tokens_in     integer,
  _tokens_out    integer,
  _cost_estimate numeric,
  _date          date    DEFAULT CURRENT_DATE,
  _request_id    text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller-identity guard
  IF auth.uid() IS NULL
     OR (auth.uid() != _user_id AND NOT has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  INSERT INTO public.ai_usage_buffer (
    user_id,
    org_id,
    tokens_in,
    tokens_out,
    cost_estimate,
    model,
    request_id,
    date
  ) VALUES (
    _user_id,
    _org_id,
    COALESCE(_tokens_in, 0),
    COALESCE(_tokens_out, 0),
    COALESCE(_cost_estimate, 0),
    _model,
    _request_id,
    COALESCE(_date, CURRENT_DATE)
  );

  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- Restrict EXECUTE to authenticated users only
REVOKE ALL ON FUNCTION public.log_ai_usage_safe(uuid, uuid, text, integer, integer, numeric, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_ai_usage_safe(uuid, uuid, text, integer, integer, numeric, date, text) TO authenticated;
