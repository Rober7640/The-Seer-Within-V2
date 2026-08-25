import { test, expect, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// V1 DOWNSELL ORDER BUMP — live smoke against the DEVELOPMENT deployment.
//
//   npx playwright test --config=playwright.staging.config.ts tests/downsell-bump-dev.spec.ts
//
// Unlike audit-downsell-bump.mjs (which MOCKS /api/lead + /api/checkout and runs
// local-only), this hits the REAL dev backend: the real /api/lead assigns the
// price arm, and we assert the bump card renders at exactly the price that lead
// response carried — the card==charge bug this feature fixed, proven end to end.
//
// It walks the funnel as a user: greeting → name → bucket → deepening → EMAIL
// (this is what fires /api/lead and assigns the bump) → $35 pitch → three money
// objections → the $25 downsell → the bump card. It stops at the card and does
// NOT press accept, so it creates no Stripe session on dev.
//
// facebook.com is blocked at the network layer and /api/fb-event is stubbed, so
// no pixel/CAPI event fires from the test.
// ─────────────────────────────────────────────────────────────────────────────

const PERSONA = {
  name: 'Claire',
  concern: "I've been divorced for two years and every man I meet seems to lose interest after a few weeks.",
  deeper: "It always starts wonderfully, then they pull away and I never understand what I did wrong.",
  future: 'A steady, honest man who stays — someone to build a calm life with.',
  feel: 'It would feel like I can finally stop bracing for the door to close.',
  source: 'Honestly, it might go back to my marriage — I spent years feeling invisible in it.',
  cost: "Two years of lonely weekends, and I've started believing something is wrong with me.",
};
const ANSWERS = [PERSONA.name, PERSONA.concern, PERSONA.deeper, PERSONA.future, PERSONA.feel, PERSONA.source, PERSONA.cost];
const FALLBACKS = [
  "Yes... that's exactly how it feels.",
  "You're right. I can feel that.",
  "I hadn't thought of it that way, but yes.",
  "That's true for me, honestly.",
];
const OBJECTIONS = [
  "That's a lot of money for me right now",
  "I can't afford that right now",
  'Money is really tight this month',
];

// Settle-detector: waits for Evelyn to stop "typing" and reports which gate the
// turn ended on so the walk can click a choice card vs. type a reply.
async function waitForTurnEnd(page: Page, timeoutMs = 90000):
  Promise<'bucket' | 'perm' | 'pitch' | 'input' | 'timeout'> {
  const input = page.locator('[data-testid="input-chat-message"]');
  const perm = page.getByRole('button', { name: /Yes, please help me Evelyn/i });
  const bucket = page.getByRole('button', { name: /Love & Relationships/i });
  // The pitch renders as one of three cards depending on the live arms: the
  // commitment gate (3 checkboxes — active on dev), the sliding-close choice card
  // ($55/$35), or the plain purchase button. Detect by the CARD testids, which
  // appear immediately — not by the "Begin My Energy Clearing" button, which the
  // commitment gate withholds until all 3 boxes are ticked.
  const pitch = page.locator(
    '[data-testid="commitment-gate-card"], [data-testid="clearing-choice-card"]',
  );
  const plainCta = page.getByRole('button', { name: /Begin My Energy Clearing/i });
  const start = Date.now();
  let lastCount = -1, stableSince = Date.now();
  while (Date.now() - start < timeoutMs) {
    const typing = await page.locator('[data-testid="indicator-typing"]').isVisible().catch(() => false);
    const count = await page.locator('[data-testid^="message-"]').count().catch(() => 0);
    if (count !== lastCount) { lastCount = count; stableSince = Date.now(); }
    // Pitch cards can be checked without waiting for settle — they only appear at
    // the close, so seeing one is unambiguous even mid-monologue.
    if (await pitch.first().isVisible().catch(() => false)) return 'pitch';
    if (!typing && Date.now() - stableSince > 4000) {
      if (await bucket.isVisible().catch(() => false)) return 'bucket';
      if (await perm.isVisible().catch(() => false)) return 'perm';
      if (await plainCta.first().isVisible().catch(() => false)) return 'pitch';
      if (await input.isVisible().catch(() => false) && await input.isEnabled().catch(() => false)) return 'input';
    }
    await page.waitForTimeout(500);
  }
  return 'timeout';
}

test('the downsell carries a bump card priced at the arm /api/lead assigned', async ({ page, context }) => {
  test.setTimeout(300_000); // real LLM turns over the network — generous ceiling.

  // Block Meta; stub our own event endpoint so nothing is tracked from the test.
  await context.route('**/*', (r) => {
    const u = r.request().url();
    if (u.includes('facebook.com') || u.includes('connect.facebook.net')) return r.abort();
    return r.continue();
  });
  await context.route('**/api/fb-event', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  // Capture the price arm the server assigns at lead capture. This is the source
  // of truth the card must match; if the field is absent the price test is not
  // running on dev and the card falls back to the $9.77 tier default.
  let assignedCents: number | null = null;
  page.on('response', async (r) => {
    if (r.url().includes('/api/lead') && r.request().method() === 'POST') {
      const body = await r.json().catch(() => null);
      if (body && typeof body.bumpCentsDownsell === 'number') assignedCents = body.bumpCentsDownsell;
    }
  });

  // Collapse the cosmetic 1–5s typing pauses; the question GATES still gate
  // (they wait on a click, not a timer).
  await page.addInitScript(() => {
    const real = window.setTimeout;
    // @ts-expect-error narrowing the overload is not worth it in a test shim
    window.setTimeout = (fn, ms, ...rest) => real(fn, Math.min(Number(ms) || 0, 60), ...rest);
  });

  // ── Phase A: greeting → the $35 pitch ──────────────────────────────────────
  await page.goto('/fb-tarot/chat', { waitUntil: 'domcontentloaded' });
  const input = page.locator('[data-testid="input-chat-message"]');
  const queue = [...ANSWERS];
  let fallbackI = 0, typedTurns = 0, reachedPitch = false, emailSent = false;

  for (let step = 0; step < 34; step++) {
    const state = await waitForTurnEnd(page);
    if (state === 'timeout') break;
    if (state === 'bucket') { await page.getByRole('button', { name: /Love & Relationships/i }).click(); continue; }
    if (state === 'perm') { await page.getByRole('button', { name: /Yes, please help me Evelyn/i }).click(); continue; }
    if (state === 'pitch') { reachedPitch = true; break; }
    if (typedTurns >= 18) break;

    // The email step fires /api/lead, which assigns the bump arm. Detect it by the
    // input's own type, not queue position, so it stays correct across funnels.
    const isEmailStep = (await input.getAttribute('type').catch(() => 'text')) === 'email';
    const answer = isEmailStep
      ? `pw-dev-bump-${Date.now()}@example.invalid`
      : (queue.length ? queue.shift()! : FALLBACKS[fallbackI++ % FALLBACKS.length]);
    if (isEmailStep) emailSent = true;
    typedTurns += 1;
    await input.fill(answer);
    await input.press('Enter');
  }

  expect(emailSent, 'never reached the email step — /api/lead never fired, so no bump can be assigned').toBe(true);
  expect(reachedPitch, 'flow never surfaced the $35 pitch CTA').toBe(true);
  expect(assignedCents, 'dev /api/lead did not return bumpCentsDownsell — is v1_downsell_bump_price_2026 running on dev?')
    .not.toBeNull();
  expect([977, 1277], `unexpected arm ${assignedCents}`).toContain(assignedCents);

  // ── Phase B: refuse three times → the $25 downsell fork ────────────────────
  for (const objection of OBJECTIONS) {
    await input.waitFor({ state: 'visible', timeout: 60000 });
    await input.fill(objection);
    await input.press('Enter');
    await waitForTurnEnd(page);
  }

  const downsellCta = page.getByRole('button', { name: /Get Your Written Reading|\$25/i }).first();
  await expect(downsellCta, 'the $25 downsell CTA must appear after three money objections')
    .toBeVisible({ timeout: 20000 });

  // ── Phase C: the downsell must raise the bump card, at the assigned arm ─────
  await downsellCta.click();
  const card = page.locator('[data-testid="bump-offer-card"]');
  await expect(card, 'pressing the $25 downsell must raise the bump card').toBeVisible({ timeout: 45000 });

  const expectedPrice = `$${(assignedCents! / 100).toFixed(2)}`; // 977 → $9.77, 1277 → $12.77
  const wrongPrice = assignedCents === 1277 ? '$9.77' : '$12.77';
  const cardText = await card.innerText();

  expect(cardText, `card must show the assigned arm ${expectedPrice} (lead said ${assignedCents}¢)`)
    .toContain(expectedPrice);
  expect(cardText, `card must NOT show the other arm's price ${wrongPrice} — that is the card≠charge bug`)
    .not.toContain(wrongPrice);
  await expect(page.locator('[data-testid="button-bump-accept"]'), 'accept button renders').toBeVisible();
  await expect(page.locator('[data-testid="button-bump-decline"]'), 'decline button renders').toBeVisible();

  console.log(`✅ dev downsell bump: assigned arm ${assignedCents}¢ → card shows ${expectedPrice}`);
});
