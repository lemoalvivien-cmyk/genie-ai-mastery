
-- ============================================================
-- MIGRATION : Dépréciation des tables dormantes
-- Date       : 2026-03-08
-- Stratégie  : RENAME uniquement (pas DROP) — fenêtre 30 jours
-- Vérification : aucun code front/edge ne référence ces tables
-- ============================================================

-- ─── Marketplace fantôme (remplacé par agent_store_items) ───
ALTER TABLE IF EXISTS public.marketplace_items    RENAME TO _deprecated_marketplace_items;
ALTER TABLE IF EXISTS public.marketplace_ratings  RENAME TO _deprecated_marketplace_ratings;
ALTER TABLE IF EXISTS public.marketplace_usage    RENAME TO _deprecated_marketplace_usage;

-- ─── Agent store transactions (0 lignes, aucune référence UI) ─
ALTER TABLE IF EXISTS public.agent_store_installs RENAME TO _deprecated_agent_store_installs;
ALTER TABLE IF EXISTS public.agent_store_ratings  RENAME TO _deprecated_agent_store_ratings;

-- ─── Revenue sub-tables orphelines (0 lignes) ────────────────
-- revenue_opportunities conservé (RevenueEngine.tsx l.66)
ALTER TABLE IF EXISTS public.revenue_reports      RENAME TO _deprecated_revenue_reports;
ALTER TABLE IF EXISTS public.revenue_leads        RENAME TO _deprecated_revenue_leads;

-- ─── Logs système dupliqués (canal officiel = audit_logs) ────
ALTER TABLE IF EXISTS public.system_logs          RENAME TO _deprecated_system_logs;
ALTER TABLE IF EXISTS public.activity_log         RENAME TO _deprecated_activity_log;

-- ─── Features org non déployées (0 lignes) ───────────────────
ALTER TABLE IF EXISTS public.org_weekly_reports   RENAME TO _deprecated_org_weekly_reports;

-- ─── Phishing lab vide (0 lignes) ────────────────────────────
ALTER TABLE IF EXISTS public.phishing_results     RENAME TO _deprecated_phishing_results;

-- ─── Job system legacy (job_queue conservé, job_results = 0 lignes) ──
ALTER TABLE IF EXISTS public.job_results          RENAME TO _deprecated_job_results;

-- ─── GenieOS workflows (0 lignes, aucune référence code) ──────
ALTER TABLE IF EXISTS public.genieos_workflows    RENAME TO _deprecated_genieos_workflows;

-- ─── Commentaires de traçabilité (date + raison + expiry) ────
COMMENT ON TABLE public._deprecated_marketplace_items    IS 'DEPRECATED 2026-03-08 — Remplacé par agent_store_items. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_marketplace_ratings  IS 'DEPRECATED 2026-03-08 — Remplacé par agent_store_ratings. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_marketplace_usage    IS 'DEPRECATED 2026-03-08 — 0 lignes, aucune utilisation. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_agent_store_installs IS 'DEPRECATED 2026-03-08 — 0 lignes, aucune référence code. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_agent_store_ratings  IS 'DEPRECATED 2026-03-08 — 0 lignes, aucune référence code. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_revenue_reports      IS 'DEPRECATED 2026-03-08 — 0 lignes, aucune référence code. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_revenue_leads        IS 'DEPRECATED 2026-03-08 — 0 lignes, aucune référence code. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_system_logs          IS 'DEPRECATED 2026-03-08 — Remplacé par audit_logs/edge_errors. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_activity_log         IS 'DEPRECATED 2026-03-08 — 0 lignes, aucune référence code. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_org_weekly_reports   IS 'DEPRECATED 2026-03-08 — Feature non déployée. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_phishing_results     IS 'DEPRECATED 2026-03-08 — Lab vide. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_job_results          IS 'DEPRECATED 2026-03-08 — 0 lignes, aucune référence code. DROP après 2026-04-08.';
COMMENT ON TABLE public._deprecated_genieos_workflows    IS 'DEPRECATED 2026-03-08 — 0 lignes, aucune référence code. DROP après 2026-04-08.';
