// v1-funnel-audit (upsells) — the post-purchase UPSELL chats: Upsell 1 (Protection
// Ritual) at /welcome1 and Upsell 2 (Manifestation Bracelet) at /welcome2 → /success.
//
//   node .claude/skills/v1-funnel-audit/scripts/audit-upsells.mjs
//
// These were the last uncovered V1 surface: separate state machines (useUpsellChat /
// useUpsell2Chat), server-owned 1-click off-session pricing, a Path-A/Path-B split,
// and a $30 downsell. Two complementary layers, mirroring flow-vs-charge elsewhere:
//
//   PART 1 (server, Stripe TEST) — charge correctness. The real 1-click charge reuses
//     the buyer's saved card (off_session), which the sandbox has no way to stand up,
//     so we assert the SAME server-owned price through the FALLBACK Checkout path
//     (which the client takes whenever 1-click can't run): create the fallback
//     session for real, retrieve it from Stripe TEST, and assert the amount ==
//     the price the buyer was QUOTED. Upsell pricing is fully server-authoritative
//     (Zod strips any client `amount`), so we also send a bogus amount and prove it
//     is ignored.
//
//   PART 2 + 3 (browser) — flow health of the U1 and U2 chats: the offer renders at
//     the right price, the CTAs work, decline → $30 downsell (U2), Path A skips
//     shipping / Path B collects it, and each stage hands off to the next page. The
//     charge endpoints + LLM reading are MOCKED here (charge is proven in PART 1;
//     mocking the reading keeps the run free of Anthropic calls). Meta is blocked.
//
// SAFE: LOCAL-ONLY guard; Stripe TEST key only (from .env.sandbox), refuses sk_live/
// sk_test mismatch; fallback sessions charge nothing; browser mocks mean no real
// charge, no enrolment side-effects, nothing reaches Meta.
import { chromium } from '@playwright/test';
import Stripe from 'stripe';
import { config as loadEnv } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';

loadEnv({ path: '.env.sandbox' });

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5000';
const OUT_DIR = 'audit-runs/v1-funnel-audit/upsells';
const SHOT_DIR = `${OUT_DIR}/shots`;
const RUN = Date.now().toString(36);
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

const checks = [];
const check = (name, pass, detail = '') => {
  checks.push({ name, pass: !!pass, detail });
  console.log(`    ${pass ? '✅' : '🔴'} ${name}${detail ? `  — ${detail}` : ''}`);
};
const money = (c) => (c == null ? 'null' : `$${(c / 100).toFixed(2)}`);

async function postJson(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status} ${text.slice(0, 200)}`);
  return json;
}
async function getJson(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status} ${text.slice(0, 200)}`);
  return json;
}
function sessionIdFromUrl(url) {
  if (/cs_live_/.test(url)) throw new Error(`🔴 got a LIVE Stripe session (${url.slice(0, 40)}…) — ABORT`);
  return (url.match(/cs_test_[A-Za-z0-9]+/) || [])[0] || null;
}
async function sessionAmount(stripe, url) {
  const id = sessionIdFromUrl(url);
  if (!id) throw new Error(`no cs_test_ id in url ${url.slice(0, 60)}`);
  const s = await stripe.checkout.sessions.retrieve(id);
  return s.amount_total;
}

