
-- ─────────────────────────────────────────────────────────────
-- NEURO-REWARDS + COLLECTIVE INTELLIGENCE HIVE SYSTEM
-- ─────────────────────────────────────────────────────────────

-- ── 1. BADGE DEFINITIONS (catalogue global, admin-managed) ────
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '🏆',
  category      TEXT NOT NULL DEFAULT 'learning',
  rarity        TEXT NOT NULL DEFAULT 'common',
  xp_reward     INTEGER NOT NULL DEFAULT 50,
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL DEFAULT 1,
  is_secret     BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badge_definitions_public_read" ON public.badge_definitions
  FOR SELECT USING (true);

-- ── 2. USER BADGES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id      TEXT NOT NULL REFERENCES public.badge_definitions(id),
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_at_earn    INTEGER,
  streak_at_earn INTEGER,
  notified      BOOLEAN NOT NULL DEFAULT false,
  metadata      JSONB,
  UNIQUE (user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges_owner_select" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_badges_owner_insert" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_badges_owner_update" ON public.user_badges FOR UPDATE USING (auth.uid() = user_id);

-- ── 3. REWARD EVENTS (dopamine loop log) ──────────────────────
CREATE TABLE IF NOT EXISTS public.reward_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  xp_delta      INTEGER NOT NULL DEFAULT 0,
  badge_id      TEXT REFERENCES public.badge_definitions(id),
  multiplier    NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  context       JSONB,
  is_surprise   BOOLEAN NOT NULL DEFAULT false,
  notified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reward_events_owner_select" ON public.reward_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reward_events_owner_insert" ON public.reward_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reward_events_user ON public.reward_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_events_unnotified ON public.reward_events(user_id, notified_at) WHERE notified_at IS NULL;

-- ── 4. HIVE FEEDBACK (Collective Intelligence — anonymous RAG) ──
CREATE TABLE IF NOT EXISTS public.hive_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug     TEXT NOT NULL,
  question_hash   TEXT,
  feedback_type   TEXT NOT NULL,
  quality_score   SMALLINT CHECK (quality_score BETWEEN 1 AND 5),
  suggested_fix   TEXT,
  embedding_hint  TEXT,
  hive_weight     NUMERIC(4,3) NOT NULL DEFAULT 1.0,
  upvotes         INTEGER NOT NULL DEFAULT 0,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id_hash    TEXT
);

ALTER TABLE public.hive_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hive_feedback_auth_insert" ON public.hive_feedback FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "hive_feedback_anon_select" ON public.hive_feedback FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_hive_feedback_module ON public.hive_feedback(module_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hive_feedback_pending ON public.hive_feedback(processed_at) WHERE processed_at IS NULL;

-- ── 5. USER XP LEDGER ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_xp_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  xp_delta      INTEGER NOT NULL,
  source        TEXT NOT NULL,
  multiplier    NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  xp_after      INTEGER NOT NULL DEFAULT 0,
  context       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_xp_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_ledger_owner_select" ON public.user_xp_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "xp_ledger_owner_insert" ON public.user_xp_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_xp_ledger_user ON public.user_xp_ledger(user_id, created_at DESC);

-- ── 6. SEED BADGE DEFINITIONS ─────────────────────────────────
INSERT INTO public.badge_definitions (id, name, description, emoji, category, rarity, xp_reward, condition_type, condition_value, sort_order) VALUES
  ('streak_3',    'Apprenti Régulier',   '3 jours consécutifs',                    '🔥', 'streak', 'common',    50,  'streak_days', 3,   10),
  ('streak_7',    'Habitué de la Forge', '7 jours — la semaine parfaite',          '⚡', 'streak', 'uncommon', 150,  'streak_days', 7,   20),
  ('streak_14',   'Machine de Guerre',   '14 jours d''affilée',                    '💪', 'streak', 'rare',     300,  'streak_days', 14,  30),
  ('streak_30',   'Titan du Savoir',     '30 jours — niveau légendaire',           '👑', 'streak', 'legendary',750,  'streak_days', 30,  40),
  ('xp_500',      'Premier Décollage',   '500 XP gagnés',                          '🚀', 'learning','common',   25,  'xp_total',  500,  50),
  ('xp_2000',     'Vecteur d''Attaque',  '2000 XP — vous devenez dangereux',       '🎯', 'learning','uncommon', 100, 'xp_total', 2000,  60),
  ('xp_5000',     'Architecte Neural',   '5000 XP — cerveau upgradé',              '🧠', 'learning','rare',     250, 'xp_total', 5000,  70),
  ('xp_10000',    'Légende GENIE',       '10 000 XP — vous êtes le jeu',           '🌟', 'learning','legendary',1000,'xp_total',10000,  80),
  ('quiz_first_perfect','Premier 100%',  'Premier quiz parfait',                   '✨', 'learning','common',   75,  'quiz_perfect',  1,  90),
  ('quiz_ace',    'Sniper Brain',        '5 quiz parfaits consécutifs',            '🎖', 'learning','epic',     500, 'quiz_perfect',  5, 100),
  ('module_1',    'Première Brèche',     'Premier module terminé',                 '🏁', 'learning','common',   30,  'modules_done',  1, 110),
  ('module_5',    'Chasseur de Failles', '5 modules complétés',                    '🔍', 'learning','uncommon', 100, 'modules_done',  5, 120),
  ('module_10',   'Analyste Cyber',      '10 modules complétés',                   '🛡', 'learning','rare',     250, 'modules_done', 10, 130),
  ('hive_first',  'Neurone Collectif',   'Première contribution Hive',             '🐝', 'hive',   'common',   50,  'hive_contributions', 1,  140),
  ('hive_10',     'Ruche Consciente',    '10 feedbacks Hive',                      '🍯', 'hive',   'rare',     200, 'hive_contributions', 10, 150),
  ('mystery_phoenix','Phénix Noir',      'Revenu après une longue absence',        '🦅', 'elite',  'epic',     400, 'streak_days',  0, 200),
  ('mystery_nightowl','Chouette 3h',     'Mission entre 2h et 4h du matin',        '🦉', 'elite',  'rare',     200, 'streak_days',  0, 210)
