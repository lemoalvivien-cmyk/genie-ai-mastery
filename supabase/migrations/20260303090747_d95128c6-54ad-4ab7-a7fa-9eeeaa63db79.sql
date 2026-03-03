
-- ── Performance indexes for 30k users ────────────────────────────────────────
-- modules: filter by domain, level, persona_variant, published
CREATE INDEX IF NOT EXISTS idx_modules_domain ON public.modules (domain);
CREATE INDEX IF NOT EXISTS idx_modules_level ON public.modules (level);
CREATE INDEX IF NOT EXISTS idx_modules_published ON public.modules (is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_modules_persona ON public.modules (persona_variant);
CREATE INDEX IF NOT EXISTS idx_modules_order ON public.modules (order_index);

-- progress: most-queried by user_id + status
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.progress (user_id);
CREATE INDEX IF NOT EXISTS idx_progress_module_id ON public.progress (module_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_status ON public.progress (user_id, status);
CREATE INDEX IF NOT EXISTS idx_progress_completed_at ON public.progress (completed_at DESC) WHERE status = 'completed';

-- chat_messages: session + user + time-based pagination
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_rate_limit ON public.chat_messages (user_id, created_at DESC) WHERE role = 'user';

-- ai_usage_daily: budget checks by user+date and org+date
CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_user_date ON public.ai_usage_daily (user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_org_date ON public.ai_usage_daily (org_id, date);

-- profiles: org membership lookups
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles (org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- user_roles: role lookups (has_role function)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles (user_id, role);

-- attestations
CREATE INDEX IF NOT EXISTS idx_attestations_user_id ON public.attestations (user_id);
CREATE INDEX IF NOT EXISTS idx_attestations_org_id ON public.attestations (org_id) WHERE org_id IS NOT NULL;

-- audit_logs: admin views by time desc
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

-- edge_errors / edge_logs: admin monitoring
CREATE INDEX IF NOT EXISTS idx_edge_errors_fn ON public.edge_errors (fn, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_logs_fn ON public.edge_logs (fn, created_at DESC);

-- csp_reports: admin monitoring
CREATE INDEX IF NOT EXISTS idx_csp_reports_created_at ON public.csp_reports (created_at DESC);

-- ip_rate_limits: check by ip+endpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_rate_limits_ip_endpoint ON public.ip_rate_limits (ip_hash, endpoint);

-- abuse_flags: user lookup
CREATE INDEX IF NOT EXISTS idx_abuse_flags_user_id ON public.abuse_flags (user_id) WHERE user_id IS NOT NULL;

-- user_streaks
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_streaks_user_id ON public.user_streaks (user_id);

-- phishing_results
CREATE INDEX IF NOT EXISTS idx_phishing_results_user_id ON public.phishing_results (user_id);

-- daily_missions: active filter
CREATE INDEX IF NOT EXISTS idx_daily_missions_active ON public.daily_missions (is_active, domain) WHERE is_active = true;

-- user_daily_log
CREATE INDEX IF NOT EXISTS idx_user_daily_log_user_date ON public.user_daily_log (user_id, completed_date DESC);

-- artifacts
CREATE INDEX IF NOT EXISTS idx_artifacts_user_id ON public.artifacts (user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_org_id ON public.artifacts (org_id) WHERE org_id IS NOT NULL;
