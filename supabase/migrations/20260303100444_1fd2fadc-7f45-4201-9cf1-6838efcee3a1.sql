
-- ─── sources_watchlist: curated RSS/release-notes feed sources ───────────────
CREATE TABLE IF NOT EXISTS public.sources_watchlist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  url          text NOT NULL UNIQUE,
  type         text NOT NULL DEFAULT 'rss',
  domain       text NOT NULL DEFAULT 'general',
  tags         text[] DEFAULT '{}',
  persona_tags text[] DEFAULT '{}',
  enabled      boolean NOT NULL DEFAULT true,
  last_fetch_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sources_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sources_watchlist"
  ON public.sources_watchlist FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read sources_watchlist"
  ON public.sources_watchlist FOR SELECT
  USING (true);
