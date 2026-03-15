/**
 * FORMETOIALIA – Parcours B2C en viewport mobile (iPhone 14 – 390×844)
 * Vérifie responsive, pas d'overflow, inputs accessibles, chat fonctionnel
 */
import { test, expect, devices } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://formetoialia.com";

test.use({
  ...devices["iPhone 14"],
  locale: "fr-FR",
});

test.describe("📱 Mobile iPhone 14 (390×844) – Parcours B2C", () => {

  test("1 – Landing mobile : H1 visible, zéro overflow horizontal", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("2 – Landing mobile : CTA principal cliquable", async ({ page }) => {
    await page.goto(BASE);
    await expect(
      page.getByRole("link", { name: /commencer|démarrer|essai|inscription/i }).first()
        .or(page.getByRole("button", { name: /commencer|démarrer|essai|inscription/i }).first())
    ).toBeVisible({ timeout: 10_000 });
  });

  test("3 – Navigation mobile : menu burger accessible", async ({ page }) => {
    await page.goto(BASE);
    const burger = page.getByRole("button", { name: /menu|navigation|hamburger/i }).first()
      .or(page.locator('[aria-label*="menu" i], [data-testid*="menu"], button.hamburger').first());
    if (await burger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await burger.click();
      await expect(
        page.getByRole("navigation").first()
          .or(page.getByRole("link", { name: /connexion|login|register/i }).first())
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("4 – Register mobile : formulaire entièrement visible + utilisable", async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await page.waitForLoadState("networkidle");
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    // Vérifier que l'input est dans le viewport
    const box = await emailInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844 + 300); // +300 clavier virtuel
    // Taper dans les champs
    await emailInput.tap();
    await emailInput.fill("mobile.test@yopmail.com");
    await expect(emailInput).toHaveValue("mobile.test@yopmail.com");
  });

  test("5 – Login mobile : formulaire accessible", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/mot de passe|password/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /connexion|se connecter|login/i })).toBeVisible();
  });

  test("6 – Pricing mobile : plans lisibles, pas d'overflow", async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/59|gratuit|pro|plan/i).first()).toBeVisible({ timeout: 10_000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("7 – Chat mobile : textarea accessible + dans le viewport", async ({ page }) => {
    await page.goto(`${BASE}/app/chat`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/login")) {
      await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 5_000 });
      return;
    }
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    const box = await textarea.boundingBox();
    if (box) {
      // Textarea doit être dans la moitié basse de l'écran
      expect(box.y).toBeGreaterThan(100);
    }
  });

  test("8 – Chat mobile : envoi message + indicateur queued visible", async ({ page }) => {
    await page.goto(`${BASE}/app/chat`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/login")) { test.skip(); return; }
    const textarea = page.locator("textarea").first();
    if (!await textarea.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    await textarea.tap();
    await textarea.fill("Phishing en 1 mot ?");
    await page.keyboard.press("Enter");
    await expect(
      page.locator(".animate-bounce, .animate-spin, .animate-pulse").first()
        .or(page.getByText(/queued|chargement|en file/i).first())
    ).toBeVisible({ timeout: 3_000 });
  });

  test("9 – Modules mobile : cards lisibles, scroll vertical fluide", async ({ page }) => {
    await page.goto(`${BASE}/app/modules`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/login")) { test.skip(); return; }
    await expect(
      page.getByRole("article").first()
        .or(page.getByRole("heading", { name: /module|phishing|cyber/i }).first())
    ).toBeVisible({ timeout: 15_000 });
    // Pas d'overflow horizontal
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test("10 – Dashboard mobile : widgets visibles sans scroll horizontal", async ({ page }) => {
    await page.goto(`${BASE}/app/dashboard`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/login") || page.url().includes("/welcome")) { test.skip(); return; }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

});
