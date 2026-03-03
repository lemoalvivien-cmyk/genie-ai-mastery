/**
 * Shared handleSummary for all GENIE IA k6 scenarios.
 * Produces:
 *   - tests/load/results/<scenario>-<timestamp>.json  (full k6 data)
 *   - console output: human-readable table with p95, p99, error rate
 *
 * Import this in each scenario file:
 *   import { makeSummaryHandler } from "../summary.js";
 *   export const handleSummary = makeSummaryHandler("chat");
 */
import { fmtMs, fmtRate, badge, extractPercentiles } from "./lib/helpers.js";

export function makeSummaryHandler(scenario) {
  return function handleSummary(data) {
    const ts       = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const jsonFile = `tests/load/results/${scenario}-${ts}.json`;
    const mode     = (__ENV.MODE === "smoke") ? "SMOKE" : "FULL";

    // ── Collect metrics by scenario ─────────────────────────────────────────
    const httpDur    = extractPercentiles(data.metrics["http_req_duration"]);
    const chatDur    = extractPercentiles(data.metrics["chat_duration_ms"]);
    const pdfDur     = extractPercentiles(data.metrics["pdf_duration_ms"]);
    const dbDur      = extractPercentiles(data.metrics["db_read_duration_ms"]);
    const customDur  = chatDur.p95 != null ? chatDur
                     : pdfDur.p95  != null ? pdfDur
                     : dbDur.p95   != null ? dbDur
                     : httpDur;

    const errorRate  = data.metrics["chat_error_rate"]?.values?.rate
                    ?? data.metrics["pdf_error_rate"]?.values?.rate
                    ?? data.metrics["db_read_error_rate"]?.values?.rate
                    ?? data.metrics["http_req_failed"]?.values?.rate
                    ?? 0;

    const totalReqs  = data.metrics["http_reqs"]?.values?.count ?? 0;
    const vusMax     = data.metrics["vus_max"]?.values?.max ?? 0;
    const chatTO     = data.metrics["chat_timeouts"]?.values?.count ?? 0;
    const pdfTO      = data.metrics["pdf_timeouts"]?.values?.count ?? 0;
    const timeouts   = chatTO + pdfTO;
    const ecoModeAct = data.metrics["chat_eco_mode_activations"]?.values?.count ?? 0;

    // ── Threshold pass/fail ─────────────────────────────────────────────────
    const p95Pass = customDur.p95 != null;  // present = threshold was evaluated
    const errPass = errorRate < 0.05;

    // Check if thresholds actually passed (k6 sets root_group.checks or thresholds map)
    const thresholds = data.metrics;
    const p95Threshold = scenario === "chat"  ? 8000
                       : scenario === "pdf"   ? 20000
                       : scenario === "reads" ? 2000
                       : 5000;
    const p99Threshold = scenario === "chat"  ? 15000
                       : scenario === "pdf"   ? 40000
                       : scenario === "reads" ? 5000
                       : 10000;

    const p95Ok = customDur.p95 == null || customDur.p95 < p95Threshold;
    const p99Ok = customDur.p99 == null || customDur.p99 < p99Threshold;
    const errOk = errPass;

    // ── Console report ──────────────────────────────────────────────────────
    const hr  = "─".repeat(54);
    const sep = "│";

    const report = `
╔══════════════════════════════════════════════════════╗
║  GENIE IA — Load Test Report  [${mode.padEnd(6)}] [${scenario.toUpperCase().padEnd(6)}]  ║
╚══════════════════════════════════════════════════════╝
  ${hr}
  ${sep} Metric                 ${sep} Value          ${sep} Status ${sep}
  ${hr}
  ${sep} Total requests         ${sep} ${String(totalReqs).padEnd(14)} ${sep}        ${sep}
  ${sep} Peak VUs               ${sep} ${String(vusMax).padEnd(14)} ${sep}        ${sep}
  ${hr}
  ${sep} p50  (avg)             ${sep} ${fmtMs(customDur.avg).padEnd(14)} ${sep}        ${sep}
  ${sep} p95  latency           ${sep} ${fmtMs(customDur.p95).padEnd(14)} ${sep} ${badge(p95Ok)}  ${sep}
  ${sep} p99  latency           ${sep} ${fmtMs(customDur.p99).padEnd(14)} ${sep} ${badge(p99Ok)}  ${sep}
  ${sep} Max  latency           ${sep} ${fmtMs(customDur.max).padEnd(14)} ${sep}        ${sep}
  ${hr}
  ${sep} Error rate             ${sep} ${fmtRate(errorRate).padEnd(14)} ${sep} ${badge(errOk)}  ${sep}
  ${sep} Timeouts               ${sep} ${String(timeouts).padEnd(14)} ${sep}        ${sep}
  ${ecoModeAct > 0 ? `  ${sep} Eco mode activations  ${sep} ${String(ecoModeAct).padEnd(14)} ${sep} ⚠️  ECO   ${sep}` : ""}
  ${hr}
  Thresholds:
    p(95) < ${p95Threshold}ms   ${badge(p95Ok)}
    p(99) < ${p99Threshold}ms  ${badge(p99Ok)}
    error_rate < 5%    ${badge(errOk)}

  Full JSON saved to: ${jsonFile}
`;

    return {
      [jsonFile]: JSON.stringify(data, null, 2),
      stdout: report,
    };
  };
}
