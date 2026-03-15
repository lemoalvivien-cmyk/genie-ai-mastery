import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "https://formetoialia.com";

// En local : headed par défaut. En CI : headless forcé.
const IS_CI = !!process.env.CI;
const IS_HEADED = !IS_CI; // local = toujours headed sauf si CI

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 1,
  workers: IS_CI ? 1 : 2,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,

  use: {
    baseURL: BASE_URL,
    headless: !IS_HEADED,        // false en local, true en CI
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Ralentir légèrement pour que le navigateur soit visible
    launchOptions: {
      slowMo: IS_HEADED ? 120 : 0,
    },
  },

  projects: [
    // ── Desktop Chrome (B2C + Performance)
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
      testMatch: "**/formetoialia-full-simulation.spec.ts",
    },

    // ── Desktop Wide (B2B Manager)
    {
      name: "desktop-wide",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
      testMatch: "**/formetoialia-full-simulation.spec.ts",
    },

    // ── Mobile iPhone 14
    {
      name: "mobile-iphone14",
      use: {
        ...devices["iPhone 14"],
      },
      testMatch: "**/formetoialia-full-simulation.spec.ts",
    },

    // ── Legacy E2E (genie.spec.ts)
    {
      name: "legacy-e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
        headless: true, // legacy toujours headless
      },
      testMatch: "**/e2e/*.spec.ts",
    },
  ],
});
