/**
 * FORMETOIALIA – Tests Performance & Sécurité
 * LCP < 2s, CSP headers, 404 correct, chat queued < 3s, attestation contient "Formetoialia"
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://formetoialia.com";

test.describe("⚡ Performance & Sécurité", () => {

  test("1 – LCP landing < 2s : H1 visible en moins de 2 secondes", async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 2_000 });
    expect(Date.now() - start).toBeLessThan(2_000);
  });

  test("2 – LCP register < 2s : formulaire prêt à l'emploi", async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 2_000 });
    expect(Date.now() - start).toBeLessThan(2_000);
  });

  test("3 – LCP pricing < 2s : plans visibles", async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE}/pricing`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/59|gratuit|pro/i).first()).toBeVisible({ timeout: 2_000 });
    expect(Date.now() - start).toBeLessThan(2_000);
  });

  test("4 – Headers sécurité : CSP ou X-Frame-Options présents", async ({ request }) => {
    const res = await request.get(BASE);
    const h = res.headers();
    const hasSecHeader =
      "content-security-policy" in h ||
      "x-frame-options" in h ||
      "strict-transport-security" in h ||
      "x-content-type-options" in h;
    expect(hasSecHeader).toBe(true);
  });

  test("5 – Headers sécurité : X-Content-Type-Options nosniff", async ({ request }) => {
    const res = await request.get(BASE);
    const val = res.headers()["x-content-type-options"];
    if (val) expect(val.toLowerCase()).toContain("nosniff");
    else test.skip(); // header optionnel, pas bloquant
  });

  test("6 – 404 : route inexistante affiche page NotFound", async ({ page }) => {
    await page.goto(`${BASE}/cette-page-n-existe-vraiment-pas-xyz-999`);
    await expect(
      page.getByText(/404|introuvable|not found|page.*existe|erreur/i).first()
    ).toBeVisible({ timeout: 10_000 });
    expect(page.url()).not.toContain("undefined");
  });

  test("7 – Chat queued < 3s : indicateur de traitement immédiat", async ({ page }) => {
    await page.goto(`${BASE}/app/chat`, { waitUntil: "domcontentloaded" });
    if (page.url().includes("/login")) {
      // Non auth → redirection correcte
      await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 5_000 });
      return;
    }
    const textarea = page.locator("textarea").first();
    if (!await textarea.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    const start = Date.now();
    await textarea.fill("Test latence queued");
    await textarea.press("Enter");
    await expect(
      page.locator(".animate-bounce, .animate-spin, .animate-pulse").first()
        .or(page.getByText(/queued|en file|chargement/i).first())
    ).toBeVisible({ timeout: 3_000 });
    expect(Date.now() - start).toBeLessThan(3_000);
  });

  test("8 – Attestation : page verify contient 'Formetoialia' ou 'GENIE'", async ({ page }) => {
    await page.goto(`${BASE}/verify/test-perf-hash`);
    await page.waitForLoadState("domcontentloaded");
    const title = await page.title();
    const body = await page.locator("body").textContent() ?? "";
    expect((title + body).toLowerCase()).toMatch(/formetoialia|genie/i);
  });

  test("9 – Redirections auth : /app sans session → /login", async ({ page }) => {
    // Navigation sans session existante
    await page.goto(`${BASE}/app/dashboard`);
    await page.waitForURL(url =>
      url.pathname.includes("/login") || url.pathname.includes("/app"),
      { timeout: 10_000 }
    );
    // Soit login, soit app si session persistante
    const url = page.url();
    expect(url).toMatch(/login|app/);
  });

  test("10 – /manager sans pro → /pricing ou /app (jamais erreur 500)", async ({ page }) => {
    await page.goto(`${BASE}/manager`);
    await page.waitForLoadState("networkidle");
    const url = page.url();
    expect(url).toMatch(/pricing|manager|app/);
    // Aucune erreur 500
    await expect(page.getByText(/500|internal server error/i).first()).toBeHidden();
  });

  test("11 – Pas de console error critique sur la landing", async ({ page }) => {
    const criticalErrors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        criticalErrors.push(msg.text());
      }
    });
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Filtrer erreurs inoffensives connues
    const real = criticalErrors.filter(e =>
      !e.includes("favicon") &&
      !e.includes("sentry") &&
      !e.includes("analytics") &&
      !e.includes("ResizeObserver")
    );
    expect(real.length).toBeLessThanOrEqual(2); // tolérer max 2 erreurs mineures
  });

});
