-- ══════════════════════════════════════════════════════════════════
-- VAGUE 1 — BUG P0 : prevent_profile_privilege_escalation
-- Le trigger bloquait les mises à jour légitimes via service_role
-- (ex: assignation org_id lors du B2B onboarding via edge function).
-- Fix : service_role (auth.uid() IS NULL) est toujours autorisé.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Service role bypass : edge functions appellent avec auth.uid() IS NULL
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bloquer les tentatives client de changer le rôle
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Access denied: role cannot be changed directly.';
  END IF;

  -- Bloquer les changements d'org_id depuis le client
  -- EXCEPTION : NULL → valeur autorisée (premier rattachement B2B)
  IF NEW.org_id IS DISTINCT FROM OLD.org_id AND OLD.org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Access denied: org_id cannot be changed directly.';
  END IF;

  RETURN NEW;
END;
$$;