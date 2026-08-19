import { test, expect } from '@playwright/test';

// PRODUCTION smoke for the Version-B copy port (2026-08-19), after pushing c13a2a0.
//
// Covers one lander from each source: an existing live lander, the copy-test pair
// (challenger + its control), a face-up deck via the /c redirect, one of ours, and a
// money lander.
//
// SAFETY on LIVE www:
//   · ?noemail=1 — no /api/lead, no AWeber, no Facebook CAPI
//   · facebook.com aborted at the network layer
//   · nothing clicked that leads toward checkout — live Stripe is never touched
//   · Version B makes NO model call, so no LLM spend
//   · 🔴 bot signals are deliberately NOT masked. posthog-js drops captures from
//     automation, which is exactly what we want here: this run must not create fake
//     persons in the production project. (The opposite of the fb-tarot-*-posthog-prod
//     specs, whose whole job is to land events.)
//   · utm_source=claude_smoke so anything that does slip through is excludable

const LIVE = 'https://www.theseerwithin.com';
const BUBBLE = '[data-testid^="message-"]:not([data-testid^="message-card-art-"])';

test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(180000);

const CASES = [
  { path: '/fb-tarot/c?hook=cards-return', headline: 'Will he come back?', note: 'live lander, via /c redirect' },
  { path: '/fb-tarot/c?hook=cards-twin-back', headline: 'Is my twin flame coming back to me?', note: 'the copy-test control' },
  { path: '/fb-tarot/b?hook=cards-twinflame-back', headline: 'Is my twin flame coming back to me?', note: 'the challenger (ours)' },
  { path: '/fb-tarot/c?hook=cards-honest&deck=arcana-mfh', headline: 'Is he being honest with you?', note: 'face-up deck via /c' },
  { path: '/fb-tarot/b?hook=cards-find-closure', headline: 'Will I ever find closure?', note: 'ours — closure' },
  { path: '/fb-tarot/b?hook=cards-out-of-time', headline: 'Is something still blocking my money, or have I run out of time?', note: 'money lander' },
];

for (const { path, headline, note } of CASES) {
  test(`prod · ${note}`, async ({ page }) => {
    const bad: string[] = [];
    await page.route('**facebook.com/**', (r) => r.abort());
    page.on('response', (r) => {
      if (r.url().includes('/api/') && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
    });

    await page.goto(`${LIVE}${path}&noemail=1&utm_source=claude_smoke`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: headline })).toBeVisible({ timeout: 30000 });
    if (path.includes('/fb-tarot/c')) expect(page.url(), 'the /c redirect did not fire').toContain('/fb-tarot/b');

    await page.getByTestId('tarot-card-a').click();
    await page.waitForURL(/\/fb-tarot\/chat/, { timeout: 30000 });
    await expect(page.getByText(/what's your first name, dear\?/)).toBeVisible({ timeout: 120000 });

    const texts = await page.locator(BUBBLE).allInnerTexts();
    expect(texts.length, `${note}: the cut did not arrive`).toBeGreaterThanOrEqual(7);
    for (const t of texts) expect(t.trim().length, `${note}: empty bubble`).toBeGreaterThan(0);
    // face-down decks are DRAWN, face-up decks are CHOSEN
    expect(texts[0], `${note}: must open on the card`).toMatch(/^You (turned|chose) /);
    expect(bad, `${note}: API errors\n${bad.join('\n')}`).toEqual([]);

    console.log(`  ${note.padEnd(30)} ${texts.length} bubbles · OK`);
  });
}
