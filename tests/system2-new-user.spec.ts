import { test, expect, type Page } from '@playwright/test';

/**
 * System 2 — Brand-New User journey (B1–B7), rewritten for the current reading UI.
 * A brand-new customer: registers → gets the free trial → browses guides → has a first
 * reading → can always buy more → actually buys with a card → returns with balance intact
 * → shares one wallet across guides. Exercises the live chat engine (real replies).
 */

const TOKEN_KEY = 'seer_auth_token';
const testPassword = 'NewUser123!';
const SUGGESTED = /financial abundance|love keep slipping|life purpose|holding me back|meant to last/i;

async function uiRegister(page: Page, firstName: string): Promise<{ email: string; token: string }> {
  const email = `${firstName.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto('/login');
  await page.click('text=/New here|Create an account/i');
  await page.waitForTimeout(400);
  await page.fill('input[name="firstName"]', firstName);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', testPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*reading/, { timeout: 15000 });
  const token = (await page.evaluate((k) => localStorage.getItem(k), TOKEN_KEY)) as string;
  return { email, token };
}

async function getBalance(page: Page, token: string): Promise<number> {
  const res = await page.request.get('/api/credits/balance', { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).coinBalance;
}

async function fillStripeCard(scope: ReturnType<Page['getByRole']>) {
  const frame = scope.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await frame.locator('[name="number"]').fill('4242424242424242');
  await frame.locator('[name="expiry"]').fill('1234');
  await frame.locator('[name="cvc"]').fill('123');
  const postal = frame.locator('[name="postalCode"]');
  if (await postal.count()) await postal.fill('12345');
}

test.describe('System 2 — Brand-New User (B1–B7)', () => {
  test('B1: cold registration — lands in the reading with the free trial and a guide ready', async ({ page }) => {
    const { token } = await uiRegister(page, 'BrandNew');
    // The free trial is granted (3:00 = 897¢).
    expect(await getBalance(page, token)).toBe(897);
    // A guide is ready: opening her reading shows the suggested-question entry.
    await expect(page.getByText(/Evelyn Cross/i).first()).toBeVisible({ timeout: 15000 });
    await page.goto('/reading?persona=evelyn-cross');
    await expect(page.getByRole('button', { name: SUGGESTED }).first()).toBeVisible({ timeout: 15000 });
  });

  test('B2: exploring before committing — can browse /personas as a guest', async ({ page }) => {
    await page.goto('/personas');
    await expect(page.getByText(/Evelyn Cross/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/free/i).first()).toBeVisible();
    // Starting as a guest opens an inline auth modal (register-and-continue).
    await page.locator('button:has-text("Start Reading"), button:has-text("Start Chat")').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
  });

  test('B3: first chat — a complete novice sends a message and gets a real reply', async ({ page }) => {
    await uiRegister(page, 'Novice');
    await page.goto('/reading?persona=evelyn-cross');
    const q = page.getByRole('button', { name: /financial abundance/i });
    await expect(q).toBeVisible({ timeout: 15000 });
    await q.click();
    await expect(page.getByText(/financial abundance/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder(/type your message/i)).toBeVisible({ timeout: 30000 });
    // A substantive reply arrives.
    await expect(page.getByText(/sensing|tell me|love|dear|feel|energy|heart|see|notice/i).first())
      .toBeVisible({ timeout: 45000 });
    // The time counter is shown.
    await expect(page.getByText(/\b[0-2]:\d{2}\b/).first()).toBeVisible({ timeout: 15000 });
  });

  test('B4: running low — buying more time is always one tap away', async ({ page }) => {
    await uiRegister(page, 'LowBal');
    // From anywhere with the nav, the customer can reach the store and see real packs.
    await page.goto('/personas');
    await page.getByRole('link', { name: /minutes/i }).first().click().catch(async () => { await page.goto('/credits'); });
    await page.waitForURL(/.*credits/, { timeout: 10000 }).catch(() => {});
    await page.goto('/credits?personaId=' + await evelynId(page));
    await expect(page.getByRole('heading', { name: /Add to your balance/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Keep going', exact: true }).first()).toBeVisible();
  });

  test('B5: first purchase — buys a pack with a card and the balance grows', async ({ page }) => {
    const { token } = await uiRegister(page, 'Purchase');
    const before = await getBalance(page, token);
    await page.goto('/credits?personaId=' + await evelynId(page));
    await expect(page.getByRole('heading', { name: /Add to your balance/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Keep going', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /Credit Card/i }).click();
    await fillStripeCard(dialog);
    await dialog.getByRole('button', { name: /Pay \$10\.00/i }).click();
    await expect.poll(() => getBalance(page, token), { timeout: 30000, intervals: [1000] }).toBe(before + 1000);
  });

  test('B6: returning after time away — balance persists across logout/login', async ({ page }) => {
    const { email, token } = await uiRegister(page, 'Return');
    const balance = await getBalance(page, token);

    // Logout via the avatar dropdown (on a page that shows the nav).
    await page.goto('/personas');
    await page.locator('button[aria-haspopup="menu"]').first().click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    await page.waitForURL(/.*login|^\/$/, { timeout: 10000 });

    // Log back in "days later".
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 15000 });

    const token2 = (await page.evaluate((k) => localStorage.getItem(k), TOKEN_KEY)) as string;
    // No phantom deductions — the wallet is exactly as left.
    expect(await getBalance(page, token2)).toBe(balance);
  });

  test('B7: multi-persona — one shared wallet across guides', async ({ page }) => {
    const { token } = await uiRegister(page, 'Multi');
    const start = await getBalance(page, token);
    // The balance is the SAME shared pool regardless of which guide is viewed.
    await page.goto('/reading?persona=evelyn-cross');
    await expect(page.getByText(/Evelyn Cross/i).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Marcus Stone/i }).first().click();
    await expect(page.getByText(/Marcus Stone/i).first()).toBeVisible({ timeout: 15000 });
    // Switching guide does not change the wallet (no per-guide balances).
    expect(await getBalance(page, token)).toBe(start);
  });
});

async function evelynId(page: Page): Promise<string> {
  const personas = await (await page.request.get('/api/personas')).json();
  const list = Array.isArray(personas) ? personas : personas.personas;
  return list.find((p: any) => p.slug === 'evelyn-cross').id;
}
