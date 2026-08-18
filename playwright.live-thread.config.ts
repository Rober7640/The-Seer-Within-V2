import { defineConfig, devices } from "@playwright/test";

// Browser coverage for the LIVE THREAD arrival surface on /evelyn.
//
// ⚠ LOCAL ONLY, BY DESIGN — the spec hard-refuses any non-localhost base URL.
//   Dev and production SHARE ONE DATABASE, so there is no "safe" remote target.
//
// Deliberately NO `webServer`. The root playwright.config.ts boots `npm run dev`,
// which reads `.env` — and `.env`'s DATABASE_URL is the shared Supabase instance.
// This suite submits email addresses to /check-email, whose job is to mail
// people, so it runs against a server YOU started on the local sandbox DB:
//
//   PORT=5100 BASE_URL=http://localhost:5100 \
//     npx cross-env NODE_ENV=development npx tsx --env-file=.env.test server/index.ts
//   npx playwright test --config=playwright.live-thread.config.ts
//
// `.env.test` is git-ignored and machine-specific; see server/lib/testGuards.ts
// for the keys it must blank (Resend, PostHog, Turnstile, NeverBounce, and all
// three Anthropic keys) and why anything it does not name falls through to the
// LIVE values in `.env`.
//
// NODE_ENV must be `development`, not `production`: the spec reaches the arm via
// `?mechanic=live_thread`, which EvelynLanderPage gates behind
// `import.meta.env.DEV`. A production build cannot see the dark arm at all.
export default defineConfig({
  testDir: "./tests",
  testMatch: /(live-thread-evelyn|evelyn-lander-campaign-cache)\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 120_000,
  use: {
    baseURL: process.env.LOCAL_BASE_URL || "http://localhost:5100",
    trace: "off",
    // The traffic is a daily marketing email opened on a phone.
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "mobile-390", use: {} }],
});