ON CONFLICT (id) DO NOTHING;

-- ── 7. RPC: get_unnotified_rewards ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_unnotified_rewards(p_user_id UUID)
RETURNS TABLE (
  id UUID, event_type TEXT, xp_delta INTEGER, badge_id TEXT,
  multiplier NUMERIC, is_surprise BOOLEAN, context JSONB, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN QUERY
  SELECT re.id, re.event_type, re.xp_delta, re.badge_id,
         re.multiplier, re.is_surprise, re.context, re.created_at
  FROM public.reward_events re
  WHERE re.user_id = p_user_id AND re.notified_at IS NULL
  ORDER BY re.created_at ASC;
END;
$$;

-- ── 8. RPC: mark_rewards_notified ────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_rewards_notified(p_user_id UUID, p_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.reward_events
  SET notified_at = now()
  WHERE user_id = p_user_id AND id = ANY(p_ids);
END;
$$;

-- ── 9. RPC: check_and_award_badges ───────────────────────────
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak        INTEGER := 0;
  v_total_xp      INTEGER := 0;
  v_modules_done  INTEGER := 0;
  v_hive_count    INTEGER := 0;
  v_quiz_perfect  INTEGER := 0;
  v_new_badges    TEXT[] := '{}';
  v_bd            RECORD;
  v_already       BOOLEAN;
  v_met           BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT COALESCE(current_streak,0), COALESCE(total_xp,0)
    INTO v_streak, v_total_xp
    FROM public.user_streaks WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_modules_done
    FROM public.progress WHERE user_id = p_user_id AND status = 'completed';

  SELECT COUNT(*) INTO v_hive_count
    FROM public.hive_feedback
    WHERE user_id_hash = encode(sha256(p_user_id::text::bytea), 'hex');

  SELECT COUNT(*) INTO v_quiz_perfect
    FROM public.user_daily_log WHERE user_id = p_user_id AND score >= 100;

  FOR v_bd IN SELECT * FROM public.badge_definitions WHERE is_secret = false LOOP
    SELECT EXISTS(SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_id = v_bd.id) INTO v_already;
    CONTINUE WHEN v_already;

    v_met := false;
    IF v_bd.condition_type = 'streak_days'        AND v_streak       >= v_bd.condition_value THEN v_met := true; END IF;
    IF v_bd.condition_type = 'xp_total'           AND v_total_xp     >= v_bd.condition_value THEN v_met := true; END IF;
    IF v_bd.condition_type = 'modules_done'       AND v_modules_done >= v_bd.condition_value THEN v_met := true; END IF;
    IF v_bd.condition_type = 'hive_contributions' AND v_hive_count   >= v_bd.condition_value THEN v_met := true; END IF;
    IF v_bd.condition_type = 'quiz_perfect'       AND v_quiz_perfect >= v_bd.condition_value THEN v_met := true; END IF;

    IF v_met THEN
      INSERT INTO public.user_badges (user_id, badge_id, xp_at_earn, streak_at_earn, notified)
      VALUES (p_user_id, v_bd.id, v_total_xp, v_streak, false)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.reward_events (user_id, event_type, xp_delta, badge_id, context, is_surprise)
      VALUES (
        p_user_id, 'badge_earned', v_bd.xp_reward, v_bd.id,
        jsonb_build_object('badge_name', v_bd.name, 'rarity', v_bd.rarity),
        (v_bd.rarity IN ('epic','legendary'))
      );

      v_new_badges := array_append(v_new_badges, v_bd.id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('new_badges', v_new_badges, 'count', coalesce(array_length(v_new_badges,1),0));
END;
$$;
