
-- ══════════════════════════════════════════════════════════════════════════════
-- Table: org_invoices — Factures Stripe par org, RLS multi-tenant strict
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.org_invoices (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id            UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT        UNIQUE,
  stripe_customer_id TEXT,
  amount_cents      INTEGER     NOT NULL DEFAULT 0,
  currency          TEXT        NOT NULL DEFAULT 'eur',
  status            TEXT        NOT NULL DEFAULT 'draft',
  description       TEXT,
  period_start      TIMESTAMPTZ,
  period_end        TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  invoice_pdf_url   TEXT,
  hosted_invoice_url TEXT,
  seats             INTEGER     DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invoices_org_id    ON public.org_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invoices_status    ON public.org_invoices(status);
CREATE INDEX IF NOT EXISTS idx_org_invoices_paid_at   ON public.org_invoices(paid_at);
CREATE INDEX IF NOT EXISTS idx_org_invoices_stripe_id ON public.org_invoices(stripe_invoice_id);

ALTER TABLE public.org_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_and_admins_view_org_invoices"
  ON public.org_invoices FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'manager'::public.app_role)
      AND org_id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

CREATE POLICY "service_role_insert_invoices"
  ON public.org_invoices FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "service_role_update_invoices"
  ON public.org_invoices FOR UPDATE
  USING (auth.uid() IS NULL);

CREATE OR REPLACE TRIGGER set_org_invoices_updated_at
  BEFORE UPDATE ON public.org_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- RPC: get_org_billing_metrics — MRR, ARR, revenue cumulé
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_org_billing_metrics(_org_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _caller_org UUID;
  _result     JSONB;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager'::public.app_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF public.has_role(auth.uid(), 'manager'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    SELECT org_id INTO _caller_org FROM public.profiles WHERE id = auth.uid();
    IF _caller_org IS DISTINCT FROM _org_id THEN RAISE EXCEPTION 'Access denied: wrong org'; END IF;
  END IF;

  SELECT jsonb_build_object(
    'mrr_cents',           COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid' AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', now())), 0),
    'arr_cents',           COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid' AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', now())), 0) * 12,
    'total_revenue_cents', COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0),
    'invoices_this_month', COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now())),
    'invoices_paid_total', COUNT(*) FILTER (WHERE status = 'paid'),
    'invoices_open',       COUNT(*) FILTER (WHERE status IN ('open', 'draft')),
    'last_invoice_at',     MAX(paid_at),
    'mrr_30d_cents',       COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid' AND paid_at > now() - INTERVAL '30 days'), 0)
  )
  INTO _result
  FROM public.org_invoices WHERE org_id = _org_id;

  SELECT _result || jsonb_build_object(
    'org_name',  o.name, 'org_plan', o.plan,
    'seats_max', o.seats_max, 'org_created', o.created_at
  )
  INTO _result FROM public.organizations o WHERE o.id = _org_id;

  RETURN COALESCE(_result, '{}'::JSONB);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- RPC: get_org_invoices_list — Liste paginée des factures
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_org_invoices_list(_org_id UUID, _limit INTEGER DEFAULT 20, _offset INTEGER DEFAULT 0)
RETURNS TABLE(
  id UUID, stripe_invoice_id TEXT, amount_cents INTEGER, currency TEXT,
  status TEXT, description TEXT, period_start TIMESTAMPTZ, period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ, invoice_pdf_url TEXT, hosted_invoice_url TEXT,
  seats INTEGER, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _caller_org UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager'::public.app_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF public.has_role(auth.uid(), 'manager'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    SELECT p.org_id INTO _caller_org FROM public.profiles p WHERE p.id = auth.uid();
    IF _caller_org IS DISTINCT FROM _org_id THEN RAISE EXCEPTION 'Access denied: wrong org'; END IF;
  END IF;
  RETURN QUERY
    SELECT i.id, i.stripe_invoice_id, i.amount_cents, i.currency, i.status,
           i.description, i.period_start, i.period_end, i.paid_at,
           i.invoice_pdf_url, i.hosted_invoice_url, i.seats, i.created_at
    FROM public.org_invoices i
    WHERE i.org_id = _org_id
    ORDER BY i.created_at DESC LIMIT _limit OFFSET _offset;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- RPC: get_billing_timeseries — Revenus journaliers
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_billing_timeseries(_org_id UUID, _days INTEGER DEFAULT 90)
RETURNS TABLE(day DATE, revenue_cents BIGINT, invoice_count BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _caller_org UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager'::public.app_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF public.has_role(auth.uid(), 'manager'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    SELECT p.org_id INTO _caller_org FROM public.profiles p WHERE p.id = auth.uid();
    IF _caller_org IS DISTINCT FROM _org_id THEN RAISE EXCEPTION 'Access denied: wrong org'; END IF;
  END IF;
  RETURN QUERY
    SELECT DATE(paid_at) AS day, SUM(amount_cents)::BIGINT, COUNT(*)::BIGINT
    FROM public.org_invoices
    WHERE org_id = _org_id AND status = 'paid' AND paid_at > now() - (_days || ' days')::INTERVAL
    GROUP BY DATE(paid_at) ORDER BY day ASC;
END;
$$;

-- Realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'org_invoices') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.org_invoices';
  END IF;
END$$;
