
-- ══════════════════════════════════════════════════════
-- AI APP STORE
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agent_store_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'general',
  use_cases     TEXT[] DEFAULT '{}',
  system_prompt TEXT DEFAULT '',
  tools         JSONB DEFAULT '[]',
  config        JSONB DEFAULT '{}',
  author_id     UUID,
  author_name   TEXT DEFAULT 'GENIE Team',
  is_official   BOOLEAN DEFAULT false,
  is_public     BOOLEAN DEFAULT true,
  icon          TEXT DEFAULT 'bot',
  tags          TEXT[] DEFAULT '{}',
  install_count INTEGER DEFAULT 0,
  rating_avg    REAL DEFAULT 0,
  rating_count  INTEGER DEFAULT 0,
  version       TEXT DEFAULT '1.0.0',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_store_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public items are readable by all"
  ON public.agent_store_items FOR SELECT
  USING (is_public = true OR author_id = auth.uid());

CREATE POLICY "Authors can manage their items"
  ON public.agent_store_items FOR ALL
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- agent_store_installs: user installs an agent from store
CREATE TABLE IF NOT EXISTS public.agent_store_installs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  item_id     UUID NOT NULL REFERENCES public.agent_store_items(id) ON DELETE CASCADE,
  agent_id    UUID REFERENCES public.genieos_agents(id) ON DELETE SET NULL,
  config      JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.agent_store_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own installs"
  ON public.agent_store_installs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- agent_store_ratings
CREATE TABLE IF NOT EXISTS public.agent_store_ratings (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL,
  item_id   UUID NOT NULL REFERENCES public.agent_store_items(id) ON DELETE CASCADE,
  rating    INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment   TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.agent_store_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are public"
  ON public.agent_store_ratings FOR SELECT USING (true);

CREATE POLICY "Users manage their own ratings"
  ON public.agent_store_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own ratings"
  ON public.agent_store_ratings FOR UPDATE
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════
-- PERSONAL AI BRAIN
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_brain_profile (
  user_id         UUID PRIMARY KEY,
  expertise_level TEXT DEFAULT 'intermediate',
  work_domain     TEXT DEFAULT '',
  learning_style  TEXT DEFAULT 'visual',
  primary_language TEXT DEFAULT 'fr',
  top_skills      TEXT[] DEFAULT '{}',
  interests       TEXT[] DEFAULT '{}',
  ai_tools_used   TEXT[] DEFAULT '{}',
  personality     JSONB DEFAULT '{}',
  summary         TEXT DEFAULT '',
  last_analyzed_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_brain_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their brain profile"
  ON public.user_brain_profile FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_goals
CREATE TABLE IF NOT EXISTS public.user_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  category    TEXT DEFAULT 'growth',
  status      TEXT DEFAULT 'active',
  priority    INTEGER DEFAULT 5,
  target_date DATE,
  progress    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their goals"
  ON public.user_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_activity: lightweight event log for brain analysis
CREATE TABLE IF NOT EXISTS public.user_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  event_type  TEXT NOT NULL,
  module      TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their activity"
  ON public.user_activity FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_store_items_category ON public.agent_store_items(category);
CREATE INDEX IF NOT EXISTS idx_agent_store_items_public ON public.agent_store_items(is_public, install_count DESC);
CREATE INDEX IF NOT EXISTS idx_agent_store_installs_user ON public.agent_store_installs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_store_ratings_item ON public.agent_store_ratings(item_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_user ON public.user_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON public.user_activity(user_id, created_at DESC);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_store_item_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.agent_store_items
  SET
    rating_avg   = (SELECT AVG(rating)::REAL FROM public.agent_store_ratings WHERE item_id = NEW.item_id),
    rating_count = (SELECT COUNT(*)         FROM public.agent_store_ratings WHERE item_id = NEW.item_id),
    updated_at   = now()
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER agent_store_rating_updated
  AFTER INSERT OR UPDATE ON public.agent_store_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_store_item_rating();
