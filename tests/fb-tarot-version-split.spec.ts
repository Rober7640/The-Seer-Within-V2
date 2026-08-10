// Does the B-vs-C split actually change what Evelyn SAYS?
//
// Everything else about this test has been verified at the API and database level:
// the endpoint hands back arms, the scope holds, exposures log. None of that proves
// the thing that actually matters — that a visitor assigned to B sees a different
// opening conversation from one assigned to C. This walks the real chat in a real
// browser and asserts the two diverge, and that the SERVER's assignment is what
// drives it.
//
//   npx playwright test tests/fb-tarot-version-split.spec.ts
//     --config playwright.fb-tarot-faceup.config.ts
//
// Requires the experiment RUNNING on whatever environment BASE points at, because
// the whole point is that the URL says v=c for everyone and the server decides.
// Every visitor lands on the same ad URL; only the ab_vid cookie differs.
//
// Reads only. No email is entered, so no lead is captured and no LLM call fires:
// Version C's opener (card line + question) is static, and the model is only
// invoked once she TYPES a reply, which this never does.

import { test, expect, type BrowserContext } from '@playwright/test';

const BASE = process.env.TAROT_BASE ?? 'https://the-seer-within-v2-development.up.railway.app';
const HOOK = 'cards-return';
const CARD = 'a';

// The exact copy each arm is supposed to produce, from client/src/content/tarotReads.ts.
// Version C opens with the card line + this question and waits for her answer.
const C_QUESTION = 'what was left unfinished when he pulled away?';
// Version B delivers the whole read and goes straight to name capture.
const B_NAME_CAPTURE = 'what\'s your first name';

/**
 * Load the chat as a brand-new visitor and return what Evelyn said + the input hint.
 *
 * Classified on the INPUT PLACEHOLDER, not on message text. The opener types out one
 * message at a time with a simulated delay, so any fixed wait races the last line —
 * B's closing "what's your first name, dear?" can still be mid-type 18s in. The
 * placeholder is set by the same updateState call that ends the opener, so it is the
 * first stable, unambiguous signal of which arm ran:
 *     B → "Your name..."          (NAME_CAPTURE)
 *     C → "Share what's on your heart…" (TAROT_REFLECT — the LLM reads her answer)
 */
async function walk(context: BrowserContext) {
  const page = await context.newPage();
  // v=c for EVERYONE — exactly what the live ad URLs hand to the chat. If the arms
  // differ from here, only the server-side assignment can be responsible.
  await page.goto(`${BASE}/fb-tarot/chat?hook=${HOOK}&card=${CARD}&v=c`, {
    waitUntil: 'domcontentloaded',
  });

  const input = page.locator('input[type="text"], textarea').first();
  let placeholder: string | null = null;
  // Poll rather than sleep: fast when the opener is short, patient when it isn't.
  for (let i = 0; i < 40 && !placeholder; i++) {
    await page.waitForTimeout(1000);
    placeholder = await input.getAttribute('placeholder').catch(() => null);
    if (placeholder && !/name|heart/i.test(placeholder)) placeholder = null;
  }
  // Let the final message finish typing so the transcript is complete.
  await page.waitForTimeout(3000);
  const text = await page.locator('body').innerText();
  await page.close();
  return { text, placeholder };
}

test('server assignment — not the URL — decides whether she gets Version B or C', async ({ browser }) => {
  test.setTimeout(300_000);

  const seen: Record<string, { text: string; placeholder: string | null }> = {};
  // Fresh context each time = fresh ab_vid = a fresh draw from the 70/30 split.
  // At 30% B, 14 tries makes missing an arm entirely very unlikely (~0.7%).
  for (let i = 0; i < 14 && (!seen.B || !seen.C); i++) {
    const context = await browser.newContext();
    const r = await walk(context);
    await context.close();
    const arm = /heart/i.test(r.placeholder ?? '') ? 'C'
      : /name/i.test(r.placeholder ?? '') ? 'B'
      : null;
    if (arm && !seen[arm]) seen[arm] = r;
    console.log(`visitor ${i + 1}: ${arm ?? 'UNRECOGNISED'}`);
  }

  expect(seen.C, 'no visitor was served Version C in 14 tries').toBeTruthy();
  expect(seen.B, 'no visitor was served Version B in 14 tries — the split is not reaching B').toBeTruthy();

  // 1. They are genuinely different conversations, not the same text twice.
  expect(seen.B.text).not.toEqual(seen.C.text);

  // 2. Each arm says what its ROLE says it should.
  //    C asks an open question and waits — the LLM reads the answer next.
  expect(seen.C.text).toContain(C_QUESTION);
  expect(seen.C.placeholder).toContain('heart');

  //    B delivers the read and asks for her name. It must NOT ask C's question.
  expect(seen.B.text.toLowerCase()).toContain(B_NAME_CAPTURE);
  expect(seen.B.text).not.toContain(C_QUESTION);
  expect(seen.B.placeholder?.toLowerCase()).toContain('name');

  // 3. B is the FULL read; C shows only the first line of it up front. So B's
  //    opener must be materially longer — this is the actual product difference.
  expect(seen.B.text.length).toBeGreaterThan(seen.C.text.length);

  console.log(`\nC placeholder: ${seen.C.placeholder}`);
  console.log(`B placeholder: ${seen.B.placeholder}`);
});
