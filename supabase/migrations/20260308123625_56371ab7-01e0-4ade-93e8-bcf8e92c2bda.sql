
-- ═══════════════════════════════════════════════════════════════
-- OPENCLAW PHASE 1 — Schema complet avec RLS stricte
-- ═══════════════════════════════════════════════════════════════

-- ── 1. openclaw_runtimes ────────────────────────────────────────
CREATE TABLE public.openclaw_runtimes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  environment           text NOT NULL CHECK (environment IN ('dev','staging','prod')),
  base_url              text NOT NULL,
  tool_profile          text NOT NULL CHECK (tool_profile IN ('tutor_readonly','browser_lab','scheduled_coach')),
  status                text NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy','degraded','offline','unknown')),
  is_default            boolean NOT NULL DEFAULT false,
  last_healthcheck_at   timestamptz,
  created_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_openclaw_runtimes_org_id     ON public.openclaw_runtimes (org_id);
CREATE INDEX idx_openclaw_runtimes_status     ON public.openclaw_runtimes (status);
CREATE INDEX idx_openclaw_runtimes_env        ON public.openclaw_runtimes (environment);

-- ── 2. openclaw_policies ───────────────────────────────────────
CREATE TABLE public.openclaw_policies (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_name               text NOT NULL,
  allowed_tools             text[] NOT NULL DEFAULT '{}',
  require_approval_for      text[] NOT NULL DEFAULT '{}',
  network_mode              text NOT NULL DEFAULT 'restricted' CHECK (network_mode IN ('restricted','allowlisted','open')),
  max_runtime_seconds       integer NOT NULL DEFAULT 120 CHECK (max_runtime_seconds BETWEEN 10 AND 1800),
  max_artifacts             integer NOT NULL DEFAULT 20 CHECK (max_artifacts BETWEEN 1 AND 100),
  active                    boolean NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_openclaw_policies_org_active ON public.openclaw_policies (org_id) WHERE active = true;
CREATE INDEX idx_openclaw_policies_org_id ON public.openclaw_policies (org_id);

-- ── 3. openclaw_jobs ───────────────────────────────────────────
CREATE TABLE public.openclaw_jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  runtime_id            uuid NOT NULL REFERENCES public.openclaw_runtimes(id) ON DELETE RESTRICT,
  job_type              text NOT NULL CHECK (job_type IN ('tutor_search','browser_lab','scheduled_coach','custom')),
  title                 text NOT NULL,
  prompt                text NOT NULL,
  payload               jsonb NOT NULL DEFAULT '{}',
  status                text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  risk_level            text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  approval_required     boolean NOT NULL DEFAULT false,
  approved_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at           timestamptz,
  started_at            timestamptz,
  completed_at          timestamptz,
  error_message         text,
  result_summary        text,
  result_json           jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_openclaw_jobs_org_id      ON public.openclaw_jobs (org_id);
CREATE INDEX idx_openclaw_jobs_user_id     ON public.openclaw_jobs (user_id);
CREATE INDEX idx_openclaw_jobs_runtime_id  ON public.openclaw_jobs (runtime_id);
CREATE INDEX idx_openclaw_jobs_status      ON public.openclaw_jobs (status);
CREATE INDEX idx_openclaw_jobs_created_at  ON public.openclaw_jobs (created_at DESC);

-- ── 4. openclaw_job_events ────────────────────────────────────
CREATE TABLE public.openclaw_job_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES public.openclaw_jobs(id) ON DELETE CASCADE,
  event_type    text NOT NULL,
  message       text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_openclaw_job_events_job_id     ON public.openclaw_job_events (job_id);
CREATE INDEX idx_openclaw_job_events_created_at ON public.openclaw_job_events (created_at DESC);

-- ── 5. openclaw_artifacts ────────────────────────────────────
CREATE TABLE public.openclaw_artifacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES public.openclaw_jobs(id) ON DELETE CASCADE,
  artifact_type   text NOT NULL CHECK (artifact_type IN ('text','json','screenshot','pdf','html','log')),
  storage_path    text,
  mime_type       text,
  size_bytes      bigint,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_openclaw_artifacts_job_id ON public.openclaw_artifacts (job_id);

-- ── Triggers updated_at ─────────────────────────────────────
CREATE TRIGGER trg_openclaw_runtimes_updated_at
  BEFORE UPDATE ON public.openclaw_runtimes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_openclaw_policies_updated_at
  BEFORE UPDATE ON public.openclaw_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_openclaw_jobs_updated_at
  BEFORE UPDATE ON public.openclaw_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Audit trail: changement de statut ─────────────────────────
CREATE OR REPLACE FUNCTION public.openclaw_job_audit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.openclaw_job_events (job_id, event_type, message, metadata)
    VALUES (
      NEW.id,
      'status_change',
      format('Status: %s → %s', OLD.status, NEW.status),
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_openclaw_job_audit
  AFTER UPDATE ON public.openclaw_jobs
  FOR EACH ROW EXECUTE FUNCTION public.openclaw_job_audit_status_change();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.openclaw_runtimes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "openclaw_runtimes_select_org_member"
  ON public.openclaw_runtimes FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND org_id IS NOT NULL)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "openclaw_runtimes_insert_manager_admin"
  ON public.openclaw_runtimes FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.is_manager_of_org(auth.uid(), org_id)
  );

