-- Add content and metadata columns to artifacts table for storing text-based artifacts
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Index for faster querying by type
CREATE INDEX IF NOT EXISTS idx_artifacts_user_type ON public.artifacts(user_id, type, created_at DESC);