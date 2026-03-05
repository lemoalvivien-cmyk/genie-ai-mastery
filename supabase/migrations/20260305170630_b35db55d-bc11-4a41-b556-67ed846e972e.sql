
-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge sources: metadata about uploaded documents/URLs
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'document',
  file_path text,
  url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own knowledge sources"
  ON public.knowledge_sources FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Knowledge documents: full text content
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  file_path text,
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own knowledge documents"
  ON public.knowledge_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Knowledge chunks: text chunks with vector embeddings
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  chunk_index integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own knowledge chunks"
  ON public.knowledge_chunks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search index on chunks content
CREATE INDEX IF NOT EXISTS knowledge_chunks_content_fts
  ON public.knowledge_chunks USING gin(to_tsvector('french', content));

-- Full-text search function
CREATE OR REPLACE FUNCTION public.search_knowledge_fts(
  _user_id uuid,
  _query text,
  _limit integer DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  content text,
  title text,
  similarity float4
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    kd.title,
    ts_rank(to_tsvector('french', kc.content), plainto_tsquery('french', _query)) AS similarity
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE kc.user_id = _user_id
    AND to_tsvector('french', kc.content) @@ plainto_tsquery('french', _query)
  ORDER BY similarity DESC
  LIMIT _limit;
$$;

-- Vector similarity search function
CREATE OR REPLACE FUNCTION public.search_knowledge_semantic(
  _user_id uuid,
  _embedding vector(1536),
  _limit integer DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  content text,
  title text,
  similarity float4
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    kd.title,
    1 - (kc.embedding <=> _embedding) AS similarity
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE kc.user_id = _user_id
    AND kc.embedding IS NOT NULL
  ORDER BY kc.embedding <=> _embedding
  LIMIT _limit;
$$;
