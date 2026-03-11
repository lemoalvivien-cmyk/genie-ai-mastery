
-- ============================================================
-- FIX 1: Stripe fields — restrict to managers/admins only
-- ============================================================

-- Drop overly-permissive member policy
DROP POLICY IF EXISTS "Org members view safe fields" ON public.organizations;

-- New: members see only non-sensitive columns (via a row-filter policy)
-- RLS cannot restrict columns, but we create a separate secure view for members
CREATE POLICY "Org members view safe fields"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      -- Managers and admins can see full row
      public.has_role(auth.uid(), 'manager'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Non-manager members: only non-sensitive org fields via view
CREATE OR REPLACE VIEW public.org_public_info
  WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  slug,
  logo_url,
  plan,
  seats_max,
  seats_used,
  created_at
  -- stripe_customer_id, stripe_subscription_id, partner_org_id, settings: excluded
FROM public.organizations;

GRANT SELECT ON public.org_public_info TO authenticated;

COMMENT ON VIEW public.org_public_info IS
  'Non-sensitive org fields only — Stripe IDs and settings excluded. Use this for member-facing queries.';

-- ============================================================
-- FIX 2: quizzes table — change policy from public to authenticated
-- ============================================================
DO $$
BEGIN
  -- Drop the overly-permissive public policy if it exists
  DROP POLICY IF EXISTS "Authenticated users read quizzes" ON public.quizzes;
EXCEPTION WHEN undefined_table THEN NULL;
END$$;

DO $$
BEGIN
  CREATE POLICY "Authenticated users read quizzes"
    ON public.quizzes
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END$$;

-- ============================================================
-- FIX 3: app_settings — change policy from public to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Authenticated read app_settings" ON public.app_settings;

CREATE POLICY "Authenticated read app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);
