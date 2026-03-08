/**
 * Tests OpenClaw Phase 1 + Phase 2
 * Vérifie les fonctions utilitaires locales : risk classifier, status mapping,
 * validation, quotas, dev-harness contract, sécurité.
 * Ces tests ne nécessitent aucun accès réseau.
 */
import { describe, it, expect } from "vitest";
import packageJson from "../../package.json";

// ── 1. Package manager officiel ──────────────────────────────────────────────
describe("Repo — Package Manager", () => {
  it('package.json déclare "packageManager": "bun@1.2.0"', () => {
    expect((packageJson as Record<string, unknown>).packageManager).toBe("bun@1.2.0");
  });
});

// ── 2. Risk classifier logic (replicated from openclaw-create-job) ─────────
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

// ── 3. Quota logic (replicated from openclaw-create-job) ─────────────────────
function checkQuota(recentCount: number, runningCount: number, maxPerHour: number, maxConcurrent: number): { allowed: boolean; error?: string; status?: number } {
  if (recentCount >= maxPerHour) {
    return {
      allowed: false,
      error: `quota_exceeded: limite de ${maxPerHour} jobs par heure atteinte`,
      status: 429,
    };
  }
  if (runningCount >= maxConcurrent) {
    return {
      allowed: false,
      error: `quota_exceeded: limite de ${maxConcurrent} jobs simultanés atteinte`,
      status: 429,
    };
  }
  return { allowed: true };
}

describe("OpenClaw — Quotas", () => {
  it("accepte un job quand les quotas sont dans les limites", () => {
    const result = checkQuota(5, 2, 20, 5);
    expect(result.allowed).toBe(true);
    expect(result.status).toBeUndefined();
  });

  it("retourne 429 quand la limite horaire est atteinte", () => {
    const result = checkQuota(20, 2, 20, 5);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error).toMatch(/quota_exceeded/);
    expect(result.error).toMatch(/heure/);
  });

  it("retourne 429 quand les jobs simultanés sont au max", () => {
    const result = checkQuota(5, 5, 20, 5);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error).toMatch(/quota_exceeded/);
    expect(result.error).toMatch(/simultanés/);
  });

  it("limite horaire = 0 bloque immédiatement", () => {
    const result = checkQuota(0, 0, 0, 5);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(429);
  });

  it("recentCount = maxPerHour - 1 est encore accepté", () => {
    const result = checkQuota(19, 0, 20, 5);
    expect(result.allowed).toBe(true);
  });
});

// ── 4. Dev harness contract ───────────────────────────────────────────────────
// Réplique le contrat de réponse de openclaw-dev-harness pour vérification locale.

interface DevHarnessHealthResponse {
  status: "ok";
  version: string;
  dev_only: true;
  warning: string;
  tools: Record<string, string[]>;
  capabilities: string[];
  timestamp: string;
}

interface DevHarnessJobResponse {
  job_id: string;
  accepted: true;
  dev_only: true;
  warning: string;
  estimated_completion_ms: number;
  runtime: "DEV_ONLY_OPENCLAW_RUNTIME";
  timestamp: string;
}

function buildDevHarnessHealthResponse(): DevHarnessHealthResponse {
  return {
    status: "ok",
    version: "dev-harness-1.0.0",
    dev_only: true,
    warning: "DEV_ONLY_OPENCLAW_RUNTIME — ne pas utiliser en production",
    tools: {
      tutor_readonly: ["web_search", "knowledge_search", "ai_summarize"],
      browser_lab: ["browser_navigate", "browser_screenshot", "browser_extract"],
      scheduled_coach: ["ai_generate", "notification_send", "knowledge_search"],
    },
    capabilities: ["web_search_mock", "knowledge_search_mock", "ai_summarize_mock"],
    timestamp: new Date().toISOString(),
  };
}

function buildDevHarnessJobResponse(jobId: string): DevHarnessJobResponse {
  return {
    job_id: jobId,
    accepted: true,
    dev_only: true,
    warning: "DEV_ONLY_OPENCLAW_RUNTIME — simulation en cours, callback dans ~4s",
    estimated_completion_ms: 4000,
    runtime: "DEV_ONLY_OPENCLAW_RUNTIME",
    timestamp: new Date().toISOString(),
  };
}

