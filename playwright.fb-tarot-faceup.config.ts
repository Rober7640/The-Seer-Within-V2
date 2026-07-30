import { defineConfig, devices } from "@playwright/test";

// FACE-UP decode-him report run — the `arcana-mfh` deck on the 3 SIGNED-OFF
// headlines (cards-honest / cards-return / cards-feels), the same three the
// face-down `return-mhf` deck was signed off on (2026-07-28).
//
// Produces the boss-facing deliverable: 5 screenshots + a plain-text transcript
// per hook, into fb-tarot/report/screenshots/arcana-mfh-<hook>/.
//
// ⚠ LOCAL ONLY, BY DESIGN — dev and production SHARE ONE DATABASE, so there is no
//   "safe" remote target. There is deliberately NO `webServer` block here: the
//   default playwright.config.ts starts `npm run dev`, which loads the real .env
//   (LIVE Stripe key + the shared PRODUCTION database). Start the server yourself,
//   pointed at the isolated sandbox:
//
//     node scripts/make-sandbox-env.mjs
//     DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts
//     npx playwright test --config=playwright.fb-tarot-faceup.config.ts
//
// The chat turns here are REAL LLM calls (that is the point — the transcript is the
// deliverable), but every outbound integration is muted by .env.sandbox and the spec
// blocks facebook.* at the network layer. ?noemail=1 means /api/lead never fires, so
// there is no lead row, no AWeber call and no Meta Lead event.
// See the memory note `sandbox-isolation-dotenv-windows`.
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-tarot-flow\.spec\.ts/,
  // Only the face-up decode-him cases. Without this the other 4 cases in the spec
  // (arcana-eef, return-mhf, the self-frame hooks) re-run and burn LLM calls
  // re-generating screenshots that are already in the report.
  grep: /arcana-mfh \(cards-(honest|return|feels)\)/,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 300_000,
  use: {
    baseURL: process.env.LOCAL_BASE_URL || "http://127.0.0.1:5000",
    trace: "off",
    // Phone width — these are Facebook ad landers; ~100% of traffic is mobile.
    // 390x844 also matches the existing report screenshots exactly, so the new
    // face-up section renders consistently alongside the face-down one.
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "mobile-390", use: {} }],
});
