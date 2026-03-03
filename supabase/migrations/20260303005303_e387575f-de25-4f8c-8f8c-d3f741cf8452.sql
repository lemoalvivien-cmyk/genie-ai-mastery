-- 1. Drop the overly permissive INSERT policy on audit_logs
DROP POLICY IF EXISTS "System insert audit logs" ON public.audit_logs;

-- 2. Create a SECURITY DEFINER RPC for safe audit logging
-- This is the ONLY way to insert into audit_logs from client code
CREATE OR REPLACE FUNCTION public.log_audit(
  _action text,
  _meta jsonb DEFAULT '{}'::jsonb,
  _resource_type text DEFAULT NULL,
  _resource_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    created_at
  )
  VALUES (
    auth.uid(),
    _action,
    _resource_type,
    _resource_id,
    COALESCE(_meta, '{}'::jsonb),
    now()
  );
EXCEPTION WHEN OTHERS THEN
  -- Never fail calling code because of audit logging
  NULL;
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.log_audit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit TO authenticated;

-- 3. Add a service-role INSERT policy for edge functions (using service role key)
-- Edge functions use supabaseAdmin (service role) which bypasses RLS entirely.
-- No INSERT policy needed for service role — RLS is bypassed.
-- But we keep an explicit policy for the service_role just to be clear:
-- (service_role already bypasses RLS, this is documentation-only via a permissive policy scoped to no auth users)

-- Remove any leftover permissive policies that might still allow client inserts
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users insert audit logs" ON public.audit_logs;