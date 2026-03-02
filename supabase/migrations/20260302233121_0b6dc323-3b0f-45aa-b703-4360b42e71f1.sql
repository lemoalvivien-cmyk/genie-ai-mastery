
-- Skills catalog
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL CHECK (domain IN ('ia_pro', 'ia_perso', 'cyber', 'vibe_coding')),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  level text NOT NULL DEFAULT 'debutant',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read skills"
  ON public.skills FOR SELECT
  USING (true);

-- User skill scores
CREATE TABLE public.user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, skill_id)
);

ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own user_skills"
  ON public.user_skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own user_skills"
  ON public.user_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own user_skills"
  ON public.user_skills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Managers view org user_skills"
  ON public.user_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_skills.user_id
        AND p.org_id IS NOT NULL
        AND public.is_manager_of_org(auth.uid(), p.org_id)
    )
  );

CREATE POLICY "Admins manage all user_skills"
  ON public.user_skills FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed default skills
INSERT INTO public.skills (domain, name, slug, level) VALUES
  ('ia_pro',      'Prompting professionnel',    'ia-prompting-pro',      'debutant'),
  ('ia_pro',      'IA générative métier',        'ia-generative-metier',  'intermediaire'),
  ('ia_pro',      'Conformité IA',               'ia-conformite',         'intermediaire'),
  ('ia_perso',    'Utiliser l''IA au quotidien', 'ia-quotidien',          'debutant'),
  ('ia_perso',    'Protéger sa vie privée IA',   'ia-vie-privee',         'debutant'),
  ('cyber',       'Hygiène numérique',           'cyber-hygiene',         'debutant'),
  ('cyber',       'Gestion des mots de passe',   'cyber-passwords',       'debutant'),
  ('cyber',       'Détection hameçonnage',       'cyber-phishing',        'debutant'),
  ('cyber',       'Procédure incident',           'cyber-incident',        'intermediaire'),
  ('vibe_coding', 'Vibe Coding basics',           'vibe-coding-basics',    'debutant'),
  ('vibe_coding', 'Déploiement IA-first',         'vibe-coding-deploy',    'intermediaire');
