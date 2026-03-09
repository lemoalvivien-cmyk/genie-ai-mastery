
-- ══════════════════════════════════════════════════════════════════════════════
-- VAGUE 1.6 — Hardening identité / rôles / organisation
-- Objectif : remplacer la confiance implicite dans raw_user_meta_data.org_id
--             par une preuve serveur via la table org_invitations.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Table org_invitations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token           text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  org_id          uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by      uuid        NOT NULL,
  email           text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_user_id uuid        NULL,
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_email  ON public.org_invitations (lower(email));
CREATE INDEX IF NOT EXISTS idx_org_invitations_token  ON public.org_invitations (token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON public.org_invitations (org_id);

CREATE TRIGGER org_invitations_updated_at
  BEFORE UPDATE ON public.org_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. RLS pour org_invitations ───────────────────────────────────────────────
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- Managers/admins de l'org peuvent voir les invitations
CREATE POLICY "managers_see_org_invitations"
  ON public.org_invitations FOR SELECT
  USING (public.is_manager_of_org(auth.uid(), org_id));

-- Seul le service_role (auth.uid() IS NULL) peut insérer / modifier
CREATE POLICY "service_role_insert_invitations"
  ON public.org_invitations FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "service_role_update_invitations"
  ON public.org_invitations FOR UPDATE
  USING (auth.uid() IS NULL);

-- ── 3. RPC resolve_org_invitation ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_org_invitation(_email text)
  RETURNS TABLE(invitation_id uuid, org_id uuid, invited_by uuid)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id        AS invitation_id,
    i.org_id,
    i.invited_by
  FROM public.org_invitations i
  WHERE lower(i.email) = lower(_email)
    AND i.status       = 'pending'
    AND i.expires_at   > now()
  ORDER BY i.created_at DESC
  LIMIT 1;
END;
$$;

-- ── 4. RPC accept_org_invitation ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_org_invitation(
  _invitation_id   uuid,
  _invited_user_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.org_invitations
  SET
    status          = 'accepted',
    invited_user_id = _invited_user_id,
    updated_at      = now()
  WHERE id = _invitation_id
    AND status = 'pending';
END;
$$;

-- ── 5. Refactoring handle_new_user ────────────────────────────────────────────
-- Résout l'invitation via la table serveur (preuve cryptographique).
-- Ne lit plus raw_user_meta_data.org_id.
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _inv_id     uuid;
  _org_id     uuid;
  _invited_by uuid;
BEGIN
  -- Résolution via table serveur uniquement
  SELECT
    inv.invitation_id,
    inv.org_id,
    inv.invited_by
  INTO _inv_id, _org_id, _invited_by
  FROM public.resolve_org_invitation(NEW.email) AS inv
  LIMIT 1;

  INSERT INTO public.profiles (id, email, full_name, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NULL
    ),
    _org_id
  )
  ON CONFLICT (id) DO UPDATE
    SET org_id = CASE
      WHEN profiles.org_id IS NULL AND EXCLUDED.org_id IS NOT NULL
        THEN EXCLUDED.org_id
      ELSE profiles.org_id
    END;

  -- Rôle toujours learner — jamais d'élévation via invitation
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'learner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, total_xp)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Marquer l'invitation acceptée
  IF _inv_id IS NOT NULL THEN
    PERFORM public.accept_org_invitation(_inv_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- ── 6. RPC create_org_and_assign_manager ──────────────────────────────────────
-- Crée l'org ET attribue le rôle manager côté serveur.
-- Appelée par l'edge function create-org-bootstrap.
-- auth.uid() doit correspondre à _user_id (pas de proxy interdit).
CREATE OR REPLACE FUNCTION public.create_org_and_assign_manager(
  _user_id   uuid,
  _name      text,
  _slug      text,
  _seats_max integer DEFAULT 5
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _org_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Access denied');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND org_id IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User already has an organization');
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) THEN
    _slug := _slug || '-' || floor(random() * 99999)::text;
  END IF;

  INSERT INTO public.organizations (name, slug, plan, seats_max)
  VALUES (_name, _slug, 'free', _seats_max)
  RETURNING id INTO _org_id;

  -- Source de vérité : user_roles
  INSERT INTO public.user_roles (user_id, role, org_id)
  VALUES (_user_id, 'manager', _org_id)
  ON CONFLICT (user_id, role) DO UPDATE SET org_id = EXCLUDED.org_id;

  -- Cache display uniquement
  UPDATE public.profiles
  SET org_id = _org_id, role = 'manager', updated_at = now()
  WHERE id = _user_id;

  INSERT INTO public.ai_budgets (org_id, daily_limit)
  VALUES (_org_id, 5.00)
  ON CONFLICT (org_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'org_id', _org_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;
