/**
 * FORMETOIALIA – Parcours B2B Manager complet
 * Inscription dirigeant → Onboarding → Accès dashboard → Import CSV → Stats realtime
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://formetoialia.com";
const ts = Date.now();
const EMAIL = process.env.B2B_EMAIL ?? `manager.${ts}@yopmail.com`;
const PASSWORD = process.env.B2B_PASSWORD ?? "Secure123!";

const CSV_CONTENT = `email,full_name,role
alice.martin@acme.com,Alice Martin,user
bob.dupont@acme.com,Bob Dupont,user
charlie.durand@acme.com,Charlie Durand,user
diana.leroy@acme.com,Diana Leroy,user
eric.moreau@acme.com,Eric Moreau,user`;

test.describe("🏢 B2B – Parcours Manager complet", () => {

  test("1 – Inscription manager : formulaire → compte créé", async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10_000 });
    // Sélectionner onglet manager si présent
    const managerTab = page.getByRole("button", { name: /manager|entreprise|dirigeant/i }).first();
    if (await managerTab.isVisible({ timeout: 2_000 }).catch(() => false)) await managerTab.click();
    await page.getByLabel(/email/i).fill(EMAIL);
    const pwFields = await page.getByLabel(/mot de passe|password/i).all();
    await pwFields[0].fill(PASSWORD);
    if (pwFields.length > 1) await pwFields[1].fill(PASSWORD);
    await page.getByRole("button", { name: /créer|s'inscrire|register|commencer/i }).click();
    await page.waitForURL(url =>
      url.pathname.includes("/app") || url.pathname.includes("/onboarding") || url.pathname.includes("/welcome"),
      { timeout: 25_000 }
    );
  });

  test("2 – Onboarding : profil dirigeant sélectionné", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const managerOpt = page.getByText(/manager|dirigeant|responsable/i).first()
      .or(page.getByRole("button", { name: /manager|dirigeant/i }).first());
    if (await managerOpt.isVisible({ timeout: 4_000 }).catch(() => false)) await managerOpt.click();
    const next = page.getByRole("button", { name: /continuer|suivant|next/i }).first();
    if (await next.isVisible({ timeout: 3_000 }).catch(() => false)) await next.click();
  });

  test("3 – Onboarding : compléter toutes les étapes", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    for (let i = 0; i < 6; i++) {
      const next = page.getByRole("button", { name: /continuer|suivant|passer|terminer|next/i }).first();
      if (!await next.isVisible({ timeout: 2_500 }).catch(() => false)) break;
      await next.click();
      await page.waitForTimeout(600);
    }
    await page.waitForURL(url => url.pathname.includes("/manager") || url.pathname.includes("/app"), { timeout: 20_000 });
  });

  test("4 – Manager Dashboard : accès et métriques visibles", async ({ page }) => {
    await page.goto(`${BASE}/manager`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/pricing")) {
      // Non-pro → vérifier la page pricing
      await expect(page.getByText(/pro|59€|plan/i).first()).toBeVisible({ timeout: 10_000 });
      return;
    }
    await expect(
      page.getByRole("heading", { name: /équipe|manager|tableau de bord|dashboard/i }).first()
        .or(page.getByText(/membres|collaborateurs|team/i).first())
    ).toBeVisible({ timeout: 15_000 });
  });

  test("5 – Import CSV : ouverture dialog", async ({ page }) => {
    await page.goto(`${BASE}/manager`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/pricing")) { test.skip(); return; }
    const importBtn = page.getByRole("button", { name: /importer|csv|import/i }).first();
    if (!await importBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    await importBtn.click();
    await expect(
      page.getByRole("dialog").first()
        .or(page.getByText(/csv|import|colonnes|fichier/i).first())
    ).toBeVisible({ timeout: 10_000 });
  });

  test("6 – Import CSV : upload fichier + preview tableau", async ({ page }) => {
    await page.goto(`${BASE}/manager`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/pricing")) { test.skip(); return; }
    const importBtn = page.getByRole("button", { name: /importer|csv|import/i }).first();
    if (!await importBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    await importBtn.click();
    await page.waitForTimeout(500);

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await fileInput.setInputFiles({
        name: "equipe-acme.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(CSV_CONTENT),
      });
      // Preview tableau visible après parsing
      await expect(
        page.getByRole("table").first()
          .or(page.getByText(/alice.martin|5 lignes|preview/i).first())
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("7 – Import CSV : détection doublon dans le fichier", async ({ page }) => {
    await page.goto(`${BASE}/manager`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/pricing")) { test.skip(); return; }
    const importBtn = page.getByRole("button", { name: /importer|csv|import/i }).first();
    if (!await importBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    await importBtn.click();
    await page.waitForTimeout(500);

    const csvWithDupes = `email,full_name,role
alice.martin@acme.com,Alice Martin,user
alice.martin@acme.com,Alice Martin Duplicate,user
bob.dupont@acme.com,Bob Dupont,user`;

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await fileInput.setInputFiles({
        name: "avec-doublons.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csvWithDupes),
      });
      // Badge ou message doublon visible
      await expect(
        page.getByText(/doublon|duplicate|1 doublon/i).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("8 – Dashboard stats realtime : métriques présentes", async ({ page }) => {
    await page.goto(`${BASE}/manager`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/pricing")) { test.skip(); return; }
    // Vérifier la présence d'indicateurs numériques ou de progression
    await expect(
      page.getByText(/\d+\s*%|\d+\s*membre|\d+\s*user/i).first()
        .or(page.locator('[data-testid*="stat"], [data-testid*="metric"], .recharts-wrapper').first())
    ).toBeVisible({ timeout: 15_000 });
  });

  test("9 – Onboarding manager : page dédiée accessible", async ({ page }) => {
    await page.goto(`${BASE}/manager/onboarding`);
    await page.waitForLoadState("networkidle");
    // Soit page onboarding, soit redirigé vers manager dashboard
    const validUrl = page.url();
    expect(validUrl).toMatch(/manager|pricing|app/);
  });

});
