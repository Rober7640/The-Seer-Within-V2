import { defineConfig, devices } from "@playwright/test";

// Regression runner for the $57.77 charge — see tests/price-funnel-stickiness.spec.ts.
// LOCAL server, LOCAL database, TEST Stripe. API-level, so no LLM calls: it runs in
// seconds, unlike the browser walks.
//
//   npm run build
//   DOTENV_CONFIG_PATH=.env.bumpwalk node dist/index.cjs
//   npx playwright test --config=playwright.price-funnel-stickiness.config.ts
//
// No `webServer` block ON PURPOSE: the default playwright.config.ts starts
// `npm run dev`, which loads the real .env — LIVE Stripe key, production database.
// Start the server yourself against .env.bumpwalk. The spec itself refuses any
// database host that is not 127.0.0.1/localhost.
export default defineConfig({
  testDir: "./tests",
  testMatch: /price-funnel-stickiness\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 60_000,
  use: {
    baseURL: process.env.LOCAL_BASE_URL || "http://127.0.0.1:5000",
    trace: "off",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "api", use: {} }],
});
