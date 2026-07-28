import { defineConfig, devices } from "@playwright/test";

// Coverage for the /fb-tarot card draw (shuffle, reveal integrity, hand-off,
// per-hook headlines, signed-off copy).
//
// ⚠ LOCAL ONLY, BY DESIGN — dev and production SHARE ONE DATABASE, so there is no
//   "safe" remote target. The spec hard-refuses any non-localhost base URL.
//
// This spec never leaves the bridge: no /api/lead, no chat turns, no LLM calls,
// no DB writes. The client Meta pixel id is hardcoded in index.html so .env.sandbox
// cannot mute it — the spec blocks facebook.* at the network layer instead.
//
// Run against a server wired to the isolated local Postgres sandbox:
//   node scripts/make-sandbox-env.mjs
//   DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts
//   npx playwright test --config=playwright.fb-tarot-draw.config.ts
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-tarot-card-draw\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 300_000,
  use: {
    baseURL: process.env.LOCAL_BASE_URL || "http://127.0.0.1:5000",
    trace: "off",
    // Phone width — these are Facebook ad landers; ~100% of traffic is mobile.
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "mobile-390", use: {} }],
});
