/**
 * k6 scenario C — Supabase DB reads (modules + progress)
 * Simulates authenticated read-heavy traffic (browse catalog, check progress).
 * Uses the Supabase REST API directly.
 *
 * Smoke : 30s  | Full : ~12 min
 * ENV: SUPABASE_URL, BEARER_TOKEN, ANON_KEY, MODE
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { randomJitter } from "../lib/helpers.js";
import { makeSummaryHandler } from "../summary.js";

export const handleSummary = makeSummaryHandler("reads");

export const readDuration    = new Trend("db_read_duration_ms", true);
export const readErrors      = new Rate("db_read_error_rate");
export const modulesFetched  = new Counter("modules_fetched");
export const progressFetched = new Counter("progress_fetched");

const MODE = __ENV.MODE === "smoke" ? "smoke" : "full";

const STAGES = {
  smoke: [
    { duration: "10s", target: 20  },
    { duration: "15s", target: 100 },
    { duration: "5s",  target: 0   },
  ],
  full: [
    { duration: "1m",  target: 100  },  // warm-up
    { duration: "2m",  target: 500  },  // ramp 1
    { duration: "3m",  target: 1000 },  // peak — 1000 concurrent readers
    { duration: "3m",  target: 1000 },  // sustain
    { duration: "2m",  target: 500  },
    { duration: "1m",  target: 0    },
  ],
};

export const options = {
  stages: STAGES[MODE],
  thresholds: {
    db_read_duration_ms: ["p(95)<2000", "p(99)<5000"],
    db_read_error_rate:  ["rate<0.02"],  // DB reads should be very reliable
    http_req_failed:     ["rate<0.02"],
  },
};

// ── Headers factory ───────────────────────────────────────────────────────────
function dbHeaders() {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${__ENV.BEARER_TOKEN}`,
    "apikey":        __ENV.ANON_KEY || __ENV.BEARER_TOKEN,
    "Prefer":        "return=minimal",
  };
}

const BASE = `${__ENV.SUPABASE_URL}/rest/v1`;

export default function () {
  const h = dbHeaders();

  // ── Modules catalog read (public, cached by PostgREST) ────────────────────
  group("modules_catalog", () => {
    const res = http.get(
      `${BASE}/modules?is_published=eq.true&select=id,title,domain,level,duration_minutes&limit=20&order=order_index.asc`,
      { headers: h, timeout: "10s" },
    );
    readDuration.add(res.timings.duration);

    const ok = check(res, {
      "modules: status 200":    (r) => r.status === 200,
      "modules: array":         (r) => {
        try { return Array.isArray(JSON.parse(r.body)); }
        catch { return false; }
      },
    });
    readErrors.add(!ok);
    if (ok) modulesFetched.add(1);
  });

  sleep(randomJitter(0.2, 0.8));

  // ── Progress read (authenticated, RLS-filtered) ───────────────────────────
  group("user_progress", () => {
    const res = http.get(
      `${BASE}/progress?select=id,module_id,status,score&limit=50&order=updated_at.desc`,
      { headers: h, timeout: "10s" },
    );
    readDuration.add(res.timings.duration);

    const ok = check(res, {
      "progress: status 200 or 401": (r) => r.status === 200 || r.status === 401,
      "progress: has body":          (r) => r.body && r.body.length > 0,
    });
    readErrors.add(!ok);
    if (res.status === 200) progressFetched.add(1);
  });

  sleep(randomJitter(0.5, 2));

  // ── Briefs read (public content) — 1 in 3 VUs ────────────────────────────
  if (Math.random() < 0.33) {
    group("briefs_catalog", () => {
      const res = http.get(
        `${BASE}/briefs?select=id,title,domain,confidence&limit=10&order=created_at.desc`,
        { headers: h, timeout: "10s" },
      );
      readDuration.add(res.timings.duration);
      check(res, {
        "briefs: status 200": (r) => r.status === 200,
      });
    });
  }

  sleep(randomJitter(0.3, 1));
}
