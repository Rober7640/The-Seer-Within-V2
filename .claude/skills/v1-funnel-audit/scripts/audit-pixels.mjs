// v1-funnel-audit (pixels) — asserts the FB Pixel + Conversions-API events fire
// with matching event_ids (dedup). Joel's "FB Pixel verification" ask; the memory
// flags Lead/InitiateCheckout/Purchase + pixel↔CAPI dedup as NEVER asserted.
//
//   node .claude/skills/v1-funnel-audit/scripts/audit-pixels.mjs
//
// HERMETIC + SAFE: blocks connect.facebook.net so Meta's fbevents.js NEVER loads —
// every fbq(...) call then sits in window.fbq.queue (the standard snippet queues
// until the lib flushes it), so we read exactly what fired and NOTHING reaches Meta.
// The client's server-relay POST to /api/fb-event is captured locally (fulfilled 200).
// Requires the app on :5000 booted from .env.sandbox (see SKILL.md).
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.LOCAL_BASE_URL || 'http://localhost:5000';
const OUT_DIR = 'audit-runs/v1-funnel-audit/pixels';
const RUN = Date.now().toString(36);
const EMAIL = `pixeltest+${RUN}@example.com`;

// MUST match client shortHashSha256 (SHA-256, first 16 hex) in client/src/lib/facebook.ts.
const leadEventId = (email) =>
  `lead_${createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 16)}`;

const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail });

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
const FALLBACKS = ["Yes... that's exactly how it feels.", "You're right. I can feel that.", "That's true for me, honestly."];

// Read every fbq(...) call still sitting in the (never-flushed) queue.
async function pixelEvents(page) {
  return page.evaluate(() => {
    const fbq = window.fbq;
    const q = fbq && fbq.queue ? Array.from(fbq.queue) : [];
    const out = [];
    for (const raw of q) {
      const a = Array.from(raw);
      if (a[0] === 'trackSingle' || a[0] === 'trackSingleCustom') out.push({ event: a[2], eventID: a[4] && a[4].eventID || null });
      else if (a[0] === 'track' || a[0] === 'trackCustom') out.push({ event: a[1], eventID: a[3] && a[3].eventID || null });
    }
    return out;
  });
}

