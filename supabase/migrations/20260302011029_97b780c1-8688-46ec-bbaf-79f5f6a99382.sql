
-- Create access_codes table (idempotent)
CREATE TABLE IF NOT EXISTS public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'business',
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  used_by JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read access codes" ON public.access_codes;
CREATE POLICY "Authenticated users can read access codes"
  ON public.access_codes FOR SELECT
  TO authenticated
  USING (true);
