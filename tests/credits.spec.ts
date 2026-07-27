import { test, expect, type Page } from '@playwright/test';
import {
  DEFAULT_PRICING,
  COINS_PER_MINUTE,
  FREE_TRIAL_MINUTES,
  coinsToClock,
  minutesToCoins,
} from '../shared/types';

// The dollar wallet (2026-07-23) + the neutral-wallet store redesign (2026-07-27).
//
// The customer sees DOLLARS for the balance and packs, and MINUTES only where a
// specific guide is named — because a coin is now a CENT and the wallet is SHARED,
// so one balance has no single time value once guides charge different rates.
// The word "coin" is internal and must never reach the page.
//
// Expected values are derived from DEFAULT_PRICING and from each guide's OWN
// coins_per_minute (read live off the API) rather than typed as literals: this
// file's job is to prove the PAGE renders what the source of truth says. The money
// math itself is pinned in server/lib/perMinutePricing.test.ts, so a bad rate can't
// slip through both.
//
// REWRITTEN 2026-07-27. The previous version asserted the pre-redesign store —
// a "Simple per-minute pricing" heading, the balance as an m:ss clock, a per-pack
// "$2.99/m" label, an inline "= m:ss" preview under the custom field, and a flat
// rate for every guide. None of those exist now: the heading is "Add to your
// balance", the balance is dollars, the rate is shown per guide in the grid, packs
// preview by TAP (the button buys), and guides may legitimately differ in price.
// Those 9 tests failed for purely cosmetic reasons, which is worse than useless —
// a real pricing break would have hidden among them.

type GuideRate = { id: string; slug: string; name: string; coinsPerMinute: number };

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
  // NOTE: if a plain `npm run dev` is already on :5000, Playwright reuses it via
  // reuseExistingServer and this wait times out at the verification gate.
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20000 });
  return email;
}

/** The store is up once the neutral wallet title has rendered. */
async function storeReady(page: Page) {
  await expect(page.getByRole('heading', { name: /Add to your balance/i }))
    .toBeVisible({ timeout: 15000 });
}

/** Live per-guide rates — the grid must reflect these, whatever they are. */
async function guideRates(page: Page): Promise<GuideRate[]> {
  const res = await page.request.get('/api/personas');
  const body = await res.json();
  const list = Array.isArray(body) ? body : (body.personas ?? []);
  return list.map((p: any) => ({
    id: p.id,
    slug: p.slug,
    name: p.displayName ?? p.name,
    coinsPerMinute: p.coinsPerMinute ?? COINS_PER_MINUTE,
  }));
}

/**
 * Authenticated API call. Auth is a JWT the client keeps in localStorage and sends
 * as a Bearer header — NOT a cookie — so page.request is anonymous by default and
 * every authed endpoint silently returns a body without the field under test.
 */