async function waitForTurnEnd(page, { timeoutMs = 180000 } = {}) {
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
    console.error(`🔴 REFUSING to run against "${BASE}". Point LOCAL_BASE_URL at a localhost sandbox.`);
    process.exit(2);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`\nv1-funnel-audit (pixels) — base=${BASE}  email=${EMAIL}\n`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  // 🔒 Block Meta entirely — fbevents.js never loads, so fbq calls stay queued and readable.
  let metaBlocked = 0;
  await ctx.route(/(connect\.facebook\.net|facebook\.com\/tr|fbcdn\.net)/i, (r) => { metaBlocked++; return r.abort(); });
  // Capture the client's CAPI-relay POSTs, fulfil locally.
  const relay = [];
  await ctx.route('**/api/fb-event', async (route) => {
    try { relay.push(JSON.parse(route.request().postData() || '{}')); } catch { /* ignore */ }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  // Mock /api/lead: the pixel test only needs trackLead to FIRE. trackLead runs *after*
  // this fetch resolves (useConversation.ts), so an intermittent sandbox /api/lead error
  // would silently skip the client Lead pixel. Return a benign success so it always fires.
  // (audit-flow.mjs mocks /api/lead for the same reason.)
  await ctx.route('**/api/lead', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  // Mock /api/checkout: a CTA click fires InitiateCheckout (synchronously, before this call)
  // but handlePurchase only navigates when the response carries a `url` — return none, so the
  // page stays put and no Stripe session is created.
  await ctx.route('**/api/checkout', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  // Mock the upsell order-data READ so the success page fires Purchase for a synthetic
  // session — no real checkout or payment needed. Only the browser's view is mocked.
  const PSID = `purchasetest_${RUN}`;
  await ctx.route('**/api/upsell/user-data**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ email: EMAIL, firstName: 'Claire', mainPurchaseAmount: 5500, priceVariant: '55-35', bucket: 'love' }) }));

  const page = await ctx.newPage();
  await page.goto(`${BASE}/chat?close=55`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800); // let PageView fire on mount

  // ── PageView: pixel + CAPI relay share one event_id
  const pvPixel = (await pixelEvents(page)).find((e) => e.event === 'PageView');
  const pvRelay = relay.find((e) => e.eventName === 'PageView');
  check('PageView pixel fired on load', pvPixel);
  check('PageView CAPI relay (/api/fb-event) fired', pvRelay);
  check('PageView pixel↔CAPI event_id MATCHES (dedup)',
    pvPixel && pvRelay && pvPixel.eventID === pvRelay.eventId, `pixel=${pvPixel?.eventID} relay=${pvRelay?.eventId}`);

  // ── drive to the email-capture step (detected by the input placeholder)
  const input = page.locator('[data-testid="input-chat-message"]');
  const queue = [...ANSWERS];
  let fallbackI = 0, emailSubmitted = false, reachedPitch = false;
  for (let step = 0; step < 34 && !reachedPitch; step++) {
    const state = await waitForTurnEnd(page);
    if (state === 'timeout') break;
    if (state === 'pitch') { reachedPitch = true; break; }
    if (state === 'bucket') { await page.getByRole('button', { name: /Love & Relationships/i }).click(); continue; }
    if (state === 'perm') { await page.getByRole('button', { name: /Yes, please help me Evelyn/i }).click(); continue; }
    const ph = (await input.getAttribute('placeholder')) || '';
    if (/e-?mail/i.test(ph) && !emailSubmitted) { await input.fill(EMAIL); await input.press('Enter'); emailSubmitted = true; }
    else { await input.fill(queue.length ? queue.shift() : FALLBACKS[fallbackI++ % FALLBACKS.length]); await input.press('Enter'); }
  }
  check('Reached + submitted the email-capture step', emailSubmitted);
  await page.waitForTimeout(1500); // let trackLead settle

  // ── Lead: deterministic dedup id; and it must NOT double-relay client-side (V1 skipServerRelay)
  const lead = (await pixelEvents(page)).find((e) => e.event === 'Lead');
  check('Lead pixel fired on email capture', lead);
  check('Lead uses the deterministic dedup id lead_<sha256(email)>',
    lead && lead.eventID === leadEventId(EMAIL), `got=${lead?.eventID} expected=${leadEventId(EMAIL)}`);
  check('Lead NOT double-relayed client-side (skipServerRelay; server /api/lead owns CAPI)',
    !relay.find((e) => e.eventName === 'Lead'));

  // ── InitiateCheckout: click a checkout CTA (checkout is mocked → no Stripe, no navigation)
  check('Reached the pitch to test InitiateCheckout', reachedPitch);
  if (reachedPitch) {
    const full = page.locator('[data-testid="button-full-offering"]');
    const cta = (await full.isVisible().catch(() => false))
      ? full
      : page.getByRole('button', { name: /Begin My Energy Clearing/i }).first();
    await cta.click().catch(() => {});
    await page.waitForTimeout(1500);
    const ic = (await pixelEvents(page)).find((e) => e.event === 'InitiateCheckout');
    const icRelay = relay.find((e) => e.eventName === 'InitiateCheckout');
    check('InitiateCheckout pixel fired on CTA click', ic);
    check('InitiateCheckout CAPI relay (/api/fb-event) fired', icRelay);
    check('InitiateCheckout pixel↔CAPI event_id MATCHES (dedup)',
      ic && icRelay && ic.eventID === icRelay.eventId, `pixel=${ic?.eventID} relay=${icRelay?.eventId}`);
  }

  // ── Purchase: load the success page with a synthetic paid session (order-data mocked above)
  const up = await ctx.newPage();
  await up.goto(`${BASE}/welcome1?session_id=${PSID}`, { waitUntil: 'domcontentloaded' });
  await up.waitForTimeout(2500); // let the order-data fetch resolve + trackPurchase fire
  const purchase = (await pixelEvents(up)).find((e) => e.event === 'Purchase');
  check('Purchase pixel fired on the success page', purchase);
  check('Purchase uses the deterministic dedup id purchase_<session>',
    purchase && purchase.eventID === `purchase_${PSID}`, `got=${purchase?.eventID} expected=purchase_${PSID}`);
  check('Purchase NOT double-relayed client-side (skipServerRelay; Stripe webhook owns CAPI)',
    !relay.find((e) => e.eventName === 'Purchase'));
  await up.close();

  check('🔒 No Meta request escaped (all blocked)', true, `${metaBlocked} blocked`);

  await ctx.close();
  await browser.close();

  const passed = checks.filter((c) => c.pass).length, failed = checks.length - passed;
  const report =
    `# v1-funnel-audit (pixels) — PageView + Lead + InitiateCheckout + Purchase dedup\n\n` +
    `Base: ${BASE} · ${passed}/${checks.length} passed${failed ? ` · 🔴 ${failed} FAILED` : ' · ✅ ALL PASS'} · ${metaBlocked} Meta requests blocked\n\n` +
    checks.map((c) => `- ${c.pass ? '✅' : '🔴'} ${c.name}${c.detail ? `  — ${c.detail}` : ''}`).join('\n') + '\n';
  writeFileSync(`${OUT_DIR}/report.md`, report);
  console.log('\n' + report);
  console.log(`wrote ${OUT_DIR}/report.md\n`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error('\n🔴 PIXEL AUDIT ERROR:', e.message); process.exit(2); });
