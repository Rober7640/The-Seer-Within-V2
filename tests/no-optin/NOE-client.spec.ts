import { test, expect } from '@playwright/test';

/**
 * No-optin (`?noemail=1`) CLIENT-SIDE trigger tests.
 *
 * These verify the deterministic browser behaviour that gates all three
 * no-optin tasks: the email-gate flag. They do NOT need the LLM chat or a
 * Stripe payment — they assert the observable signal (`sessionStorage.seer_noemail`)
 * that `skipEmail()` persists and that `App.tsx` captures on mount.
 *
 * What this proves:
 *  - `/?noemail=1` turns the email gate OFF (no-optin arm engaged).
 *  - A normal visit is UNAFFECTED (regression guard for live email traffic).
 *  - The choice is sticky for the tab (survives navigation without the param).
 *  - `?noemail=0` is an explicit opt-out.
 *
 * The server-side effects (AWeber `noemail` tag, V2 account on purchase) are
 * covered separately: V2 migration in tests/no-optin/webhook-no-optin-v2.test.ts,
 * AWeber tag by manual verification (see docs/no-optin-root-localhost-test-plan.md).
 */

const KEY = 'seer_noemail';
const readFlag = (page: import('@playwright/test').Page) =>
  page.evaluate((k) => window.sessionStorage.getItem(k), KEY);

test.describe('No-optin client trigger (?noemail=1)', () => {
  test('NOE-C1: ?noemail=1 on the home funnel turns the email gate OFF', async ({ page }) => {
    await page.goto('/?noemail=1');
    // App.tsx calls skipEmail() on mount, which persists the choice.
    await expect.poll(() => readFlag(page), { timeout: 10000 }).toBe('1');
  });

  test('NOE-C2: a normal visit leaves the email gate ON (regression guard)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // let the mount effect run
    expect(await readFlag(page)).toBeNull();
  });

  test('NOE-C3: the no-optin choice is sticky for the tab', async ({ page }) => {
    await page.goto('/?noemail=1');
    await expect.poll(() => readFlag(page), { timeout: 10000 }).toBe('1');
    // Navigate within the same tab WITHOUT the param — choice must survive.
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(await readFlag(page)).toBe('1');
  });

  test('NOE-C4: ?noemail=0 is an explicit opt-out', async ({ page }) => {
    await page.goto('/?noemail=0');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(await readFlag(page)).not.toBe('1');
  });
});
