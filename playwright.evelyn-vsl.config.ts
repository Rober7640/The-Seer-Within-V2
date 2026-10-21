import { defineConfig, devices } from '@playwright/test';

// Evelyn video funnel (Job A, Task 12) e2e — tests/evelyn-vsl-funnel.spec.ts.
//
// Port 5000 is the macOS AirPlay Receiver on this machine (and on anyone else's with
// AirPlay on), NOT a free port — playwright.config.ts's hardcoded 5000 cannot be
// trusted here. This worktree's own .env already pins PORT=5008 for exactly that
// reason. Mirrors playwright.marcus-smoke.config.ts's precedent: a dedicated config,
// no auto-managed webServer (start `npm run dev` yourself first), targeting the
// worktree's own port so this never races a different session's server on 5000.
export default defineConfig({
  testDir: './tests',
  testMatch: /evelyn-vsl-funnel\.spec\.ts/,
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: process.env.EVELYN_VSL_BASE_URL || 'http://localhost:5008',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // No webServer: start `npm run dev` yourself (reads PORT=5008 from .env) before running.
});
