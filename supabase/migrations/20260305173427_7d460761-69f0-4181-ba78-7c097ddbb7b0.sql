
-- Data Engine tables for GENIE OS Business Intelligence

-- data_sources: user-configured sources (websites, RSS, APIs)
CREATE TABLE IF NOT EXISTS public.data_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'website',
  url           TEXT,
  config        JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  fetch_count   INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'pending',
  error_msg     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own data sources"
  ON public.data_sources FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- data_documents: fetched and normalized documents
CREATE TABLE IF NOT EXISTS public.data_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  source_id     UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  title         TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  url           TEXT,
  domain        TEXT,
  category      TEXT DEFAULT 'general',
  summary       TEXT,
  tags          TEXT[] DEFAULT '{}',
  metadata      JSONB DEFAULT '{}',
  relevance_score REAL DEFAULT 0,
  is_processed  BOOLEAN DEFAULT false,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.data_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own data documents"
  ON public.data_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- data_updates: tracks delta changes and alerts
CREATE TABLE IF NOT EXISTS public.data_updates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  document_id   UUID REFERENCES public.data_documents(id) ON DELETE CASCADE,
  update_type   TEXT NOT NULL DEFAULT 'new',
  title         TEXT NOT NULL DEFAULT '',
  summary       TEXT,
  importance    TEXT DEFAULT 'medium',
  is_read       BOOLEAN DEFAULT false,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.data_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own data updates"
  ON public.data_updates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_data_sources_user ON public.data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_data_documents_user ON public.data_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_data_documents_category ON public.data_documents(category);
CREATE INDEX IF NOT EXISTS idx_data_documents_created ON public.data_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_updates_user ON public.data_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_data_updates_read ON public.data_updates(user_id, is_read);

CREATE TRIGGER data_sources_updated_at
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER data_documents_updated_at
  BEFORE UPDATE ON public.data_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
