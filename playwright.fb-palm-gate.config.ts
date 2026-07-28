import { defineConfig, devices } from "@playwright/test";

// Browser coverage for the fb-palm COMMITMENT GATE (`35_palm_gate`).
//
// ⚠ LOCAL ONLY, BY DESIGN — the spec hard-refuses any non-localhost base URL.
//   Dev and production SHARE ONE DATABASE, so there is no "safe" remote target.
//
// The spec stubs /api/lead (to pick the arm), /api/chat (deterministic, zero
// Anthropic calls) and /api/checkout (no Stripe session, no navigation), so it
// never touches the live variant pool and costs nothing to run.
//
// Run against a server wired to the isolated local Postgres sandbox:
//   node scripts/make-sandbox-env.mjs
//   DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts
//   npx playwright test --config=playwright.fb-palm-gate.config.ts
//
// The client-side Meta pixel id is HARDCODED, so `.env.sandbox` cannot mute it —
// the spec blocks facebook.* at the network layer. See the memory note
// `sandbox-isolation-dotenv-windows`.
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-palm-commitment-gate\.spec\.ts/,
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
