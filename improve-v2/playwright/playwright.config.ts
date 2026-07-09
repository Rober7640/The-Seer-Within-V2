import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the improve-v2 V2 suite.
 *
 * Scope: DETERMINISTIC end-to-end regression around the V2 chat engine —
 *   • the refund/billing deflection template (code-level, no LLM)
 *   • the V2 reading round-trip (auth → greeting → message → in-character reply)
 *   • safety interception
 * LLM *behavioural quality* (give-then-ask, no hard dates, no verbatim loops) is
 * scored by the eval harness (improve-v2/eval), NOT here — asserting model text in
 * Playwright would be flaky. See ./README.md.
 *
 * ALL output stays under improve-v2/playwright/ (results/ + report/), per request.
 *
 * Run from repo root:
 *   npx playwright test -c improve-v2/playwright/playwright.config.ts
 */
export default defineConfig({
  testDir: '.',
  outputDir: './results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000, // real LLM turns can take 10-20s
  reporter: [
    ['list'],
    ['html', { outputFolder: './report', open: 'never' }],
    ['json', { outputFile: './results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test',
      DISABLE_RATE_LIMIT: 'true',
      // Force-run the draft Evelyn prompt experiment for THIS server process only,
      // so users who bucket onto B exercise the improve-v2 prompt. Production DB rows
      // stay draft. Refund + smoke assertions are arm-agnostic and pass on A or B.
      EXPERIMENT_FORCE_RUNNING: 'persona_prompt_evelyn_2026',
    },
  },
});
