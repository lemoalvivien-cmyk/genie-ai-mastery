import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "https://formetoialia.com";

export default defineConfig({
  // Inclure tous les fichiers de test (e2e legacy + simulations)
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false, // séquentiel pour respecter les flux utilisateur
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    headless: process.env.HEADED !== "true" && !!process.env.CI,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // ── Desktop Chrome (principal)
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        headless: process.env.HEADED !== "true" && !!process.env.CI,
      },
      testMatch: "**/formetoialia-full-simulation.spec.ts",
    },

    // ── Desktop Wide (manager dashboard)
    {
      name: "desktop-wide",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        headless: process.env.HEADED !== "true" && !!process.env.CI,
      },
      testMatch: "**/formetoialia-full-simulation.spec.ts",
    },

    // ── Mobile (iPhone 14)
    {
      name: "mobile-iphone14",
      use: {
        ...devices["iPhone 14"],
        headless: process.env.HEADED !== "true" && !!process.env.CI,
      },
      testMatch: "**/formetoialia-full-simulation.spec.ts",
    },

    // ── Legacy E2E (genie.spec.ts)
    {
      name: "legacy-e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL:
          process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
      },
      testMatch: "**/e2e/*.spec.ts",
    },
  ],
});
