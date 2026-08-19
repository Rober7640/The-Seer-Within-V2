import { test, expect } from '@playwright/test';

// Staging walk of the SIX locally-built landers (closure + soulmate-return) after the
// push to development. Confirms each one is live, renders its own headline, and serves
// the Natural Tarot-Cut as separate bubbles.
//
// SAFETY: ?noemail=1, facebook.com aborted, nothing clicked toward checkout, no model call.

const BASE = 'https://the-seer-within-v2-development.up.railway.app';
const BUBBLE = '[data-testid^="message-"]:not([data-testid^="message-card-art-"])';

test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(180000);

const SIX = [
  { hook: 'cards-find-closure', headline: 'Will I ever find closure?', family: 'closure' },
  { hook: 'cards-heart-heal', headline: 'Will my heart ever heal?', family: 'closure' },
  { hook: 'cards-feel-like-myself', headline: 'Am I ever going to feel like myself again?', family: 'closure' },
  { hook: 'cards-my-soulmate-back', headline: 'Is my soulmate coming back to me?', family: 'soulmate-return' },
  { hook: 'cards-twinflame-back', headline: 'Is my twin flame coming back to me?', family: 'soulmate-return' },
  { hook: 'cards-was-he-soulmate', headline: 'Was he ever really my soulmate?', family: 'soulmate-return' },
];

for (const { hook, headline, family } of SIX) {
  test(`${family} · ${hook}`, async ({ page }) => {
    const bad: string[] = [];
    await page.route('**facebook.com/**', (r) => r.abort());
    page.on('response', (r) => {
      if (r.url().includes('/api/') && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
    });

    await page.goto(`${BASE}/fb-tarot/b?hook=${hook}&noemail=1`, { waitUntil: 'domcontentloaded' });
    // its own headline, not the DEFAULT_HOOK fallback
    await expect(page.getByRole('heading', { name: headline })).toBeVisible({ timeout: 30000 });

    await page.getByTestId('tarot-card-a').click();
    await page.waitForURL(/\/fb-tarot\/chat/, { timeout: 30000 });
    await expect(page.getByText(/what's your first name, dear\?/)).toBeVisible({ timeout: 120000 });

    const texts = await page.locator(BUBBLE).allInnerTexts();
    expect(texts.length, `${hook}: the cut did not arrive`).toBeGreaterThanOrEqual(7);
    expect(texts[0], `${hook}: must open on the card`).toMatch(/^You turned /);
    // the read bubbles are everything between beat 2 and the open loop
    const read = texts.slice(2, -2);
    expect(read.length, `${hook}: beat 3 was not cut`).toBeGreaterThanOrEqual(3);
    expect(bad, `${hook}: API errors\n${bad.join('\n')}`).toEqual([]);

    console.log(`  ${hook.padEnd(24)} ${texts.length} bubbles (${read.length} in the read) · OK`);
  });
}
