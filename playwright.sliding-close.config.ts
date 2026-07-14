import { defineConfig } from "@playwright/test";

// Integration proof that the $55/$35 sliding close is assigned to the fb-palm THUMB
// ads and to nothing else. Drives the real /api/lead endpoint.
//
// ⚠ LOCAL ONLY, BY DESIGN. Dev and production SHARE ONE DATABASE, so there is no
//   "safe" remote target — pointing this at the dev deploy would write ~160 real
//   conversation rows into the production DB and fire AWeber/Resend/Kit. The spec
//   itself hard-refuses any non-localhost base URL.
//
// Run against a local server wired to the isolated local Postgres sandbox:
//   DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seer \
//   V1_PRICE_VARIANTS_JSON="$(cat improve-v1/go-live-pool.json)" \
//   npm run dev
//   npx playwright test --config=playwright.sliding-close.config.ts
//
// See docs/sliding-close-thumb-only-runbook.md.
export default defineConfig({
  testDir: "./tests",
  testMatch: /sliding-close-thumb-only\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 120_000,
  use: {
    baseURL: process.env.LOCAL_BASE_URL || "http://127.0.0.1:5000",
    trace: "off",
  },
});
