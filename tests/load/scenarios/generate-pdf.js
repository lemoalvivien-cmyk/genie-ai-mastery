/**
 * k6 scenario B — generate-pdf
 * Heavy I/O endpoint — lower VU counts, longer timeout.
 *
 * Smoke : 30s  | Full : ~10 min
 * ENV: SUPABASE_URL, BEARER_TOKEN, MODE
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { sharedHeaders, randomJitter, assertBody } from "../lib/helpers.js";
import { makeSummaryHandler } from "../summary.js";

export const handleSummary = makeSummaryHandler("pdf");

export const pdfDuration = new Trend("pdf_duration_ms", true);
export const pdfErrors   = new Rate("pdf_error_rate");
export const pdfTimeouts = new Counter("pdf_timeouts");

const MODE = __ENV.MODE === "smoke" ? "smoke" : "full";

const STAGES = {
  smoke: [
    { duration: "10s", target: 5  },
    { duration: "15s", target: 20 },
    { duration: "5s",  target: 0  },
  ],
  full: [
    { duration: "1m",  target: 10  },  // warm-up
    { duration: "2m",  target: 50  },  // ramp 1
    { duration: "3m",  target: 100 },  // ramp 2
    { duration: "3m",  target: 200 },  // peak
    { duration: "1m",  target: 50  },
    { duration: "1m",  target: 0   },
  ],
};

export const options = {
  stages: STAGES[MODE],
  thresholds: {
    pdf_duration_ms: ["p(95)<20000", "p(99)<40000"],
    pdf_error_rate:  ["rate<0.05"],
    http_req_failed: ["rate<0.05"],
  },
};

// ── Fixtures ──────────────────────────────────────────────────────────────────
const PDF_TYPES = [
  {
    type: "checklist",
    title: "Checklist Cyber Hygiène",
    items: [
      "Activer l'authentification MFA sur tous les comptes",
      "Mettre à jour les systèmes d'exploitation",
      "Sauvegarder les données selon la règle 3-2-1",
      "Former les employés contre le phishing",
      "Utiliser un gestionnaire de mots de passe",
    ],
  },
  {
    type: "checklist",
    title: "Conformité IA en entreprise",
    items: [
      "Inventorier tous les outils IA utilisés",
      "Évaluer les risques de chaque outil",
      "Rédiger une Charte IA interne",
      "Former les collaborateurs",
      "Auditer et mettre à jour trimestriellement",
    ],
  },
  {
    type: "checklist",
    title: "Sécurité télétravail",
    items: [
      "VPN activé pour toutes les connexions pro",
      "Wi-Fi personnel sécurisé (WPA3 de préférence)",
      "Écran de veille avec mot de passe",
      "Mises à jour automatiques activées",
      "Antivirus à jour",
    ],
  },
];

export default function () {
  const fixture = PDF_TYPES[Math.floor(Math.random() * PDF_TYPES.length)];
  const payload = JSON.stringify(fixture);

  const res = http.post(
    `${__ENV.SUPABASE_URL}/functions/v1/generate-pdf`,
    payload,
    { headers: sharedHeaders(), timeout: "45s" },
  );

  pdfDuration.add(res.timings.duration);

  if (res.error_code === 1050) {
    pdfTimeouts.add(1);
    pdfErrors.add(true);
    sleep(randomJitter(3, 6));
    return;
  }

  const ok = check(res, {
    "pdf: status 200 or 4xx": (r) => r.status >= 200 && r.status < 500,
    "pdf: has body":          (r) => r.body && r.body.length > 0,
  });

  pdfErrors.add(!ok);
  sleep(randomJitter(2, 5));
}
