-- Passe H — Index couvrants sur colonnes filtrées fréquemment

-- skill_mastery : tri par p_mastery pour NBA + SkillRadar
CREATE INDEX IF NOT EXISTS idx_skill_mastery_user_mastery
  ON public.skill_mastery (user_id, p_mastery ASC);

-- audit_logs : recherche par action + resource (webhooks idempotency + logs admin)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_resource
  ON public.audit_logs (action, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON public.audit_logs (user_id, created_at DESC);

-- daily_missions : filtre domain + level + is_active (get_guided_daily_mission)
CREATE INDEX IF NOT EXISTS idx_daily_missions_domain_level_active
  ON public.daily_missions (domain, level, is_active)
  WHERE is_active = true;

-- chat_messages : quota journalier (count par user + date)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created
  ON public.chat_messages (user_id, created_at DESC);

-- progress : dashboard stats (status par user)
CREATE INDEX IF NOT EXISTS idx_progress_user_status
  ON public.progress (user_id, status);

-- user_daily_log : missions récentes (NBA + Today)
CREATE INDEX IF NOT EXISTS idx_user_daily_log_user_date
  ON public.user_daily_log (user_id, completed_date DESC);

-- openclaw_jobs : statut par org (ManagerOpenClaw dashboard)
CREATE INDEX IF NOT EXISTS idx_openclaw_jobs_org_status
  ON public.openclaw_jobs (org_id, status, created_at DESC);