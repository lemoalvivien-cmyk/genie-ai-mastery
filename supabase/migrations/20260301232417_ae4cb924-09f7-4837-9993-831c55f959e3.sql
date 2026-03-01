
-- ============================================================
-- GENIE IA - SCHEMA COMPLET
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================
CREATE TYPE public.persona_type AS ENUM ('jeune', 'parent', 'salarie', 'dirigeant', 'senior', 'independant');
CREATE TYPE public.preferred_mode_type AS ENUM ('enfant', 'normal', 'expert');
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'learner');
CREATE TYPE public.org_plan AS ENUM ('free', 'perso', 'famille', 'business', 'compliance', 'partner');
CREATE TYPE public.module_domain AS ENUM ('ia_pro', 'ia_perso', 'cyber');
CREATE TYPE public.persona_variant_type AS ENUM ('jeune', 'parent', 'salarie', 'dirigeant', 'senior', 'independant', 'universal');
CREATE TYPE public.module_level AS ENUM ('debutant', 'intermediaire', 'avance');
CREATE TYPE public.progress_status AS ENUM ('not_started', 'in_progress', 'completed', 'failed');
CREATE TYPE public.chat_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE public.flag_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.flag_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE public.partner_type AS ENUM ('comptable', 'courtier', 'msp', 'cci', 'federation', 'autre');
CREATE TYPE public.partner_status AS ENUM ('pending', 'active', 'suspended');

-- ============================================================
-- 2. UTILITY FUNCTION: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. partner_orgs (no dependencies)
-- ============================================================
CREATE TABLE public.partner_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.partner_type NOT NULL,
  contact_email TEXT NOT NULL,
  revenue_share_pct DECIMAL(5,2) DEFAULT 30.00,
  stripe_connect_id TEXT NULL,
  clients_count INTEGER DEFAULT 0,
  status public.partner_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_orgs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. organizations (depends on partner_orgs)
-- ============================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan public.org_plan DEFAULT 'free',
  seats_max INTEGER DEFAULT 1,
  seats_used INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  partner_org_id UUID REFERENCES public.partner_orgs(id) NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_plan ON public.organizations(plan);
