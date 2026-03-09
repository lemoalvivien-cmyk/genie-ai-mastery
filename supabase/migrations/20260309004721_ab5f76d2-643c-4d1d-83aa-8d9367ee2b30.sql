
-- ── SPRINT DIVIN 1 ────────────────────────────────────────────────────────────

-- BLOC 1: placement_quiz_results
CREATE TABLE IF NOT EXISTS public.placement_quiz_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  taken_at    timestamp with time zone NOT NULL DEFAULT now(),
  answers     jsonb NOT NULL DEFAULT '{}',
  scores      jsonb NOT NULL DEFAULT '{}',
  total_score numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.placement_quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their placement results"
  ON public.placement_quiz_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add placement_done flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS placement_done boolean NOT NULL DEFAULT false;

-- BLOC 2: RPC get_next_best_action
CREATE OR REPLACE FUNCTION public.get_next_best_action(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _top_gap      record;
  _next_module  record;
  _completed    int;
  _has_mastery  bool;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() != _user_id AND NOT has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('error', 'access_denied');
  END IF;

  SELECT COUNT(*) INTO _completed FROM public.progress
  WHERE user_id = _user_id AND status = 'completed';

  SELECT EXISTS(SELECT 1 FROM public.skill_mastery WHERE user_id = _user_id) INTO _has_mastery;

  -- No data → placement quiz
  IF NOT _has_mastery AND _completed = 0 THEN
    -- Check if placement already done
    IF EXISTS (SELECT 1 FROM public.placement_quiz_results WHERE user_id = _user_id) THEN
      NULL; -- Fall through to module recommendation
    ELSE
      RETURN jsonb_build_object(
        'action_type', 'placement_quiz',
        'reason',      'Aucune donnée de progression. Un benchmark rapide personnalise votre parcours.',
        'title',       'Faire le benchmark de positionnement',
        'path',        '/app/placement',
        'urgency',     'high',
        'domain',      null,
        'top_gap',     null
      );
    END IF;
  END IF;

  -- Top gap: lowest mastery < 60%
  SELECT sm.p_mastery, s.name, s.domain, s.slug
  INTO _top_gap
  FROM public.skill_mastery sm
  JOIN public.skills s ON s.id = sm.skill_id
  WHERE sm.user_id = _user_id
  ORDER BY sm.p_mastery ASC
  LIMIT 1;

  IF _top_gap IS NOT NULL AND _top_gap.p_mastery < 0.6 THEN
    SELECT m.id, m.title, m.slug, m.domain, m.level
    INTO _next_module
    FROM public.modules m
    LEFT JOIN public.progress p ON p.module_id = m.id AND p.user_id = _user_id
    WHERE m.is_published = true
      AND m.domain = _top_gap.domain
      AND (p.status IS NULL OR p.status != 'completed')
    ORDER BY m.order_index ASC
    LIMIT 1;

    IF _next_module IS NOT NULL THEN
      RETURN jsonb_build_object(
        'action_type', 'module',
        'reason',      format('Lacune détectée : "%s" à %s%% — compétence clé à renforcer.', _top_gap.name, round(_top_gap.p_mastery * 100)),
        'title',       _next_module.title,
        'path',        format('/app/modules/%s', _next_module.slug),
        'urgency',     CASE WHEN _top_gap.p_mastery < 0.3 THEN 'high' ELSE 'medium' END,
        'domain',      _top_gap.domain,
        'top_gap',     jsonb_build_object('name', _top_gap.name, 'score', round(_top_gap.p_mastery * 100))
      );
    END IF;
  END IF;

  -- Next unstarted/in-progress module
  SELECT m.id, m.title, m.slug, m.domain, m.level
  INTO _next_module
  FROM public.modules m
  LEFT JOIN public.progress p ON p.module_id = m.id AND p.user_id = _user_id
  WHERE m.is_published = true
    AND (p.status IS NULL OR p.status = 'in_progress')
  ORDER BY
    CASE WHEN p.status = 'in_progress' THEN 0 ELSE 1 END ASC,
    m.order_index ASC
  LIMIT 1;

  IF _next_module IS NOT NULL THEN
    RETURN jsonb_build_object(
      'action_type', 'module',
      'reason',      CASE WHEN _completed = 0
        THEN 'Premier module recommandé pour démarrer.'
        ELSE format('%s modules terminés — continuez votre progression.', _completed)
      END,
      'title',       _next_module.title,
      'path',        format('/app/modules/%s', _next_module.slug),
      'urgency',     'medium',
      'domain',      _next_module.domain,
      'top_gap',     null
    );
  END IF;

  -- All done
  RETURN jsonb_build_object(
    'action_type', 'synthesis',
    'reason',      format('Bravo ! %s modules validés. Génère ton attestation.', _completed),
    'title',       'Générer mon attestation',
    'path',        '/app/settings',
    'urgency',     'low',
    'domain',      null,
    'top_gap',     null
  );
END;
$$;

-- BLOC 3: get_guided_daily_mission — sélection déterministe
CREATE OR REPLACE FUNCTION public.get_guided_daily_mission(
  _user_id    uuid,
  _persona    text DEFAULT 'salarie',
  _level      int  DEFAULT 1,
  _top_domain text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result          record;
  _recent_ids      uuid[];
  _preferred_level text;
  _domains         text[];
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() != _user_id AND NOT has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('error', 'access_denied');
  END IF;

  SELECT array_agg(mission_id) INTO _recent_ids
  FROM public.user_daily_log
  WHERE user_id = _user_id
    AND completed_date >= CURRENT_DATE - INTERVAL '7 days';

  IF _recent_ids IS NULL THEN _recent_ids := '{}'; END IF;

  _preferred_level := CASE
    WHEN _level >= 4 THEN 'avance'
    WHEN _level >= 2 THEN 'intermediaire'
    ELSE 'debutant'
  END;

  -- Domains by persona
  _domains := CASE _persona
    WHEN 'dirigeant'    THEN ARRAY['cyber', 'ia_pro']
    WHEN 'jeune'        THEN ARRAY['vibe_coding', 'ia_perso']
    WHEN 'independant'  THEN ARRAY['ia_pro', 'vibe_coding']
    WHEN 'parent'       THEN ARRAY['ia_perso', 'cyber']
    WHEN 'senior'       THEN ARRAY['cyber', 'ia_perso']
    ELSE ARRAY['cyber', 'ia_pro', 'ia_perso']
  END;

  -- Priority 1: weak domain + right level + not recent
  IF _top_domain IS NOT NULL THEN
    SELECT * INTO _result FROM public.daily_missions
    WHERE is_active = true AND domain = _top_domain AND level = _preferred_level
      AND (id != ALL(_recent_ids))
    ORDER BY random() LIMIT 1;
    IF FOUND THEN RETURN to_jsonb(_result); END IF;
  END IF;

  -- Priority 2: persona domains + right level + not recent
  SELECT * INTO _result FROM public.daily_missions
  WHERE is_active = true AND domain = ANY(_domains) AND level = _preferred_level
    AND (id != ALL(_recent_ids))
  ORDER BY random() LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(_result); END IF;

  -- Priority 3: persona domains + any level + not recent
  SELECT * INTO _result FROM public.daily_missions
  WHERE is_active = true AND domain = ANY(_domains)
    AND (id != ALL(_recent_ids))
  ORDER BY random() LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(_result); END IF;

  -- Fallback: any not recent
  SELECT * INTO _result FROM public.daily_missions
  WHERE is_active = true AND (id != ALL(_recent_ids))
  ORDER BY random() LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(_result); END IF;

  -- Full recycle
  SELECT * INTO _result FROM public.daily_missions
  WHERE is_active = true ORDER BY random() LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(_result); END IF;

  RETURN null;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_placement_quiz_user
  ON public.placement_quiz_results(user_id, taken_at DESC);
