/**
 * Playwright E2E tests – GENIE IA
 * Run: npx playwright test
 *
 * Requires PLAYWRIGHT_BASE_URL env var (default: http://localhost:5173)
 * and TEST_USER_EMAIL / TEST_USER_PASSWORD for an existing test account.
 */
import { test, expect, Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const EMAIL = process.env.TEST_USER_EMAIL ?? "test@genie-ia.dev";
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "test123456!";

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/mot de passe|password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /se connecter|connexion/i }).click();
  await page.waitForURL(/\/app\//);
}

// ── 1. Register flow ────────────────────────────────────────────────────────
test("register page loads and shows form", async ({ page }) => {
  await page.goto(`${BASE}/register`);
  await expect(page.getByRole("heading", { name: /créer|inscription|commencer/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/mot de passe|password/i).first()).toBeVisible();
});

// ── 2. Login → Dashboard ────────────────────────────────────────────────────
test("login redirects to dashboard", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/app\//);
});

// ── 3. Jarvis page loads ─────────────────────────────────────────────────────
test("jarvis page loads and shows ask button", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/app/jarvis`);
  await expect(page.getByRole("button", { name: /jarvis|demander|analyser/i }).first()).toBeVisible({ timeout: 10_000 });
});

// ── 4. Chat sends message ────────────────────────────────────────────────────
test("chat: send a message and get a response", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/app/chat`);
  const textarea = page.locator("textarea").first();
  await textarea.fill("Bonjour, c'est quoi le phishing en 1 phrase ?");
  await textarea.press("Enter");
  // Wait for assistant response (loading dots then content)
  await expect(page.locator(".animate-bounce").first()).toBeVisible({ timeout: 5_000 });
  await expect(page.locator(".animate-bounce").first()).toBeHidden({ timeout: 30_000 });
});

// ── 5. Phishing Lab loads ────────────────────────────────────────────────────
test("phishing lab loads with email list", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/app/labs/phishing`);
  await expect(page.getByText(/phishing|simulat/i).first()).toBeVisible({ timeout: 10_000 });
});

// ── 6. Pricing page shows 59€ ────────────────────────────────────────────────
test("pricing page shows 59€ plan", async ({ page }) => {
  await page.goto(`${BASE}/pricing`);
  await expect(page.getByText(/59/)).toBeVisible();
  await expect(page.getByText(/essai gratuit|14 jours/i)).toBeVisible();
});

// ── 7. Non-pro user cannot access /manager ──────────────────────────────────
test("non-pro user is redirected from /manager to /pricing", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/manager`);
  // Either redirected to /pricing or /app/dashboard
  await expect(page).toHaveURL(/\/pricing|\/app\//);
});

// ── 8. Settings page loads ──────────────────────────────────────────────────
test("settings page shows profile info", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/app/settings`);
  await expect(page.getByText(/abonnement|profil/i).first()).toBeVisible();
});
