import { defineConfig, devices } from "@playwright/test";

// heart-line sign smoke — LOCAL SANDBOX ONLY, at mobile width.
//
// No webServer: boot the app yourself against the muted sandbox first, so this
// can never accidentally point at a real environment (dev and prod share one DB).
//
//   Start-Process ... pg_ctl start   # sandbox PG on :5433
//   node scripts/make-sandbox-env.mjs
//   DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts
//   npx playwright test --config=playwright.fb-palm-heart-line.config.ts
const BASE = process.env.LOCAL_BASE_URL || "http://127.0.0.1:5000";

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(BASE)) {
  throw new Error(`REFUSING to run against "${BASE}" — localhost sandbox only.`);
}

export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-palm-heart-line-smoke\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    trace: "off",
    screenshot: "only-on-failure",
  },
  // The viewport MUST live inside the project: a `...devices[...]` spread carries
  // its own viewport and silently overrides anything set in top-level `use`,
  // which is how an earlier run of this config quietly executed at 1280x720
  // while claiming to be mobile. iPhone-class width is the point — the two tiles
  // are only ~150px each here, which is where art legibility actually has to hold.
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
  ],
});
