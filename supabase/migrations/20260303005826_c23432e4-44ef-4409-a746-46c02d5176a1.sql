-- ─── Table: csp_reports ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.csp_reports (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- CSP standard fields
  document_uri        text,
  violated_directive  text,
  effective_directive text,
  blocked_uri         text,
  original_policy     text,
  disposition         text,   -- "enforce" | "report"
  status_code         integer,
  source_file         text,
  line_number         integer,
  column_number       integer,
  -- context
  user_agent  text,
  ip_address  inet
);

-- RLS
ALTER TABLE public.csp_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read csp_reports"
  ON public.csp_reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role can always insert (edge function uses service role)
-- No INSERT policy for authenticated users — edge function only

-- Index for quick admin queries
CREATE INDEX IF NOT EXISTS csp_reports_created_at_idx ON public.csp_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS csp_reports_directive_idx  ON public.csp_reports (violated_directive);
CREATE INDEX IF NOT EXISTS csp_reports_blocked_uri_idx ON public.csp_reports (blocked_uri);