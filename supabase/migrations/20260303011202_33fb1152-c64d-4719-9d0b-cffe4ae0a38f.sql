
-- ─── edge_errors: capture exceptions from edge functions ─────────────────────
CREATE TABLE IF NOT EXISTS public.edge_errors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   text,
  fn           text NOT NULL,                   -- function name (e.g. "chat-completion")
  user_id      uuid,
  org_id       uuid,
  message      text NOT NULL,
  stack_hash   text,                            -- SHA-256 of stack first 500 chars (dedup)
  status_code  int,
  latency_ms   int,
  meta         jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edge_errors_fn_created ON public.edge_errors (fn, created_at DESC);
CREATE INDEX IF NOT EXISTS edge_errors_created ON public.edge_errors (created_at DESC);

ALTER TABLE public.edge_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage edge_errors"
  ON public.edge_errors FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─── edge_logs: structured request logs from edge functions ──────────────────
CREATE TABLE IF NOT EXISTS public.edge_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   text,
  fn           text NOT NULL,
  user_id      uuid,
  org_id       uuid,
  status_code  int,
  latency_ms   int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edge_logs_fn_created ON public.edge_logs (fn, created_at DESC);
CREATE INDEX IF NOT EXISTS edge_logs_created ON public.edge_logs (created_at DESC);

ALTER TABLE public.edge_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage edge_logs"
  ON public.edge_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));
