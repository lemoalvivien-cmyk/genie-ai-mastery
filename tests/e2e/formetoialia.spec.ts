/**
 * Playwright E2E tests — Formetoialia
 * Run: bun run test:simulation
 *
 * Requires env vars:
 *   PLAYWRIGHT_BASE_URL (default: https://formetoialia.com)
 *   TEST_USER_EMAIL
 *   TEST_USER_PASSWORD
 */
import { test, expect, Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://formetoialia.com";
const EMAIL = process.env.TEST_USER_EMAIL ?? "test@formetoialia.dev";
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/mot de passe|password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /se connecter|connexion/i }).click();
  await page.waitForURL(/\/app\//);
}

// ── 1. Register page ─────────────────────────────────────────────────────────
test("register page loads and shows form", async ({ page }) => {
  await page.goto(`${BASE}/register`);
  await expect(page.getByRole("heading", { name: /créer|inscription|commencer/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/mot de passe|password/i).first()).toBeVisible();
});

// ── 2. Login → Dashboard ─────────────────────────────────────────────────────
test("login redirects to app", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/app\//);
});

// ── 3. Chat / Copilote IA page loads ─────────────────────────────────────────
test("chat page loads and shows input", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/app/chat`);
  await expect(page.locator("textarea").first()).toBeVisible({ timeout: 10_000 });
});

// ── 4. Chat sends message ────────────────────────────────────────────────────
test("chat: send a message and get a response", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/app/chat`);
  const textarea = page.locator("textarea").first();
  await textarea.fill("Bonjour, c'est quoi le phishing en 1 phrase ?");
  await textarea.press("Enter");
  await expect(page.locator(".animate-bounce").first()).toBeVisible({ timeout: 5_000 });
  await expect(page.locator(".animate-bounce").first()).toBeHidden({ timeout: 30_000 });
});

// ── 5. Phishing Lab loads ────────────────────────────────────────────────────
test("phishing lab loads", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/app/labs/phishing`);
  await expect(page.getByText(/phishing|simulat/i).first()).toBeVisible({ timeout: 10_000 });
});

// ── 6. Pricing page shows 59€ and 14 jours ──────────────────────────────────
test("pricing page shows 59€ plan and 14-day trial", async ({ page }) => {
  await page.goto(`${BASE}/pricing`);
  await expect(page.getByText(/59/)).toBeVisible();
  await expect(page.getByText(/essai gratuit|14 jours/i)).toBeVisible();
  // Must NOT show money-back guarantee (not implemented)
  await expect(page.getByText(/satisfait ou remboursé/i)).not.toBeVisible();
});

// ── 7. Non-manager user is redirected from /manager ─────────────────────────
test("non-manager user is redirected from /manager", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/manager`);
  await expect(page).toHaveURL(/\/pricing|\/app\//);
});

// ── 8. Settings page loads ──────────────────────────────────────────────────
test("settings page shows subscription info", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/app/settings`);
  await expect(page.getByText(/abonnement|profil/i).first()).toBeVisible();
});

// ── 9. Verify attestation page is public ────────────────────────────────────
test("verify attestation page loads publicly", async ({ page }) => {
  await page.goto(`${BASE}/verify/test-attestation-id`);
  // Should show a verification page, not redirect to login
  await expect(page).not.toHaveURL(/\/login/);
});
