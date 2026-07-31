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
  // Screenshot folder. Defaults to `deck`, but a deck that appears more than once
  // (same cards, different `?hook=`) MUST set this or each run overwrites the
  // previous one's shots and the report shows the wrong hook's screenshots.
  slug?: string;
  // FACE-UP decks only: the panel deterministically IS the card (the shuffle is
  // gated on `facing`), so we can assert exactly which card the reveal named.
  expectCard?: string;
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
  // ── FACE-UP decode-him, on the 3 SIGNED-OFF headlines (2026-07-30) ───────────
  // The face-up `arcana-mfh` deck answering the same three questions the signed-off
  // face-down `return-mhf` deck answers. Headlines come from TAROT_HEADLINES, which
  // is keyed by HOOK not by deck, so these render the identical headline strings —
  // that identity is what `headline` below asserts.
  //
  // A different panel is tapped per hook (a=Magician, b=Fool, c=Hanged Man) so the
  // three runs cover all three cards as well as all three headlines. Face-up is
  // deterministic, so each asserts its exact card via `expectCard`.
  {
    deck: 'arcana-mfh',
    hook: 'cards-honest',
    headline: 'Is he being honest with you?',
    slug: 'arcana-mfh-cards-honest',
    card: 'a',
    expectCard: 'the Magician',
    cardNames: ['the Magician', 'the Fool', 'the Hanged Man'],
    cardPattern: /the (Magician|Fool|Hanged Man)/,
    situation: "He says everything is fine but his story keeps changing, and I can't shake the feeling something is off.",
  },
  {
    deck: 'arcana-mfh',
    hook: 'cards-return',
    headline: 'Will he come back?',
    slug: 'arcana-mfh-cards-return',
    card: 'b',
    expectCard: 'the Fool',
    cardNames: ['the Magician', 'the Fool', 'the Hanged Man'],
    cardPattern: /the (Magician|Fool|Hanged Man)/,
    situation: "He ended it six weeks ago and has gone completely silent, and I don't know if he is ever coming back.",
  },
  {
    deck: 'arcana-mfh',
    hook: 'cards-feels',
    headline: 'How does he really feel about you?',
    slug: 'arcana-mfh-cards-feels',
    card: 'c',
    expectCard: 'the Hanged Man',
    cardNames: ['the Magician', 'the Fool', 'the Hanged Man'],
    cardPattern: /the (Magician|Fool|Hanged Man)/,
    situation: "He is warm with me one week and completely closed off the next, and I can't tell what I actually mean to him.",
  },
  // ── FACE-UP trust hooks (2026-07-30) ─────────────────────────────────────────
  // The same 3 trust headlines on the face-up deck. Reads are ported card-for-card
  // from return-mhf, so the assertion here is the FACE-UP framing: "You chose", the
  // exact card (face-up is deterministic), and that the hand-off still does not 400.
  // A different panel each, so the 3 runs cover all 3 cards.
  {
    deck: 'arcana-mfh',
    hook: 'cards-who-he-is',
    headline: 'Is he really who he says he is?',
    slug: 'arcana-mfh-cards-who-he-is',
    card: 'a',
    expectCard: 'the Magician',
    cardNames: ['the Magician', 'the Fool', 'the Hanged Man'],
    cardPattern: /the (Magician|Fool|Hanged Man)/,
    situation: "Every time I think I know him, something turns up that does not fit the man he showed me.",
  },
  {
    deck: 'arcana-mfh',
    hook: 'cards-real-person',
    headline: 'Is he the real person, or just a picture?',
    slug: 'arcana-mfh-cards-real-person',
    card: 'c',
    expectCard: 'the Hanged Man',
    cardNames: ['the Magician', 'the Fool', 'the Hanged Man'],
    cardPattern: /the (Magician|Fool|Hanged Man)/,
    situation: "There is always a reason he cannot meet me, and I have started to wonder if he is even real.",
  },
  {
    deck: 'arcana-mfh',
    hook: 'cards-misled',
    headline: 'Am I being misled?',
    slug: 'arcana-mfh-cards-misled',
    card: 'b',
    expectCard: 'the Fool',
    cardNames: ['the Magician', 'the Fool', 'the Hanged Man'],
    cardPattern: /the (Magician|Fool|Hanged Man)/,
    situation: "What he says and what I actually see keep pulling apart, and I no longer trust my own read on it.",
  },
  // ─────────────────────────────────────────────────────────────────────────────
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
  // ── FACE-DOWN trust/authenticity hooks (2026-07-30) ──────────────────────────
  // The 3 new trust headlines on the live face-down deck. return-mhf appears more
  // than once now, so these MUST carry `slug` or they overwrite its screenshots.
  // Face-down ⇒ the draw is shuffled, so no `expectCard` (any of the 3 is valid).
  {
    deck: 'return-mhf',
    hook: 'cards-who-he-is',
    headline: 'Is he really who he says he is?',
    slug: 'return-mhf-cards-who-he-is',
    card: 'b',
    cardNames: ['the Magician', 'the Hanged Man', 'the Fool'],
    cardPattern: /the (Magician|Hanged Man|Fool)/,
    situation: "The more I learn about him the less the pieces line up, and I don't know which version of him is the real one.",
  },
  {
    deck: 'return-mhf',
    hook: 'cards-real-person',
    headline: 'Is he the real person, or just a picture?',
    slug: 'return-mhf-cards-real-person',
    card: 'b',
    cardNames: ['the Magician', 'the Hanged Man', 'the Fool'],
    cardPattern: /the (Magician|Hanged Man|Fool)/,
    situation: "We have been talking for four months and he has never once been able to video call me.",
  },
  {
    deck: 'return-mhf',
    hook: 'cards-misled',
    headline: 'Am I being misled?',
    slug: 'return-mhf-cards-misled',
    card: 'b',
    cardNames: ['the Magician', 'the Hanged Man', 'the Fool'],
    cardPattern: /the (Magician|Hanged Man|Fool)/,
    situation: "He tells me one thing and then I find out something completely different, and I am starting to feel crazy.",
  },
  // ── COMMITMENT hooks on the live face-down deck (2026-07-31) ─────────────────
  // A different panel each (a/b/c) so the three runs cover all three cards as well
  // as all three headlines. Face-DOWN shuffles, so the card cannot be asserted —
  // `cardPattern` checks it named one of the three, which is the correct assertion
  // for this facing (see expectCard, face-up only).
  {
    deck: 'return-mhf',
    hook: 'cards-will-commit',
    headline: 'Will he ever commit?',
    slug: 'return-mhf-cards-will-commit',
    card: 'a',
    cardNames: ['the Magician', 'the Hanged Man', 'the Fool'],
    cardPattern: /the (Magician|Hanged Man|Fool)/,
    situation: "We have been together two years and he still will not talk about living together or anything after that.",
  },
  {
    deck: 'return-mhf',
    hook: 'cards-wont-commit',
    headline: "Why won't he commit to me?",
    slug: 'return-mhf-cards-wont-commit',
    card: 'b',
    cardNames: ['the Magician', 'the Hanged Man', 'the Fool'],
    cardPattern: /the (Magician|Hanged Man|Fool)/,
    situation: "Every time I bring up the future he changes the subject, and I have started to feel like I am asking for too much.",
  },
  {
    deck: 'return-mhf',
    hook: 'cards-ready-commit',
    headline: 'Is he ever going to be ready for real commitment?',
    slug: 'return-mhf-cards-ready-commit',
    card: 'c',
    cardNames: ['the Magician', 'the Hanged Man', 'the Fool'],
    cardPattern: /the (Magician|Hanged Man|Fool)/,
    situation: "He says he is not in a place for anything serious yet, and I keep waiting for that to change.",
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    deck: 'arcana-eef',
    hook: 'cards-soulmate',
    headline: 'When is my soulmate coming?',
    // Slugged: arcana-eef appears twice, and without this the soulmate run
    // overwrote the cards-honest shots the report renders.
    slug: 'arcana-eef-cards-soulmate',
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
    const dir = d.slug ?? d.deck;
    let meta = 0;
    await context.route('**/*', (r) => {
      const u = r.request().url();
      if (u.includes('facebook.com') || u.includes('connect.facebook.net')) { meta++; return r.abort(); }
      return r.continue();
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    // The report's headline claim is "the chat hand-off does not 400" — so actually
    // watch /api/chat for it. (/api/conversation/resume 404s benignly on a fresh
    // session, so it is recorded but not asserted on.)
    const chatFailures: string[] = [];
    const otherApi: string[] = [];
    page.on('response', (r) => {
      const u = r.url();
      if (!u.includes('/api/') || r.status() < 400) return;
      if (u.includes('/api/chat')) chatFailures.push(`${r.status()} ${u}`);
      else otherApi.push(`${r.status()} ${u}`);
    });

    // 1 — Lander (the ad quiz continues)
    await page.goto(`/fb-tarot?hook=${d.hook}&deck=${d.deck}&noemail=1`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(d.headline)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid^="tarot-card-"]')).toHaveCount(3);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/${dir}/01-lander.png` });

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
    // FACE-UP: the panel she taps IS the card, so this must be exact. If a future
    // change ever extended the shuffle to face-up decks, "you chose the Magician"
    // would become a lie and this is what catches it.
    if (d.expectCard) {
      expect(drawn, `face-up deck ${d.deck} panel ${d.card} must reveal ${d.expectCard}`).toBe(d.expectCard);
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/${dir}/02-reveal.png` });

    // 3 — Chat hand-off (the DRAWN card carries into the greeting; must NOT 400)
    await page.locator('[data-testid="tarot-continue"]').click();
    await page.waitForURL(/\/fb-tarot\/chat/, { timeout: 10000 });
    await expect(page.getByText(drawn!, { exact: false }).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SHOTS}/${dir}/03-chat-greeting.png`, fullPage: true });

    // 4 — Give a name → the meet-greeting + the deepening invite
    await sendAndSettle(page, 'Sarah');
    await page.screenshot({ path: `${SHOTS}/${dir}/04-after-name.png`, fullPage: true });

    // 5 — Share the situation → Evelyn's deepening reading
    await sendAndSettle(page, d.situation);
    await page.screenshot({ path: `${SHOTS}/${dir}/05-reading.png`, fullPage: true });

    // 5b — Dump a plain-text transcript of the whole conversation for the report.
    const bubbles = await page.locator('[data-testid^="message-"]').allInnerTexts();
    mkdirSync(`${SHOTS}/${dir}`, { recursive: true });
    writeFileSync(
      `${SHOTS}/${dir}/transcript.txt`,
      `# ${d.deck} — hook ${d.hook} ("${d.headline}"), tapped card ${d.card} (${d.cardNames.join("/")})\n` +
        `# she typed: "${d.situation}"\n\n` +
        bubbles.map((b, i) => `[${i + 1}] ${b.trim()}`).join('\n\n'),
    );

    // Health checks
    expect(errors, `no uncaught client errors: ${errors.join(' | ')}`).toEqual([]);
    // The hand-off must not 400 (the roster-sync failure mode this whole spec exists
    // to catch: a deck or hook the server does not know about).
    expect(chatFailures, `/api/chat must not error: ${chatFailures.join(' | ')}`).toEqual([]);
    // Real emptiness check. The old `:has-text("")` selector matched every bubble and
    // was asserted with toBeGreaterThanOrEqual(0), so it could never fail.
    const empties = bubbles.filter((b) => b.trim() === '').length;
    expect(empties, `no empty chat bubbles (of ${bubbles.length})`).toBe(0);
    // She must actually have received a reading, not just an empty shell.
    expect(bubbles.length, 'the conversation produced messages').toBeGreaterThan(3);
    // Every facebook.* request was aborted at the network layer, so nothing reached
    // Meta. Logged rather than asserted — 0 is the normal, healthy value here.
    console.log(
      `   ${dir}: ${bubbles.length} bubbles · ${meta} meta request(s) blocked` +
        (otherApi.length ? ` · other api noise: ${otherApi.join(', ')}` : ''),
    );
  });
}
