import { defineConfig, devices } from "@playwright/test";

// Browser smoke for the NEW `thumb-angle` fb-palm sign (life-line arc).
//
// ⚠ LOCAL ONLY, BY DESIGN — the spec hard-refuses any non-localhost base URL.
//   Dev and production SHARE ONE DATABASE, so there is no "safe" remote target:
//   this walks the real funnel and drives /api/lead + /api/chat.
//
// Run against a server wired to the isolated local Postgres sandbox:
//   node scripts/make-sandbox-env.mjs
//   DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts
//   npx playwright test --config=playwright.fb-palm-thumb-angle.config.ts
//
// The client-side Meta pixel id is HARDCODED, so `.env.sandbox` cannot mute it —
// the spec blocks facebook.* at the network layer and reports the blocked count.
// See the memory note `sandbox-isolation-dotenv-windows`.
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-palm-thumb-angle-smoke\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 180_000,
  use: {
    baseURL: process.env.LOCAL_BASE_URL || "http://127.0.0.1:5000",
    trace: "off",
    // Phone width — these are Facebook ad landers; ~100% of traffic is mobile.
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "mobile-390", use: {} }],
});
