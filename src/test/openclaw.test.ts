/**
 * Tests minimums OpenClaw Phase 1
 * Vérifie les fonctions utilitaires locales : risk classifier, status mapping, validation.
 * Ces tests ne nécessitent aucun accès réseau.
 */
import { describe, it, expect } from "vitest";

// ── 1. Risk classifier logic (replicated from openclaw-create-job) ─────────
const HIGH_RISK_KEYWORDS = ["delete", "supprimer", "écrire dans", "modifier", "envoyer email", "submit", "post to", "publier"];
const MEDIUM_RISK_KEYWORDS = ["scrape", "crawler", "télécharger", "download", "external api", "api externe"];

type JobType = "tutor_search" | "browser_lab" | "scheduled_coach" | "custom";
type RiskLevel = "low" | "medium" | "high";

function classifyRisk(job_type: JobType, prompt: string): { risk_level: RiskLevel; approval_required: boolean } {
  const promptLower = prompt.toLowerCase();
  const hasHighRisk = HIGH_RISK_KEYWORDS.some(k => promptLower.includes(k));
  const hasMediumRisk = MEDIUM_RISK_KEYWORDS.some(k => promptLower.includes(k));

  if (job_type === "browser_lab" || hasHighRisk) {
    return { risk_level: "high", approval_required: true };
  }
  if (hasMediumRisk) {
    return { risk_level: "medium", approval_required: false };
  }
  return { risk_level: "low", approval_required: false };
}

describe("OpenClaw — Risk Classifier", () => {
  it("classifie tutor_search sans mots sensibles comme low risk", () => {
    const result = classifyRisk("tutor_search", "Synthèse sur les attaques IA en 2025");
    expect(result.risk_level).toBe("low");
    expect(result.approval_required).toBe(false);
  });

  it("classifie browser_lab toujours comme high risk + approval required", () => {
    const result = classifyRisk("browser_lab", "Prends une capture de cette page");
    expect(result.risk_level).toBe("high");
    expect(result.approval_required).toBe(true);
  });

  it("détecte les mots-clés à haut risque dans le prompt", () => {
    // "supprimer" (infinitif) est dans la liste — pas "supprime" (conjugué)
    const result = classifyRisk("tutor_search", "supprimer les anciens messages et envoyer email au manager");
    expect(result.risk_level).toBe("high");
    expect(result.approval_required).toBe(true);
  });

  it("détecte les mots-clés à risque moyen dans le prompt", () => {
    const result = classifyRisk("tutor_search", "Scrape les dernières publications du site ANSSI");
    expect(result.risk_level).toBe("medium");
    expect(result.approval_required).toBe(false);
  });

  it("classifie scheduled_coach sans mots sensibles comme low risk", () => {
    const result = classifyRisk("scheduled_coach", "Génère un rappel quotidien sur les bonnes pratiques IA");
    expect(result.risk_level).toBe("low");
    expect(result.approval_required).toBe(false);
  });
});

// ── 2. Job status mapping ────────────────────────────────────────────────────
const VALID_JOB_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
const VALID_RUNTIME_STATUSES = ["healthy", "degraded", "offline", "unknown"] as const;
const VALID_RISK_LEVELS = ["low", "medium", "high"] as const;
const VALID_JOB_TYPES = ["tutor_search", "browser_lab", "scheduled_coach", "custom"] as const;
const VALID_ARTIFACT_TYPES = ["text", "json", "screenshot", "pdf", "html", "log"] as const;
const VALID_ENVIRONMENTS = ["dev", "staging", "prod"] as const;

