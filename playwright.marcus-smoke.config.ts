import { defineConfig, devices } from '@playwright/test';

// Focused, SAFE smoke for the 08 Marcus reading funnel — render + fail-closed only.
// GET-only: no purchases, no DB writes. Targets a server the operator starts on :5050
// (port 5000 is AirPlay on this machine), and does NOT auto-start its own server, so it
// never touches port 5000 or the shared dev DB beyond read-only page/API GETs.
export default defineConfig({
  testDir: './tests',
  testMatch: /marcus-08-funnel-smoke\.spec\.ts/,
  fullyParallel: true,
  reporter: 'line',
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'http://localhost:5050',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // No webServer: the server is started manually on :5050.
});
