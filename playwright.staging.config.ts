// Staging-only runner: point the existing specs at the Railway dev host and
// start NO local server. Deliberately a separate file so playwright.config.ts —
// which every local run and CI uses — keeps its localhost webServer contract.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: 'line',
  use: {
    baseURL: process.env.STAGING_URL ?? 'https://the-seer-within-v2-development.up.railway.app',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