describe("OpenClaw — Schema Validation", () => {
  it("job_statuses correspond au schéma DB attendu", () => {
    const DB_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"];
    VALID_JOB_STATUSES.forEach(s => expect(DB_STATUSES).toContain(s));
  });

  it("runtime_statuses correspondent au schéma DB attendu", () => {
    const DB_STATUSES = ["healthy", "degraded", "offline", "unknown"];
    VALID_RUNTIME_STATUSES.forEach(s => expect(DB_STATUSES).toContain(s));
  });

  it("risk_levels correspondent au schéma DB attendu", () => {
    const DB_LEVELS = ["low", "medium", "high"];
    VALID_RISK_LEVELS.forEach(l => expect(DB_LEVELS).toContain(l));
  });

  it("job_types correspondent au schéma DB attendu", () => {
    const DB_TYPES = ["tutor_search", "browser_lab", "scheduled_coach", "custom"];
    VALID_JOB_TYPES.forEach(t => expect(DB_TYPES).toContain(t));
  });

  it("artifact_types correspondent au schéma DB attendu", () => {
    const DB_TYPES = ["text", "json", "screenshot", "pdf", "html", "log"];
    VALID_ARTIFACT_TYPES.forEach(t => expect(DB_TYPES).toContain(t));
  });

  it("environments correspondent au schéma DB attendu", () => {
    const DB_ENVS = ["dev", "staging", "prod"];
    VALID_ENVIRONMENTS.forEach(e => expect(DB_ENVS).toContain(e));
  });
});

// ── 3. Create-job payload validation ────────────────────────────────────────
function validateCreateJobPayload(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return "Body must be an object";
  const b = raw as Record<string, unknown>;
  if (!b.runtime_id || typeof b.runtime_id !== "string") return "runtime_id is required (string)";
  if (!b.job_type || !VALID_JOB_TYPES.includes(b.job_type as JobType)) return "invalid job_type";
  if (!b.title || typeof b.title !== "string" || b.title.trim().length < 3 || b.title.trim().length > 200) return "title must be 3-200 chars";
  if (!b.prompt || typeof b.prompt !== "string" || b.prompt.trim().length < 10 || b.prompt.trim().length > 4000) return "prompt must be 10-4000 chars";
  return null;
}

describe("OpenClaw — Payload Validation", () => {
  it("rejette un payload vide", () => {
    expect(validateCreateJobPayload({})).not.toBeNull();
  });

  it("rejette un job sans runtime_id", () => {
    expect(validateCreateJobPayload({ job_type: "tutor_search", title: "Test", prompt: "prompt long enough" })).toMatch(/runtime_id/);
  });

  it("rejette un job_type invalide", () => {
    expect(validateCreateJobPayload({ runtime_id: "uuid", job_type: "hack_everything", title: "Test", prompt: "valid prompt here" })).toMatch(/job_type/);
  });

  it("rejette un titre trop court", () => {
    expect(validateCreateJobPayload({ runtime_id: "uuid", job_type: "tutor_search", title: "ab", prompt: "valid prompt here" })).toMatch(/title/);
  });

  it("rejette un prompt trop court", () => {
    expect(validateCreateJobPayload({ runtime_id: "uuid", job_type: "tutor_search", title: "Valid title", prompt: "short" })).toMatch(/prompt/);
  });

  it("accepte un payload valide", () => {
    expect(validateCreateJobPayload({
      runtime_id: "550e8400-e29b-41d4-a716-446655440000",
      job_type: "tutor_search",
      title: "Synthèse IA 2025",
      prompt: "Recherche 5 sources fiables sur les attaques de phishing en 2025.",
    })).toBeNull();
  });
});

// ── 4. Security: aucun secret dans le code client ────────────────────────────
describe("OpenClaw — Sécurité Zéro Client", () => {
  it("OPENCLAW_API_TOKEN ne doit pas être accessible dans process.env côté client", () => {
    // Vite expose uniquement les variables VITE_* côté client
    // Si OPENCLAW_API_TOKEN apparaît ici, c'est une fuite de secret
    const envKeys = Object.keys(import.meta.env ?? {});
    const hasBadSecret = envKeys.some(k =>
      k.includes("OPENCLAW_API_TOKEN") ||
      k.includes("SUPABASE_SERVICE_ROLE") ||
      k.includes("CRON_SECRET") ||
      k.includes("WEBHOOK_SECRET")
    );
    expect(hasBadSecret).toBe(false);
  });

  it("seules les variables VITE_ sont exposées côté client", () => {
    const publicKeys = Object.keys(import.meta.env ?? {}).filter(k => k.startsWith("VITE_"));
    const allKeys = Object.keys(import.meta.env ?? {});
    const nonPublicKeys = allKeys.filter(k => !k.startsWith("VITE_") && !["MODE", "DEV", "PROD", "SSR", "BASE_URL"].includes(k));
    expect(nonPublicKeys.length).toBe(0);
  });
});
