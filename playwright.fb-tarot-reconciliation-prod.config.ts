import { defineConfig, devices } from "@playwright/test";

// TEMP verification config (2026-08-06) — LIVE PRODUCTION, read-only.
// Fires real PostHog + Meta PageView events; enters no email, so no DB write.
//   npx playwright test --config=playwright.fb-tarot-reconciliation-prod.config.ts
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-tarot-reconciliation-posthog-prod\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 120_000,
  use: {
    baseURL: "https://www.theseerwithin.com",
    trace: "off",
    // Facebook ad lander — mobile viewport, like ~100% of the real traffic.
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "mobile-390", use: {} }],
});
