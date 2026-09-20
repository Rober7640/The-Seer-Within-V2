import { test, expect } from '@playwright/test';

// 08 Marcus reading funnel — focused render + fail-closed smoke.
//
// SAFE by construction: every check is a GET. No booking is submitted, no card is
// charged, no session id is supplied — so the money paths never run and nothing is
// written. It proves the funnel PAGES mount and behave correctly, which is the gap the
// unit/integration tests can't cover (they test logic, not the rendered React pages).
//
// Run against a server the operator starts on :5050:
//   PORT=5050 npm run dev
//   npx playwright test --config=playwright.marcus-smoke.config.ts

const FAIL_CLOSED = /No payment has reached Marcus’s team yet\.|No payment has reached Marcus's team yet\./;

test.describe('08 Marcus funnel — pages render', () => {
  test('booking page mounts with Marcus chrome and no error overlay', async ({ page }) => {
    const resp = await page.goto('/marcus/reading', { waitUntil: 'networkidle' });
    expect(resp?.status(), 'HTTP status for /marcus/reading').toBeLessThan(400);
    // Marcus's masthead identity renders (proves MarcusShell + marcus.css loaded).
    await expect(page.locator('.m8 .mast-name')).toHaveText('Marcus Stone');
    await expect(page.locator('.m8 .mast-role')).toContainText('Daily Tarot Reader');
    // Vite's dev error overlay must not be present.
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  });

  test('editions API responds (data layer reachable)', async ({ request }) => {
    const r = await request.get('/api/backend/marcus/editions');
    expect(r.status(), 'GET /api/backend/marcus/editions').toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.editions), 'editions is an array').toBe(true);
  });

  test('bridge fails CLOSED with no paid session (no redirect, honest copy)', async ({ page }) => {
    await page.goto('/marcus/reading/bridge', { waitUntil: 'networkidle' });
    // No session → must NOT advance anywhere; must show the fail-closed copy.
    await expect(page.getByText(FAIL_CLOSED)).toBeVisible();
    expect(page.url()).toContain('/marcus/reading/bridge');
  });

  test('upsell fails CLOSED with no paid session (does not charge or redirect)', async ({ page }) => {
    await page.goto('/marcus/reading/welcome1', { waitUntil: 'networkidle' });
    await expect(page.getByText(FAIL_CLOSED)).toBeVisible();
    // It must NOT bounce to the receipt when there is no paid order.
    expect(page.url()).toContain('/marcus/reading/welcome1');
  });

  test('receipt page mounts without crashing on a missing session', async ({ page }) => {
    const resp = await page.goto('/marcus/reading/success', { waitUntil: 'networkidle' });
    expect(resp?.status(), 'HTTP status for /marcus/reading/success').toBeLessThan(400);
    await expect(page.locator('.m8 .mast-name')).toHaveText('Marcus Stone');
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  });
});
