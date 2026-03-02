
-- daily_missions table
CREATE TABLE public.daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('action','quiz_flash','reflexe')),
  content JSONB NOT NULL,
  jarvis_intro TEXT NOT NULL,
  jarvis_bravo TEXT NOT NULL,
  xp INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_daily_missions_domain_level ON public.daily_missions(domain, level, is_active);

ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read daily missions"
  ON public.daily_missions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- user_streaks table
CREATE TABLE public.user_streaks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  last_completed_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_streaks_user_id ON public.user_streaks(user_id);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own streak"
  ON public.user_streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own streak"
  ON public.user_streaks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own streak"
  ON public.user_streaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- user_daily_log table
CREATE TABLE public.user_daily_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID REFERENCES public.daily_missions(id) NOT NULL,
  completed_date DATE NOT NULL,
  score INTEGER,
  xp_earned INTEGER,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, completed_date)
);

CREATE INDEX idx_user_daily_log_user_date ON public.user_daily_log(user_id, completed_date DESC);

ALTER TABLE public.user_daily_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own daily log"
  ON public.user_daily_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own daily log"
  ON public.user_daily_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger: initialize user_streaks on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, total_xp, last_completed_date)
  VALUES (NEW.id, 0, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_streak
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_streak();
