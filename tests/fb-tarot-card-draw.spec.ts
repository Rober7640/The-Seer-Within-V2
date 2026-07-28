import { test, expect, type Page } from "@playwright/test";

// Coverage for the /fb-tarot CARD DRAW — the mechanic that decides which of the
// three cards a visitor actually gets, and whether the reveal tells her the truth
// about it.
//
// ── Why this exists ──────────────────────────────────────────────────────────
// The bridge originally mapped panel→card FIXED: panel A was always the first
// card, B always the second, C always the third. On a FACE-DOWN deck the three
// panels are identical backs, so she isn't choosing a card — she's choosing a
// position, and with three options people overwhelmingly tap the MIDDLE one. One
// card would have taken most of the traffic and one read would barely ever have
// been seen. The fix shuffles the cards behind the backs once per visit
// (TarotBridge `drawOrder`).
//
// That fix creates two NEW ways to break things, both silent, both covered here:
//   1. the reveal IMAGE could stop matching the card named in the text, and
//   2. the chat hand-off could carry the tapped PANEL instead of the drawn CARD,
//      so Evelyn would open by talking about a card the visitor never got.
//
// FACE-UP decks must NOT rotate — there she can see the cards and genuinely picks
// one, so randomising would show her a card she didn't choose and make "you chose
// the Magician" a lie. That exemption is asserted too.
//
// 🔒 SAFETY: localhost only (hard-refused otherwise). No /api/lead, no chat turns,
//    no LLM calls, no DB writes — this never leaves the bridge. Meta is blocked at
//    the network layer because the client pixel id is hardcoded in index.html.
//
// ── RUN IT (isolated local sandbox — NEVER production) ───────────────────────
//   node scripts/make-sandbox-env.mjs
//   DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts
//   npx playwright test --config=playwright.fb-tarot-draw.config.ts

const FACE_DOWN_DECK = "return-mhf";
const FACE_UP_DECK = "arcana-mfh";
// The panel people tap most — deliberately held constant so panel != card.
const MIDDLE = "b";

// return-mhf, panels A/B/C in config order.
const CARD_INDEX: Record<string, number> = { Magician: 0, "Hanged Man": 1, Fool: 2 };
const CARD_LETTER: Record<string, string> = { Magician: "a", "Hanged Man": "b", Fool: "c" };
// A 3-up strip cropped by background-position: index i → (i/(n-1))*100.
const EXPECT_POS: Record<number, string> = { 0: "0%", 1: "50%", 2: "100%" };

const NAMES = /Magician|Hanged Man|Fool/;

async function blockMeta(page: Page) {
  await page.route("**://*.facebook.com/**", (r) => r.abort());
  await page.route("**://connect.facebook.net/**", (r) => r.abort());
}

/** One visit: open the lander, tap `panel`, return the card named in the reveal. */
async function draw(page: Page, deck: string, hook: string, panel: string): Promise<string> {
  await page.goto(`/fb-tarot?deck=${deck}&hook=${hook}`, { waitUntil: "domcontentloaded" });
  await page.getByTestId(`tarot-card-${panel}`).click();
  await expect(page.getByTestId("tarot-continue")).toBeVisible({ timeout: 20_000 });
  const body = await page.locator("p").filter({ hasText: NAMES }).first().innerText();
  const named = Object.keys(CARD_INDEX).find((c) => body.includes(c));
  expect(named, `reveal named no card: ${body.slice(0, 80)}`).toBeTruthy();
  return named!;
}

test.beforeAll(({}, testInfo) => {
  const base = String(testInfo.project.use.baseURL ?? "");
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
    throw new Error(`🔴 REFUSING to run against "${base}" — localhost sandbox only.`);
  }
});

test("face-down: the same panel yields DIFFERENT cards across visits", async ({ page }) => {
  await blockMeta(page);
  const seen: Record<string, number> = {};
  const N = 24;
  for (let i = 0; i < N; i++) {
    const c = await draw(page, FACE_DOWN_DECK, "cards-return", MIDDLE);
    seen[c] = (seen[c] ?? 0) + 1;
  }
  console.log(`  panel "${MIDDLE}" tapped ${N}x → ${JSON.stringify(seen)}`);
  // All three must appear. P(a given card missing in 24 fair draws) ≈ 0.01%, so
  // this is a real failure rather than flake — it means the draw is stuck.
  expect(
    Object.keys(seen).sort(),
    "a card never appeared — the draw is not rotating",
  ).toEqual(["Fool", "Hanged Man", "Magician"]);
});

