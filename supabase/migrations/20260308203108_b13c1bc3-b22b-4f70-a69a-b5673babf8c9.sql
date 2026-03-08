CREATE TABLE IF NOT EXISTS public.proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  score INTEGER,
  metadata JSONB DEFAULT '{}',
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own proofs" ON public.proofs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own proofs" ON public.proofs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_proofs_user_id ON public.proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_proofs_type ON public.proofs(type);