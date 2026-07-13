import { defineConfig, devices } from "@playwright/test";

// Smoke for the /fb-palm hand-size sign. Defaults to the DEV deploy, because
// the hand-size art rework ships there first.
//   npx playwright test --config=playwright.fb-palm-handsize.config.ts
//   PROD_BASE_URL=https://www.theseerwithin.com npx playwright test --config=...
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-palm-handsize-smoke\.spec\.ts/,
  workers: 1,
  retries: 1,
  reporter: "line",
  use: {
    baseURL:
      process.env.PROD_BASE_URL ||
      "https://the-seer-within-v2-development.up.railway.app",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