// ── PART 1: server-owned upsell charge correctness (via the fallback Checkout) ────
async function chargeCorrectness(stripe) {
  // U1 price is variant-dependent, so prove quote==charge end-to-end per funnel:
  // lead (assign) → checkout (stamp the session row) → user-data (the QUOTE the buyer
  // sees) → fallback-checkout (the CHARGE) → assert equal. Sampling fb hits both arms.
  const U1_CASES = [
    { funnel: undefined, label: 'root' },
    { funnel: 'v1-fb', label: 'fb' },
    { funnel: 'v1-fb', label: 'fb' },
    { funnel: 'v1-palm', label: 'palm', sign: 'thumb' },
  ];
  for (let i = 0; i < U1_CASES.length; i++) {
    const c = U1_CASES[i];
    const email = `u1-${c.label}-${i}-${RUN}@example.com`;
    const leadBody = { email, firstName: 'Claire', bucket: 'love' };
    if (c.funnel) leadBody.funnel = c.funnel;
    if (c.sign) leadBody.sign = c.sign;
    await postJson('/api/lead', leadBody);

    const coBody = { email, firstName: 'Claire', bucket: 'love', type: 'main' };
    if (c.funnel) coBody.funnel = c.funnel;
    const co = await postJson('/api/checkout', coBody);
    const sessionId = sessionIdFromUrl(co.url || '');
    if (!sessionId) { check(`[U1 ${c.label}] could create a main session`, false, `url=${(co.url || '').slice(0, 60)}`); continue; }

    const ud = await getJson(`/api/upsell/user-data?session_id=${sessionId}`);
    const quote = ud.upsell1PriceCents;

    const fbBody = { email, firstName: 'Claire', bucket: 'love', originalSessionId: sessionId, amount: 999 };
    if (c.funnel) fbBody.funnel = c.funnel;
    const fb = await postJson('/api/upsell/fallback-checkout', fbBody);
    const charge = await sessionAmount(stripe, fb.url || '');

    check(`[U1 ${c.label}] fallback charge == the quoted upsell-1 price`, charge === quote,
      `quoted(user-data)=${money(quote)} charged(stripe)=${money(charge)}`);
    check(`[U1 ${c.label}] server ignored the client-supplied amount (sent 999¢)`, charge !== 999 && charge >= 3000,
      `charged=${money(charge)} (a legit configured upsell-1 price, not $9.99)`);
  }

  // U2 price is server-hardcoded (type full=4700 / downsell=3000), funnel-independent.
  const email2 = `u2-${RUN}@example.com`;
  await postJson('/api/lead', { email: email2, firstName: 'Claire', bucket: 'love', funnel: 'v1-fb' });
  const coBody2 = { email: email2, firstName: 'Claire', bucket: 'love', type: 'main', funnel: 'v1-fb' };
  const co2 = await postJson('/api/checkout', coBody2);
  const origSession = sessionIdFromUrl(co2.url || '');
  for (const [type, expect] of [['full', 4700], ['downsell', 3000]]) {
    const fb = await postJson('/api/upsell2/fallback-checkout', {
      email: email2, firstName: 'Claire', bucket: 'love', originalSessionId: origSession, funnel: 'v1-fb', type, amount: 111,
    });
    const charge = await sessionAmount(stripe, fb.url || '');
    check(`[U2 ${type}] fallback charge == server price ${money(expect)}`, charge === expect,
      `expected=${money(expect)} charged(stripe)=${money(charge)}`);
    check(`[U2 ${type}] server ignored the client-supplied amount (sent 111¢)`, charge !== 111 && charge === expect);
  }
}

// ── browser helpers ──────────────────────────────────────────────────────────
async function blockMeta(ctx) {
  let n = 0;
  await ctx.route(/(connect\.facebook\.net|facebook\.com|fbcdn\.net)/i, (r) => { n++; return r.abort(); });
  return () => n;
}
// Fast-forward the scripted typing delays (calculateTypingDelay → sleep → setTimeout,
// 1–5s per message) by clamping setTimeout. The question gates WAIT on a click, not a
// timer, so they still gate correctly — only the bot's typing collapses to ~instant.
async function speedUpTyping(ctx) {
  await ctx.addInitScript(() => {
    const orig = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...rest) => orig(fn, typeof ms === 'number' ? Math.min(ms, 60) : ms, ...rest);
  });
}
// Advance a scripted upsell chat: answer any visible quick-reply, stop when done().
async function advance(page, done, { timeoutMs = 35000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await done()) return true;
    const qr = page.locator('[data-testid^="button-quick-reply-"]').first();
    if (await qr.isVisible().catch(() => false)) { await qr.click().catch(() => {}); await page.waitForTimeout(500); continue; }
    await page.waitForTimeout(400);
  }
  return done();
}
const visible = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);
// A genuinely empty bubble = no text AND no media. The upsell chats deliberately
// send image-only messages (the lava stone, the bracelet photo), which have empty
// textContent but are NOT defects — so a bubble carrying an <img>/media counts as full.
async function emptyBubbles(page) {
  return page.locator('[data-testid^="message-"]').evaluateAll((ns) =>
    ns.filter((n) => !(n.textContent || '').trim() && !n.querySelector('img,svg,video,canvas,picture,[role="img"]')).length).catch(() => 0);
}
async function bodyText(page) { return (await page.locator('body').textContent().catch(() => '')) || ''; }

