import { test, expect } from '@playwright/test';

// STAGING smoke for the Version-B copy port (2026-08-19), after pushing to development.
//
// Proves on the deployed build what local tests cannot: the lander renders the right
// headline, the cut read arrives as separate bubbles, and the bridge hands off without
// a 400. Covers one lander from each source — ours, Joel's rewrite of a live lander,
// the copy-test control, a money lander, and a /c URL that must redirect.
//
// SAFETY: ?noemail=1 (no /api/lead, no AWeber, no Facebook), facebook.com aborted,
// nothing clicked that leads to checkout. Version B makes no model call. Staging runs
// TEST Stripe and is never customer-facing.

const BASE = 'https://the-seer-within-v2-development.up.railway.app';
const BUBBLE = '[data-testid^="message-"]:not([data-testid^="message-card-art-"])';

test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(180000);

const CASES = [
  { path: '/fb-tarot/b?hook=cards-find-closure', headline: 'Will I ever find closure?', note: 'ours — closure' },
  { path: '/fb-tarot/b?hook=cards-twinflame-back', headline: 'Is my twin flame coming back to me?', note: 'ours — the challenger' },
  { path: '/fb-tarot/c?hook=cards-twin-back', headline: 'Is my twin flame coming back to me?', note: 'the control, via /c redirect' },
  { path: '/fb-tarot/c?hook=cards-honest&deck=arcana-mfh', headline: 'Is he being honest with you?', note: 'face-up deck, via /c redirect' },
  { path: '/fb-tarot/b?hook=cards-out-of-time', headline: 'Is something still blocking my money, or have I run out of time?', note: 'money lander' },
];

for (const { path, headline, note } of CASES) {
  test(`staging · ${note}`, async ({ page }) => {
    const bad: string[] = [];
    await page.route('**facebook.com/**', (r) => r.abort());
    page.on('response', (r) => {
      if (r.url().includes('/api/') && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
    });

    await page.goto(`${BASE}${path}&noemail=1`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: headline })).toBeVisible({ timeout: 30000 });

    // a /c URL must have become /b before any JS ran
    if (path.includes('/fb-tarot/c')) expect(page.url()).toContain('/fb-tarot/b');

    await page.getByTestId('tarot-card-a').click();
    await page.waitForURL(/\/fb-tarot\/chat/, { timeout: 30000 });
    await expect(page.getByText(/what's your first name, dear\?/)).toBeVisible({ timeout: 120000 });

    const texts = await page.locator(BUBBLE).allInnerTexts();
    // beat 1 + beat 2 + the cut bubbles + beat 4 + name capture
    expect(texts.length, `${note}: too few bubbles — the cut did not arrive`).toBeGreaterThanOrEqual(7);
    for (const t of texts) expect(t.trim().length, `${note}: empty bubble`).toBeGreaterThan(0);
    // 🔴 The verb follows the FACING: face-down decks are drawn ('You turned'), face-up decks
    // are chosen ('You chose'). arcana-mfh is face-up, so asserting 'You turned' everywhere is
    // wrong — it would fail the copy it is meant to protect.
    expect(texts[0], `${note}: must open on the card`).toMatch(/^You (turned|chose) /);
    expect(bad, `${note}: API errors\n${bad.join('\n')}`).toEqual([]);

    console.log(`  ${note.padEnd(30)} ${texts.length} bubbles · OK`);
  });
}
