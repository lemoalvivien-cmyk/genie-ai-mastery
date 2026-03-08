
-- PASSE H — Index couvrants (sans CONCURRENTLY pour migration)
CREATE INDEX IF NOT EXISTS idx_skill_mastery_user_score
ON public.skill_mastery(user_id, p_mastery DESC);

CREATE INDEX IF NOT EXISTS idx_progress_user_updated
ON public.progress(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_fn_calls_daily_lookup
ON public.function_calls_daily(user_id, fn, date);
