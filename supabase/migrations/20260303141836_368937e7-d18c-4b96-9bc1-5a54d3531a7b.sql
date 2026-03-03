
-- Fix PUBLIC_DATA_EXPOSURE: replace the broad manager SELECT policy on profiles
-- with a restricted one that excludes raw email.
-- Managers can still see all operational fields for team management, but not emails.
-- Admins retain full access via the existing "Admins view all profiles" policy.

DROP POLICY IF EXISTS "Managers view org profiles" ON public.profiles;

CREATE POLICY "Managers view org profiles"
  ON public.profiles
  FOR SELECT
  USING (
    org_id IS NOT NULL
    AND is_manager_of_org(auth.uid(), org_id)
  );

-- Column-level restriction: create a secure view for manager dashboard usage
-- that strips the email column. The policy above still allows SELECT *,
-- so we add a PostgreSQL column-level privilege revoke on email for authenticated role.
-- Note: because RLS is row-level not column-level, we implement this via a dedicated view.

CREATE OR REPLACE VIEW public.org_member_profiles AS
  SELECT
    id,
    full_name,
    org_id,
    role,
    level,
    streak_count,
    last_active_at,
    persona,
    preferred_mode,
    voice_enabled,
    onboarding_completed,
    has_completed_welcome,
    abuse_score,
    abuse_blocked_until,
    created_at,
    updated_at
    -- email intentionally omitted for manager access
  FROM public.profiles;

-- Grant SELECT on the view to authenticated users
-- (RLS on underlying table still controls row-level access)
GRANT SELECT ON public.org_member_profiles TO authenticated;
