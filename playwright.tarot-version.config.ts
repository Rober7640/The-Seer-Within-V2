import { defineConfig } from "@playwright/test";

// Config for the /fb-tarot Version B-vs-C split walk.
//
// 🔴 NO `webServer` BLOCK, DELIBERATELY. The default playwright.config.ts starts
// `npm run dev`, which loads the real .env — a LIVE Stripe key and whichever
// database that file points at. This spec targets an ALREADY-DEPLOYED remote
// environment by absolute URL instead, so nothing is booted locally and no local
// env is read.
//
// Target with TAROT_BASE (defaults to Railway dev inside the spec). Point it at
// production only to observe; the spec enters no email, so it captures no lead and
// fires no LLM call — but it DOES create one exposure per visitor it walks, and on
// production those land in the live denominator.
//
//   npx playwright test --config=playwright.tarot-version.config.ts
//
// Requires the experiment to be RUNNING on the target: the whole point is that every
// visitor gets the same v=c URL and the server decides the arm.
export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-tarot-version-split\.spec\.ts/,
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    // No baseURL — the spec uses absolute URLs so the target is always explicit
    // and can never silently fall back to localhost.
    headless: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  projects: [{ name: "mobile-390", use: {} }],
});
