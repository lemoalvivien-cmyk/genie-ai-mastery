-- ══════════════════════════════════════════════════════════════════
-- VAGUE 1.5 — Propagation de l'invitation B2B dans handle_new_user
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _invited_org_id uuid;
  _invited_by     uuid;
  _org_exists     boolean := false;
BEGIN
  -- ── Lire les métadonnées d'invitation (écrites par inviteUserByEmail) ──
  BEGIN
    _invited_org_id := (NEW.raw_user_meta_data->>'org_id')::uuid;
    _invited_by     := (NEW.raw_user_meta_data->>'invited_by')::uuid;
  EXCEPTION WHEN OTHERS THEN
    _invited_org_id := NULL;
    _invited_by     := NULL;
  END;

  -- ── Valider que l'org existe vraiment (anti-forgery) ─────────────────
  IF _invited_org_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.organizations WHERE id = _invited_org_id
    ) INTO _org_exists;
  END IF;

  IF NOT _org_exists THEN
    _invited_org_id := NULL;
    _invited_by     := NULL;
  END IF;

  -- ── Créer le profil avec org_id propagé si invitation valide ─────────
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    org_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NULL
    ),
    _invited_org_id
  )
  ON CONFLICT (id) DO UPDATE
    SET
      org_id = CASE
        WHEN profiles.org_id IS NULL AND EXCLUDED.org_id IS NOT NULL
        THEN EXCLUDED.org_id
        ELSE profiles.org_id
      END;

  -- ── Assigner le rôle (toujours 'learner' — jamais d'élévation via invite) ─
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'learner')
  ON CONFLICT DO NOTHING;

  -- ── Créer le streak initial ──────────────────────────────────────────
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, total_xp)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;