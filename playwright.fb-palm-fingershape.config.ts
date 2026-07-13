import { defineConfig, devices } from "@playwright/test";

// Read-only production smoke for the 3 finger-shape hook links.
//   npx playwright test --config=playwright.fb-palm-fingershape.config.ts
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-palm-fingershape-prod-smoke\.spec\.ts/,
  workers: 1,
  retries: 1,
  reporter: "line",
  use: {
    baseURL: process.env.PROD_BASE_URL || "https://www.theseerwithin.com",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
