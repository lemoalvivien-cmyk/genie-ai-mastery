
-- PASSE H — INDEX COUVRANTS pour requêtes critiques
CREATE INDEX IF NOT EXISTS idx_revenue_leads_user_created ON public.revenue_leads (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_leads_user_status ON public.revenue_leads (user_id, status);
CREATE INDEX IF NOT EXISTS idx_revenue_opportunities_user_created ON public.revenue_opportunities (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_started ON public.agent_executions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_status ON public.agent_executions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_memory_timeline_user_created ON public.memory_timeline (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_timeline_user_event_type ON public.memory_timeline (user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_data_updates_user_unread ON public.data_updates (user_id, is_read, created_at DESC);
-- PASSE E — Index pour idempotence webhook Stripe (audit_logs)
CREATE INDEX IF NOT EXISTS idx_audit_logs_stripe_idempotency ON public.audit_logs (action, resource_id) WHERE action = 'stripe_event_processed';
-- PASSE F — Rate-limit check rapide sur chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON public.chat_messages (user_id, created_at DESC);
