-- ============================================================
-- 1. audit_logs: append-only trigger (SOC2 compliance)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_log_append_only()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_logs is append-only — modification interdite (SOC2)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_append_only ON public.audit_logs;
CREATE TRIGGER audit_append_only
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_append_only();

-- ============================================================
-- 2. audit_logs RLS
-- ============================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_insert_all"  ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert"      ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_own"  ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_update"   ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete"   ON public.audit_logs;

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "audit_logs_no_update" ON public.audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "audit_logs_no_delete" ON public.audit_logs
  FOR DELETE USING (false);

-- ============================================================
-- 3. login_attempts table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash      TEXT        NOT NULL,
  email_hash   TEXT        NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success      BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_email_time
  ON public.login_attempts (ip_hash, email_hash, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_time
  ON public.login_attempts (attempted_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_attempts_service_only" ON public.login_attempts
  FOR ALL USING (auth.uid() IS NULL);

-- ============================================================
-- 4. check_login_rate_limit SECURITY DEFINER function
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  _ip_hash    TEXT,
  _email_hash TEXT,
  _success    BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start  TIMESTAMPTZ := now() - INTERVAL '15 minutes';
  _attempt_count INT;
  _blocked_until TIMESTAMPTZ;
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - INTERVAL '24 hours';

  SELECT COUNT(*) INTO _attempt_count
  FROM public.login_attempts
  WHERE ip_hash    = _ip_hash
    AND email_hash = _email_hash
    AND success    = false
    AND attempted_at >= _window_start;

  IF _attempt_count >= 5 THEN
    SELECT MAX(attempted_at) + INTERVAL '15 minutes'
    INTO _blocked_until
    FROM public.login_attempts
    WHERE ip_hash    = _ip_hash
      AND email_hash = _email_hash
      AND success    = false
      AND attempted_at >= _window_start;

    IF _blocked_until > now() THEN
      RETURN jsonb_build_object(
        'allowed',       false,
        'attempts',      _attempt_count,
        'blocked_until', _blocked_until,
        'remaining_ms',  EXTRACT(EPOCH FROM (_blocked_until - now())) * 1000
      );
    END IF;
  END IF;

  INSERT INTO public.login_attempts (ip_hash, email_hash, success)
  VALUES (_ip_hash, _email_hash, _success);

  RETURN jsonb_build_object(
    'allowed',       true,
    'attempts',      _attempt_count + CASE WHEN NOT _success THEN 1 ELSE 0 END,
    'blocked_until', NULL,
    'remaining_ms',  0
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('allowed', true, 'error', SQLERRM);
END;
$$;