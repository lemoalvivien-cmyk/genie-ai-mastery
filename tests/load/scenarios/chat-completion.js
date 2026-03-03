/**
 * k6 scenario A — chat-completion
 * Simulates concurrent AI chat usage at scale (up to 1000 VUs in full mode).
 *
 * Smoke : 30s  | Full : ~14 min
 * ENV:
 *   SUPABASE_URL   – e.g. https://xpzvbsfrwnabnwwfsnnc.supabase.co
 *   BEARER_TOKEN   – user JWT
 *   MODE           – "smoke" | "full" (default: full)
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { sharedHeaders, randomJitter, assertBody } from "../lib/helpers.js";
import { makeSummaryHandler } from "../summary.js";

export const handleSummary = makeSummaryHandler("chat");

// ── Custom metrics ────────────────────────────────────────────────────────────
export const chatDuration = new Trend("chat_duration_ms", true);
export const chatErrors    = new Rate("chat_error_rate");
export const chatTimeouts  = new Counter("chat_timeouts");
export const chatEcoMode   = new Counter("chat_eco_mode_activations");

const MODE = __ENV.MODE === "smoke" ? "smoke" : "full";

// ── Stage definitions ─────────────────────────────────────────────────────────
const STAGES = {
  smoke: [
    { duration: "10s", target: 10 },
    { duration: "15s", target: 50 },
    { duration: "5s",  target: 0  },
  ],
  full: [
    { duration: "1m",  target: 50   },  // warm-up
    { duration: "2m",  target: 200  },  // ramp 1
    { duration: "3m",  target: 500  },  // ramp 2
    { duration: "3m",  target: 1000 },  // peak
    { duration: "2m",  target: 500  },  // scale-down
    { duration: "2m",  target: 200  },
    { duration: "1m",  target: 0    },  // cool-down
  ],
};

export const options = {
  stages: STAGES[MODE],
  thresholds: {
    chat_duration_ms:              ["p(95)<8000", "p(99)<15000"],
    chat_error_rate:               ["rate<0.05"],
    http_req_failed:               ["rate<0.05"],
    // Eco mode activations are informational — no hard threshold
  },
};

// ── Fixtures ──────────────────────────────────────────────────────────────────
const QUESTIONS = [
  "c'est quoi le phishing ?",
  "comment créer un mot de passe solide ?",
  "qu'est-ce qu'une attaque par ransomware ?",
  "comment activer le MFA sur Google ?",
  "quelle est la différence entre HTTP et HTTPS ?",
  "comment détecter un email de phishing ?",
  "qu'est-ce que le RGPD ?",
  "comment sécuriser mon réseau Wi-Fi ?",
];

const PERSONAS = ["salarie", "dirigeant", "jeune", "parent", "independant"];
const MODES    = ["normal", "expert", "enfant"];

// ── Default function ──────────────────────────────────────────────────────────
export default function () {
  const q       = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
  const mode    = MODES[Math.floor(Math.random() * MODES.length)];

  const payload = JSON.stringify({
    messages:     [{ role: "user", content: q }],
    user_profile: { persona, level: Math.ceil(Math.random() * 5), mode },
    session_id:   `load-${__VU}-${__ITER}`,
    request_type: "chat",
  });

  const res = http.post(
    `${__ENV.SUPABASE_URL}/functions/v1/chat-completion`,
    payload,
    { headers: sharedHeaders(), timeout: "30s" },
  );

  chatDuration.add(res.timings.duration);

  // Timeout detection (k6 network error)
  if (res.error_code === 1050) {
    chatTimeouts.add(1);
    chatErrors.add(true);
    sleep(randomJitter(2, 4));
    return;
  }

  const ok = check(res, {
    "chat: status 200 or 429": (r) => r.status === 200 || r.status === 429,
    "chat: has body":          (r) => r.body && r.body.length > 0,
    "chat: valid json":        (r) => assertBody(r),
    "chat: content or error":  (r) => {
      try { const b = JSON.parse(r.body); return !!(b.content || b.error); }
      catch { return false; }
    },
  });

  chatErrors.add(!ok);

  // Track eco mode activations (budget circuit-breaker)
  try {
    const b = JSON.parse(res.body);
    if (b.eco_mode || b.eco_mode_activated) chatEcoMode.add(1);
  } catch { /* no-op */ }

  sleep(randomJitter(1, 3));
}
