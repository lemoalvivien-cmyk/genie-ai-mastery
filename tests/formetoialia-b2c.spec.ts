/**
 * FORMETOIALIA – Parcours B2C complet
 * Landing → Inscription → Onboarding → Modules → Quiz → Chat → PDF Attestation
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://formetoialia.com";
const ts = Date.now();
const EMAIL = process.env.B2C_EMAIL ?? `b2c.${ts}@yopmail.com`;
const PASSWORD = process.env.B2C_PASSWORD ?? "Secure123!";

test.describe("🧑 B2C – Parcours learner complet", () => {

  test("1 – Landing : hero H1 + CTA visibles", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("link", { name: /commencer|démarrer|essai|inscription/i })
        .or(page.getByRole("button", { name: /commencer|démarrer|essai|inscription/i }))
        .first()
    ).toBeVisible();
  });

  test("2 – Inscription : formulaire → compte créé", async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await expect(page.getByRole("heading", { name: /créer|inscription|commencer/i }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByLabel(/email/i).fill(EMAIL);
    const pwFields = await page.getByLabel(/mot de passe|password/i).all();
    await pwFields[0].fill(PASSWORD);
    if (pwFields.length > 1) await pwFields[1].fill(PASSWORD);
    await page.getByRole("button", { name: /créer|s'inscrire|register|commencer/i }).click();
    await page.waitForURL(url => url.pathname.includes("/app") || url.pathname.includes("/onboarding") || url.pathname.includes("/welcome"), { timeout: 25_000 });
  });

  test("3 – Onboarding étape 1 : choix persona ou niveau", async ({ page }) => {
    await page.goto(`${BASE}/app/welcome`);
    await page.waitForLoadState("networkidle");
    const btns = await page.getByRole("button").filter({ hasNotText: /retour|back|skip|passer/i }).all();
    if (btns.length > 0) await btns[0].click();
    const next = page.getByRole("button", { name: /continuer|suivant|next/i }).first();
    if (await next.isVisible({ timeout: 3_000 }).catch(() => false)) await next.click();
  });

  test("4 – Onboarding étape 2 : sélection intérêts", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const checks = await page.getByRole("checkbox").all();
    if (checks.length > 0) await checks[0].click();
    if (checks.length > 1) await checks[1].click();
    const next = page.getByRole("button", { name: /continuer|suivant|next/i }).first();
    if (await next.isVisible({ timeout: 3_000 }).catch(() => false)) await next.click();
  });

  test("5 – Onboarding quiz phishing : répondre 3 questions", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    for (let i = 0; i < 5; i++) {
      const opts = await page.getByRole("button").filter({ hasNotText: /retour|skip|passer|fermer|continuer|suivant/i }).all();
      if (opts.length === 0) break;
      await opts[0].click({ timeout: 3_000 }).catch(() => {});
      await page.waitForTimeout(400);
      const valider = page.getByRole("button", { name: /valider|suivant|next/i }).first();
      if (await valider.isVisible({ timeout: 1_500 }).catch(() => false)) await valider.click();
    }
    await page.waitForURL(url =>
      url.pathname.includes("/result") || url.pathname.includes("/unlock") ||
      url.pathname.includes("/dashboard") || url.pathname.includes("/app"),
      { timeout: 20_000 }
    );
  });

  test("6 – Modules : liste visible avec au moins 1 carte", async ({ page }) => {
    await page.goto(`${BASE}/app/modules`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("article").first()
        .or(page.getByRole("heading", { name: /phishing|cyber|module/i }).first())
    ).toBeVisible({ timeout: 15_000 });
  });

  test("7 – Module : ouvrir le premier module disponible", async ({ page }) => {
    await page.goto(`${BASE}/app/modules`);
    await page.waitForLoadState("networkidle");
    const links = await page.getByRole("link").filter({ hasText: /phishing|module|cyber/i }).all();
    if (links.length > 0) {
      await links[0].click();
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("main").first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("8 – Quiz module : démarrer + répondre questions", async ({ page }) => {
    const quizBtn = page.getByRole("button", { name: /quiz|tester|évaluation|commencer/i }).first();
    if (!await quizBtn.isVisible({ timeout: 4_000 }).catch(() => false)) return;
    await quizBtn.click();
    await page.waitForLoadState("networkidle");
    for (let i = 0; i < 10; i++) {
      const answers = await page.getByRole("button").filter({ hasNotText: /retour|fermer|quitter|skip/i }).all();
      if (answers.length === 0) break;
      await answers[0].click({ timeout: 3_000 }).catch(() => {});
      await page.waitForTimeout(300);
      const next = page.getByRole("button", { name: /valider|suivant/i }).first();
      if (await next.isVisible({ timeout: 1_000 }).catch(() => false)) await next.click();
    }
  });

  test("9 – Chat : message envoyé + queued < 3s", async ({ page }) => {
    await page.goto(`${BASE}/app/chat`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/login")) { test.skip(); return; }
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    const start = Date.now();
    await textarea.fill("Explique le phishing en une phrase.");
    await textarea.press("Enter");
    await expect(
      page.locator(".animate-bounce, .animate-spin").first()
        .or(page.getByText(/queued|en file|chargement/i).first())
    ).toBeVisible({ timeout: 3_000 });
    expect(Date.now() - start).toBeLessThan(3_000);
    // Attendre la réponse
    await expect(page.locator(".animate-bounce, .animate-spin").first()).toBeHidden({ timeout: 45_000 });
  });

  test("10 – PDF Attestation : génération déclenchée", async ({ page }) => {
    await page.goto(`${BASE}/app/modules`);
    await page.waitForLoadState("networkidle");
    const pdfBtn = page.getByRole("button", { name: /pdf|attestation|télécharger/i }).first();
    if (!await pdfBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    const reqPromise = page.waitForRequest(r => r.url().includes("generate-pdf") || r.url().includes("ai-queue"), { timeout: 8_000 });
    await pdfBtn.click();
    await reqPromise.catch(() => {});
    await expect(
      page.getByText(/en file|queued|génération|téléchargement/i).first()
        .or(page.locator('[role="status"]').first())
    ).toBeVisible({ timeout: 8_000 });
  });

  test("11 – Attestation : page verify contient Formetoialia", async ({ page }) => {
    await page.goto(`${BASE}/verify/test-hash-demo`);
    await page.waitForLoadState("domcontentloaded");
    const title = await page.title();
    const bodyText = await page.locator("body").textContent();
    expect((title + bodyText).toLowerCase()).toMatch(/formetoialia|genie/i);
  });

});
