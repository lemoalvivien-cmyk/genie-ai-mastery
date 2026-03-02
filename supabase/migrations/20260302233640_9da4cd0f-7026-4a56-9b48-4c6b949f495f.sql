
-- ─── sources ──────────────────────────────────────────────────────────────────
CREATE TABLE public.sources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  type         text NOT NULL DEFAULT 'rss',          -- rss | json | api
  url          text NOT NULL,
  domain       text NOT NULL DEFAULT 'ia_pro',       -- ia_pro | ia_perso | cyber | vibe_coding | general
  enabled      boolean NOT NULL DEFAULT true,
  refresh_freq text NOT NULL DEFAULT '6h',           -- e.g. 6h, 24h
  last_fetch_at timestamp with time zone,
  created_at   timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read sources"
  ON public.sources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage sources"
  ON public.sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─── source_items ─────────────────────────────────────────────────────────────
CREATE TABLE public.source_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  title        text NOT NULL,
  summary      text,
  raw          text,
  published_at timestamp with time zone,
  hash         text NOT NULL UNIQUE,   -- SHA-256 of (source_id + title + published_at) for deduplication
  created_at   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX source_items_source_id_idx ON public.source_items(source_id);
CREATE INDEX source_items_published_at_idx ON public.source_items(published_at DESC);

ALTER TABLE public.source_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read source_items"
  ON public.source_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage source_items"
  ON public.source_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow edge functions (service role) to insert items
CREATE POLICY "Service role insert source_items"
  ON public.source_items FOR INSERT WITH CHECK (true);

-- ─── briefs ───────────────────────────────────────────────────────────────────
CREATE TABLE public.briefs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain       text NOT NULL DEFAULT 'general',
  title        text NOT NULL,
  kid_summary  text NOT NULL,
  action_plan  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- string[]
  sources      jsonb NOT NULL DEFAULT '[]'::jsonb,  -- {title, url}[]
  source_count integer NOT NULL DEFAULT 0,
  confidence   integer NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  is_verified  boolean NOT NULL DEFAULT false,
  created_at   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX briefs_domain_idx ON public.briefs(domain);
CREATE INDEX briefs_created_at_idx ON public.briefs(created_at DESC);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read briefs"
  ON public.briefs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage briefs"
  ON public.briefs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow edge functions (service role) to insert briefs
CREATE POLICY "Service role insert briefs"
  ON public.briefs FOR INSERT WITH CHECK (true);

-- ─── Seed default sources ─────────────────────────────────────────────────────
INSERT INTO public.sources (name, type, url, domain, enabled, refresh_freq) VALUES
  ('CNIL Actualités',     'rss', 'https://www.cnil.fr/fr/rss.xml',                       'cyber',       true, '24h'),
  ('ANSSI Alertes',       'rss', 'https://www.cert.ssi.gouv.fr/feed/',                   'cyber',       true, '6h'),
  ('ZATAZ Cybersécurité', 'rss', 'https://www.zataz.com/feed/',                          'cyber',       true, '12h'),
  ('AI News (Hugging Face)','rss','https://huggingface.co/blog/feed.xml',                'ia_pro',      true, '12h'),
  ('MIT AI News',         'rss', 'https://news.mit.edu/rss/topic/artificial-intelligence','ia_pro',     true, '24h'),
  ('Dev.to Vibe Coding',  'rss', 'https://dev.to/feed/tag/ai',                           'vibe_coding', true, '12h');
