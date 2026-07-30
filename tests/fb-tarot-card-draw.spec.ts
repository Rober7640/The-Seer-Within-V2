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

// ── The CLEAN ad URL (no ?deck=) ────────────────────────────────────────────
// Ad links follow the fb-palm convention and omit the default concept:
//   /fb-tarot/c?hook=cards-honest      (not …&deck=return-mhf)
// So a bare URL must serve the LIVE deck. This regressed once already: the default
// was the seeded 'decode-him', whose strip art is byte-identical to
// client/public/palm/thumbs-strip.png — a clean tarot URL rendered PALM THUMBS.
for (const hook of ["cards-return", "cards-honest", "cards-feels"] as const) {
  test(`clean URL (no deck param) serves the live deck — ${hook}`, async ({ page }) => {
    await blockMeta(page);
    const strips: string[] = [];
    page.on("response", (r) => {
      if (/\/tarot\/.+\.png/.test(r.url())) strips.push(r.url());
    });

    await page.goto(`/fb-tarot?hook=${hook}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    // It must be the real card deck, not the palm-strip placeholder.
    const used = strips.join(" ");
    expect(used, `clean URL loaded no tarot art (saw: ${used})`).toContain("return-mhf");
    expect(used, "clean URL is serving the decode-him PLACEHOLDER (a palm strip)").not.toContain(
      "decode-him",
    );

    // …and it must still reveal a real card from THIS deck.
    await page.getByTestId(`tarot-card-${MIDDLE}`).click();
    await expect(page.getByTestId("tarot-continue")).toBeVisible({ timeout: 20_000 });
    const body = await page.locator("p").filter({ hasText: NAMES }).first().innerText();
    const named = Object.keys(CARD_INDEX).find((c) => body.includes(c));
    expect(named, `clean URL revealed no known card: ${body.slice(0, 80)}`).toBeTruthy();
  });
}

// The hooks the ads run. Each must swap the headline on the SAME deck.
for (const [hook, headline] of [
  ["cards-return", "Will he come back?"],
  ["cards-honest", "Is he being honest with you?"],
  ["cards-feels", "How does he really feel about you?"],
  // Trust/authenticity hooks added 2026-07-30.
  ["cards-who-he-is", "Is he really who he says he is?"],
  ["cards-real-person", "Is he the real person, or just a picture?"],
  ["cards-misled", "Am I being misled?"],
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

/**
 * Does `text` make a FLAT (un-negated) claim matching `re`?
 *
 * A naive `.not.toMatch(/he is fictional/)` fires on the CORRECT copy, because these
 * reads deliberately phrase the guardrail as a negation ("The Magician does not tell
 * me he is fictional — it tells me…"). So find each match and reject it only when no
 * negation precedes it in the same clause. Returns the offending phrase, or null.
 */
function flatClaim(text: string, re: RegExp): string | null {
  const rx = new RegExp(re.source, re.flags.replace("g", "") + "g");
  for (const m of text.matchAll(rx)) {
    const before = text.slice(Math.max(0, m.index - 70), m.index);
    // Negation in the same clause (no . ; or — between it and the claim) ⇒ fine.
    if (/\b(not|never|n't|nor)\b[^.;—]*$/i.test(before)) continue;
    return m[0];
  }
  return null;
}

// `cards-real-person` ("Is he the real person, or just a picture?") draws women who
// suspect a fake profile or a romance scam. The 2026-07-10 buyer audit caught Evelyn
// reframing textbook scam markers as a genuine bond, so on THIS hook REASSURANCE is
// the failure mode — not the safe default. All three reads must back her caution
// without ever pronouncing him fake (which would be a verdict).
test("cards-real-person never reassures her the man is genuine", async ({ page }) => {
  await blockMeta(page);
  const texts: Record<string, string> = {};
  // Face-down: the draw is shuffled, so loop until all three cards have been seen.
  for (let i = 0; i < 60 && Object.keys(texts).length < 3; i++) {
    const named = await draw(page, FACE_DOWN_DECK, "cards-real-person", MIDDLE);
    if (!texts[named]) {
      texts[named] = await page.locator("p").filter({ hasText: NAMES }).first().innerText();
    }
  }
  expect(Object.keys(texts).sort(), "all 3 cards drawn").toEqual(["Fool", "Hanged Man", "Magician"]);

  for (const [card, text] of Object.entries(texts)) {
    // Never vouch for him / never reassure her the bond is genuine.
    expect(
      flatClaim(text, /\b(he (is|really is) (real|genuine|honest|who he says)|the bond is (real|genuine)|you can trust him|his feelings are real)\b/i),
      `${card}: reassures her about him`,
    ).toBeNull();
    // …but also never a flat verdict that he IS fake — that is still a verdict.
    expect(
      flatClaim(text, /\bhe is (fake|a catfish|catfishing|lying|an invention|fictional|a scammer)\b/i),
      `${card}: pronounces him fake`,
    ).toBeNull();
    // And it must actually back her — the whole point of the hook.
    expect(text, `${card}: does not affirm her read`).toMatch(
      /\b(information|your caution|asking me for|wisdom)\b/i,
    );
    // Same funnel-wide guardrails.
    expect(text, `${card}: exclamation mark`).not.toMatch(/!/);
  }
});

// The 2026-07-28 sign-off is on the WORDING, not on one deck — the FACE-UP decks
// serve the same decode-him reads. These lock the signed-off lines in on the face-up
// side too, and are deterministic (no shuffle on face-up, so panel IS the card).
//
// Why this block exists: `arcana-eef`'s Fool read carried the REJECTED accusation
// "someone careless with the truth more than cruel with it" until 2026-07-30, and
// nothing tested it, so the fix could have been silently walked back.
for (const [deck, hook, panel, must] of [
  // arcana-mfh — the ad-cleared face-up deck, on the 3 signed-off headlines.
  // Panels: a = Magician, b = Fool, c = Hanged Man.
  [FACE_UP_DECK, "cards-honest", "b", "unexamined rather than hidden"],
  [FACE_UP_DECK, "cards-return", "c", "unresolved rather than finished"],
  // The Fool's conditional softening. This is the line that predicted a return
  // ("what comes back often comes back") until 2026-07-30 — the face-down deck was
  // given this phrasing at the sign-off and the face-up deck was not.
  [FACE_UP_DECK, "cards-return", "b", "if something does come of this"],
  [FACE_UP_DECK, "cards-feels", "c", "real but suspended"],
  // arcana-eef — the ported fix. Panels: a = Emperor, b = Empress, c = Fool.
  ["arcana-eef", "cards-honest", "c", "unexamined rather than hidden"],
  // The 3 trust hooks, ported card-for-card from the face-down deck (2026-07-30). Same
  // card + same question = same read, so these assert the shared wording is present on
  // the face-up side too. Panels here: a = Magician, b = Fool, c = Hanged Man.
  [FACE_UP_DECK, "cards-who-he-is", "a", "a version he built on purpose"],
  [FACE_UP_DECK, "cards-real-person", "c", "always one obstacle short of meeting you"],
  [FACE_UP_DECK, "cards-misled", "b", "let a convenient impression stand"],
] as const) {
  test(`face-up signed-off copy — ${deck} / ${hook} / panel ${panel}`, async ({ page }) => {
    await blockMeta(page);
    await page.goto(`/fb-tarot?deck=${deck}&hook=${hook}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId(`tarot-card-${panel}`).click();
    await expect(page.getByTestId("tarot-continue")).toBeVisible({ timeout: 20_000 });
    // Face-up reveals open with "You chose …" (face-down says "You turned …").
    const text = await page.locator("p").filter({ hasText: /You chose/ }).first().innerText();
    expect(text, `face-up reveal had no read: ${text.slice(0, 80)}`).toBeTruthy();
    expect(text).toContain(must);
    // The rejected accusation must never come back, on any deck or hook.
    expect(text, "rejected 'careless with the truth' line is back").not.toContain(
      "careless with the truth",
    );
    // Nor may any read presuppose that he returns.
    expect(text, "read predicts a return").not.toContain("what comes back often comes back");
    // Same guardrails as the face-down reads.
    expect(text, "no exclamation marks").not.toMatch(/!/);
    expect(text, "never a flat verdict").not.toMatch(/\bhe is (lying|cheating|faithful|honest)\b/i);
  });
}

// ── The card ART in the chat opener (Versions B and C) ──────────────────────
// A and the lander show her the card. B and C hand straight to chat, so without
// artwork in the opener she is TOLD which card she drew but never SEES it — and
// the card image is the whole appeal of a tarot draw.
//
// The crop must match the DRAWN card: both the lander reveal and this bubble read
// from tarotReads.cardArtFor(), so a mismatch here means that helper drifted.
for (const version of ["b", "c"] as const) {
  test(`chat opener shows the drawn card's artwork — version ${version}`, async ({ page }) => {
    await blockMeta(page);
    const checked = new Set<string>();

    for (let i = 0; i < 40 && checked.size < 3; i++) {
      await page.goto(`/fb-tarot/${version}?hook=cards-honest`, { waitUntil: "domcontentloaded" });
      await page.getByTestId(`tarot-card-${MIDDLE}`).click();
      await page.waitForURL(/\/fb-tarot\/chat\?/, { timeout: 20_000 });

      // The opener's first bubble carries the art.
      const art = page.locator('[data-testid^="message-card-art-"]').first();
      await expect(art, "no card artwork in the chat opener").toBeVisible({ timeout: 30_000 });

      const named = await page
        .locator('[data-testid^="message-bot-"]')
        .filter({ hasText: NAMES })
        .first()
        .innerText()
        .then((t) => Object.keys(CARD_INDEX).find((c) => t.includes(c))!);
      if (checked.has(named)) continue;
      checked.add(named);

      const pos = await art.evaluate((el) => getComputedStyle(el).backgroundPositionX);
      expect(pos, `${named}: chat artwork crops to the wrong card`).toBe(
        EXPECT_POS[CARD_INDEX[named]],
      );
      // It must be the FACES sheet, not the identical backs.
      const img = await art.evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(img, "chat artwork is showing the card BACKS").toContain("faces");
      console.log(`  v${version} · ${named.padEnd(11)} img=${pos} ✅`);
    }
    expect(checked.size, "did not observe all three cards").toBe(3);
  });
}

// Only ONE bubble carries art — the artwork must not repeat down the opener.
test("the card artwork appears exactly once in the opener", async ({ page }) => {
  await blockMeta(page);
  await page.goto(`/fb-tarot/b?hook=cards-honest`, { waitUntil: "domcontentloaded" });
  await page.getByTestId(`tarot-card-${MIDDLE}`).click();
  await page.waitForURL(/\/fb-tarot\/chat\?/, { timeout: 20_000 });
  await expect(page.locator('[data-testid^="message-card-art-"]').first()).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForTimeout(6000); // let the rest of the opener land
  await expect(page.locator('[data-testid^="message-card-art-"]')).toHaveCount(1);
});
