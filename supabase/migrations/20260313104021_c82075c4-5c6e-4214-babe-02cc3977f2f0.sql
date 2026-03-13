-- Complete Enterprise RAG schema (single idempotent migration)

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('org-documents', 'org-documents', false, 20971520,
  ARRAY['application/pdf','text/plain','text/markdown','application/json','text/csv'])
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Org members can upload documents') THEN
    EXECUTE 'CREATE POLICY "Org members can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''org-documents'' AND auth.uid() IS NOT NULL)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Org members can read org documents') THEN
    EXECUTE 'CREATE POLICY "Org members can read org documents" ON storage.objects FOR SELECT USING (bucket_id = ''org-documents'' AND auth.uid() IS NOT NULL)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Org members can delete own documents') THEN
    EXECUTE 'CREATE POLICY "Org members can delete own documents" ON storage.objects FOR DELETE USING (bucket_id = ''org-documents'' AND auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- Org knowledge documents
CREATE TABLE IF NOT EXISTS public.org_knowledge_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  file_path   TEXT,
  source_url  TEXT,
  source_type TEXT NOT NULL DEFAULT 'upload',
  content     TEXT,
  status      TEXT NOT NULL DEFAULT 'processing',
  category    TEXT,
  is_auto     BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_knowledge_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='org_knowledge_documents' AND policyname='Org members view org docs') THEN
    CREATE POLICY "Org members view org docs" ON public.org_knowledge_documents FOR SELECT
      USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='org_knowledge_documents' AND policyname='Org members insert org docs') THEN
    CREATE POLICY "Org members insert org docs" ON public.org_knowledge_documents FOR INSERT
      WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()) AND uploaded_by = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='org_knowledge_documents' AND policyname='Uploader or admin delete org docs') THEN
    CREATE POLICY "Uploader or admin delete org docs" ON public.org_knowledge_documents FOR DELETE
      USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='org_knowledge_documents' AND policyname='Service update org docs') THEN
    CREATE POLICY "Service update org docs" ON public.org_knowledge_documents FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Org knowledge chunks
CREATE TABLE IF NOT EXISTS public.org_knowledge_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.org_knowledge_documents(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  chunk_index INT NOT NULL,
  embedding   vector(1536),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_knowledge_chunks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='org_knowledge_chunks' AND policyname='Org members view chunks') THEN
    CREATE POLICY "Org members view chunks" ON public.org_knowledge_chunks FOR SELECT
      USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='org_knowledge_chunks' AND policyname='Service insert chunks') THEN
    CREATE POLICY "Service insert chunks" ON public.org_knowledge_chunks FOR INSERT WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_org_chunks_embedding ON public.org_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_org_chunks_org_id ON public.org_knowledge_chunks (org_id);

-- Org system prompts
CREATE TABLE IF NOT EXISTS public.org_system_prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL DEFAULT '',
  variables   JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  updated_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_system_prompts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='org_system_prompts' AND policyname='Org members view system prompt') THEN
    CREATE POLICY "Org members view system prompt" ON public.org_system_prompts FOR SELECT
      USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='org_system_prompts' AND policyname='Managers upsert system prompt') THEN
    CREATE POLICY "Managers upsert system prompt" ON public.org_system_prompts FOR ALL
      USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
        AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')))
      WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
        AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')));
  END IF;
END $$;

-- WorldWatch entries
CREATE TABLE IF NOT EXISTS public.worldwatch_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL,
  entry_id     TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  summary      TEXT,
  severity     TEXT,
  cvss_score   NUMERIC(4,1),
  published_at TIMESTAMPTZ,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  url          TEXT,
  tags         TEXT[] DEFAULT '{}',
  is_ingested  BOOLEAN NOT NULL DEFAULT false,
  metadata     JSONB NOT NULL DEFAULT '{}'
);
ALTER TABLE public.worldwatch_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='worldwatch_entries' AND policyname='Auth users read worldwatch') THEN
    CREATE POLICY "Auth users read worldwatch" ON public.worldwatch_entries FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='worldwatch_entries' AND policyname='Service manage worldwatch') THEN
    CREATE POLICY "Service manage worldwatch" ON public.worldwatch_entries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Semantic search function
CREATE OR REPLACE FUNCTION public.search_org_knowledge_semantic(
  _org_id UUID, _embedding vector, _limit INT DEFAULT 5, _category TEXT DEFAULT NULL
)
RETURNS TABLE(chunk_id UUID, document_id UUID, content TEXT, title TEXT, category TEXT, similarity REAL, source_type TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT oc.id, oc.document_id, oc.content, od.title, od.category,
    (1 - (oc.embedding <=> _embedding))::REAL AS similarity, od.source_type
  FROM public.org_knowledge_chunks oc
  JOIN public.org_knowledge_documents od ON od.id = oc.document_id
  WHERE oc.org_id = _org_id AND oc.embedding IS NOT NULL AND od.status = 'ready'
    AND (_category IS NULL OR od.category = _category)
  ORDER BY oc.embedding <=> _embedding LIMIT _limit;
$$;

-- FTS search function
CREATE OR REPLACE FUNCTION public.search_org_knowledge_fts(
  _org_id UUID, _query TEXT, _limit INT DEFAULT 5
)
RETURNS TABLE(chunk_id UUID, document_id UUID, content TEXT, title TEXT, category TEXT, similarity REAL, source_type TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT oc.id, oc.document_id, oc.content, od.title, od.category,
    ts_rank(to_tsvector('french', oc.content), plainto_tsquery('french', _query))::REAL AS similarity,
    od.source_type
  FROM public.org_knowledge_chunks oc
  JOIN public.org_knowledge_documents od ON od.id = oc.document_id
  WHERE oc.org_id = _org_id AND od.status = 'ready'
    AND to_tsvector('french', oc.content) @@ plainto_tsquery('french', _query)
  ORDER BY ts_rank(to_tsvector('french', oc.content), plainto_tsquery('french', _query)) DESC
  LIMIT _limit;
$$;

-- Triggers
CREATE OR REPLACE TRIGGER trg_org_knowledge_docs_updated_at BEFORE UPDATE ON public.org_knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_org_system_prompts_updated_at BEFORE UPDATE ON public.org_system_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();