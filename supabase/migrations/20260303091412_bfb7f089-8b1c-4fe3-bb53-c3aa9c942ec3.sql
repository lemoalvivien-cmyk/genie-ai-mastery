
-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Rentabilité – partenaires, analytics, quotas, usage IA/voix
-- ══════════════════════════════════════════════════════════════════════════════

-- ── ENUMS ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.partner_account_status AS ENUM ('active', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.commission_status AS ENUM ('pending', 'paid', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.usage_kind AS ENUM ('ai_tokens_in', 'ai_tokens_out', 'tts_characters', 'tts_seconds', 'pdf_generated', 'labs_runs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.plan_type AS ENUM ('free', 'launch_59', 'pro', 'business', 'partner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── A) partner_accounts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_accounts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      text NOT NULL,
  contact_email             text NOT NULL,
  status                    public.partner_account_status NOT NULL DEFAULT 'active',
  stripe_connect_account_id text,
  revshare_percent          int NOT NULL DEFAULT 30,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_accounts_status  ON public.partner_accounts (status);
CREATE INDEX IF NOT EXISTS idx_partner_accounts_email   ON public.partner_accounts (contact_email);

ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner_accounts"
  ON public.partner_accounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ── B) partner_referrals ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  referral_code    text NOT NULL UNIQUE,
  landing_url_slug text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner_id    ON public.partner_referrals (partner_id);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_partner_referrals_code  ON public.partner_referrals (referral_code);

ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner_referrals"
  ON public.partner_referrals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ── C) partner_commissions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  org_id            uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  stripe_invoice_id text,
  amount_cents      int NOT NULL DEFAULT 0,
  status            public.commission_status NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_id ON public.partner_commissions (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_org_id     ON public.partner_commissions (org_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_status     ON public.partner_commissions (status);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_created_at ON public.partner_commissions (created_at DESC);

ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner_commissions"
  ON public.partner_commissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ── D) analytics_events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  org_id        uuid,
  session_id    text,
  event_name    text NOT NULL,
  properties    jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name  ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at  ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id     ON public.analytics_events (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_org_id      ON public.analytics_events (org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties  ON public.analytics_events USING GIN (properties);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users insert own events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (actor_user_id IS NULL OR actor_user_id = auth.uid())
  );

CREATE POLICY "Admins read all analytics_events"
  ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ── E) usage_counters ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id          uuid,
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  ai_tokens_in     int NOT NULL DEFAULT 0,
  ai_tokens_out    int NOT NULL DEFAULT 0,
  tts_characters   int NOT NULL DEFAULT 0,
  tts_seconds      int NOT NULL DEFAULT 0,
  pdf_generated    int NOT NULL DEFAULT 0,
  labs_runs        int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usage_counters_user_period UNIQUE (user_id, period_start),
  CONSTRAINT usage_counters_org_period  UNIQUE (org_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id     ON public.usage_counters (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_org_id      ON public.usage_counters (org_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_period      ON public.usage_counters (period_start, period_end);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own usage_counters"
  ON public.usage_counters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers view org usage_counters"
  ON public.usage_counters FOR SELECT
  USING (
    org_id IS NOT NULL
    AND public.is_manager_of_org(auth.uid(), org_id)
  );

CREATE POLICY "Admins manage usage_counters"
  ON public.usage_counters FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ── F) plan_limits ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan              public.plan_type PRIMARY KEY,
  ai_tokens_out_max int NOT NULL DEFAULT 50000,
  tts_seconds_max   int NOT NULL DEFAULT 0,
  pdf_max           int NOT NULL DEFAULT 3,
  labs_max          int NOT NULL DEFAULT 1,
  seats_max         int NOT NULL DEFAULT 1,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read plan_limits"
  ON public.plan_limits FOR SELECT
  USING (true);

CREATE POLICY "Admins manage plan_limits"
  ON public.plan_limits FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ── Seed default plan limits ──────────────────────────────────────────────────
INSERT INTO public.plan_limits (plan, ai_tokens_out_max, tts_seconds_max, pdf_max, labs_max, seats_max) VALUES
  ('free',       50000,    0,     3,   1,   1),
  ('launch_59',  200000,   300,  20,  10,   1),
  ('pro',        500000,  1800,  50,  50,   1),
  ('business',  2000000,  7200, 200, 200,  50),
  ('partner',   5000000, 18000, 500, 500, 200)
ON CONFLICT (plan) DO UPDATE SET
  ai_tokens_out_max = EXCLUDED.ai_tokens_out_max,
  tts_seconds_max   = EXCLUDED.tts_seconds_max,
  pdf_max           = EXCLUDED.pdf_max,
  labs_max          = EXCLUDED.labs_max,
  seats_max         = EXCLUDED.seats_max,
  updated_at        = now();

-- ══════════════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ── increment_usage ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_usage(
  _user_id    uuid,
  _org_id     uuid,
  _kind       public.usage_kind,
  _amount     int DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period_start date := date_trunc('month', CURRENT_DATE)::date;
  _period_end   date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
BEGIN
  -- Upsert user counter
  IF _user_id IS NOT NULL THEN
    INSERT INTO public.usage_counters (user_id, org_id, period_start, period_end)
    VALUES (_user_id, _org_id, _period_start, _period_end)
    ON CONFLICT (user_id, period_start) DO NOTHING;

    EXECUTE format(
      'UPDATE public.usage_counters SET %I = %I + $1, updated_at = now() WHERE user_id = $2 AND period_start = $3',
      _kind, _kind
    ) USING _amount, _user_id, _period_start;
  END IF;

  -- Upsert org counter
  IF _org_id IS NOT NULL THEN
    INSERT INTO public.usage_counters (org_id, period_start, period_end)
    VALUES (_org_id, _period_start, _period_end)
    ON CONFLICT (org_id, period_start) DO NOTHING;

    EXECUTE format(
      'UPDATE public.usage_counters SET %I = %I + $1, updated_at = now() WHERE org_id = $2 AND user_id IS NULL AND period_start = $3',
      _kind, _kind
    ) USING _amount, _org_id, _period_start;
  END IF;

  RETURN jsonb_build_object('ok', true, 'kind', _kind, 'amount', _amount);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ── can_execute ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_execute(
  _user_id uuid,
  _org_id  uuid,
  _kind    public.usage_kind
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period_start  date := date_trunc('month', CURRENT_DATE)::date;
  _user_plan     text := 'free';
  _limit_col     text;
  _limit_val     int  := 0;
  _current_usage int  := 0;
  _counter       record;
  _limits        record;
BEGIN
  -- Resolve plan from org or profile
  IF _org_id IS NOT NULL THEN
    SELECT COALESCE(o.plan::text, 'free') INTO _user_plan
    FROM public.organizations o WHERE o.id = _org_id;
  ELSE
    SELECT COALESCE(p.role::text, 'free') INTO _user_plan
    FROM public.profiles p WHERE p.id = _user_id;
    -- Map role to plan (simplified)
    _user_plan := 'free';
  END IF;

  -- Map kind to limit column
  _limit_col := CASE _kind
    WHEN 'ai_tokens_out'  THEN 'ai_tokens_out_max'
    WHEN 'ai_tokens_in'   THEN 'ai_tokens_out_max'
    WHEN 'tts_seconds'    THEN 'tts_seconds_max'
    WHEN 'tts_characters' THEN 'tts_seconds_max'
    WHEN 'pdf_generated'  THEN 'pdf_max'
    WHEN 'labs_runs'      THEN 'labs_max'
    ELSE 'ai_tokens_out_max'
  END;

  -- Get limit
  EXECUTE format('SELECT %I FROM public.plan_limits WHERE plan = $1', _limit_col)
  INTO _limit_val USING _user_plan::public.plan_type;

  IF _limit_val IS NULL THEN _limit_val := 0; END IF;

  -- Get current usage
  SELECT * INTO _counter
  FROM public.usage_counters
  WHERE user_id = _user_id AND period_start = _period_start
  LIMIT 1;

  IF _counter IS NOT NULL THEN
    EXECUTE format('SELECT ($1).%I', _kind) INTO _current_usage USING _counter;
  END IF;

  IF _current_usage IS NULL THEN _current_usage := 0; END IF;

  RETURN jsonb_build_object(
    'allowed',        _current_usage < _limit_val OR _limit_val = -1,
    'current_usage',  _current_usage,
    'limit',          _limit_val,
    'remaining',      GREATEST(_limit_val - _current_usage, 0),
    'plan',           _user_plan,
    'kind',           _kind
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('allowed', true, 'error', SQLERRM);
END;
$$;

-- ── resolve_referral ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_referral(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref record;
BEGIN
  SELECT r.id, r.partner_id, r.landing_url_slug, a.name, a.status, a.revshare_percent
  INTO _ref
  FROM public.partner_referrals r
  JOIN public.partner_accounts  a ON a.id = r.partner_id
  WHERE r.referral_code = _code
    AND a.status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found',            true,
    'referral_id',      _ref.id,
    'partner_id',       _ref.partner_id,
    'partner_name',     _ref.name,
    'landing_url_slug', _ref.landing_url_slug,
    'revshare_percent', _ref.revshare_percent
  );
END;
$$;

-- ── updated_at trigger on partner_accounts & usage_counters ──────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_partner_accounts_updated_at
  BEFORE UPDATE ON public.partner_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