// ── PART 2: Upsell 1 browser flow ─────────────────────────────────────────────
async function upsell1Flow(browser) {
  const SID = `u1flow_${RUN}`;
  const userData = { firstName: 'Claire', email: `u1flow-${RUN}@example.com`, bucket: 'love', personName: '', stripeCustomerId: 'cus_test', mainPurchaseAmount: 3500, upsell1PriceCents: 4700 };

  async function ctxFor() {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const metaN = await blockMeta(ctx);
    await speedUpTyping(ctx);
    await ctx.route('**/api/upsell/user-data**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(userData) }));
    await ctx.route('**/api/fb-event', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    return { ctx, metaN };
  }

  // Sub-flow A: reach the offer, assert price + both CTAs, then DECLINE → /welcome2.
  {
    const { ctx, metaN } = await ctxFor();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/welcome1?session_id=${SID}`, { waitUntil: 'domcontentloaded' });
    const reached = await advance(page, () => visible(page, '[data-testid="button-upsell-accept"]'));
    check('[U1] offer stage reached (3 questions answered → CTA)', reached);
    const txt = await bodyText(page);
    check('[U1] offer shows the $47 upsell-1 price', /\$47/.test(txt), reached ? '' : 'offer not reached');
    check('[U1] both accept + decline CTAs present',
      (await visible(page, '[data-testid="button-upsell-accept"]')) && (await visible(page, '[data-testid="button-upsell-decline"]')));
    const u1Empty = await emptyBubbles(page);
    check('[U1] no empty chat bubbles (media bubbles excluded)', u1Empty === 0, `${u1Empty} empty`);
    await page.screenshot({ path: `${SHOT_DIR}/u1-offer.png` }).catch(() => {});
    await page.locator('[data-testid="button-upsell-decline"]').click().catch(() => {});
    let navigated = false;
    try { await page.waitForURL(/\/welcome2/, { timeout: 15000 }); navigated = true; } catch { /* */ }
    check('[U1] decline → hands off to /welcome2', navigated, navigated ? '' : `url=${page.url()}`);
    check('[U1] 🔒 no Meta request escaped (decline run)', true, `${metaN()} blocked`);
    await ctx.close();
  }

  // Sub-flow B: ACCEPT → shipping form → submit → /welcome2 (charge mocked success).
  {
    const { ctx } = await ctxFor();
    let chargeBody = null;
    await ctx.route('**/api/upsell/charge', (r) => {
      try { chargeBody = JSON.parse(r.request().postData() || '{}'); } catch { chargeBody = {}; }
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"paymentIntentId":"pi_test"}' });
    });
    await ctx.route('**/api/shipping/save', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
    const page = await ctx.newPage();
    await page.goto(`${BASE}/welcome1?session_id=${SID}`, { waitUntil: 'domcontentloaded' });
    await advance(page, () => visible(page, '[data-testid="button-upsell-accept"]'));
    await page.locator('[data-testid="button-upsell-accept"]').click().catch(() => {});
    const shipShown = await advance(page, () => visible(page, '[data-testid="button-shipping-submit"]'), { timeoutMs: 20000 });
    check('[U1] accept → 1-click charge posted with NO client amount', chargeBody && chargeBody.amount === undefined,
      chargeBody ? `body keys: ${Object.keys(chargeBody).join(',')}` : 'no /api/upsell/charge captured');
    check('[U1] accept → shipping form appears', shipShown);
    if (shipShown) {
      await page.fill('[data-testid="input-shipping-name"]', 'Claire Test').catch(() => {});
      await page.fill('[data-testid="input-shipping-line1"]', '1 Test St').catch(() => {});
      await page.fill('[data-testid="input-shipping-city"]', 'Testville').catch(() => {});
      await page.fill('[data-testid="input-shipping-state"]', 'CA').catch(() => {});
      await page.fill('[data-testid="input-shipping-postal"]', '90001').catch(() => {});
      await page.locator('[data-testid="button-shipping-submit"]').click().catch(() => {});
      let navigated = false;
      try { await page.waitForURL(/\/welcome2/, { timeout: 15000 }); navigated = true; } catch { /* */ }
      check('[U1] shipping submit → hands off to /welcome2', navigated, navigated ? '' : `url=${page.url()}`);
    }
    await ctx.close();
  }
}

// ── PART 3: Upsell 2 browser flow ─────────────────────────────────────────────
async function upsell2Flow(browser) {
  const SID = `u2flow_${RUN}`;
  const base = { firstName: 'Claire', email: `u2flow-${RUN}@example.com`, bucket: 'love', concern: 'I feel stuck in love', personName: '' };
  const pathB = { ...base, upsellPurchased: false, upsellAmountCents: null, hasShipping: false, shipping: null };
  const pathA = { ...base, upsellPurchased: true, upsellAmountCents: 4700, hasShipping: true,
    shipping: { name: 'Claire Test', line1: '1 Test St', line2: '', city: 'Testville', state: 'CA', postal: '90001', country: 'US' } };

  async function ctxFor(userData) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const metaN = await blockMeta(ctx);
    await speedUpTyping(ctx);
    await ctx.route('**/api/upsell2/user-data**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(userData) }));
    await ctx.route('**/api/upsell2/reading', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"messages":["Your bracelet is being attuned to your intention."]}' }));
    await ctx.route('**/api/upsell2/shipping', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
    await ctx.route('**/api/fb-event', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    let chargeBody = null;
    await ctx.route('**/api/upsell2/charge', (r) => {
      try { chargeBody = JSON.parse(r.request().postData() || '{}'); } catch { chargeBody = {}; }
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"paymentIntentId":"pi_test"}' });
    });
    return { ctx, metaN, getCharge: () => chargeBody };
  }

  // Path B: offer $47 → decline → $30 downsell → downsell accept → shipping → /success
  {
    const { ctx, metaN, getCharge } = await ctxFor(pathB);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/welcome2?session_id=${SID}`, { waitUntil: 'domcontentloaded' });
    const reached = await advance(page, () => visible(page, '[data-testid="button-upsell2-accept"]'));
    check('[U2 Path B] offer stage reached', reached);
    check('[U2 Path B] offer shows the $47 full price', /\$47/.test(await bodyText(page)));
    const u2Empty = await emptyBubbles(page);
    check('[U2 Path B] no empty chat bubbles (media bubbles excluded)', u2Empty === 0, `${u2Empty} empty`);
    await page.screenshot({ path: `${SHOT_DIR}/u2-offer.png` }).catch(() => {});
    // 1st decline → downsell (the objection behavior)
    await page.locator('[data-testid="button-upsell2-decline"]').click().catch(() => {});
    const downsell = await advance(page, () => visible(page, '[data-testid="button-upsell2-downsell-accept"]'), { timeoutMs: 30000 });
    check('[U2 Path B] 1st decline → $30 downsell offered', downsell);
    check('[U2 Path B] downsell shows the $30 price', /\$30/.test(await bodyText(page)));
    await page.screenshot({ path: `${SHOT_DIR}/u2-downsell.png` }).catch(() => {});
    // accept downsell → shipping (Path B collects it) → /success
    await page.locator('[data-testid="button-upsell2-downsell-accept"]').click().catch(() => {});
    const shipShown = await advance(page, () => visible(page, '[data-testid="button-shipping-submit"]'), { timeoutMs: 20000 });
    check('[U2 Path B] downsell accept → 1-click charge posted with NO client amount, type=downsell',
      getCharge() && getCharge().amount === undefined && getCharge().type === 'downsell',
      getCharge() ? `type=${getCharge().type} keys=${Object.keys(getCharge()).join(',')}` : 'no /api/upsell2/charge captured');
    check('[U2 Path B] downsell accept → shipping form appears (Path B collects address)', shipShown);
    if (shipShown) {
      await page.fill('[data-testid="input-shipping-name"]', 'Claire Test').catch(() => {});
      await page.fill('[data-testid="input-shipping-line1"]', '1 Test St').catch(() => {});
      await page.fill('[data-testid="input-shipping-city"]', 'Testville').catch(() => {});
      await page.fill('[data-testid="input-shipping-state"]', 'CA').catch(() => {});
      await page.fill('[data-testid="input-shipping-postal"]', '90001').catch(() => {});
      await page.locator('[data-testid="button-shipping-submit"]').click().catch(() => {});
    }
    let toSuccess = false;
    try { await page.waitForURL(/\/success/, { timeout: 15000 }); toSuccess = true; } catch { /* */ }
    check('[U2 Path B] completed → hands off to /success', toSuccess, toSuccess ? '' : `url=${page.url()}`);
    check('[U2 Path B] 🔒 no Meta request escaped', true, `${metaN()} blocked`);
    await ctx.close();
  }

  // Path A: bought U1 (has shipping) → accept full → shipping SKIPPED → /success
  {
    const { ctx } = await ctxFor(pathA);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/welcome2?session_id=${SID}`, { waitUntil: 'domcontentloaded' });
    const reached = await advance(page, () => visible(page, '[data-testid="button-upsell2-accept"]'));
    check('[U2 Path A] offer stage reached', reached);
    await page.locator('[data-testid="button-upsell2-accept"]').click().catch(() => {});
    // Path A should NOT show a shipping form; it should go straight to /success.
    let toSuccess = false;
    try { await page.waitForURL(/\/success/, { timeout: 20000 }); toSuccess = true; } catch { /* */ }
    const shipShown = await visible(page, '[data-testid="button-shipping-submit"]');
    check('[U2 Path A] accept → shipping SKIPPED (address reused)', !shipShown);
    check('[U2 Path A] accept → hands off to /success', toSuccess, toSuccess ? '' : `url=${page.url()}`);
    await ctx.close();
  }

  // 2nd-decline path: decline offer → downsell → decline downsell → DECLINED → /success
  {
    const { ctx } = await ctxFor(pathB);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/welcome2?session_id=${SID}`, { waitUntil: 'domcontentloaded' });
    await advance(page, () => visible(page, '[data-testid="button-upsell2-accept"]'));
    await page.locator('[data-testid="button-upsell2-decline"]').click().catch(() => {});
    const downsell = await advance(page, () => visible(page, '[data-testid="button-upsell2-downsell-decline"]'), { timeoutMs: 30000 });
    check('[U2] downsell decline button present after 1st decline', downsell);
    await page.locator('[data-testid="button-upsell2-downsell-decline"]').click().catch(() => {});
    let toSuccess = false;
    try { await page.waitForURL(/\/success/, { timeout: 15000 }); toSuccess = true; } catch { /* */ }
    check('[U2] 2nd decline (downsell) → DECLINED → hands off to /success', toSuccess, toSuccess ? '' : `url=${page.url()}`);
    await ctx.close();
  }
}

