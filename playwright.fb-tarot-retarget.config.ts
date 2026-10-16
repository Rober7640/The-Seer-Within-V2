import { defineConfig, devices } from "@playwright/test";

// Coverage for the /fb-tarot RETARGETING page (`/fb-tarot/b?src=retarget`) — the offer
// page: render, prices, both buy blocks' /api/checkout payload, the name, the
// Stripe-cancel return — and that a normal /fb-tarot/b visit is untouched.
// Plus its POST-PURCHASE path (fb-tarot-retarget-post-purchase.spec.ts): U1, U2 with the
// fixed reveal (no AI call), the downsell and the thank-you → Evelyn, with a normal tarot
// buyer as the control. That spec seeds two rows in the LOCAL sandbox DB only.
//
// ⚠ LOCAL ONLY, BY DESIGN — dev and production SHARE ONE DATABASE, so there is no
//   "safe" remote target, and there is deliberately NO `webServer` block (the default
//   config boots `npm run dev`, which loads the real .env). The spec hard-refuses any
//   non-localhost base URL, intercepts /api/checkout (never reaches Stripe), never
//   types into a chat (no LLM turn, no /api/lead) and blocks Meta + PostHog at the
//   network layer.
//
// Run against a server wired to the isolated local Postgres sandbox:
//   node scripts/make-sandbox-env.mjs
//   DOTENV_CONFIG_PATH=.env.sandbox PORT=5066 npx tsx server/index.ts
//   LOCAL_BASE_URL=http://127.0.0.1:5066 npx playwright test --config=playwright.fb-tarot-retarget.config.ts
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-tarot-retarget(-post-purchase)?\.spec\.ts/,
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
