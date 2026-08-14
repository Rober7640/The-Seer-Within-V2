import { defineConfig, devices } from "@playwright/test";

// Browser coverage for the emailed V1 recovery link (`/<funnel>/chat?resume=<id>`).
//
// ⚠ LOCAL ONLY, BY DESIGN — the spec hard-refuses any non-localhost base URL.
//
// This one is cheaper to run than the other V1 specs: it stubs
// /api/conversation/resume/:id (which is what carries her arms onto a resumed
// session), /api/chat and /api/checkout, so it never reads or writes a database,
// never calls Anthropic, and never creates a Stripe session. The server only has
// to serve the SPA.
//
// Run:
//   npm run dev
//   npx playwright test --config=playwright.v1-resume.config.ts
//
// The client-side Meta pixel id is HARDCODED, so no env can mute it — the spec
// blocks facebook.* at the network layer instead.
export default defineConfig({
  testDir: "./tests",
  testMatch: /v1-resume-arms\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 120_000,
  use: {
    baseURL: process.env.LOCAL_BASE_URL || "http://127.0.0.1:5000",
    trace: "off",
    // Phone width — recovery emails are opened on a phone.
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "mobile-390", use: {} }],
});