test("face-up: the same panel yields the SAME card every time (rotation must NOT apply)", async ({
  page,
}) => {
  await blockMeta(page);
  const seen = new Set<string>();
  for (let i = 0; i < 8; i++) seen.add(await draw(page, FACE_UP_DECK, "cards-honest", MIDDLE));
  console.log(`  face-up panel "${MIDDLE}" tapped 8x → ${JSON.stringify([...seen])}`);
  expect(
    seen.size,
    "a face-up pick must be deterministic — she can SEE the card she chose",
  ).toBe(1);
});

test("the revealed IMAGE matches the card named in the copy", async ({ page }) => {
  await blockMeta(page);
  const checked = new Set<string>();
  for (let i = 0; i < 40 && checked.size < 3; i++) {
    const named = await draw(page, FACE_DOWN_DECK, "cards-honest", MIDDLE);
    if (checked.has(named)) continue;
    checked.add(named);
    const pos = await page
      .locator('div[style*="background-image"]')
      .last()
      .evaluate((el) => getComputedStyle(el).backgroundPositionX);
    expect(pos, `${named}: image crop does not match the named card`).toBe(
      EXPECT_POS[CARD_INDEX[named]],
    );
    console.log(`  ${named.padEnd(11)} img=${pos} ✅`);
  }
  expect(checked.size, "did not observe all three cards").toBe(3);
});

test("the chat hand-off carries the DRAWN card, not the tapped panel", async ({ page }) => {
  await blockMeta(page);
  const checked = new Set<string>();
  for (let i = 0; i < 40 && checked.size < 3; i++) {
    const named = await draw(page, FACE_DOWN_DECK, "cards-honest", MIDDLE);
    if (checked.has(named)) continue;
    checked.add(named);
    await page.getByTestId("tarot-continue").click();
    await page.waitForURL(/\/fb-tarot\/chat\?/, { timeout: 20_000 });
    const q = new URL(page.url()).searchParams;
    expect(q.get("card"), `hand-off sent the wrong card for ${named}`).toBe(CARD_LETTER[named]);
    expect(q.get("hook")).toBe("cards-honest");
    console.log(`  tapped=${MIDDLE} drew=${named} → url card=${q.get("card")} ✅`);
  }
  expect(checked.size, "did not observe all three cards").toBe(3);
});

// The three hooks the ads run. Each must swap the headline on the SAME deck.
for (const [hook, headline] of [
  ["cards-return", "Will he come back?"],
  ["cards-honest", "Is he being honest with you?"],
  ["cards-feels", "How does he really feel about you?"],
] as const) {
  test(`hook ${hook} renders its own headline`, async ({ page }) => {
    await blockMeta(page);
    await page.goto(`/fb-tarot?deck=${FACE_DOWN_DECK}&hook=${hook}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("h2").first()).toHaveText(headline, { timeout: 20_000 });
    await expect(page.locator('[data-testid^="tarot-card-"]')).toHaveCount(3);
  });
}

// The rewritten reads (2026-07-28 sign-off): the three lines that were softened
// away from predicting a return / accusing him. Asserted verbatim so a future
// edit can't quietly walk them back.
for (const [hook, card, must] of [
  ["cards-return", "Hanged Man", "doesn't promise a return"],
  ["cards-return", "Fool", "if something does come of this"],
  ["cards-honest", "Fool", "unexamined rather than hidden"],
] as const) {
  test(`signed-off copy — ${hook} / ${card}`, async ({ page }) => {
    await blockMeta(page);
    let text = "";
    for (let i = 0; i < 40 && !text; i++) {
      const named = await draw(page, FACE_DOWN_DECK, hook, MIDDLE);
      if (named === card) {
        text = await page.locator("p").filter({ hasText: NAMES }).first().innerText();
      }
    }
    expect(text, `never drew ${card}`).toBeTruthy();
    expect(text).toContain(must);
    // Guardrails that must hold for every read on this funnel.
    expect(text, "no exclamation marks").not.toMatch(/!/);
    expect(text, "never a flat verdict").not.toMatch(/\bhe is (lying|cheating|faithful|honest)\b/i);
  });
}