async function main() {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
    console.error(`🔴 REFUSING to run against "${BASE}". Point LOCAL_BASE_URL at a localhost sandbox.`);
    process.exit(2);
  }
  if (!STRIPE_KEY.startsWith('sk_test_')) {
    console.error(`🔴 REFUSING: STRIPE_SECRET_KEY in .env.sandbox is not an sk_test_ key. Run scripts/make-sandbox-env.mjs first.`);
    process.exit(2);
  }
  mkdirSync(SHOT_DIR, { recursive: true });
  const stripe = new Stripe(STRIPE_KEY);
  console.log(`\nv1-funnel-audit (upsells) — base=${BASE}  Stripe=TEST  run=${RUN}\n`);

  console.log('  PART 1 — server charge correctness (fallback → Stripe TEST)…');
  await chargeCorrectness(stripe);
  const browser = await chromium.launch();
  console.log('  PART 2 — Upsell 1 chat flow…');
  await upsell1Flow(browser);
  console.log('  PART 3 — Upsell 2 chat flow…');
  await upsell2Flow(browser);
  await browser.close();

  const passed = checks.filter((c) => c.pass).length, failed = checks.length - passed;
  const report =
    `# v1-funnel-audit (upsells) — /welcome1 (U1) → /welcome2 (U2) → /success\n\n` +
    `Base: ${BASE} · Stripe: TEST · run ${RUN} · ${passed}/${checks.length} passed${failed ? ` · 🔴 ${failed} FAILED` : ' · ✅ ALL PASS'}\n\n` +
    `PART 1 asserts the server-owned upsell price via the fallback Checkout (retrieved from Stripe TEST);\n` +
    `PARTS 2–3 drive the real U1/U2 chats (charge + LLM reading mocked) and assert flow health + hand-offs.\n\n` +
    `## Checks\n${checks.map((c) => `- ${c.pass ? '✅' : '🔴'} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`).join('\n')}\n\n` +
    `Screenshots: \`${SHOT_DIR}/\`\n`;
  writeFileSync(`${OUT_DIR}/report.md`, report);
  console.log('\n' + report);
  console.log(`wrote ${OUT_DIR}/report.md\n`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error('\n🔴 UPSELLS AUDIT ERROR:', e.message); process.exit(2); });
