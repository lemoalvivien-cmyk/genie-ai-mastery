-- Add monitoring columns to brain_events
ALTER TABLE public.brain_events 
  ADD COLUMN IF NOT EXISTS latency_ms integer,
  ADD COLUMN IF NOT EXISTS error_type text,
  ADD COLUMN IF NOT EXISTS agents_count integer;

-- Create DB function for monitoring stats
CREATE OR REPLACE FUNCTION public.get_brain_monitoring(_org_id uuid, _hours integer DEFAULT 24)
RETURNS jsonb
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
    'avg_latency_ms',      ROUND(AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL)),
    'p95_latency_ms',      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE latency_ms IS NOT NULL)),
    'total_swarms',        COUNT(*) FILTER (WHERE event_type = 'swarm_completed'),
    'error_count',         COUNT(*) FILTER (WHERE error_type IS NOT NULL),
    'error_rate_pct',      ROUND(
                             100.0 * COUNT(*) FILTER (WHERE error_type IS NOT NULL)
                             / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('swarm_completed','brain_message_sent')), 0)
                           ),
    'avg_agents',          ROUND(AVG(agents_count) FILTER (WHERE agents_count IS NOT NULL), 1),
    'swarms_last_hour',    COUNT(*) FILTER (WHERE event_type = 'swarm_completed' AND created_at > now() - interval '1 hour'),
    'last_latency_ms',     (SELECT latency_ms FROM public.brain_events 
                            WHERE org_id = _org_id AND latency_ms IS NOT NULL 
                            ORDER BY created_at DESC LIMIT 1)
  )
  INTO _result
  FROM public.brain_events
  WHERE org_id = _org_id
    AND created_at > now() - (_hours || ' hours')::INTERVAL;

  RETURN COALESCE(_result, '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Timeseries for latency chart
CREATE OR REPLACE FUNCTION public.get_brain_latency_timeseries(_org_id uuid, _hours integer DEFAULT 24)
RETURNS TABLE(ts timestamptz, latency_ms integer, agents_count integer, event_type text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT created_at, latency_ms, agents_count, event_type
  FROM public.brain_events
  WHERE org_id = _org_id
    AND created_at > now() - (_hours || ' hours')::INTERVAL
    AND latency_ms IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 100;
$$;