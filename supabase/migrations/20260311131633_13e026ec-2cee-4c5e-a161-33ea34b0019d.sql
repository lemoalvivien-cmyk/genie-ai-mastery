-- Fix 1: credit_balance privilege escalation
-- Remove user-facing INSERT and UPDATE policies; all writes must go through service role only
DROP POLICY IF EXISTS "System inserts credit balance" ON public.credit_balance;
DROP POLICY IF EXISTS "Users update own credit balance" ON public.credit_balance;

-- Ensure a safe service-role-only policy exists for writes
CREATE POLICY "service_role_insert_credit_balance"
  ON public.credit_balance
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role_update_credit_balance"
  ON public.credit_balance
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix 2: org_invitations anonymous write bypass
-- Replace auth.uid() IS NULL (matches anon) with auth.role() = 'service_role'
DROP POLICY IF EXISTS "service_role_insert_invitations" ON public.org_invitations;
DROP POLICY IF EXISTS "service_role_update_invitations" ON public.org_invitations;

CREATE POLICY "service_role_insert_invitations"
  ON public.org_invitations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role_update_invitations"
  ON public.org_invitations
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);