
-- ============================================================
-- FIX: org_member_profiles VIEW — security_invoker explicite
-- Garantit que les RLS policies de `profiles` s'appliquent
-- pleinement quelle que soit l'identité de l'appelant.
-- ============================================================

DROP VIEW IF EXISTS public.org_member_profiles;

CREATE VIEW public.org_member_profiles
  WITH (security_invoker = true)
AS
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
FROM public.profiles;

GRANT SELECT ON public.org_member_profiles TO authenticated;
GRANT SELECT ON public.org_member_profiles TO service_role;

COMMENT ON VIEW public.org_member_profiles IS
  'Security-invoker view on profiles: email excluded, RLS from profiles table fully enforced.';
