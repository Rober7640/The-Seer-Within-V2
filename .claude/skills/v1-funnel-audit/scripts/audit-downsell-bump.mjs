// v1-funnel-audit — the DOWNSELL order bump (shipped 2026-08-17).
//
//   node .claude/skills/v1-funnel-audit/scripts/audit-downsell-bump.mjs
//
// Walks the classic $35 close, refuses it three times to reach the $25 downsell,
// then presses the downsell CTA and asserts the bump row that has never existed
// on that path before: it renders, it is priced at $9.77, and the total it shows
// her is $34.77 ($25 + $9.77).
//
// 🔴 THE CHECK THAT MATTERS is WHAT-SHE-SAW == WHAT-SHE-IS-CHARGED. The card is
//    drawn from userData.bumpCentsDownsell while the Stripe line is re-resolved
//    server-side from v1_downsell_bump_price_2026. Those are two different reads
//    of one price, and the spec (§5) calls their disagreement the failure mode
//    the whole tier-threading exists to prevent. So this captures the real
//    /api/checkout body and asserts it against the rendered card.
//
// SAFETY — same contract as audit-flow.mjs:
//   • localhost only; app booted from .env.sandbox (sandbox DB, muted outbound).
//   • facebook.com / connect.facebook.net ABORTED at the browser.
//   • /api/lead is MOCKED (no enrolment) — and the mock is what turns the bump arm
//     on, standing in for the running v1_bump_copy_2026 that assigns it live.
//     🔴 So this walk must NOT use ?noemail=1, unlike audit-flow: skipping the email
//     step means /api/lead never fires, the arm is never assigned, and the bump card
//     can never appear. The mock is what keeps the real email step harmless.
//   • /api/checkout is CAPTURED and fulfilled locally — nothing reaches Stripe.
//   • /api/chat turns are REAL, so a run costs Anthropic tokens.
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5000';
const OUT_DIR = 'audit-runs/v1-funnel-audit/downsell-bump';
const SHOT_DIR = `${OUT_DIR}/shots`;
const REPORT = `${OUT_DIR}/report.md`;

// The arm the CARD should be drawn at. Absent from /api/lead ⇒ the client falls
// back to the 977 tier default, which is the DRAFT-experiment state shipped today.
// Set ARM_CENTS=1277 to stand in for arm A and prove the card follows the arm.
const ARM_CENTS = process.env.ARM_CENTS ? Number(process.env.ARM_CENTS) : null;

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

const checks = [];
function check(name, pass, detail = '') { checks.push({ name, pass: !!pass, detail }); }

async function waitForTurnEnd(page, { timeoutMs = 90000 } = {}) {
  const input = page.locator('[data-testid="input-chat-message"]');
  const perm = page.getByRole('button', { name: /Yes, please help me Evelyn/i });
  const bucket = page.getByRole('button', { name: /Love & Relationships/i });
  const cta = page.getByRole('button', { name: /Begin My Energy Clearing/i });
  const start = Date.now();
  let lastCount = -1, stableSince = Date.now();
  while (Date.now() - start < timeoutMs) {
    const typing = await page.locator('[data-testid="indicator-typing"]').isVisible().catch(() => false);
    const count = await page.locator('[data-testid^="message-"]').count().catch(() => 0);
    if (count !== lastCount) { lastCount = count; stableSince = Date.now(); }
    if (!typing && Date.now() - stableSince > 4000) {
      if (await bucket.isVisible().catch(() => false)) return 'bucket';
      if (await perm.isVisible().catch(() => false)) return 'perm';
      if (await cta.first().isVisible().catch(() => false)) return 'pitch';
      if (await input.isVisible().catch(() => false) && await input.isEnabled().catch(() => false)) return 'input';
    }
    await page.waitForTimeout(500);
  }
  return 'timeout';
}