async function authedGet(page: Page, path: string) {
  const token = await page.evaluate(() => localStorage.getItem('seer_auth_token') ?? '');
  expect(token, 'expected a JWT in localStorage after registering').not.toBe('');
  const res = await page.request.get(path, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

/** The free grant a brand-new account receives, in cents. */
const FREE_GRANT_COINS = DEFAULT_PRICING.freeCoins; // minutesToCoins(3) = 897

test.describe('Dollar-wallet credits store', () => {
  test('presents the wallet in dollars, not as a per-guide clock', async ({ page }) => {
    await registerFreshUser(page, 'wallet');
    await page.goto('/credits');
    await storeReady(page);

    // The balance is a DOLLAR figure. It deliberately is NOT an m:ss clock: one
    // shared wallet buys different amounts of time from different guides, so a
    // single clock would contradict the per-guide grid right below it.
    const dollars = `$${(FREE_GRANT_COINS / 100).toFixed(2)}`;
    // exact — otherwise this also matches the "Add to your balance" heading.
    await expect(page.getByText('Your balance', { exact: true })).toBeVisible();
    await expect(page.getByText(dollars, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/Works with every guide/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /One simple wallet/i })).toBeVisible();
  });

  test('a new account is granted exactly the free trial', async ({ page }) => {
    await registerFreshUser(page, 'freetrial');

    const { coinBalance } = await authedGet(page, '/api/credits/balance');
    expect(coinBalance, 'signup grant must equal the free-trial constant').toBe(FREE_GRANT_COINS);

    // …and that grant is sized to buy FREE_TRIAL_MINUTES at the DEFAULT rate.
    expect(FREE_GRANT_COINS).toBe(minutesToCoins(FREE_TRIAL_MINUTES));
  });

  test('lists every pack at its dollar price', async ({ page }) => {
    await registerFreshUser(page, 'packs');
    await page.goto('/credits');
    await storeReady(page);

    for (const tier of DEFAULT_PRICING.tiers) {
      const dollars = `$${(tier.priceUsd / 100).toFixed(2)}`;
      await expect(
        page.getByText(dollars, { exact: false }).first(),
        `pack ${dollars} should be listed`,
      ).toBeVisible();
    }

    // Packs grant exactly the dollars paid — the dollar-wallet invariant. A pack
    // that granted a bonus would silently break the advertised per-minute rate.
    for (const tier of DEFAULT_PRICING.tiers) {
      expect(tier.totalCoins, `${tier.packageType} must grant its price in cents`).toBe(tier.priceUsd);
    }
  });

  test('shows each guide at its OWN rate, with the time that rate buys', async ({ page }) => {
    await registerFreshUser(page, 'perguide');
    await page.goto('/credits');
    await storeReady(page);

    const guides = await guideRates(page);
    expect(guides.length, 'need at least one active guide to render the grid').toBeGreaterThan(0);

    await expect(page.getByRole('heading', { name: /What your balance buys/i })).toBeVisible();

    for (const g of guides) {
      const rateLabel = `$${(g.coinsPerMinute / 100).toFixed(2)}/min`;
      const expectedTime = coinsToClock(FREE_GRANT_COINS, g.coinsPerMinute);

      // Scope to this guide's card so a $2.99 guide can't satisfy the assertion
      // for a $3.50 one — the exact bug a flat-rate test would miss.
      const card = page.getByTestId(`guide-card-${g.id}`);
      await expect(card, `${g.slug} card should quote ${rateLabel}`).toContainText(rateLabel);
      await expect(card, `${g.slug} should show ${expectedTime} for a ${FREE_GRANT_COINS}¢ wallet`)
        .toContainText(expectedTime);
    }
  });

  test('tapping a pack previews the projected balance for every guide', async ({ page }) => {
    await registerFreshUser(page, 'preview');
    await page.goto('/credits');
    await storeReady(page);

    const guides = await guideRates(page);
    const tier = DEFAULT_PRICING.tiers.find(t => t.priceUsd === 2000)!;
    const dollars = `$${(tier.priceUsd / 100).toFixed(2)}`;

    // Only the pack TILES carry aria-pressed; the nested "buy" button does not.
    // Tapping the tile must preview, never purchase.
    await page.locator('[role="button"][aria-pressed]').filter({ hasText: dollars }).first().click();

    const projected = FREE_GRANT_COINS + tier.totalCoins;
    await expect(
      page.getByRole('heading', { name: new RegExp(`What \\$${(projected / 100).toFixed(2)} would buy`, 'i') }),
    ).toBeVisible();
    await expect(page.getByText(`${dollars} preview`, { exact: false })).toBeVisible();

    // Every guide re-projects at its own rate, and the delta is that guide's own
    // gain — this is the assertion that would catch a rate applied to the wrong guide.
    for (const g of guides) {
      const added = coinsToClock(tier.totalCoins, g.coinsPerMinute);
      const card = page.getByTestId(`guide-card-${g.id}`);
      await expect(card, `${g.slug} should project +${added}`).toContainText(`+${added}`);
    }
  });

  test('never says "coin" anywhere on the store', async ({ page }) => {
    await registerFreshUser(page, 'nocoins');
    await page.goto('/credits');
    await storeReady(page);

    const body = await page.evaluate(() => document.body.innerText);
    expect(body, 'the coin ledger is internal — customers see dollars and minutes')
      .not.toMatch(/\bcoins?\b/i);
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

  test('serves each guide its own per-minute rate, and packs priced in plain dollars', async ({ page }) => {
    await registerFreshUser(page, 'per-persona');

    // REWRITTEN: this test used to assert "the same flat pricing for every persona"
    // and passed a SLUG where the API expects an id — so it silently fell back to
    // defaults and asserted nothing. Per-guide pricing is now a shipped feature
    // (Luna $3.50, Marcus $4.25), so the real contract is: each guide reports its
    // own rate, while pack DOLLARS stay identical because the wallet is shared.
    const guides = await guideRates(page);
    const idRes = await page.request.get('/api/personas');
    const idBody = await idRes.json();
    const idList = Array.isArray(idBody) ? idBody : (idBody.personas ?? []);

    let packDollars: string | null = null;

    for (const p of idList) {
      const res = await page.request.get(`/api/credits/pricing?personaId=${p.id}`);
      const body = await res.json();
      const cpm = body.coinsPerMinute ?? COINS_PER_MINUTE;
      const tiers = body.tiers ?? body.pricing?.tiers ?? [];

      const expectedRate = guides.find(g => g.slug === p.slug)?.coinsPerMinute ?? COINS_PER_MINUTE;
      expect(cpm, `${p.slug} should serve its own rate`).toBe(expectedRate);

      // A pack costs the same dollars for everyone — only the time it buys differs.
      const dollars = tiers.map((t: { priceUsd: number }) => t.priceUsd).join(',');
      if (packDollars === null) packDollars = dollars;
      expect(dollars, 'pack dollar prices must not vary by guide').toBe(packDollars);

      // Effective $/min implied by each pack must equal that guide's own rate.
      for (const t of tiers as Array<{ totalCoins: number; priceUsd: number }>) {
        const implied = (t.priceUsd / 100) / (t.totalCoins / cpm);
        expect(implied.toFixed(2), `${p.slug} pack should imply its own rate`).toBe((cpm / 100).toFixed(2));
      }
    }
  });
});
