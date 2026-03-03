
-- Drop the SECURITY DEFINER view (linter error) and use SECURITY INVOKER instead
DROP VIEW IF EXISTS public.org_member_profiles;

CREATE OR REPLACE VIEW public.org_member_profiles
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
    -- email intentionally excluded — managers use this view, not profiles directly
  FROM public.profiles;

GRANT SELECT ON public.org_member_profiles TO authenticated;