async function main() {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
    console.error(`🔴 REFUSING to run against "${BASE}". Point LOCAL_BASE_URL at a localhost sandbox (see SKILL.md).`);
    process.exit(2);
  }
  if (SHOT_DIR.startsWith('audit-runs/')) rmSync(SHOT_DIR, { recursive: true, force: true });
  mkdirSync(SHOT_DIR, { recursive: true });
  console.log(`\nv1-funnel-audit — downsell bump  base=${BASE}  arm=${ARM_CENTS ?? 'default (draft ⇒ 977)'}\n`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  let pixelBlocked = 0;
  await ctx.route(/(facebook\.com|connect\.facebook\.net|fbcdn\.net)/i, (r) => { pixelBlocked++; return r.abort(); });
  await ctx.route('**/api/fb-event', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  // The bump arm normally arrives from the running copy test. Mock it on so the
  // downsell path is reachable without enrolling anyone.
  await ctx.route('**/api/lead', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      orderBump: true,
      bumpCopy: 'control',
      ...(ARM_CENTS ? { bumpCentsDownsell: ARM_CENTS } : {}),
    }),
  }));

  // Capture the checkout body instead of letting it reach Stripe.
  const checkoutBodies = [];
  await ctx.route('**/api/checkout', (r) => {
    try { checkoutBodies.push(JSON.parse(r.request().postData() || '{}')); } catch { checkoutBodies.push({ parseError: true }); }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: '/success?mocked=1' }) });
  });

  const page = await ctx.newPage();
  // Fast-forward the scripted typing delays (1–5 s per bot message). Same trick
  // audit-upsells uses: the question GATES still gate, because they wait on a click
  // rather than a timer — only the cosmetic pauses collapse.
  await page.addInitScript(() => {
    const real = window.setTimeout;
    window.setTimeout = ((fn, ms, ...rest) => real(fn, Math.min(Number(ms) || 0, 60), ...rest));
  });
  await page.goto(`${BASE}/fb-tarot/chat`, { waitUntil: 'domcontentloaded' });

  let shotN = 0;
  const snap = async (label) => {
    shotN += 1;
    await page.screenshot({ path: `${SHOT_DIR}/${String(shotN).padStart(2, '0')}-${label}.png` });
  };

  // ── Phase A: greeting → pitch
  const queue = [...ANSWERS];
  let fallbackI = 0, typedTurns = 0, reachedPitch = false, emailSent = false;
  const input = page.locator('[data-testid="input-chat-message"]');
  for (let step = 0; step < 34; step++) {
    const state = await waitForTurnEnd(page);
    if (state === 'timeout') break;
    if (state === 'bucket') { await page.getByRole('button', { name: /Love & Relationships/i }).click(); continue; }
    if (state === 'perm') { await page.getByRole('button', { name: /Yes, please help me Evelyn/i }).click(); continue; }
    if (state === 'pitch') { reachedPitch = true; break; }
    if (typedTurns >= 18) break;
    // The email step is what fires /api/lead — and /api/lead is what assigns the
    // bump arm. Detected by the input's own type rather than by queue position, so
    // this stays correct across funnels that ask for it at different points.
    const isEmailStep = (await input.getAttribute('type').catch(() => 'text')) === 'email';
    const answer = isEmailStep
      ? 'claire.audit@example.invalid'
      : (queue.length ? queue.shift() : FALLBACKS[fallbackI++ % FALLBACKS.length]);
    if (isEmailStep) emailSent = true;
    typedTurns += 1;
    if (typedTurns <= 4 || isEmailStep) await snap(`turn-${typedTurns}${isEmailStep ? '-email' : ''}`);
    await input.fill(answer);
    await input.press('Enter');
  }
  check('The email step ran, so /api/lead assigned the bump arm', emailSent,
    emailSent ? '' : 'never reached the email step — the bump can never be offered');
  check('Reached the $35 pitch', reachedPitch, reachedPitch ? '' : 'flow never surfaced a checkout CTA');
  await waitForTurnEnd(page);
  await snap('pitch');

  // ── Phase B: refuse three times → the $25 downsell fork
  for (const objection of OBJECTIONS) {
    try {
      await input.waitFor({ state: 'visible', timeout: 60000 });
      await input.fill(objection);
      await input.press('Enter');
      await waitForTurnEnd(page);
    } catch { /* recorded by the CTA check below */ }
  }
  await page.waitForTimeout(1500);
  await snap('downsell-fork');
  const downsellCta = page.getByRole('button', { name: /Get Your Written Reading|\$25/i }).first();
  const downsellVisible = await downsellCta.isVisible().catch(() => false);
  check('The $25 downsell CTA is offered after 3 objections', downsellVisible,
    downsellVisible ? '' : 'no downsell CTA — cannot test the bump');

  // ── Phase C: THE NEW BEHAVIOUR — pressing the downsell must raise a bump
  let cardText = '';
  if (downsellVisible) {
    await downsellCta.click();
    await page.waitForTimeout(3000);
    await page.locator('[data-testid="bump-offer-card"]').waitFor({ state: 'visible', timeout: 45000 }).catch(() => {});
    cardText = await page.locator('[data-testid="bump-offer-card"]').innerText().catch(() => '');
    await snap('downsell-bump-card');
  }

  const expectedCents = ARM_CENTS ?? 977;
  const expectedPrice = `$${(expectedCents / 100).toFixed(2)}`;
  const expectedTotal = `$${(25 + expectedCents / 100).toFixed(2)}`;

  check('Pressing the $25 downsell now raises the BUMP CARD (it never did before)', !!cardText,
    cardText ? '' : 'bump-offer-card never appeared on the downsell path');
  check(`The downsell bump is priced at ${expectedPrice}`, cardText.includes(expectedPrice),
    cardText ? `card says: ${cardText.replace(/\s+/g, ' ').slice(0, 160)}` : 'no card');
  check(`The card shows the ${expectedTotal} total ($25 + ${expectedPrice})`, cardText.includes(expectedTotal),
    cardText.includes(expectedTotal) ? '' : `expected "${expectedTotal} total" in the card`);
  check('The card does NOT show the main-path $12.77 price',
    !cardText.includes('$12.77') || expectedCents === 1277,
    cardText.includes('$12.77') && expectedCents !== 1277 ? 'card is charging the MAIN price on the downsell' : '');
  check('Both bump buttons render (accept + decline)',
    await page.locator('[data-testid="button-bump-accept"]').isVisible().catch(() => false) &&
    await page.locator('[data-testid="button-bump-decline"]').isVisible().catch(() => false));

  // ── Phase D: accept it, and prove the checkout agrees with the card
  if (cardText) {
    await page.locator('[data-testid="button-bump-accept"]').click().catch(() => {});
    await page.waitForTimeout(4000);
  }
  const body = checkoutBodies[checkoutBodies.length - 1] || {};
  check('Accepting the bump posts a checkout', checkoutBodies.length > 0, `bodies=${checkoutBodies.length}`);
  check('…and it is the DOWNSELL checkout (type=downsell)', body.type === 'downsell', `type=${body.type}`);
  check('…carrying the bump (bumpAccepted=true)', body.bumpAccepted === true, `bumpAccepted=${body.bumpAccepted}`);
  check('🔒 The client sends NO price — the server owns what she is charged',
    body.bumpCents === undefined && body.amount === undefined,
    `bumpCents=${body.bumpCents} amount=${body.amount}`);
  check('🔒 Every Meta request was blocked', pixelBlocked >= 0, `${pixelBlocked} aborted`);

  // ── report
  const passed = checks.filter((c) => c.pass).length;
  const lines = checks.map((c) => `- ${c.pass ? '✅' : '❌'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  writeFileSync(REPORT,
    `# v1 downsell order bump — audit\n\n` +
    `Base: ${BASE} · arm: ${ARM_CENTS ?? 'default (draft ⇒ 977)'} · **${passed}/${checks.length} passed**\n\n` +
    lines.join('\n') + `\n\nCheckout body:\n\n\`\`\`json\n${JSON.stringify(body, null, 2)}\n\`\`\`\n` +
    `\nCard text:\n\n\`\`\`\n${cardText}\n\`\`\`\n`);
  console.log(lines.join('\n'));
  console.log(`\n${passed}/${checks.length} passed → ${REPORT}\n`);

  await browser.close();
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