CREATE POLICY "openclaw_runtimes_update_manager_admin"
  ON public.openclaw_runtimes FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_manager_of_org(auth.uid(), org_id)
  );

CREATE POLICY "openclaw_runtimes_delete_admin"
  ON public.openclaw_runtimes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.openclaw_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "openclaw_policies_select_org_member"
  ON public.openclaw_policies FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND org_id IS NOT NULL)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "openclaw_policies_write_manager_admin"
  ON public.openclaw_policies FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_manager_of_org(auth.uid(), org_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.is_manager_of_org(auth.uid(), org_id)
  );

ALTER TABLE public.openclaw_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "openclaw_jobs_select_own_or_manager"
  ON public.openclaw_jobs FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_manager_of_org(auth.uid(), org_id)
  );

CREATE POLICY "openclaw_jobs_insert_own"
  ON public.openclaw_jobs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND org_id IS NOT NULL)
  );

CREATE POLICY "openclaw_jobs_update_own_or_manager"
  ON public.openclaw_jobs FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_manager_of_org(auth.uid(), org_id)
  );

CREATE POLICY "openclaw_jobs_delete_admin"
  ON public.openclaw_jobs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.openclaw_job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "openclaw_job_events_select"
  ON public.openclaw_job_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.openclaw_jobs j
      WHERE j.id = job_id
        AND (
          j.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.is_manager_of_org(auth.uid(), j.org_id)
        )
    )
  );

CREATE POLICY "openclaw_job_events_insert_own_or_admin"
  ON public.openclaw_job_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.openclaw_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

ALTER TABLE public.openclaw_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "openclaw_artifacts_select"
  ON public.openclaw_artifacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.openclaw_jobs j
      WHERE j.id = job_id
        AND (
          j.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.is_manager_of_org(auth.uid(), j.org_id)
        )
    )
  );

CREATE POLICY "openclaw_artifacts_insert_own_or_admin"
  ON public.openclaw_artifacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.openclaw_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- ── Helper: get active policy for org ───────────────────────
CREATE OR REPLACE FUNCTION public.get_openclaw_policy(_org_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(p)
  FROM public.openclaw_policies p
  WHERE p.org_id = _org_id AND p.active = true
  LIMIT 1;
$$;

-- ── Helper: validate job creation ───────────────────────────
CREATE OR REPLACE FUNCTION public.validate_openclaw_job(
  _user_id uuid,
  _org_id uuid,
  _runtime_id uuid,
  _job_type text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _runtime record;
  _policy jsonb;
BEGIN
  -- Caller must be owner or admin
  IF _user_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'access_denied');
  END IF;

  -- Runtime must belong to same org
  SELECT * INTO _runtime FROM public.openclaw_runtimes
  WHERE id = _runtime_id AND org_id = _org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'runtime_not_found_or_wrong_org');
  END IF;

  IF _runtime.status = 'offline' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'runtime_offline');
  END IF;

  -- Check job_type matches tool_profile
  IF _job_type = 'browser_lab' AND _runtime.tool_profile != 'browser_lab' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'tool_profile_mismatch');
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'runtime_status', _runtime.status,
    'tool_profile', _runtime.tool_profile,
    'environment', _runtime.environment
  );
END;
$$;