CREATE INDEX idx_organizations_stripe_customer ON public.organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ============================================================
-- 5. profiles (depends on organizations, auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  persona public.persona_type,
  level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  preferred_mode public.preferred_mode_type DEFAULT 'normal',
  org_id UUID REFERENCES public.organizations(id) NULL,
  role public.app_role DEFAULT 'learner',
  streak_count INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  voice_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_org_id ON public.profiles(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_profiles_persona ON public.profiles(persona) WHERE persona IS NOT NULL;
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- updated_at trigger
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. user_roles (SECURITY: separate roles table for RLS)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  org_id UUID REFERENCES public.organizations(id) NULL,
  UNIQUE(user_id, role, org_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- ============================================================
-- 7. SECURITY DEFINER FUNCTIONS for RLS (avoids recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_manager_of_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('manager', 'admin')
      AND (org_id = _org_id OR public.has_role(_user_id, 'admin'))
  )
$$;

-- ============================================================
-- 8. RLS POLICIES for profiles
-- ============================================================
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Managers view org profiles"
  ON public.profiles FOR SELECT
  USING (
    org_id IS NOT NULL AND
    public.is_manager_of_org(auth.uid(), org_id)
  );

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 9. RLS POLICIES for organizations
-- ============================================================
CREATE POLICY "Org members view their org"
  ON public.organizations FOR SELECT
  USING (
    id = public.get_user_org_id(auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Managers update their org"
  ON public.organizations FOR UPDATE
  USING (public.is_manager_of_org(auth.uid(), id));

CREATE POLICY "Admins insert orgs"
  ON public.organizations FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 10. RLS POLICIES for partner_orgs
-- ============================================================
CREATE POLICY "Admins manage partner_orgs"
  ON public.partner_orgs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 11. modules
-- ============================================================
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain public.module_domain NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  content_json JSONB NOT NULL DEFAULT '{"sections": []}',
  persona_variant public.persona_variant_type DEFAULT 'universal',
  level public.module_level DEFAULT 'debutant',
  duration_minutes INTEGER DEFAULT 10,
  icon_name TEXT,
  order_index INTEGER DEFAULT 0,
  sources JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2) DEFAULT 0.85,
  version INTEGER DEFAULT 1,
  is_gold BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT true,
  deliverables JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_modules_domain ON public.modules(domain);
CREATE INDEX idx_modules_persona_variant ON public.modules(persona_variant);
CREATE INDEX idx_modules_level ON public.modules(level);
CREATE INDEX idx_modules_is_published ON public.modules(is_published);
CREATE INDEX idx_modules_slug ON public.modules(slug);

CREATE TRIGGER set_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Authenticated users read published modules"
  ON public.modules FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Admins manage modules"
  ON public.modules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 12. quizzes
-- ============================================================
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  questions JSONB NOT NULL DEFAULT '[]',
  passing_score INTEGER DEFAULT 70,
  time_limit_seconds INTEGER NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_quizzes_module_id ON public.quizzes(module_id);

CREATE POLICY "Authenticated users read quizzes"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage quizzes"
  ON public.quizzes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 13. progress
-- ============================================================
CREATE TABLE public.progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  status public.progress_status DEFAULT 'not_started',
  score INTEGER NULL,
  quiz_answers JSONB NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 1,
  completed_at TIMESTAMPTZ NULL,
  attestation_url TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_progress_user_id ON public.progress(user_id);
CREATE INDEX idx_progress_module_id ON public.progress(module_id);
CREATE INDEX idx_progress_status ON public.progress(status);
CREATE INDEX idx_progress_completed_at ON public.progress(completed_at) WHERE completed_at IS NOT NULL;

CREATE TRIGGER set_progress_updated_at
  BEFORE UPDATE ON public.progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Users view own progress"
  ON public.progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers view org progress"
  ON public.progress FOR SELECT
  USING (
    public.is_manager_of_org(
      auth.uid(),
      public.get_user_org_id(user_id)
    )
  );

CREATE POLICY "Admins view all progress"
  ON public.progress FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users manage own progress"
  ON public.progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own progress"
  ON public.progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 14. attestations
-- ============================================================
CREATE TABLE public.attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) NULL,
  modules_completed JSONB NOT NULL DEFAULT '[]',
  score_average DECIMAL(5,2),
  generated_at TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 year'),
  pdf_url TEXT,
  signature_hash TEXT,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_attestations_user_id ON public.attestations(user_id);
CREATE INDEX idx_attestations_org_id ON public.attestations(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_attestations_generated_at ON public.attestations(generated_at);

CREATE POLICY "Users view own attestations"
  ON public.attestations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers view org attestations"
  ON public.attestations FOR SELECT
  USING (
    org_id IS NOT NULL AND
    public.is_manager_of_org(auth.uid(), org_id)
  );

CREATE POLICY "Admins view all attestations"
  ON public.attestations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System insert attestations"
  ON public.attestations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 15. campaigns
-- ============================================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  module_ids UUID[] NOT NULL DEFAULT '{}',
  target_group TEXT NULL,
  deadline TIMESTAMPTZ NULL,
  status public.campaign_status DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_campaigns_org_id ON public.campaigns(org_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);

CREATE POLICY "Learners in org view campaigns"
  ON public.campaigns FOR SELECT
  USING (
    org_id = public.get_user_org_id(auth.uid())
  );

CREATE POLICY "Managers CRUD campaigns in org"
  ON public.campaigns FOR ALL
  USING (public.is_manager_of_org(auth.uid(), org_id));

-- ============================================================
-- 16. chat_messages
-- ============================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  role public.chat_role NOT NULL,
  content TEXT NOT NULL,
  agent_used TEXT NULL,
  model_used TEXT NULL,
  tokens_used INTEGER NULL,
  cost_eur DECIMAL(8,6) NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

CREATE POLICY "Users view own messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all messages"
  ON public.chat_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 17. audit_logs
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID NULL,
  details JSONB DEFAULT '{}',
  ip_address INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

CREATE POLICY "Admins view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 18. flags
-- ============================================================
CREATE TABLE public.flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NULL,
  module_id UUID REFERENCES public.modules(id) NULL,
  chat_message_id UUID REFERENCES public.chat_messages(id) NULL,
  reason TEXT NOT NULL,
  severity public.flag_severity DEFAULT 'medium',
  status public.flag_status DEFAULT 'open',
  resolved_by UUID REFERENCES public.profiles(id) NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_flags_user_id ON public.flags(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_flags_status ON public.flags(status);

CREATE POLICY "Authenticated users create flags"
  ON public.flags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all flags"
  ON public.flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 19. waitlist (update existing table with source column)
-- ============================================================
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS source TEXT NULL;

-- Update RLS: remove old policy and add proper ones
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view waitlist"
  ON public.waitlist FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 20. TRIGGER: handle_new_user — auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'learner')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 21. TRIGGER: update_seats_count — keep seats_used in sync
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_seats_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.org_id IS NOT NULL THEN
    UPDATE public.organizations
    SET seats_used = seats_used + 1
    WHERE id = NEW.org_id;
  ELSIF TG_OP = 'DELETE' AND OLD.org_id IS NOT NULL THEN
    UPDATE public.organizations
    SET seats_used = GREATEST(seats_used - 1, 0)
    WHERE id = OLD.org_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.org_id IS DISTINCT FROM NEW.org_id THEN
      IF OLD.org_id IS NOT NULL THEN
        UPDATE public.organizations
        SET seats_used = GREATEST(seats_used - 1, 0)
        WHERE id = OLD.org_id;
      END IF;
      IF NEW.org_id IS NOT NULL THEN
        UPDATE public.organizations
        SET seats_used = seats_used + 1
        WHERE id = NEW.org_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_profile_org_change
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_seats_count();

-- ============================================================
-- 22. RPC FUNCTION: calculate_org_stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_org_stats(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check caller is manager/admin of this org
  IF NOT public.is_manager_of_org(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_learners', COUNT(DISTINCT p.id),
    'completed_modules', COUNT(DISTINCT pr.id) FILTER (WHERE pr.status = 'completed'),
    'in_progress_modules', COUNT(DISTINCT pr.id) FILTER (WHERE pr.status = 'in_progress'),
    'avg_score', ROUND(AVG(pr.score) FILTER (WHERE pr.score IS NOT NULL)::NUMERIC, 2),
    'completion_rate', CASE
      WHEN COUNT(DISTINCT pr.id) > 0
      THEN ROUND(
        (COUNT(DISTINCT pr.id) FILTER (WHERE pr.status = 'completed')::NUMERIC /
         COUNT(DISTINCT pr.id)::NUMERIC) * 100, 2
      )
      ELSE 0
    END,
    'total_attestations', COUNT(DISTINCT a.id),
    'active_campaigns', COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active')
  )
  INTO result
  FROM public.profiles p
  LEFT JOIN public.progress pr ON pr.user_id = p.id
  LEFT JOIN public.attestations a ON a.user_id = p.id AND a.org_id = _org_id
  LEFT JOIN public.campaigns c ON c.org_id = _org_id
  WHERE p.org_id = _org_id;

  RETURN COALESCE(result, '{}'::JSONB);
END;
$$;

-- ============================================================
-- 23. RPC FUNCTION: check_rate_limit
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id UUID, _window_seconds INTEGER DEFAULT 60, _max_calls INTEGER DEFAULT 60)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  call_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO call_count
  FROM public.chat_messages
  WHERE user_id = _user_id
    AND created_at > (now() - (_window_seconds || ' seconds')::INTERVAL)
    AND role = 'user';

  RETURN call_count < _max_calls;
END;
$$;

-- ============================================================
-- 24. Enable Realtime on progress, chat_messages, campaigns
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
