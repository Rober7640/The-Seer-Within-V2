import { defineConfig, devices } from "@playwright/test";

// PostHog event capture for the /fb-tarot face-down ad links.
//
// ⚠ LOCAL ONLY. Target is a STANDALONE CLIENT-ONLY Vite dev server — no Express, no
//   database, no Stripe, no email. The funnel's API calls simply 404, which is fine:
//   every event asserted here is emitted client-side on route change / tap.
//
//   VITE_POSTHOG_API_KEY=phc_local_capture_only npx vite --port 5199 --strictPort --host 127.0.0.1
//   npx playwright test --config=playwright.fb-tarot-posthog.config.ts
//
// The dummy VITE_POSTHOG_API_KEY is REQUIRED: without it `initialized` stays false and
// Vite dead-code-eliminates every track() call, so the bundle contains no events at all
// and the spec would pass vacuously against an app that emits nothing.
//
// The spec additionally blocks facebook/posthog/google/clarity/trackdesk at the network
// layer, so nothing leaves the machine even though the Meta pixel id is hardcoded in
// index.html. See the memory note `sandbox-isolation-dotenv-windows`.
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-tarot-posthog-capture\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 120_000,
  use: {
    baseURL: process.env.LOCAL_BASE_URL || "http://127.0.0.1:5199",
    trace: "off",
    // Phone width — these are Facebook ad landers; ~100% of traffic is mobile.
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "mobile-390", use: {} }],
});
