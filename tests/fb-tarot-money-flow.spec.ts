import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';

// End-to-end walkthrough of the MONEY landers (2026-08-19) — the first non-love family on
// /fb-tarot. Sibling of fb-tarot-flow.spec.ts, but it asserts the three things that are
// money-specific and that nothing else on the funnel can catch:
//
//   1. THE TAP LINE. The instruction lives on the DECK ("Think of the man on your mind"),
//      so before hookInstruction existed every money lander said that to a woman who
//      clicked an ad about her pension. Asserted on the rendered page, both directions.
//   2. THE HAND-OFF. hookToBucket() was hardcoded to 'love'. A money hook the server does
//      not know about 400s on /api/chat, and a 400 falls back to a normal-looking read —
//      so it does not announce itself. Watched at the network layer.
//   3. THE SEVEN BANS, swept over WHAT WAS ACTUALLY SHOWN HER, including the live model's
//      deepening reply. The registry guard checks the canned copy; only this checks what
//      the LLM says on top of it.
//
// SAFETY: localhost only, ?noemail=1 (no /api/lead, no AWeber, no FB), every facebook.com
// request aborted. The chat turns are REAL model calls — run against dev/a muted sandbox.

type MoneyLander = { hook: string; headline: string; angle: string; situation: string };

// Chosen at random from the eleven (shuf) rather than hand-picked, so this is not a
// walkthrough of the two I happened to trust.
const LANDERS: MoneyLander[] = [
  {
    hook: 'cards-out-of-time',
    headline: 'Is something still blocking my money, or have I run out of time?',
    angle: 'money-working',
    situation: 'I am 68 and still doing shifts. I thought I would have something put by by now and there is nothing.',
  },
  {
    hook: 'cards-how-much-longer',
    headline: 'How much longer will something keep blocking my money?',
    angle: 'money-working',
    situation: 'Every time I get close to being ahead something takes it. It has been like this for years.',
  },
];

const MONEY_TAP = 'Think of the money that never came. Tap the card that calls you.';
const LOVE_TAP = 'Think of the man on your mind.';

