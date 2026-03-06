import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry() {
  if (!DSN) return; // No-op in dev if DSN not set

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // Only sample 20% of transactions in prod to keep quota low
    tracesSampleRate: 0.2,
    // Don't send source maps to users console
    debug: false,
    // Ignore common non-actionable errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection",
      "Network request failed",
      "Load failed",
      /^AbortError/,
    ],
    beforeSend(event) {
      // Strip PII from breadcrumbs
      if (event.user) {
        event.user = { id: event.user.id }; // keep only anonymous ID
      }
      return event;
    },
  });
}

/** Capture an error with optional context tags */
export function captureError(
  err: unknown,
  context?: Record<string, string>,
) {
  if (!DSN) {
    // Silent in dev when no Sentry DSN configured
    return;
  }
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([k, v]) => scope.setTag(k, v));
    }
    Sentry.captureException(err);
  });
}