describe("OpenClaw — Dev Harness Contract", () => {
  it("réponse health contient dev_only: true", () => {
    const resp = buildDevHarnessHealthResponse();
    expect(resp.dev_only).toBe(true);
  });

  it("réponse health contient status: ok", () => {
    const resp = buildDevHarnessHealthResponse();
    expect(resp.status).toBe("ok");
  });

  it("réponse health contient un warning DEV_ONLY", () => {
    const resp = buildDevHarnessHealthResponse();
    expect(resp.warning).toMatch(/DEV_ONLY/);
  });

  it("réponse health contient les tool profiles émulés", () => {
    const resp = buildDevHarnessHealthResponse();
    expect(resp.tools).toHaveProperty("tutor_readonly");
    expect(resp.tools.tutor_readonly).toContain("web_search");
  });

  it("réponse job accepte le job avec dev_only: true", () => {
    const resp = buildDevHarnessJobResponse("test-job-id-123");
    expect(resp.accepted).toBe(true);
    expect(resp.dev_only).toBe(true);
    expect(resp.job_id).toBe("test-job-id-123");
  });

  it("réponse job identifie le runtime comme DEV_ONLY_OPENCLAW_RUNTIME", () => {
    const resp = buildDevHarnessJobResponse("test-job-id-456");
    expect(resp.runtime).toBe("DEV_ONLY_OPENCLAW_RUNTIME");
  });

  it("réponse job ne se présente pas comme un runtime de production", () => {
    const resp = buildDevHarnessJobResponse("test-job-id-789");
    // Le warning doit clairement indiquer DEV_ONLY
    expect(resp.warning).toMatch(/DEV_ONLY/);
    // Le runtime name doit contenir DEV_ONLY
    expect(resp.runtime).toMatch(/DEV_ONLY/);
  });
});

// ── 5. Job status mapping ────────────────────────────────────────────────────
const VALID_JOB_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
const VALID_RUNTIME_STATUSES = ["healthy", "degraded", "offline", "unknown"] as const;
const VALID_RISK_LEVELS = ["low", "medium", "high"] as const;
const VALID_JOB_TYPES = ["tutor_search", "browser_lab", "scheduled_coach", "custom"] as const;
const VALID_ARTIFACT_TYPES = ["text", "json", "screenshot", "pdf", "html", "log"] as const;
const VALID_ENVIRONMENTS = ["dev", "staging", "prod"] as const;

describe("OpenClaw — Schema Validation", () => {
  it("job_statuses correspondent au schéma DB attendu", () => {
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

// ── 6. Create-job payload validation ────────────────────────────────────────
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

// ── 7. Org-scope authorization logic ────────────────────────────────────────
interface CallerContext {
  userId: string;
  orgId: string | null;
  isAdmin: boolean;
  isManager: boolean;
}

interface JobRecord {
  user_id: string;
  org_id: string;
}

function canDispatch(caller: CallerContext, job: JobRecord): boolean {
  const isOwner = caller.userId === job.user_id;
  const isManagerOfJobOrg = caller.isManager && caller.orgId !== null && caller.orgId === job.org_id;
  return isOwner || caller.isAdmin || isManagerOfJobOrg;
}

function canCreateScheduledJob(caller: CallerContext, targetOrgId: string): boolean {
  if (caller.isAdmin) return true;
  if (!caller.orgId) return false;
  return caller.isManager && caller.orgId === targetOrgId;
}

describe("OpenClaw — Org-Scope Authorization", () => {
  const orgA = "org-aaa";
  const orgB = "org-bbb";

  it("owner peut dispatcher son propre job", () => {
    const caller: CallerContext = { userId: "user-1", orgId: orgA, isAdmin: false, isManager: false };
    const job: JobRecord = { user_id: "user-1", org_id: orgA };
    expect(canDispatch(caller, job)).toBe(true);
  });

  it("manager de l'org A peut dispatcher un job de l'org A", () => {
    const caller: CallerContext = { userId: "mgr-1", orgId: orgA, isAdmin: false, isManager: true };
    const job: JobRecord = { user_id: "user-1", org_id: orgA };
    expect(canDispatch(caller, job)).toBe(true);
  });

  it("manager de l'org A NE peut PAS dispatcher un job de l'org B (cross-org interdit)", () => {
    const caller: CallerContext = { userId: "mgr-1", orgId: orgA, isAdmin: false, isManager: true };
    const job: JobRecord = { user_id: "user-2", org_id: orgB };
    expect(canDispatch(caller, job)).toBe(false);
  });

  it("admin peut dispatcher n'importe quel job", () => {
    const caller: CallerContext = { userId: "admin-1", orgId: null, isAdmin: true, isManager: false };
    const job: JobRecord = { user_id: "user-2", org_id: orgB };
    expect(canDispatch(caller, job)).toBe(true);
  });

  it("utilisateur sans rôle ne peut pas dispatcher le job d'un autre", () => {
    const caller: CallerContext = { userId: "user-3", orgId: orgA, isAdmin: false, isManager: false };
    const job: JobRecord = { user_id: "user-1", org_id: orgA };
    expect(canDispatch(caller, job)).toBe(false);
  });

  it("manager peut créer une routine pour son org", () => {
    const caller: CallerContext = { userId: "mgr-1", orgId: orgA, isAdmin: false, isManager: true };
    expect(canCreateScheduledJob(caller, orgA)).toBe(true);
  });

  it("manager NE peut PAS créer une routine pour une autre org (cross-org interdit)", () => {
    const caller: CallerContext = { userId: "mgr-1", orgId: orgA, isAdmin: false, isManager: true };
    expect(canCreateScheduledJob(caller, orgB)).toBe(false);
  });

  it("admin peut créer une routine pour n'importe quelle org", () => {
    const caller: CallerContext = { userId: "admin-1", orgId: null, isAdmin: true, isManager: false };
    expect(canCreateScheduledJob(caller, orgB)).toBe(true);
  });

  it("manager sans org ne peut créer aucune routine", () => {
    const caller: CallerContext = { userId: "mgr-orphan", orgId: null, isAdmin: false, isManager: true };
    expect(canCreateScheduledJob(caller, orgA)).toBe(false);
  });
});

// ── 8. Security: aucun secret dans le code client ────────────────────────────
/**
 * VITE_ vars whitelisted as safe public keys:
 * - VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PROJECT_ID → Supabase anon config
 * - VITE_SENTRY_DSN → Sentry DSN is designed to be public (client-side error reporting)
 *
 * NEVER whitelisted: OPENCLAW_API_TOKEN, SERVICE_ROLE, WEBHOOK_SECRET, CRON_SECRET
 */
const SAFE_PUBLIC_VITE_KEYS = new Set([
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SENTRY_DSN",
]);

describe("OpenClaw — Sécurité Zéro Client", () => {
  it("OPENCLAW_API_TOKEN ne doit pas être présent en tant que variable VITE_", () => {
    const publicKeys = Object.keys(import.meta.env ?? {}).filter(k => k.startsWith("VITE_"));
    const hasBadSecret = publicKeys.some(k =>
      k.includes("OPENCLAW_API_TOKEN") ||
      k.includes("SERVICE_ROLE") ||
      k.includes("CRON_SECRET") ||
      k.includes("WEBHOOK_SECRET")
    );
    expect(hasBadSecret).toBe(false);
  });

  it("les variables VITE_ publiques se limitent aux clés connues et sûres", () => {
    const publicKeys = Object.keys(import.meta.env ?? {}).filter(k => k.startsWith("VITE_"));
    const BLOCKED_TERMS = ["TOKEN", "SECRET", "PASSWORD", "PRIVATE"];
    const dangerous = publicKeys.filter(k =>
      !SAFE_PUBLIC_VITE_KEYS.has(k) &&
      BLOCKED_TERMS.some(t => k.toUpperCase().includes(t))
    );
    expect(dangerous).toHaveLength(0);
  });
});

// ── 9. Integration pending — test de bout en bout honnête ────────────────────
/**
 * INTEGRATION_PENDING : Ces tests documentent le flux réel attendu,
 * mais ne s'exécutent PAS contre le runtime OpenClaw réel.
 * Ils sont tagués explicitement pour éviter toute confusion avec des tests réels.
 */
describe("OpenClaw — INTEGRATION_PENDING (flux e2e, non-exécuté sans runtime réel)", () => {
  it.skip("[INTEGRATION_PENDING] create-job retourne job_id et status=queued", async () => {
    const RUNTIME_ID = "REPLACE_WITH_REAL_RUNTIME_ID";
    const AUTH_TOKEN = "REPLACE_WITH_VALID_JWT";
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openclaw-create-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AUTH_TOKEN}` },
      body: JSON.stringify({
        runtime_id: RUNTIME_ID,
        job_type: "tutor_search",
        title: "Test intégration e2e",
        prompt: "Recherche 3 sources fiables sur la cybersécurité en 2025.",
      }),
    });
    const data = await resp.json();
    expect(resp.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.status).toBe("queued");
    expect(data.job_id).toBeDefined();
  });

  it.skip("[INTEGRATION_PENDING] dispatch-job marque le job running ou failed si runtime absent", async () => {
    const JOB_ID = "REPLACE_WITH_JOB_ID_FROM_BLOC_A";
    const AUTH_TOKEN = "REPLACE_WITH_VALID_JWT";
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openclaw-dispatch-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AUTH_TOKEN}` },
      body: JSON.stringify({ job_id: JOB_ID }),
    });
    const data = await resp.json();
    expect([200, 503]).toContain(resp.status);
    if (resp.status === 503) {
      expect(data.message).toMatch(/OPENCLAW_API_TOKEN|runtime/i);
    }
  });

  it.skip("[INTEGRATION_PENDING] sync-job persiste les callbacks sans inventer de résultat", async () => {
    const JOB_ID = "REPLACE_WITH_JOB_ID_FROM_BLOC_A";
    const AUTH_TOKEN = "REPLACE_WITH_VALID_JWT";
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openclaw-sync-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AUTH_TOKEN}` },
      body: JSON.stringify({ job_id: JOB_ID, event_type: "progress", message: "Test callback contrôlé DEV_ONLY" }),
    });
    const data = await resp.json();
    expect(data.received).toBe(true);
  });

  it.skip("[INTEGRATION_PENDING] dev-harness healthcheck réel — requiert fonction déployée", async () => {
    // Pour tester manuellement :
    // GET https://xpzvbsfrwnabnwwfsnnc.supabase.co/functions/v1/openclaw-dev-harness/v1/health
    // Authorization: Bearer <USER_JWT>
    // Réponse attendue: { status: "ok", dev_only: true, ... }
    const AUTH_TOKEN = "REPLACE_WITH_VALID_JWT";
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openclaw-dev-harness/v1/health`, {
      headers: { "Authorization": `Bearer ${AUTH_TOKEN}` },
    });
    const data = await resp.json();
    expect(resp.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.dev_only).toBe(true);
  });
});
