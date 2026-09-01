import { test, expect, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// /fb-read TEA LANDERS — commitment gate + "Double-Strength Clearing" order bump,
// live smoke against the DEVELOPMENT deployment.
//
//   npx playwright test --config=playwright.staging.config.ts tests/fb-read-gate-bump-dev.spec.ts
//
// WHAT THIS PROVES THAT NOTHING ELSE DOES. Both features are switched on by a
// row in the experiments table (scope.funnel), not by code — so no unit test can
// tell you whether they actually reach this funnel. fb-read was added to that
// scope on 2026-09-01; this walks a real visitor through the real dev backend and
// asserts she is shown both.
//
// It walks: tea lander → tap a panel → chat → her answer → the V1 flow → EMAIL
// (this is what fires /api/lead and assigns both arms) → the pitch, which must be
// the COMMITMENT GATE → tick all three → the BUMP card, which must carry the
// Double-Strength copy.
//
// It stops at the bump card and never presses accept, so it creates no Stripe
// session. Meta is blocked and /api/fb-event stubbed, so nothing is tracked.
//
// 🔴 IT DOES write a lead: a real conversation row on the dev DB, and a real
// AWeber subscriber (AWeber is NOT split dev/prod). The address is a synthetic
// @example.invalid one, matching tests/downsell-bump-dev.spec.ts, so it is
// non-routable and easy to find and purge afterwards.
// ─────────────────────────────────────────────────────────────────────────────

const PERSONA = {
  name: 'Claire',
  opening: "I've been on my own about six years now and I've started to wonder if that's simply it for me.",
  concern: "Every man I meet seems to lose interest after a few weeks and I never understand why.",
  deeper: "It always starts warmly, then they pull away and I'm left going back over it.",
  future: 'A steady, honest man who stays — someone to build a calm life with.',
  feel: 'It would feel like I can finally stop bracing for the door to close.',
  source: 'Honestly it might go back to my marriage — I spent years feeling invisible in it.',
  cost: "Six years of quiet weekends, and I've started believing something is wrong with me.",
};
const ANSWERS = [
  PERSONA.opening, PERSONA.name, PERSONA.concern, PERSONA.deeper,
  PERSONA.future, PERSONA.feel, PERSONA.source, PERSONA.cost,
];
const FALLBACKS = [
  "Yes... that's exactly how it feels.",
  "You're right. I can feel that.",
  "I hadn't thought of it that way, but yes.",
  "That's true for me, honestly.",
];

// Settle-detector, same shape as tests/downsell-bump-dev.spec.ts: waits for Evelyn
// to stop typing and reports which gate the turn ended on.
async function waitForTurnEnd(page: Page, timeoutMs = 90000):
  Promise<'bucket' | 'perm' | 'pitch' | 'input' | 'timeout'> {
  const input = page.locator('[data-testid="input-chat-message"]');
  const perm = page.getByRole('button', { name: /Yes, please help me Evelyn/i });
  const bucket = page.getByRole('button', { name: /Love & Relationships/i });
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

test('a tea lander shows the commitment gate, then the Double-Strength bump', async ({ page, context }) => {
  test.setTimeout(360_000); // real LLM turns over the network

  await context.route('**/*', (r) => {
    const u = r.request().url();
    if (u.includes('facebook.com') || u.includes('connect.facebook.net')) return r.abort();
    return r.continue();
  });
  await context.route('**/api/fb-event', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  // What the SERVER decided at lead capture. The card must match it — asserting
  // only on what rendered would pass even if the client invented the offer.
  let leadBody: any = null;
  page.on('response', async (r) => {
    if (r.url().includes('/api/lead') && r.request().method() === 'POST') {
      leadBody = await r.json().catch(() => null);
    }
  });

  // Collapse the cosmetic typing pauses; real gates still gate (they wait on a click).
  await page.addInitScript(() => {
    const real = window.setTimeout;
    // @ts-expect-error narrowing the overload is not worth it in a test shim
    window.setTimeout = (fn, ms, ...rest) => real(fn, Math.min(Number(ms) || 0, 60), ...rest);
  });

  // ── the tea lander ─────────────────────────────────────────────────────────
  await page.goto('/fb-read/c?hook=love-again&device=tea', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('read-cup'), 'the cup must render').toBeVisible({ timeout: 30000 });
  await page.getByTestId('read-card-a').click();
  await page.waitForURL(/\/fb-read\/chat\?/, { timeout: 30000 });

  // The funnel prefix must survive into the chat — it is what keeps her on
  // v1-read, which is the whole reason the gate and bump reach her at all.
  expect(page.url(), 'she must stay under /fb-read').toContain('/fb-read/chat');

  // ── walk to the pitch ──────────────────────────────────────────────────────
  const input = page.locator('[data-testid="input-chat-message"]');
  const queue = [...ANSWERS];
  let fallbackI = 0, typedTurns = 0, reachedPitch = false, emailSent = false;

  for (let step = 0; step < 36; step++) {
    const state = await waitForTurnEnd(page);
    if (state === 'timeout') break;
    if (state === 'bucket') { await page.getByRole('button', { name: /Love & Relationships/i }).click(); continue; }
    if (state === 'perm') { await page.getByRole('button', { name: /Yes, please help me Evelyn/i }).click(); continue; }
    if (state === 'pitch') { reachedPitch = true; break; }
    if (typedTurns >= 20) break;

    const isEmailStep = (await input.getAttribute('type').catch(() => 'text')) === 'email';
    const answer = isEmailStep
      ? `pw-dev-read-${Date.now()}@example.invalid`
      : (queue.length ? queue.shift()! : FALLBACKS[fallbackI++ % FALLBACKS.length]);
    if (isEmailStep) emailSent = true;
    typedTurns += 1;
    await input.fill(answer);
    await input.press('Enter');
  }

  expect(emailSent, 'never reached the email step — /api/lead never fired, so no arm can be assigned').toBe(true);
  expect(reachedPitch, 'flow never surfaced the pitch').toBe(true);

  // ── ASSERTION 1: the commitment gate ───────────────────────────────────────
  const gateCard = page.locator('[data-testid="commitment-gate-card"]');
  await expect(gateCard, 'the tea lander must show the COMMITMENT GATE at the close')
    .toBeVisible({ timeout: 30000 });

  // Tick all three, which is what releases the purchase CTA.
  for (let i = 0; i < 3; i++) await page.locator(`[data-testid="checkbox-commitment-${i}"]`).click();
  const confirm = page.locator('[data-testid="button-commitment-confirm"]');
  await expect(confirm, 'confirm unlocks once all three are ticked').toBeEnabled({ timeout: 15000 });
  await confirm.click();

  // ── ASSERTION 2: the Double-Strength bump ──────────────────────────────────
  const card = page.locator('[data-testid="bump-offer-card"]');
  await expect(card, 'the tea lander must raise the order bump card').toBeVisible({ timeout: 60000 });

  const cardText = await card.innerText();
  // The winning arm is keyed B but carries copy pack A — the Double-Strength
  // Clearing. Assert the COPY, not the arm letter: a regression to the control
  // pack would still be "arm B" and would still render a card.
  //
  // 🔴 ASSERT THE ON-CARD WORDS, NOT THE STRIPE ONES. The first version of this
  // matched /twice the depth/ and failed on a perfectly working card: that string
  // is `lineDescription`, which only ever appears on the Stripe checkout page.
  // What the CARD says is "twice as deep". Both pack A, different sentences.
  //
  // These two phrases are unique to pack A — control and pack B both sell a
  // SECOND READING on the paired topic, in completely different words.
  expect(cardText.toLowerCase(), 'the bump must be the Double-Strength copy, as on tarot')
    .toMatch(/twice as deep|double the force/);
  await expect(
    page.locator('[data-testid="button-bump-accept"]'),
    "pack A's accept label — control and pack B word it differently",
  ).toContainText(/go all the way down/i);
  expect(cardText, 'main-tier bump is $12.77').toContain('$12.77');
  await expect(page.locator('[data-testid="button-bump-accept"]')).toBeVisible();
  await expect(page.locator('[data-testid="button-bump-decline"]')).toBeVisible();

  console.log('\n✅ /fb-read tea lander: commitment gate shown, Double-Strength bump raised at $12.77');
  console.log(`   /api/lead returned: ${JSON.stringify(leadBody)}\n`);
});
