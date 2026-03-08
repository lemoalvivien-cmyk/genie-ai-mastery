/**
 * Feature flags — driven by environment variables.
 *
 * .env.development  → VITE_GENIEOS_ENABLED=true
 * .env.production   → VITE_GENIEOS_ENABLED=false  (default)
 */
export const FEATURES = {
  genieOS:  import.meta.env.VITE_GENIEOS_ENABLED === "true",
  openClaw: import.meta.env.VITE_OPENCLAW_ENABLED === "true",
} as const;
