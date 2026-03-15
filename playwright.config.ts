import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://formetoialia.com";
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 1,
  workers: IS_CI ? 1 : 2,
  timeout: 60_000,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: BASE,
    headless: IS_CI,
    slowMo: IS_CI ? 0 : 120,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "b2c-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      testMatch: "**/formetoialia-b2c.spec.ts",
    },
    {
      name: "b2b-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testMatch: "**/formetoialia-b2b.spec.ts",
    },
    {
      name: "mobile-iphone14",
      use: { ...devices["iPhone 14"] },
      testMatch: "**/formetoialia-mobile.spec.ts",
    },
    {
      name: "perf-security",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      testMatch: "**/formetoialia-perf.spec.ts",
    },
    {
      name: "legacy-e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
        headless: true,
        slowMo: 0,
      },
      testMatch: "**/e2e/*.spec.ts",
    },
  ],
});