// The seven bans, swept over the rendered transcript. Deliberately the ASSERTION forms only:
// a refusal that names the banned thing ("I will not tell you a date") is correct copy.
const BANS: Array<[RegExp, string]> = [
  [/[£$]\s?\d|\b\d[\d,]{3,}\b|\b(thousand|million|pounds|dollars)\b/i, 'BAN 1 — an amount'],
  [/\bwithin (a|the|\d)|\bin (a few|the next|another|\d+) (day|week|month|year)|\bby (the end of|christmas|new year|spring|summer|autumn|winter)\b/i, 'BAN 1 — a date'],
  [/\b(inheritance|windfall|lottery|lawsuit|compensation|a settlement|legal case)\b/i, 'BAN 1 — a SOURCE she could act on'],
  [/\bsomeone close to you\b|\ba family member\b|\byour (son|daughter|husband|partner|sister|brother|mother|father)\b/i, 'BAN 2 — names a person as the block'],
  [/\b(you should |you need to |you must )?(invest|remortgage|borrow)\b|\b(take|delay|claim) (your|the) pension\b|\bstart a business\b|\bgo back to work\b|\bstop working\b/i, 'BAN 3 — financial advice'],
  [/\b(poverty|scarcity|money) mindset\b|\braise your vibration\b|\byou attract\b|\bself.?sabotag/i, 'BAN 4 — blames her'],
  [/\b(it|this) (is|'s) too late\b|\byou (have|'ve) run out of time\b|\bthe money (is coming|will arrive)\b/i, 'BAN 5 — too late / a promised arrival'],
  [/\byou (are|'re) (broke|poor|destitute)\b|\byour debts\b/i, 'BAN 7 — presumes her finances'],
];

// ⚠ The drawn card's artwork renders INSIDE message 1 as its own element, and its testid
// (`message-card-art-<id>`) also starts with "message-" — so the obvious selector counts the
// picture as a tenth, empty bubble and the run fails on a defect that does not exist. Bubbles
// are the message wrappers only.
const BUBBLE = '[data-testid^="message-"]:not([data-testid^="message-card-art-"])';

const SHOTS = 'fb-tarot/report/screenshots';

async function sendAndSettle(page: Page, text: string, maxMs = 25000) {
  const input = page.locator('[data-testid="input-chat-message"]');
  await input.fill(text);
  await page.locator('[data-testid="button-send-message"]').click();
  await expect(input).toBeEnabled({ timeout: maxMs }).catch(() => {});
  await page.waitForTimeout(1500);
}

for (const d of LANDERS) {
  test(`fb-tarot MONEY flow — ${d.hook}`, async ({ page, context }) => {
    test.setTimeout(180_000);
    const dir = `money-${d.hook}`;
    let meta = 0;
    await context.route('**/*', (r) => {
      const u = r.request().url();
      if (u.includes('facebook.com') || u.includes('connect.facebook.net')) { meta++; return r.abort(); }
      return r.continue();
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    const chatFailures: string[] = [];
    page.on('response', (res) => {
      if (res.url().includes('/api/chat') && res.status() >= 400) chatFailures.push(`${res.status()} ${res.url()}`);
    });

    // 1 — the lander
    await page.goto(`/fb-tarot/b?hook=${d.hook}&noemail=1`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid^="tarot-card-"]')).toHaveCount(3);
    await expect(page.getByText(d.headline, { exact: false })).toBeVisible();
    // THE MONEY CHECK, both directions.
    await expect(page.getByText(MONEY_TAP, { exact: false })).toBeVisible();
    await expect(page.getByText(LOVE_TAP, { exact: false })).toHaveCount(0);
    mkdirSync(`${SHOTS}/${dir}`, { recursive: true });
    await page.screenshot({ path: `${SHOTS}/${dir}/01-lander.png` });

    // 2 — tap a card. ⚠ VERSION B HAS NO REVEAL CARD: the tap calls goToChat() and lands in
    // the chat directly, so there is no `tarot-continue` to click (that button is Version A's).
    // The read IS the chat, which is exactly why every guard on this copy is load-bearing —
    // there is no model call behind it to catch a bad line.
    await page.locator('[data-testid="tarot-card-a"]').click();
    await page.waitForURL(/\/fb-tarot\/chat/, { timeout: 15000 });
    const cardPattern = /the (Magician|Hanged Man|Fool)/;
    await expect(page.getByText(cardPattern).first()).toBeVisible({ timeout: 20000 });
    const drawn = (await page.locator('body').innerText()).match(cardPattern)?.[0];

    // 3 — the whole seven-cut read has to arrive before she is asked her name. Version B
    // serves it as separate bubbles with a typing pause between each.
    await expect(page.getByText(/what's your first name, dear\?/i)).toBeVisible({ timeout: 60000 });
    const readBubbles = await page.locator(BUBBLE).allInnerTexts();
    expect(readBubbles.length, 'the seven cuts + the name question').toBeGreaterThanOrEqual(8);
    expect(readBubbles[0], 'opens on the card').toMatch(/^You turned /);
    expect(readBubbles.slice(0, 8).join(' '), 'keeps the open loop').toMatch(/Let me look closer at/);
    await page.screenshot({ path: `${SHOTS}/${dir}/03-chat.png`, fullPage: true });

    // 4 + 5 — name, then her real situation (a live model call)
    await sendAndSettle(page, 'Sarah');
    await page.screenshot({ path: `${SHOTS}/${dir}/04-after-name.png`, fullPage: true });
    await sendAndSettle(page, d.situation);
    await page.screenshot({ path: `${SHOTS}/${dir}/05-reading.png`, fullPage: true });

    const bubbles = await page.locator(BUBBLE).allInnerTexts();
    writeFileSync(
      `${SHOTS}/${dir}/transcript.txt`,
      `# ${d.hook} (${d.angle}) — "${d.headline}"\n# drawn: ${drawn}\n# she typed: "${d.situation}"\n\n` +
        bubbles.map((b, i) => `[${i + 1}] ${b.trim()}`).join('\n\n'),
    );

    // Health
    expect(errors, `no uncaught client errors: ${errors.join(' | ')}`).toEqual([]);
    expect(chatFailures, `/api/chat must not error: ${chatFailures.join(' | ')}`).toEqual([]);
    // A textless bubble is allowed ONLY if it is the drawn card's artwork — that bubble is
    // deliberate (she looks at the card while she reads), and it is a `role="img"` div with
    // no text in it. Anything else textless is a real empty bubble.
    const textless = await page.locator(BUBBLE).evaluateAll((els) =>
      els.map((el, i) => ({ i, text: (el as HTMLElement).innerText.trim() })).filter((b) => !b.text),
    );
    expect(textless.map((b) => b.i), 'empty chat bubbles').toEqual([]);
    // The drawn card's artwork is its own element INSIDE message 1 — she reads the picture
    // line while looking at the card. Assert it is actually there, exactly once.
    await expect(page.locator('[data-testid^="message-card-art-"]')).toHaveCount(1);
    expect(bubbles.length, 'the conversation produced messages').toBeGreaterThan(5);

    // The seven bans, over everything she was actually shown — canned copy AND model output.
    const shown = bubbles.join('\n');
    const hits = BANS.filter(([re]) => re.test(shown)).map(([re, why]) => `${why}: "${shown.match(re)?.[0]}"`);
    expect(hits, `money bans broken in what she was SHOWN:\n${hits.join('\n')}`).toEqual([]);

    console.log(`   ${d.hook}: ${bubbles.length} bubbles · drawn ${drawn} · ${meta} meta blocked · 0 ban hits`);
  });
}
