import { defineConfig, devices } from "@playwright/test";

// Generic runner for tests/fb-tarot-flow.spec.ts — walks a lander end to end and
// writes 5 screenshots + a plain-text transcript per case into
// fb-tarot/report/screenshots/<slug>/. Select cases with -g:
//
//   npx playwright test --config=playwright.fb-tarot-flow.config.ts \
//     -g "return-mhf \(cards-(who-he-is|real-person|misled)\)"
//
// (playwright.fb-tarot-faceup.config.ts is the same thing pinned to the face-up
// arcana-mfh cases; this one leaves the selection to you.)
//
// ⚠ LOCAL ONLY, BY DESIGN — dev and production SHARE ONE DATABASE, so there is no
//   "safe" remote target. There is deliberately NO `webServer` block: the default
//   playwright.config.ts starts `npm run dev`, which loads the real .env (LIVE Stripe
//   key + the shared PRODUCTION database). Start the server yourself against the
//   isolated sandbox:
//
//     node scripts/make-sandbox-env.mjs
//     DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts
//
// The chat turns are REAL LLM calls (that is the point — the transcript is the
// deliverable), but .env.sandbox mutes every outbound integration, the spec blocks
// facebook.* at the network layer, and ?noemail=1 means /api/lead never fires.
// See the memory note `sandbox-isolation-dotenv-windows`.
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-tarot-flow\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 300_000,
  use: {
    baseURL: process.env.LOCAL_BASE_URL || "http://127.0.0.1:5000",
    trace: "off",
    // Phone width — these are Facebook ad landers; ~100% of traffic is mobile, and
    // 390x844 matches the existing report screenshots so sections render consistently.
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "mobile-390", use: {} }],
});
