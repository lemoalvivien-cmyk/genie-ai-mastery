
-- Ensure audit_logs table has all required columns for full event tracking
-- Add missing columns if they don't exist yet

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS score INTEGER,
  ADD COLUMN IF NOT EXISTS device TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Index for fast org-level queries (manager dashboard)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON public.audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
  ON public.audit_logs (event_type, created_at DESC);

-- Helper function: log_event (used by edge functions and triggers)
-- Callable with service role; never blocks the caller
CREATE OR REPLACE FUNCTION public.log_event(
  _user_id     uuid,
  _event_type  text,
  _details     jsonb DEFAULT '{}',
  _resource_type text DEFAULT NULL,
  _resource_id uuid DEFAULT NULL,
  _score       integer DEFAULT NULL,
  _duration_ms integer DEFAULT NULL,
  _device      text DEFAULT NULL,
  _session_id  text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, action, event_type, resource_type, resource_id,
    details, score, duration_ms, device, session_id, created_at
  ) VALUES (
    _user_id, _event_type, _event_type, _resource_type, _resource_id,
    COALESCE(_details, '{}'), _score, _duration_ms, _device, _session_id, now()
  );
EXCEPTION WHEN OTHERS THEN
  -- Never fail the caller
  NULL;
END;
$$;
