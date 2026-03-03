/**
 * Shared k6 helpers for GENIE IA load tests.
 */

/**
 * Returns standard headers for edge function calls.
 */
export function sharedHeaders() {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${__ENV.BEARER_TOKEN}`,
  };
}

/**
 * Returns a random sleep duration between min and max (seconds).
 * Adds realistic jitter to avoid thundering herd.
 */
export function randomJitter(min = 1, max = 3) {
  return min + Math.random() * (max - min);
}

/**
 * Tries to parse the response body as JSON.
 * Returns true if parsing succeeds, false otherwise.
 */
export function assertBody(res) {
  try {
    JSON.parse(res.body);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a number as ms with 0 decimal places.
 */
export function fmtMs(val) {
  return val != null ? `${Math.round(val)}ms` : "n/a";
}

/**
 * Formats a rate as percentage with 2 decimal places.
 */
export function fmtRate(val) {
  return val != null ? `${(val * 100).toFixed(2)}%` : "n/a";
}

/**
 * Extracts p95 and p99 from a k6 metric value map.
 */
export function extractPercentiles(metric) {
  if (!metric?.values) return { p95: null, p99: null, avg: null, max: null };
  return {
    avg: metric.values["avg"],
    p95: metric.values["p(95)"],
    p99: metric.values["p(99)"],
    max: metric.values["max"],
  };
}

/**
 * Builds a human-readable pass/fail badge string.
 */
export function badge(passed) {
  return passed ? "✅ PASS" : "❌ FAIL";
}
