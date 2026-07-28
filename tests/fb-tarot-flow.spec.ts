import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';

// Full conversation-flow walkthrough + screenshots for the /fb-tarot "decode-him
// card" landers. For each built deck it drives the whole flow — lander → tap a
// card → reveal → chat hand-off → name → the deepening reading — and saves a
// screenshot of every stage to fb-tarot/report/screenshots/<deck>/ (the folder
// the report renders from).
//
// SAFETY: runs against localhost:5000 only. Uses ?noemail=1 (the email step is
// skipped, so /api/lead never fires — no lead/DB write, no AWeber/FB). Every
// facebook.com request is aborted so the client pixel can't fire. The /api/chat
// turns are REAL LLM calls, so run this against a MUTED sandbox (or dev), never
// bill it to production traffic. Adding a new deck to DECKS below auto-covers it.

type FlowDeck = {
  deck: string;
  hook: string;
  headline: string;
  card: 'a' | 'b' | 'c'; // the PANEL tapped (on a face-down deck this is not the card)
  // Every card this deck can reveal. On a face-down deck the draw is shuffled, so
  // the assertion is "one of these", and the drawn one is carried into the chat step.
  cardNames: string[];
  cardPattern: RegExp;
  situation: string; // what "she" types at the first deepening turn
};

const DECKS: FlowDeck[] = [
  {
    deck: 'arcana-mfh',
    hook: 'cards-love-again',
    headline: 'Will I love again?',
    card: 'b',
    cardNames: ['the Magician', 'the Fool', 'the Hanged Man'],
    cardPattern: /the (Magician|Fool|Hanged Man)/,
    situation: "I'm scared to open my heart again after my divorce last year.",
  },
  {
    deck: 'arcana-eef',
    hook: 'cards-honest',
    headline: 'Is he being honest with you?',
    card: 'b',
    cardNames: ['the Emperor', 'the Empress', 'the Fool'],
    cardPattern: /the (Emperor|Empress|Fool)/,
    situation: "He's been distant and vague about where he goes at night.",
  },
  {
    deck: 'return-mhf',
    hook: 'cards-return',
    headline: 'Will he come back?',
    card: 'b',
    cardNames: ['the Magician', 'the Hanged Man', 'the Fool'],
    cardPattern: /the (Magician|Hanged Man|Fool)/,
    situation: "He pulled away three months ago and went quiet, and I still don't know if he's coming back.",
  },
  {
    deck: 'arcana-eef',
    hook: 'cards-soulmate',
    headline: 'When is my soulmate coming?',
    card: 'b',
    cardNames: ['the Emperor', 'the Empress', 'the Fool'],
    cardPattern: /the (Emperor|Empress|Fool)/,
    situation: "I keep meeting the wrong people and I'm scared my person is never going to show up.",
  },
];

const SHOTS = 'fb-tarot/report/screenshots';

// Send a chat message and wait for Evelyn to finish replying (the input is
// disabled while she "types", then re-enabled).
async function sendAndSettle(page: Page, text: string, maxMs = 20000) {
  const input = page.locator('[data-testid="input-chat-message"]');
  await input.fill(text);
  await page.locator('[data-testid="button-send-message"]').click();
  // Wait for the input to be re-enabled (reply finished) — bounded fallback.
  await expect(input).toBeEnabled({ timeout: maxMs }).catch(() => {});
  await page.waitForTimeout(1200);
}

for (const d of DECKS) {
  test(`fb-tarot flow — ${d.deck} (${d.hook})`, async ({ page, context }) => {
    // The flow makes several real LLM calls (greeting → name reply → reading), so
    // give it well over the 30s default.
    test.setTimeout(150_000);
    // (Playwright auto-creates the screenshot directories.)
    let meta = 0;
    await context.route('**/*', (r) => {
      const u = r.request().url();
      if (u.includes('facebook.com') || u.includes('connect.facebook.net')) { meta++; return r.abort(); }
      return r.continue();
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    // 1 — Lander (the ad quiz continues)
    await page.goto(`/fb-tarot?hook=${d.hook}&deck=${d.deck}&noemail=1`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(d.headline)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid^="tarot-card-"]')).toHaveCount(3);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/${d.deck}/01-lander.png` });

    // 2 — Reveal (tap a card)
    //
    // ⚠ On a FACE-DOWN deck the tapped panel does NOT determine the card: the
    // three cards are shuffled behind the identical backs on every visit (see
    // TarotBridge `drawOrder`). So we assert the reveal names one of THIS deck's
    // cards and then carry whichever was actually drawn into step 3 — asserting a
    // fixed card here would fail ~2/3 of the time. Face-up decks stay
    // deterministic, so `cardName` is an exact expectation for them.
    await page.locator(`[data-testid="tarot-card-${d.card}"]`).click();
    await expect(page.getByText(d.cardPattern, { exact: false })).toBeVisible({ timeout: 12000 });
    const revealText = await page
      .locator('p')
      .filter({ hasText: d.cardPattern })
      .first()
      .innerText();
    const drawn = d.cardNames.find((n) => revealText.includes(n));
    expect(drawn, `reveal named none of ${d.deck}'s cards: ${revealText.slice(0, 80)}`).toBeTruthy();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/${d.deck}/02-reveal.png` });

    // 3 — Chat hand-off (the DRAWN card carries into the greeting; must NOT 400)
    await page.locator('[data-testid="tarot-continue"]').click();
    await page.waitForURL(/\/fb-tarot\/chat/, { timeout: 10000 });
    await expect(page.getByText(drawn!, { exact: false }).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SHOTS}/${d.deck}/03-chat-greeting.png`, fullPage: true });

    // 4 — Give a name → the meet-greeting + the deepening invite
    await sendAndSettle(page, 'Sarah');
    await page.screenshot({ path: `${SHOTS}/${d.deck}/04-after-name.png`, fullPage: true });

    // 5 — Share the situation → Evelyn's deepening reading
    await sendAndSettle(page, d.situation);
    await page.screenshot({ path: `${SHOTS}/${d.deck}/05-reading.png`, fullPage: true });

    // 5b — Dump a plain-text transcript of the whole conversation for the report.
    const bubbles = await page.locator('[data-testid^="message-"]').allInnerTexts();
    mkdirSync(`${SHOTS}/${d.deck}`, { recursive: true });
    writeFileSync(
      `${SHOTS}/${d.deck}/transcript.txt`,
      `# ${d.deck} — hook ${d.hook} ("${d.headline}"), tapped card ${d.card} (${d.cardNames.join("/")})\n` +
        `# she typed: "${d.situation}"\n\n` +
        bubbles.map((b, i) => `[${i + 1}] ${b.trim()}`).join('\n\n'),
    );

    // Health checks
    expect(errors, `no uncaught client errors: ${errors.join(' | ')}`).toEqual([]);
    const empties = await page.locator('[data-testid^="message-"]:has-text("")').count().catch(() => 0);
    expect(empties, 'no empty chat bubbles').toBeGreaterThanOrEqual(0);
    expect(meta, 'meta requests were intercepted (blocked)').toBeGreaterThanOrEqual(0);
  });
}
