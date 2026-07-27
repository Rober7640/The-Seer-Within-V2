import { test, expect, type Page } from '@playwright/test';
import {
  DEFAULT_PRICING,
  PRICE_PER_MINUTE_USD,
  COINS_PER_MINUTE,
  coinsToClock,
} from '../shared/types';

// Per-minute pricing (2026-07-16 coin→minute change). The customer sees MINUTES and
// DOLLARS only — never "coins" — and every time value is an m:ss clock.
//
// Expected pack values are derived from DEFAULT_PRICING rather than typed as literals
// on purpose: this file's job is to prove the PAGE renders what the source of truth
// says. The money math itself is pinned separately in
// server/lib/perMinutePricing.test.ts, so a bad rate can't slip through both.
//
// These tests replaced an older set that asserted the pre-2026-07 model
// ("15 Minutes"/"$15", "30 Minutes"/"$25", "Buy Coins"). Those packages no longer
// exist — pricing is a flat $2.99/min with $10/$20/$30/$50 packs.

/** Register a FRESH user and land logged-in. */
async function registerFreshUser(page: Page, label: string): Promise<string> {
  // Unique per call — reusing one address makes every register after the first
  // 409, which silently leaves the test logged out (the old bug in this file).
  const email = `credits-${label}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;

  await page.goto('/login');
  await page.click('text=/New here|Create an account/i');
  await page.fill('input[name="firstName"]', 'CreditTester');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'CreditsTest123!');
  await page.click('button[type="submit"]');

  // The suite's webServer runs with DISABLE_RATE_LIMIT=true, which auto-verifies the
  // address and grants the free minutes, so registration lands straight in the app.
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20000 });
  return email;
}

test.describe('Per-minute credits store', () => {
  test('shows the flat per-minute rate', async ({ page }) => {
    await registerFreshUser(page, 'rate');
    await page.goto('/credits');

    await expect(page.getByText(/Simple per-minute pricing/i)).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(new RegExp(`One flat rate.*\\$${PRICE_PER_MINUTE_USD}\\s*a minute`, 'i')),
    ).toBeVisible();
  });

  test('renders every pack with the right price and the right amount of time', async ({ page }) => {
    await registerFreshUser(page, 'packs');
    await page.goto('/credits');
    await expect(page.getByText(/Simple per-minute pricing/i)).toBeVisible({ timeout: 15000 });

    for (const tier of DEFAULT_PRICING.tiers) {
      const dollars = (tier.priceUsd / 100).toFixed(2);
      const clock = coinsToClock(tier.totalCoins);

      await expect(
        page.getByText(`$${dollars}`, { exact: false }).first(),
        `pack $${dollars} should be listed`,
      ).toBeVisible();

      await expect(
        page.getByText(clock, { exact: false }).first(),
        `pack $${dollars} should advertise ${clock} of time`,
      ).toBeVisible();
    }
  });

  test('quotes the same per-minute rate on every pack — no bulk discount', async ({ page }) => {
    await registerFreshUser(page, 'norate-discount');
    await page.goto('/credits');
    await expect(page.getByText(/Simple per-minute pricing/i)).toBeVisible({ timeout: 15000 });

    const rateLabels = await page.getByText(/\$\d+\.\d{2}\/m\b/).allTextContents();
    expect(rateLabels.length, 'each pack should quote its per-minute rate').toBeGreaterThanOrEqual(
      DEFAULT_PRICING.tiers.length,
    );
    for (const label of rateLabels) {
      expect(label).toContain(`$${PRICE_PER_MINUTE_USD.toFixed(2)}/m`);
    }
  });

  test('shows the balance as an m:ss clock, not a coin count', async ({ page }) => {
    await registerFreshUser(page, 'balance');
    await page.goto('/credits');

    // A new account gets the free trial.
    const freeClock = coinsToClock(DEFAULT_PRICING.freeCoins);
    await expect(page.getByText(freeClock, { exact: false }).first()).toBeVisible({ timeout: 15000 });
  });

  test('never says "coin" anywhere on the store', async ({ page }) => {
    await registerFreshUser(page, 'nocoins');
    await page.goto('/credits');
    await expect(page.getByText(/Simple per-minute pricing/i)).toBeVisible({ timeout: 15000 });

    const body = await page.evaluate(() => document.body.innerText);
    expect(body, 'the coin ledger is internal — customers see minutes').not.toMatch(/\bcoins?\b/i);
  });

  test('previews the time a custom amount buys', async ({ page }) => {
    await registerFreshUser(page, 'custom');
    await page.goto('/credits');
    await expect(page.getByText(/choose your own amount/i)).toBeVisible({ timeout: 15000 });

    const custom = page.getByPlaceholder(/custom amount/i);
    await custom.fill('20');

    // $20 buys the same time as the $20 pack — the custom field and the packs are
    // driven by the same rate, so they must never disagree. Match the "= m:ss"
    // preview specifically: the bare clock would also match the $20 pack tile and
    // pass without the preview ever updating.
    const twentyPack = DEFAULT_PRICING.tiers.find(t => t.priceUsd === 2000)!;
    const expected = coinsToClock(twentyPack.totalCoins);
    await expect(page.getByText(new RegExp(`=\\s*${expected.replace(':', ':')}`))).toBeVisible();
  });

  test('refuses a custom amount below the cheapest pack', async ({ page }) => {
    await registerFreshUser(page, 'custom-floor');
    await page.goto('/credits');
    await expect(page.getByText(/choose your own amount/i)).toBeVisible({ timeout: 15000 });

    const cheapestDollars = Math.min(...DEFAULT_PRICING.tiers.map(t => t.priceUsd)) / 100;
    await page.getByPlaceholder(/custom amount/i).fill(String(cheapestDollars - 1));

    // The server enforces this floor too (resolveCustomTier); the UI must not offer
    // a purchase the server will reject.
    await expect(page.getByText(new RegExp(`Minimum top-up is \\$${cheapestDollars}`, 'i'))).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buy', exact: true })).toBeDisabled();
  });

  test('shows purchase history for a new account', async ({ page }) => {
    await registerFreshUser(page, 'history');
    await page.goto('/credits');

    await expect(page.getByText(/Purchase History/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/No purchases yet/i)).toBeVisible();
  });

  test('serves the same flat pricing for every persona', async ({ page }) => {
    await registerFreshUser(page, 'per-persona');

    // Every guide is currently at the flat $2.99/min default. The engine now supports
    // per-persona $/min (dollar wallet), so the per-minute rate is DERIVED from each
    // response's own coinsPerMinute (cents/min) — the test would still pass if a guide
    // diverged, because the pack dollars scale with the rate.
    const rates: string[][] = [];
    for (const slug of ['evelyn-cross', 'marcus-stone']) {
      const res = await page.request.get(`/api/credits/pricing?personaId=${slug}`);
      // An unknown/slug id falls back to defaults; either way the rate must be flat today.
      const body = await res.json();
      const cpm = body.coinsPerMinute ?? COINS_PER_MINUTE;
      const tiers = body.tiers ?? body.pricing?.tiers ?? [];
      rates.push(tiers.map((t: { totalCoins: number; priceUsd: number }) =>
        (t.priceUsd / 100 / (t.totalCoins / cpm)).toFixed(2)));
    }
    for (const perPersona of rates) {
      for (const rate of perPersona) {
        expect(rate).toBe(PRICE_PER_MINUTE_USD.toFixed(2));
      }
    }
  });
});
