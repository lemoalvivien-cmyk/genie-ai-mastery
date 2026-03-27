/**
 * Centralized Feature Flags — Formetoialia
 *
 * Each flag controls visibility of routes, nav items, and components.
 * Flags can be overridden via VITE_FF_<FLAG_NAME>=true environment variables.
 *
 * Default: only production-ready features are enabled.
 */

export interface FeatureFlags {
  /** Admin dashboards (ControlRoom, OpsCenter, GrowthDashboard, etc.) */
  adminDashboard: boolean;
  /** Palantir / Brain / Swarm multi-agent mode */
  palantirMode: boolean;
  /** OpenClaw agentic runtime (manager supervision page) */
  openclawRuntime: boolean;
  /** Automated monthly report generation via cron */
  monthlyReportAuto: boolean;
  /** Public live stats on landing page */
  publicLiveStats: boolean;
  /** Voice input/output (STT + TTS) in chat */
  voiceMode: boolean;
}

function envFlag(name: string, fallback: boolean): boolean {
  const val = import.meta.env[`VITE_FF_${name.toUpperCase()}`];
  if (val === "true" || val === "1") return true;
  if (val === "false" || val === "0") return false;
  return fallback;
}

/**
 * The single source of truth for feature availability.
 * Change defaults here to enable/disable features globally.
 */
export const features: FeatureFlags = {
  adminDashboard:    envFlag("ADMIN_DASHBOARD", false),
  palantirMode:      envFlag("PALANTIR_MODE", false),
  openclawRuntime:   envFlag("OPENCLAW_RUNTIME", false),
  monthlyReportAuto: envFlag("MONTHLY_REPORT_AUTO", false),
  publicLiveStats:   envFlag("PUBLIC_LIVE_STATS", false),
  voiceMode:         envFlag("VOICE_MODE", true),
};

/** Check if a specific feature is enabled */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return features[flag];
}
