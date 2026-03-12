
-- ══════════════════════════════════════════════════════════════════════════════
-- GÉNIE BRAIN — Ontologie centrale Palantir-level
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Table principale genie_brain ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.genie_brain (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id                   UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  knowledge_graph          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ontology_nodes           TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  predicted_risk_score     SMALLINT    NOT NULL DEFAULT 50,
  next_failure_prediction  TIMESTAMPTZ,
  last_analysis_at         TIMESTAMPTZ,
  analysis_version         INTEGER     NOT NULL DEFAULT 1,
  active_agents            TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  agent_states             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  cache_key                TEXT,
  cache_expires_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_genie_brain_user_id    ON public.genie_brain(user_id);
CREATE INDEX IF NOT EXISTS idx_genie_brain_org_id     ON public.genie_brain(org_id);
CREATE INDEX IF NOT EXISTS idx_genie_brain_risk_score ON public.genie_brain(predicted_risk_score);
CREATE INDEX IF NOT EXISTS idx_genie_brain_knowledge  ON public.genie_brain USING GIN(knowledge_graph);
CREATE INDEX IF NOT EXISTS idx_genie_brain_nodes      ON public.genie_brain USING GIN(ontology_nodes);

-- ── Événements Brain ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.genie_brain_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id        UUID        NOT NULL REFERENCES public.genie_brain(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL,
  org_id          UUID,
  event_type      TEXT        NOT NULL,
  agent_name      TEXT,
  payload         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  risk_delta      SMALLINT    DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_events_brain_id  ON public.genie_brain_events(brain_id);
CREATE INDEX IF NOT EXISTS idx_brain_events_user_id   ON public.genie_brain_events(user_id);
CREATE INDEX IF NOT EXISTS idx_brain_events_type      ON public.genie_brain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_brain_events_created   ON public.genie_brain_events(created_at DESC);

-- ── Modules auto-générés par le Predictor Agent ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.brain_generated_modules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL,
  org_id          UUID,
  title           TEXT        NOT NULL,
  description     TEXT,
  domain          TEXT        NOT NULL DEFAULT 'cyber',
  content         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  target_skill    TEXT,
  predicted_gap   NUMERIC(4,1),
  status          TEXT        NOT NULL DEFAULT 'pending',
  generated_by    TEXT        NOT NULL DEFAULT 'predictor_agent',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_bgm_user_id    ON public.brain_generated_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_bgm_status     ON public.brain_generated_modules(status);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.genie_brain             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genie_brain_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_generated_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brain_select_own" ON public.genie_brain
  FOR SELECT USING (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "brain_manager_select" ON public.genie_brain
  FOR SELECT USING (
    public.has_role(auth.uid(), 'manager')
    AND org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "brain_insert_own" ON public.genie_brain
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "brain_update_own" ON public.genie_brain
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "brain_events_select_own" ON public.genie_brain_events
  FOR SELECT USING (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'manager')
      AND org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "brain_events_insert_own" ON public.genie_brain_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bgm_select_own" ON public.brain_generated_modules
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "bgm_insert_own" ON public.brain_generated_modules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bgm_update_own" ON public.brain_generated_modules
  FOR UPDATE USING (auth.uid() = user_id);

-- ── Trigger updated_at ────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER genie_brain_updated_at
  BEFORE UPDATE ON public.genie_brain
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Fonction SECURITY DEFINER upsert brain ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_genie_brain(
  _user_id        UUID,
  _knowledge      JSONB DEFAULT NULL,
  _risk_score     SMALLINT DEFAULT NULL,
  _nodes          TEXT[] DEFAULT NULL,
  _next_failure   TIMESTAMPTZ DEFAULT NULL,
  _agent_states   JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _brain_id UUID;
  _org_id   UUID;
BEGIN
  IF auth.uid() IS NOT NULL
     AND _user_id != auth.uid()
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT org_id INTO _org_id FROM public.profiles WHERE id = _user_id;

  INSERT INTO public.genie_brain (user_id, org_id)
  VALUES (_user_id, _org_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO _brain_id FROM public.genie_brain WHERE user_id = _user_id;

  UPDATE public.genie_brain SET
    knowledge_graph         = COALESCE(_knowledge,    knowledge_graph),
    predicted_risk_score    = COALESCE(_risk_score,   predicted_risk_score),
    ontology_nodes          = COALESCE(_nodes,        ontology_nodes),
    next_failure_prediction = COALESCE(_next_failure, next_failure_prediction),
    agent_states            = COALESCE(_agent_states, agent_states),
    last_analysis_at        = now(),
    updated_at              = now()
  WHERE id = _brain_id;

  RETURN jsonb_build_object('ok', true, 'brain_id', _brain_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ── Fonction analytics org pour managers ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_org_brain_analytics(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    IF _caller_org != _org_id THEN
      RAISE EXCEPTION 'Access denied: wrong org';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'total_users',       COUNT(*),
    'avg_risk_score',    ROUND(AVG(predicted_risk_score)),
    'high_risk_count',   COUNT(*) FILTER (WHERE predicted_risk_score >= 70),
    'medium_risk_count', COUNT(*) FILTER (WHERE predicted_risk_score BETWEEN 40 AND 69),
    'low_risk_count',    COUNT(*) FILTER (WHERE predicted_risk_score < 40),
    'last_updated',      MAX(updated_at)
  )
  INTO _result
  FROM public.genie_brain
  WHERE org_id = _org_id;

  RETURN COALESCE(_result, '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ── Realtime ──────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.genie_brain;
ALTER PUBLICATION supabase_realtime ADD TABLE public.genie_brain_events;
