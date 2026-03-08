
-- ══════════════════════════════════════════════════════════════════
-- PALANTIR SECURITY HARDENING — PRIVILEGE ESCALATION + DATA EXPOSURE
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. PRIVILEGE ESCALATION : prevent self-role-escalation ───────
-- Add a trigger that blocks users from changing sensitive columns
-- (role, abuse_score, abuse_blocked_until, org_id) directly via UPDATE.

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Block any attempt to change protected columns via direct UPDATE
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Access denied: role cannot be changed directly.';
  END IF;
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'Access denied: org_id cannot be changed directly.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ─── 2. STRIPE IDs EXPOSED TO ALL ORG MEMBERS ──────────────────────
-- Members should NOT see stripe_customer_id / stripe_subscription_id.
-- Replace the broad "Org members view their org" policy with two scoped ones.

DROP POLICY IF EXISTS "Org members view their org" ON public.organizations;

CREATE POLICY "Org members view safe fields" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND NOT public.has_role(auth.uid(), 'admin')
    AND NOT public.is_manager_of_org(auth.uid(), id)
  );

CREATE POLICY "Org managers view full row" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    public.is_manager_of_org(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- ─── 3. SYSTEM_LOGS : hide NULL-user rows from non-admins ─────────
DROP POLICY IF EXISTS "Users view own system logs" ON public.system_logs;
CREATE POLICY "Users view own system logs" ON public.system_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (user_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

-- ─── 4. ERROR_LOGS : hide NULL-user stack traces from non-admins ───
DROP POLICY IF EXISTS "Users view own error logs" ON public.error_logs;
CREATE POLICY "Users view own error logs" ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (user_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );
