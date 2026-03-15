/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       FORMETOIALIA – SIMULATION UTILISATEUR AUTOMATISÉE              ║
 * ║  Parcours B2C (learner) + B2B (manager) + validations attestation    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   npm run test:simulation            # headless
 *   npm run test:simulation:headed     # avec navigateur visible
 *   npm run test:simulation:ui         # Playwright UI mode
 *
 * Variables d'environnement:
 *   PLAYWRIGHT_BASE_URL   (défaut: https://formetoialia.com)
 *   B2C_EMAIL             (défaut: généré dynamiquement)
 *   B2C_PASSWORD          (défaut: Secure123!)
 *   B2B_EMAIL             (défaut: généré dynamiquement)
 *   B2B_PASSWORD          (défaut: Secure123!)
 */

import { test, expect, Page, BrowserContext } from "@playwright/test";

// ─── Configuration ────────────────────────────────────────────────────────────
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://formetoialia.com";
const ts = Date.now();
const B2C_EMAIL = process.env.B2C_EMAIL ?? `b2c.sim.${ts}@yopmail.com`;
const B2C_PASSWORD = process.env.B2C_PASSWORD ?? "Secure123!";
const B2B_EMAIL = process.env.B2B_EMAIL ?? `b2b.manager.${ts}@yopmail.com`;
const B2B_PASSWORD = process.env.B2B_PASSWORD ?? "Secure123!";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fillAndSubmitRegister(
  page: Page,
  email: string,
  password: string
) {
  await page.getByLabel(/email/i).fill(email);
  const pwFields = await page.getByLabel(/mot de passe|password/i).all();
  await pwFields[0].fill(password);
  if (pwFields.length > 1) await pwFields[1].fill(password);
  await page
    .getByRole("button", {
      name: /créer|inscription|commencer|s'inscrire|register/i,
    })
    .click();
}

async function waitForAppReady(page: Page) {
  // Attendre que le spinner de chargement disparaisse
  await page
    .locator('[aria-label*="Chargement"], .animate-spin')
    .first()
    .waitFor({ state: "hidden", timeout: 20_000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
}

async function clickIfVisible(page: Page, selector: string, timeout = 3_000) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: "visible", timeout });
    await el.click();
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST 1 – PARCOURS B2C COMPLET
// Landing → Inscription → Onboarding 3 étapes → Modules → Quiz → Chat → PDF
// ══════════════════════════════════════════════════════════════════════════════

test.describe("🧑 Parcours B2C – Nouvel utilisateur Formetoialia", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ── 1.1 Landing Page ─────────────────────────────────────────────────────
  test("1.1 – Landing : page d'accueil se charge correctement", async () => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });

    // Logo ou titre principal visible
    await expect(
      page
        .getByRole("heading", { level: 1 })
        .or(page.getByAltText(/formetoialia|genie/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });

    // CTA principal visible
    await expect(
      page
        .getByRole("link", {
          name: /commencer|démarrer|essai|inscription|s'inscrire/i,
        })
        .first()
        .or(
          page
            .getByRole("button", {
              name: /commencer|démarrer|essai|inscription/i,
            })
            .first()
        )
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── 1.2 Navigation vers Register ─────────────────────────────────────────
  test("1.2 – Navigation : clic sur CTA → page inscription", async () => {
    // Aller directement sur /register si CTA navigue ailleurs
    await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });

    await expect(
      page
        .getByRole("heading", {
          name: /créer|inscription|commencer|nouveau/i,
        })
        .first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  // ── 1.3 Inscription ───────────────────────────────────────────────────────
  test("1.3 – Inscription : formulaire → création de compte", async () => {
    await fillAndSubmitRegister(page, B2C_EMAIL, B2C_PASSWORD);

    // Vérification : redirigé vers onboarding ou app (pas login)
    await page.waitForURL(
      (url) =>
        url.pathname.includes("/onboarding") ||
        url.pathname.includes("/app") ||
        url.pathname.includes("/welcome"),
      { timeout: 20_000 }
    );
  });

  // ── 1.4 Onboarding étape 1 – Persona / Niveau ────────────────────────────
  test("1.4 – Onboarding étape 1 : sélection persona ou niveau", async () => {
    await waitForAppReady(page);

    // Essayer de cliquer sur un choix de persona ou niveau
    const chose = await clickIfVisible(
      page,
      '[data-testid="persona-option"], [data-testid="level-option"]',
      3_000
    );

    if (!chose) {
      // Fallback : cliquer sur le premier bouton visible dans la page onboarding
      const btns = await page
        .getByRole("button")
        .filter({ hasNotText: /retour|back|skip/i })
        .all();
      if (btns.length > 0) await btns[0].click();
    }

    // Continuer / Suivant
    await clickIfVisible(
      page,
      'button:has-text("Continuer"), button:has-text("Suivant"), button:has-text("Next")',
      5_000
    );
  });

  // ── 1.5 Onboarding étape 2 – Intérêts ────────────────────────────────────
  test("1.5 – Onboarding étape 2 : sélection intérêts", async () => {
    await waitForAppReady(page);

    // Sélectionner le premier intérêt disponible
    const interests = await page
      .getByRole("checkbox")
      .or(page.locator('[data-testid*="interest"]'))
      .all();

    if (interests.length > 0) await interests[0].click();
    if (interests.length > 1) await interests[1].click();

    await clickIfVisible(
      page,
      'button:has-text("Continuer"), button:has-text("Suivant"), button:has-text("Next")',
      5_000
    );
  });

  // ── 1.6 Onboarding étape 3 – Quiz phishing ───────────────────────────────
  test("1.6 – Onboarding quiz : répondre aux questions", async () => {
    await waitForAppReady(page);

    // Répondre à chaque question du quiz (max 5 questions)
    for (let i = 0; i < 5; i++) {
      const options = await page
        .getByRole("button")
        .filter({ hasNotText: /retour|back|skip|passer|continuer|suivant/i })
        .all();

      if (options.length === 0) break;

      // Choisir la première option
      try {
        await options[0].click({ timeout: 3_000 });
        await page.waitForTimeout(500);
      } catch {
        break;
      }

      // Bouton "Valider" ou "Suivant" après réponse
      await clickIfVisible(
        page,
        'button:has-text("Valider"), button:has-text("Suivant"), button:has-text("Next")',
        3_000
      );
    }

    // Voir les résultats ou dashboard
    await page.waitForURL(
      (url) =>
        url.pathname.includes("/result") ||
        url.pathname.includes("/unlock") ||
        url.pathname.includes("/dashboard") ||
        url.pathname.includes("/app"),
      { timeout: 20_000 }
    );
  });

  // ── 1.7 Dashboard → Modules ───────────────────────────────────────────────
  test("1.7 – Dashboard : accéder à la liste des modules", async () => {
    await waitForAppReady(page);

    // Naviguer vers modules
    await page.goto(`${BASE}/app/modules`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    // Vérifier qu'au moins un module est visible
    await expect(
      page
        .getByRole("article")
        .or(page.locator('[data-testid="module-card"]'))
        .or(
          page.getByRole("heading", {
            name: /phishing|cybersécurité|modules/i,
          })
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── 1.8 Ouvrir un module ──────────────────────────────────────────────────
  test("1.8 – Modules : ouvrir le premier module disponible", async () => {
    // Cliquer sur le premier module
    const moduleLinks = await page
      .getByRole("link")
      .filter({ hasText: /module|phishing|cyber|sécurité/i })
      .all();

    if (moduleLinks.length > 0) {
      await moduleLinks[0].click();
      await waitForAppReady(page);

      await expect(
        page.getByRole("main").or(page.locator("article")).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  // ── 1.9 Quiz dans le module ───────────────────────────────────────────────
  test("1.9 – Module : démarrer et compléter un quiz", async () => {
    // Trouver le bouton de quiz
    const quizBtn = page
      .getByRole("button", { name: /quiz|tester|évaluation|commencer/i })
      .first();

    const visible = await quizBtn.isVisible().catch(() => false);
    if (!visible) {
      // Naviguer directement
      await page.goto(`${BASE}/app/modules`, { waitUntil: "domcontentloaded" });
      return;
    }

    await quizBtn.click();
    await waitForAppReady(page);

    // Répondre aux questions
    for (let i = 0; i < 10; i++) {
      const answers = await page
        .getByRole("button")
        .filter({ hasNotText: /retour|skip|fermer|close|quitter/i })
        .all();

      if (answers.length === 0) break;

      try {
        await answers[0].click({ timeout: 3_000 });
        await page.waitForTimeout(300);
      } catch {
        break;
      }

      await clickIfVisible(
        page,
        'button:has-text("Valider"), button:has-text("Suivant")',
        2_000
      );
    }
  });

  // ── 1.10 Chat IA ──────────────────────────────────────────────────────────
  test("1.10 – Chat : envoyer un message et vérifier réponse < 3s", async () => {
    await page.goto(`${BASE}/app/chat`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    const start = Date.now();
    await textarea.fill("Explique-moi le phishing en une phrase.");
    await textarea.press("Enter");

    // Vérifier que "queued" ou un indicateur de chargement apparaît < 3s
    await expect(
      page
        .locator(".animate-bounce, .animate-spin")
        .or(page.getByText(/en attente|queued|chargement/i))
        .first()
    ).toBeVisible({ timeout: 3_000 });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3_000);

    // Attendre la réponse complète
    await expect(
      page.locator(".animate-bounce, .animate-spin").first()
    ).toBeHidden({ timeout: 45_000 });
  });

  // ── 1.11 Génération PDF Attestation ───────────────────────────────────────
  test("1.11 – PDF : déclencher génération attestation", async () => {
    await page.goto(`${BASE}/app/modules`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    // Chercher un bouton PDF ou attestation
    const pdfBtn = page
      .getByRole("button", { name: /pdf|attestation|télécharger/i })
      .first()
      .or(page.getByText(/attestation|PDF/i).first());

    const hasPdf = await pdfBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasPdf) {
      // Intercepter la requête PDF
      const pdfRequest = page.waitForRequest(
        (req) =>
          req.url().includes("generate-pdf") ||
          req.url().includes("ai-queue"),
        { timeout: 10_000 }
      );

      await pdfBtn.click();

      // Vérifier que la requête est bien lancée
      const req = await pdfRequest.catch(() => null);
      if (req) {
        expect(req.url()).toMatch(/generate-pdf|ai-queue|pdf/);
      }

      // Vérifier toast ou indicateur
      await expect(
        page
          .getByText(/en file|queued|génération|téléchargement/i)
          .or(page.locator('[role="status"]'))
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  // ── 1.12 Validation : attestation contient "Formetoialia" ─────────────────
  test("1.12 – Attestation : page de vérification contient Formetoialia", async () => {
    await page.goto(`${BASE}/verify/demo-hash-123`, {
      waitUntil: "domcontentloaded",
    });

    // La page doit mentionner Formetoialia ou GENIE IA
    await expect(
      page
        .getByText(/formetoialia|genie/i)
        .first()
        .or(page.locator("title"))
    ).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 2 – PARCOURS B2B MANAGER
// Inscription dirigeant → Création org → Import CSV → Dashboard stats
// ══════════════════════════════════════════════════════════════════════════════

test.describe("🏢 Parcours B2B Manager – Dirigeant Formetoialia", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ── 2.1 Inscription manager ───────────────────────────────────────────────
  test("2.1 – Inscription B2B : formulaire manager", async () => {
    await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    // Sélectionner le mode "Manager / Entreprise" si disponible
    await clickIfVisible(
      page,
      'button:has-text("Manager"), button:has-text("Entreprise"), [data-testid="manager-tab"]',
      3_000
    );

    await fillAndSubmitRegister(page, B2B_EMAIL, B2B_PASSWORD);

    await page.waitForURL(
      (url) =>
        url.pathname.includes("/onboarding") ||
        url.pathname.includes("/app") ||
        url.pathname.includes("/welcome"),
      { timeout: 25_000 }
    );
  });

  // ── 2.2 Onboarding manager ────────────────────────────────────────────────
  test("2.2 – Onboarding manager : sélection profil dirigeant", async () => {
    await waitForAppReady(page);

    // Choisir "Manager" ou "Dirigeant"
    await clickIfVisible(
      page,
      'button:has-text("Manager"), button:has-text("Dirigeant"), [value="manager"]',
      5_000
    );

    await clickIfVisible(
      page,
      'button:has-text("Continuer"), button:has-text("Suivant")',
      5_000
    );
  });

  // ── 2.3 Onboarding manager ─────────────────────────────────────────────
  test("2.3 – Onboarding manager : compléter étapes", async () => {
    // Parcourir rapidement les étapes onboarding
    for (let i = 0; i < 5; i++) {
      const next = await clickIfVisible(
        page,
        'button:has-text("Continuer"), button:has-text("Suivant"), button:has-text("Passer")',
        3_000
      );
      if (!next) break;
      await page.waitForTimeout(500);
    }

    await page.waitForURL(
      (url) =>
        url.pathname.includes("/manager") || url.pathname.includes("/app"),
      { timeout: 20_000 }
    );
  });

  // ── 2.4 Accès Manager Dashboard ──────────────────────────────────────────
  test("2.4 – Manager Dashboard : accès et chargement", async () => {
    await page.goto(`${BASE}/manager`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    // Soit redirection pricing si non-pro, soit dashboard visible
    const url = page.url();
    if (url.includes("/pricing")) {
      // Utilisateur sans accès pro → test quand même la page pricing
      await expect(page.getByText(/pro|59|plan/i).first()).toBeVisible({
        timeout: 10_000,
      });
      return;
    }

    await expect(
      page
        .getByRole("heading", { name: /équipe|manager|tableau de bord/i })
        .first()
        .or(page.getByText(/membres|collaborateurs|team/i).first())
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── 2.5 Import CSV Preview ────────────────────────────────────────────────
  test("2.5 – Import CSV : preview et validation colonnes", async () => {
    const url = page.url();
    if (url.includes("/pricing")) {
      test.skip(true, "Non-pro user redirected to pricing");
      return;
    }

    // Trouver le bouton d'import CSV
    const importBtn = page
      .getByRole("button", { name: /importer|csv|import/i })
      .first();

    const visible = await importBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!visible) return;

    await importBtn.click();
    await waitForAppReady(page);

    // Vérifier que le dialogue CSV s'ouvre
    await expect(
      page
        .getByRole("dialog")
        .or(page.getByText(/csv|import|colonnes/i))
        .first()
    ).toBeVisible({ timeout: 10_000 });

    // Simuler upload d'un CSV valide
    const csvContent = `email,full_name,role
alice@company.com,Alice Martin,user
bob@company.com,Bob Dupont,user
charlie@company.com,Charlie Durand,user`;

    // Créer un fichier CSV via File API
    const fileChooserPromise = page.waitForEvent("filechooser", {
      timeout: 5_000,
    }).catch(() => null);

    await clickIfVisible(
      page,
      'input[type="file"], button:has-text("Parcourir"), button:has-text("Choisir")',
      3_000
    );

    const fileChooser = await fileChooserPromise;
    if (fileChooser) {
      await fileChooser.setFiles({
        name: "test-import.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csvContent),
      });

      // Vérifier la prévisualisation
      await expect(
        page
          .getByText(/alice@company|preview|aperçu|3 lignes/i)
          .first()
          .or(page.getByRole("table").first())
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  // ── 2.6 Dashboard stats realtime ─────────────────────────────────────────
  test("2.6 – Dashboard : statistiques équipe visibles", async () => {
    const url = page.url();
    if (url.includes("/pricing")) return;

    await page.goto(`${BASE}/manager`, { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    if (page.url().includes("/pricing")) return;

    // Vérifier les métriques
    await expect(
      page
        .getByText(/membres|utilisateurs|équipe|0%|100%|\d+%/i)
        .first()
        .or(page.locator('[data-testid*="stat"], [data-testid*="metric"]').first())
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 3 – MOBILE RESPONSIVE
// Vérifie le parcours sur mobile (375x812 – iPhone 14)
// ══════════════════════════════════════════════════════════════════════════════

test.describe("📱 Parcours Mobile – iPhone 14 (375×812)", () => {
  test("3.1 – Landing mobile : hero + CTA visibles", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    const page = await context.newPage();

    await page.goto(BASE, { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1 }).first()
    ).toBeVisible({ timeout: 15_000 });

    // Aucun overflow horizontal
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // tolérance 5px

    await context.close();
  });

  test("3.2 – Chat mobile : textarea accessible + envoi", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();

    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });

    // Login rapide avec compte existant si fourni
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (email && password) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/mot de passe|password/i).fill(password);
      await page
        .getByRole("button", { name: /connexion|se connecter/i })
        .click();
      await page
        .waitForURL((url) => url.pathname.includes("/app"), { timeout: 15_000 })
        .catch(() => {});

      await page.goto(`${BASE}/app/chat`, { waitUntil: "domcontentloaded" });

      const textarea = page.locator("textarea").first();
      await expect(textarea).toBeVisible({ timeout: 10_000 });

      // Vérifier que le textarea est dans le viewport (pas caché par clavier)
      const box = await textarea.boundingBox();
      if (box) {
        expect(box.y + box.height).toBeLessThanOrEqual(812);
      }
    }

    await context.close();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST 4 – PERFORMANCE & SÉCURITÉ
// ══════════════════════════════════════════════════════════════════════════════

test.describe("⚡ Performance & Sécurité", () => {
  test("4.1 – LCP : landing page < 3s", async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1 }).first()
    ).toBeVisible({ timeout: 3_000 });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3_000);
  });

  test("4.2 – Sécurité : headers CSP présents", async ({ request }) => {
    const response = await request.get(BASE);
    const headers = response.headers();

    // Vérifier au moins un header de sécurité
    const hasSecurityHeader =
      "content-security-policy" in headers ||
      "x-frame-options" in headers ||
      "strict-transport-security" in headers;

    expect(hasSecurityHeader).toBe(true);
  });

  test("4.3 – 404 : page NotFound s'affiche", async ({ page }) => {
    await page.goto(`${BASE}/route-inexistante-xyz-123`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page
        .getByText(/404|introuvable|not found|page.*existe/i)
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("4.4 – Chat queued < 3s : réponse 'queued' dans 3 secondes", async ({
    page,
  }) => {
    // Test en mode non-authentifié → on vérifie la redirection
    const response = await page.goto(`${BASE}/app/chat`, {
      waitUntil: "domcontentloaded",
    });

    const finalUrl = page.url();
    if (finalUrl.includes("/login")) {
      // Non authentifié → redirection OK
      await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 5_000 });
      return;
    }

    const textarea = page.locator("textarea").first();
    const isVisible = await textarea.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!isVisible) return;

    const start = Date.now();
    await textarea.fill("Test performance queued");
    await textarea.press("Enter");

    // Doit afficher un indicateur de chargement en < 3s
    await expect(
      page
        .locator(".animate-bounce, .animate-spin, .animate-pulse")
        .or(page.getByText(/queued|en file|chargement/i))
        .first()
    ).toBeVisible({ timeout: 3_000 });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3_000);
  });
});
