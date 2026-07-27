import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { DEFAULT_PRICING, coinsToClock } from '../shared/types';

/**
 * System 2 — C3: Credit system edge cases, under per-minute pricing.
 *
 * WHAT CHANGED (2026-07-22): the previous version of this file drove the balance
 * down by sending six real LLM messages per test and then asserted against UI that
 * no longer exists ("Begin Reading", "Your Reading Time Has Ended", "Browse Other
 * Guides", "Get More Credits"). It failed at the first click and cost ~6 minutes a
 * run for assertions that were mostly wrapped in `if (visible)` and could never fail.
 *
 * These tests drive the balance through the admin adjust endpoint instead: the same
 * ledger the chat engine spends from, but deterministic, instant, and free. The
 * properties under test are the ones a customer actually feels:
 *   - time bought is credited EXACTLY (no silent loss of purchased minutes)
 *   - the clock on screen matches the server ledger to the second
 *   - the balance can never go negative
 *
 * Live burn-down during a real reading is covered separately by
 * improve-v2/playwright/billing-dead-air.spec.ts.
 */

const ADMIN_EMAIL = 'admin@theseerwithin.com';
const ADMIN_PASSWORD = 'ChangeMe123!';

interface TestUser {
  id: string;
  email: string;
  password: string;
  token: string;
}

/** Register a fresh account through the API and return its id + token. */
async function createUser(request: APIRequestContext, prefix: string): Promise<TestUser> {
  const email = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  const password = 'Credits123!';

  const res = await request.post('/api/auth/register', {
    data: { email, password, firstName: prefix.slice(0, 20) },
  });
  expect(res.ok(), `registration failed: ${res.status()} ${await res.text()}`).toBeTruthy();

  const body = await res.json();
  return { id: body.user.id, email, password, token: body.token };
}

async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/admin/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), 'admin login failed — is the DB seeded?').toBeTruthy();
  return (await res.json()).token;
}

/** Adjust a user's balance. Positive adds, negative deducts. Returns the raw response. */
async function adjustBalance(
  request: APIRequestContext,
  admin: string,
  userId: string,
  coins: number,
) {
  return request.patch(`/api/admin/users/${userId}/credits`, {
    headers: { Authorization: `Bearer ${admin}` },
    data: { coins, reason: 'automated test' },
  });
}

async function apiBalance(request: APIRequestContext, user: TestUser): Promise<number> {
  const res = await request.get('/api/auth/me', {
    headers: { Authorization: `Bearer ${user.token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.user?.coinBalance ?? body.coinBalance;
}

/** Log the browser in as an already-registered user. */
async function loginAs(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

test.describe('System 2 — Credit System Edge Cases (C3)', () => {
  test('C3a: a new account starts with exactly the free trial', async ({ request }) => {
    const user = await createUser(request, 'FreeTrial');
    expect(await apiBalance(request, user)).toBe(DEFAULT_PRICING.freeCoins);
  });

  test('C3b: purchased time is credited exactly — no minutes go missing', async ({ request, page }) => {
    const user = await createUser(request, 'ExactCredit');
    const admin = await adminToken(request);

    // Zero it, then credit each pack in turn and confirm the balance is exactly the
    // advertised amount. A customer must never pay for a pack and receive less time.
    const zeroed = await adjustBalance(request, admin, user.id, -DEFAULT_PRICING.freeCoins);
    expect(zeroed.ok()).toBeTruthy();
    expect(await apiBalance(request, user)).toBe(0);

    let expected = 0;
    for (const tier of DEFAULT_PRICING.tiers) {
      const res = await adjustBalance(request, admin, user.id, tier.totalCoins);
      expect(res.ok()).toBeTruthy();
      expected += tier.totalCoins;

      expect(
        await apiBalance(request, user),
        `after crediting the $${tier.priceUsd / 100} pack the balance must be exact`,
      ).toBe(expected);
    }

    // And the screen must agree with the ledger, to the second.
    await loginAs(page, user);
    await page.goto('/credits');
    await expect(page.getByText(coinsToClock(expected), { exact: false }).first())
      .toBeVisible({ timeout: 15000 });
  });

  test('C3c: the balance can never go negative', async ({ request }) => {
    const user = await createUser(request, 'NoNegative');
    const admin = await adminToken(request);

    const before = await apiBalance(request, user);
    const res = await adjustBalance(request, admin, user.id, -(before + 10_000));

    expect(res.ok(), 'an over-deduction must be refused, not applied').toBeFalsy();
    expect(await apiBalance(request, user), 'balance must be untouched').toBe(before);
    expect(await apiBalance(request, user)).toBeGreaterThanOrEqual(0);
  });

  test('C3d: a depleted account shows no time left and is offered more', async ({ request, page }) => {
    const user = await createUser(request, 'Depleted');
    const admin = await adminToken(request);

    await adjustBalance(request, admin, user.id, -DEFAULT_PRICING.freeCoins);
    expect(await apiBalance(request, user)).toBe(0);

    await loginAs(page, user);
    await page.goto('/credits');

    // Zero reads as a clock in the per-guide grid, never as "0 coins".
    await expect(page.getByText('0:00', { exact: false }).first()).toBeVisible({ timeout: 15000 });
    // …and the store is there to top up from. The pre-2026-07-27 store led with a
    // "Simple per-minute pricing" heading; the neutral dollar wallet leads with
    // "Add to your balance" and an explicit $0.00, because one shared balance has
    // no single time value once guides charge different rates.
    await expect(page.getByRole('heading', { name: /Add to your balance/i })).toBeVisible();
    await expect(page.getByText('$0.00', { exact: false }).first()).toBeVisible();
  });

  test('C3e: the clock in the header matches the API balance to the second', async ({ request, page }) => {
    const user = await createUser(request, 'HeaderMatch');
    const admin = await adminToken(request);

    // An amount that is deliberately NOT a whole number of minutes, so a rounding
    // bug in the display can't hide behind a tidy value. $20 = 2000¢ = 6:41.
    const target = DEFAULT_PRICING.tiers.find(t => t.priceUsd === 2000)!.totalCoins;
    await adjustBalance(request, admin, user.id, -DEFAULT_PRICING.freeCoins);
    await adjustBalance(request, admin, user.id, target);

    const balance = await apiBalance(request, user);
    expect(balance).toBe(target);

    await loginAs(page, user);
    await page.goto('/credits');

    const clock = coinsToClock(balance);
    await expect(
      page.getByText(clock, { exact: false }).first(),
      `header should show ${clock} for ${balance} coins`,
    ).toBeVisible({ timeout: 15000 });

    // The old failure mode this replaces: the header used to be asserted as
    // "N minutes", which silently stopped matching when the UI moved to m:ss.
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/\bcoins?\b/i);
  });
});
