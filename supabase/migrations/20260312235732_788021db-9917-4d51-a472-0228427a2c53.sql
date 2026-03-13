
-- ── 1. brain_events: granular tracking table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brain_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id         UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  event_type     TEXT NOT NULL,
  session_id     TEXT,
  risk_score     SMALLINT,
  agents_used    TEXT[],
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brain_events_insert_own"
  ON public.brain_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "brain_events_select_own_and_org"
  ON public.brain_events FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      public.has_role(auth.uid(), 'manager'::app_role)
      AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE INDEX IF NOT EXISTS idx_brain_events_user_id   ON public.brain_events (user_id);
CREATE INDEX IF NOT EXISTS idx_brain_events_org_id    ON public.brain_events (org_id);
CREATE INDEX IF NOT EXISTS idx_brain_events_type      ON public.brain_events (event_type);
CREATE INDEX IF NOT EXISTS idx_brain_events_created   ON public.brain_events (created_at DESC);

-- ── 2. SECURITY DEFINER: get_brain_revenue_ops ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_brain_revenue_ops(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_org UUID;
  _result     JSONB;
BEGIN
  IF NOT (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF has_role(auth.uid(), 'manager'::app_role) AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    SELECT org_id INTO _caller_org FROM public.profiles WHERE id = auth.uid();
    IF _caller_org IS DISTINCT FROM _org_id THEN
      RAISE EXCEPTION 'Access denied: wrong org';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'total_activations',   COUNT(*) FILTER (WHERE event_type = 'palantir_activated'),
    'unique_activators',   COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'palantir_activated'),
    'total_messages',      COUNT(*) FILTER (WHERE event_type = 'brain_message_sent'),
    'modules_accepted',    COUNT(*) FILTER (WHERE event_type = 'module_accepted'),
    'destroyer_shown',     COUNT(*) FILTER (WHERE event_type = 'destroyer_shown'),
    'dashboard_views',     COUNT(*) FILTER (WHERE event_type = 'dashboard_viewed'),
    'activations_7d',      COUNT(*) FILTER (WHERE event_type = 'palantir_activated' AND created_at > now() - interval '7 days'),
    'messages_7d',         COUNT(*) FILTER (WHERE event_type = 'brain_message_sent' AND created_at > now() - interval '7 days'),
    'avg_risk_score',      ROUND(AVG(risk_score) FILTER (WHERE risk_score IS NOT NULL)),
    'last_event_at',       MAX(created_at)
  )
  INTO _result
  FROM public.brain_events
  WHERE org_id = _org_id;

  RETURN COALESCE(_result, '{}'::JSONB);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ── 3. SECURITY DEFINER: get_brain_events_timeseries ──────────────────────
CREATE OR REPLACE FUNCTION public.get_brain_events_timeseries(_org_id UUID, _days INTEGER DEFAULT 30)
RETURNS TABLE(day DATE, event_type TEXT, cnt BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    DATE(created_at) AS day,
    event_type,
    COUNT(*) AS cnt
  FROM public.brain_events
  WHERE org_id = _org_id
    AND created_at > now() - (_days || ' days')::INTERVAL
  GROUP BY DATE(created_at), event_type
  ORDER BY day ASC;
$$;

-- ── 4. Realtime on brain_events ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.brain_events;
