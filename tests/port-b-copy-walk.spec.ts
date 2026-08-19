import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';

// LOCALHOST walk of the ported Version-B copy (2026-08-19).
//
// Proves the three things the unit guards cannot see:
//   1. the lander RENDERS the right headline (not the DEFAULT_HOOK fallback)
//   2. tapping a card reveals the read, and the Natural Tarot-Cut arrives as SEPARATE
//      bubbles rather than one wall of text
//   3. the bridge hands off to /fb-tarot/chat without a 400
//
// SAFETY: localhost only, ?noemail=1 (no /api/lead, no AWeber, no Facebook), every
// facebook.com request aborted, and nothing is ever clicked that leads to checkout.
// Version B makes NO model call, so no LLM is touched.

const SHOTS = 'D:/seer-wt/b-copy-port/.walk-shots';
const BUBBLE = '[data-testid^="message-"]:not([data-testid^="message-card-art-"])';

type L = { hook: string; headline: string; tag: string };

const LANDERS: L[] = [
  // ours, rewritten into the Tarot-Cut
  { hook: 'cards-find-closure', headline: 'Will I ever find closure?', tag: 'ours-closure' },
  { hook: 'cards-heart-heal', headline: 'Will my heart ever heal?', tag: 'ours-closure' },
  { hook: 'cards-feel-like-myself', headline: 'Am I ever going to feel like myself again?', tag: 'ours-closure' },
  { hook: 'cards-my-soulmate-back', headline: 'Is my soulmate coming back to me?', tag: 'ours-return' },
  { hook: 'cards-twinflame-back', headline: 'Is my twin flame coming back to me?', tag: 'ours-return' },
  { hook: 'cards-was-he-soulmate', headline: 'Was he ever really my soulmate?', tag: 'ours-return' },
  // Joel's rewrite of a live lander, and its copy-test control
  { hook: 'cards-twin-back', headline: 'Is my twin flame coming back to me?', tag: 'joel-control' },
  { hook: 'cards-return', headline: 'Will he come back?', tag: 'joel-rewrite' },
  { hook: 'cards-really-soulmate', headline: 'Is he really my soulmate?', tag: 'joel-rewrite' },
  // a money lander
  { hook: 'cards-out-of-time', headline: 'Is something still blocking my money, or have I run out of time?', tag: 'joel-money' },
];

test.use({ viewport: { width: 390, height: 844 } });
// ⏱ The cut read takes far longer than Playwright's 30s default to finish arriving.
test.setTimeout(180000);

const transcript: string[] = [];
const timings: string[] = [];

test.beforeAll(() => { mkdirSync(SHOTS, { recursive: true }); });

test.afterAll(() => {
  writeFileSync(SHOTS + '/transcript.txt', transcript.join('\n'));
});

for (const { hook, headline, tag } of LANDERS) {
  test(`${tag} · ${hook} renders, reveals and hands off`, async ({ page }: { page: Page }) => {
    const bad: string[] = [];
    await page.route('**facebook.com/**', (r) => r.abort());
    page.on('response', (res) => {
      if (res.url().includes('/api/') && res.status() >= 400) bad.push(`${res.status()} ${res.url()}`);
    });

    await page.goto(`http://localhost:5000/fb-tarot/b?hook=${hook}&noemail=1`, { waitUntil: 'domcontentloaded' });

    // 1. the right lander, not the DEFAULT_HOOK fallback
    await expect(page.getByRole('heading', { name: headline })).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SHOTS}/${tag}-${hook}-1-lander.png`, fullPage: true });

    // 2. tap card A and let the read arrive
    await page.getByTestId('tarot-card-a').click();
    await page.waitForURL(/\/fb-tarot\/chat/, { timeout: 20000 });

    // ⏱ The Natural Tarot-Cut turns beat 3 into four bubbles, so Version B now delivers
    // EIGHT messages instead of five — each behind its own typing pause. Wait for the run to
    // finish (the name-capture line is always last) and record how long it took, because that
    // wait is time she sits watching a typing indicator before she can reply.
    const t0 = Date.now();
    await expect(page.getByText(/what's your first name, dear\?/)).toBeVisible({ timeout: 90000 });
    const secondsToFullRead = Math.round((Date.now() - t0) / 100) / 10;
    await page.waitForTimeout(500);

    const texts = await page.locator(BUBBLE).allInnerTexts();
    timings.push(`${tag.padEnd(13)} ${hook.padEnd(24)} ${String(texts.length).padStart(2)} bubbles  ${secondsToFullRead}s`);
    expect(texts.length, `${hook}: no bubbles rendered`).toBeGreaterThan(3);
    for (const t of texts) expect(t.trim().length, `${hook}: empty bubble`).toBeGreaterThan(0);

    await page.screenshot({ path: `${SHOTS}/${tag}-${hook}-2-read.png`, fullPage: true });

    // 3. no API error anywhere in the handoff
    expect(bad, `${hook}: API errors\n${bad.join('\n')}`).toEqual([]);

    transcript.push(
      `\n${'='.repeat(78)}\n${tag}  ${hook}\n${headline}\n${'='.repeat(78)}`,
      ...texts.map((t, i) => `  [${i + 1}] ${t.replace(/\n/g, '\n      ')}`),
    );
  });
}
