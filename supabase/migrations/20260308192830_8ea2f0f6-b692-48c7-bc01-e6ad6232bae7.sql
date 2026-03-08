
-- ============================================================
-- CORRECTION : Restaurer les tables dépréciées qui ont du code actif
-- Erreurs TypeScript révèlent des usages non détectés par grep
-- ============================================================

-- ─── Tables avec code actif → Restaurer ──────────────────────
-- revenue_leads : RevenueEngine.tsx, RevenueAnalytics.tsx, CommandCenter.tsx, CopilotPanel.tsx
ALTER TABLE IF EXISTS public._deprecated_revenue_leads      RENAME TO revenue_leads;

-- phishing_results : PhishingLab.tsx, PhishingRiskWidget.tsx
ALTER TABLE IF EXISTS public._deprecated_phishing_results   RENAME TO phishing_results;

-- system_logs : useEventBus.ts, LogsViewer.tsx
ALTER TABLE IF EXISTS public._deprecated_system_logs        RENAME TO system_logs;

-- org_weekly_reports : useWeeklyReport.ts
ALTER TABLE IF EXISTS public._deprecated_org_weekly_reports RENAME TO org_weekly_reports;

-- agent_store_installs : AIStore.tsx (install + query)
ALTER TABLE IF EXISTS public._deprecated_agent_store_installs RENAME TO agent_store_installs;

-- ─── Tables confirmées orphelines → Garder dépréciées ────────
-- _deprecated_marketplace_items    : 0 lignes, aucune référence code
-- _deprecated_marketplace_ratings  : 0 lignes, aucune référence code
-- _deprecated_marketplace_usage    : 0 lignes, aucune référence code
-- _deprecated_agent_store_ratings  : 0 lignes, aucune référence code
-- _deprecated_revenue_reports      : 0 lignes, aucune référence code
-- _deprecated_activity_log         : 0 lignes, aucune référence code
-- _deprecated_job_results          : 0 lignes, aucune référence code
-- _deprecated_genieos_workflows    : 0 lignes, aucune référence code
