/**
 * k6 load test – chat-completion + generate-pdf
 * 
 * Usage:
 *   k6 run tests/load/chat-completion.js \
 *     -e SUPABASE_URL=https://xxx.supabase.co \
 *     -e BEARER_TOKEN=eyJ...
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const p95 = new Trend("p95_duration");
const errorRate = new Rate("error_rate");

export const options = {
  stages: [
    { duration: "30s", target: 10 },  // Ramp-up to 10 VUs over 30s
    { duration: "1m", target: 50 },   // Sustain 50 VUs for 1 min
    { duration: "30s", target: 100 }, // Peak: 100 VUs for 30s
    { duration: "30s", target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"],  // 95% of requests under 5s
    error_rate: ["rate<0.05"],          // Less than 5% errors
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL;
const BEARER_TOKEN = __ENV.BEARER_TOKEN;

const chatUrl = `${SUPABASE_URL}/functions/v1/chat-completion`;
const pdfUrl  = `${SUPABASE_URL}/functions/v1/generate-pdf`;

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${BEARER_TOKEN}`,
};

const chatPayload = JSON.stringify({
  messages: [{ role: "user", content: "c'est quoi le phishing ?" }],
  user_profile: { persona: "salarie", level: 1, mode: "normal" },
  session_id: "load-test-session",
  request_type: "chat",
});

export default function () {
  // ── Test 1: chat-completion ──
  const chatRes = http.post(chatUrl, chatPayload, { headers, timeout: "10s" });

  const chatOk = check(chatRes, {
    "chat status 200 or 429": (r) => r.status === 200 || r.status === 429,
    "chat has content or error": (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!(body.content || body.error);
      } catch { return false; }
    },
  });
  errorRate.add(!chatOk);
  p95.add(chatRes.timings.duration);

  sleep(1);

  // ── Test 2: generate-pdf (lighter) — 1 in 5 VUs ──
  if (Math.random() < 0.2) {
    const pdfPayload = JSON.stringify({
      type: "checklist",
      title: "Test Load",
      items: ["Activer MFA", "Mettre à jour les logiciels", "Former les équipes"],
    });
    const pdfRes = http.post(pdfUrl, pdfPayload, { headers, timeout: "15s" });
    check(pdfRes, {
      "pdf status 200 or 4xx": (r) => r.status >= 200 && r.status < 500,
    });
  }

  sleep(Math.random() * 2); // jitter
}

export function handleSummary(data) {
  return {
    "tests/load/results.json": JSON.stringify(data, null, 2),
    stdout: `
╔═══════════════════════════════════════════╗
║  GENIE IA – Load Test Summary             ║
╚═══════════════════════════════════════════╝
  Total requests  : ${data.metrics.http_reqs?.values?.count ?? "?"}
  Error rate      : ${((data.metrics.error_rate?.values?.rate ?? 0) * 100).toFixed(2)}%
  p95 duration    : ${data.metrics.http_req_duration?.values?.["p(95)"]?.toFixed(0) ?? "?"}ms
  Threshold pass  : p95 < 5000ms, errors < 5%
`,
  };
}
