import { defineConfig, devices } from "@playwright/test";

// heart-line tracking check — LOCAL SANDBOX ONLY. Boot the muted sandbox first.
const BASE = process.env.LOCAL_BASE_URL || "http://127.0.0.1:5000";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(BASE)) {
  throw new Error(`REFUSING to run against "${BASE}" — localhost sandbox only.`);
}

export default defineConfig({
  testDir: "./tests",
  testMatch: /fb-palm-heart-line-tracking\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: BASE, trace: "off" },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
});
