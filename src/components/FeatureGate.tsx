/**
 * FeatureGate — Centralized guard for feature-flagged UI.
 *
 * Usage:
 *   <FeatureGate flag="voiceMode">
 *     <VoiceButton />
 *   </FeatureGate>
 *
 *   <FeatureGate flag="adminDashboard" fallback={<FeatureUnavailable />}>
 *     <AdminPanel />
 *   </FeatureGate>
 */
import type { ReactNode } from "react";
import { isFeatureEnabled, type FeatureFlags } from "@/config/features";
import { Lock } from "lucide-react";

interface FeatureGateProps {
  flag: keyof FeatureFlags;
  children: ReactNode;
  /** What to render when the feature is off. Defaults to nothing. */
  fallback?: ReactNode;
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  if (isFeatureEnabled(flag)) return <>{children}</>;
  return <>{fallback}</>;
}

/**
 * FeatureRoute — Route-level guard that shows an "unavailable" screen
 * instead of silently hiding content.
 */
export function FeatureUnavailable({ name }: { name?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted border border-border">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">
          {name ? `${name} — ` : ""}Fonctionnalité indisponible
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Cette fonctionnalité est en cours de développement et n'est pas encore accessible sur votre plan.
        </p>
      </div>
    </div>
  );
}
