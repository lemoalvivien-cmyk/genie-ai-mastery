-- Drop the overly permissive policy that lets any authenticated user read access codes
DROP POLICY IF EXISTS "Authenticated users can read access codes" ON public.access_codes;
-- No replacement policy needed: all code redemption goes through the redeem-code edge function (service_role)