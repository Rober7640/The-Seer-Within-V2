import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Walk for offer 04 (The Turn, tea-leaf reading) — the shared upsell pages with 04's copy.
//
//   npx vite dev --port 5095 --strictPort        # Vite ALONE — no Express, no database
//   BASE=http://localhost:5095 node improve-v1/v1-one-time-BEs/scripts/walk-04-upsells.mjs
//
// Three walks at 390×844, every API stubbed in the browser:
//   U1     /offers/upsell/welcome1?session_id=cs_test_walk04_u1
//          CONFIRMATION → … → OFFER through all three questions; presses ACCEPT once (the
//          charge is ABORTED, so she sees the retry line and the CTA again), then declines →
//          SOFT_DECLINE → lands on welcome2 with the same session.
//   U2 · B the same session (upsellPurchased:false) → PATH_B_OPEN → … → CTA → "Not right
//          now" → DOWNSELL → "No thanks, just my reading" → 04's successPath.
//   U2 · A /offers/upsell/welcome2?session_id=cs_test_walk04_pathA (upsellPurchased:true,
//          her U1 address on file) → PATH_A_OPEN → … the lava-stone circuit line → CTA →
//          ACCEPT (charge aborted).
//
// Asserts: every Evelyn bubble is free of day numbers / clearing lines / "by morning" /
// "tomorrow" / weekdays / unfilled tokens / "tonight" about the reading; no call to
// /api/upsell2/reading (the Claude stages are skipped); quick replies and CTA buttons sit
// fully on screen; no horizontal scroll; no page errors; welcome1 → welcome2 → successPath.
//
// ⛔ SAFETY. Refuses a non-local BASE unless ALLOW_REMOTE=1. Every non-BASE request is
// aborted (no Facebook, PostHog, Clarity, GTM, Trackdesk, S3 audio). Every /api call is
// either served from the stubs below or ABORTED and logged — the charge, fallback-checkout
// and shipping endpoints included. With Vite alone there is no server to reach anyway.
//
// Typing delays are scaled down SPEED× (default 12) by wrapping window.setTimeout, so a
// ~5-minute conversation walks in under a minute. Nothing else about the page changes.
//
// Screenshots + transcripts → improve-v1/evidence/04-tea-reading-2026-10-11/upsells/

const BASE = (process.env.BASE || 'http://localhost:5095').replace(/\/$/, '');
const SPEED = Number(process.env.SPEED || 12);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../evidence/04-tea-reading-2026-10-11/upsells');
const VIEWPORT = { width: 390, height: 844 };
const SUCCESS_PATH = '/offers/wiccan/tea-reading/success';

const baseHost = new URL(BASE).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(baseHost) && process.env.ALLOW_REMOTE !== '1') {
  console.error(`Refusing to walk ${BASE}: not local. Set ALLOW_REMOTE=1 if you really mean it.`);
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
};

// ── A paid 04 booking, as /api/backend/upsell/user-data returns it ──
const BASE_SESSION = {
  firstName: 'Sarah',
  email: 'walk04@example.test',
  offer: 'tea-reading',
  bucket: null,
  personName: null,
  upsell1PriceCents: 4700,
  upsell2PriceCents: 4700,
  upsell2DownsellCents: 3000,
  hasSavedCard: true,
};
const U1_ADDRESS = {
  name: 'Sarah Walk',
  line1: '14 Rosewood Avenue',
  city: 'Austin',
  state: 'TX',
  postal: '78701',
  country: 'US',
};
const SESSIONS = {
  // 04 is digital (collectsShipping:false): no address until she gives one on U1.
  cs_test_walk04_u1: { ...BASE_SESSION, upsellPurchased: false, hasShipping: false, shipping: null },
  cs_test_walk04_pathA: { ...BASE_SESSION, upsellPurchased: true, hasShipping: true, shipping: U1_ADDRESS },
};

// ── What no Evelyn bubble may say (mirrors teaReading.test.ts) ──
const NUM =
  'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|' +
  'sixteen|seventeen|eighteen|nineteen|twenty(?:-one)?|\\d+';
const RULES = [
  ['day number', new RegExp(`\\bdays? (?:${NUM})\\b`, 'i')],
  ['count of days', /\b(?<!twenty-)(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen) (?:quiet |silent )?days\b/i],
  ['numeric days', /\b(?!30\b)\d+ days\b/i],
  ['numbered week', new RegExp(`\\bweek (?:${NUM})\\b`, 'i')],
  ['clearing / V1 leak', /clearing|energy field|our conversation|we began talking/i],
  ['banned phrase', /open communication|seek guidance|embrace growth/i],
  ['timing', /by morning|tomorrow/i],
  ['weekday / month', /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|june|july|august|september|october|november|december)\b/i],
  ['unfilled token', /\{[^}]*\}/],
  ['promise of his return', /draws? him|bring(?:s)? him back|he(?:'ll| will) come back/i],
];
const tonightAboutReading = (s) =>
  s.split(/(?<=[.!?…])\s+/).some((x) => /\btonight\b/i.test(x) && /reading|cup|twenty-one|your days|sequence|letter/i.test(x));
function badBubbles(texts) {
  const bad = [];
  for (const t of texts) {
    for (const [label, re] of RULES) if (re.test(t)) bad.push(`${label}: ${t}`);
    if (tonightAboutReading(t)) bad.push(`tonight-on-reading: ${t}`);
  }
  return bad;
}

// ── Helpers ──
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const botTexts = (page) => page.locator('[data-testid^="message-bot-"]').allInnerTexts().then((a) => a.map(flat));

async function waitText(page, text, timeout = 90000) {
  await page.getByText(text, { exact: false }).last().waitFor({ state: 'visible', timeout });
  await page.waitForTimeout(250); // let the smooth auto-scroll settle before a screenshot
}

async function fullyOnScreen(page, testId) {
  const box = await page.getByTestId(testId).boundingBox();
  return { ok: !!box && box.y >= 0 && box.y + box.height <= VIEWPORT.height, box };
}

async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

async function waitReplies(page, value, label) {
  const btn = page.getByTestId(`button-quick-reply-${value}`);
  await btn.waitFor({ state: 'visible', timeout: 90000 });
  await page.waitForFunction((tid) => {
    const el = document.querySelector(`[data-testid="${tid}"]`);
    return el && !el.disabled;
  }, `button-quick-reply-${value}`, { timeout: 30000 });
  await page.waitForTimeout(300);
  const { ok, box } = await fullyOnScreen(page, 'container-quick-replies');
  check(`${label}: quick replies fully on screen`, ok, box ? `bottom=${Math.round(box.y + box.height)}` : 'no box');
  return btn;
}

// One tall picture of the whole conversation so far: unpin the h-dvh shell, screenshot the
// full page, pin it back. Purely a capture — the page is restored before the walk goes on.
async function fullTranscriptShot(page, pageTestId, chatTestId, name) {
  await page.evaluate(([p, c]) => {
    const pg = document.querySelector(`[data-testid="${p}"]`);
    const ch = document.querySelector(`[data-testid="${c}"]`);
    pg?.style.setProperty('height', 'auto');
    ch?.style.setProperty('overflow', 'visible');
    ch?.style.setProperty('flex', 'none');
  }, [pageTestId, chatTestId]);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  await page.evaluate(([p, c]) => {
    const pg = document.querySelector(`[data-testid="${p}"]`);
    const ch = document.querySelector(`[data-testid="${c}"]`);
    pg?.style.removeProperty('height');
    ch?.style.removeProperty('overflow');
    ch?.style.removeProperty('flex');
  }, [pageTestId, chatTestId]);
}

// Every Evelyn bubble, as it appears, keyed by the page it appeared on. A MutationObserver
// rather than a read at the end, because the last bubbles of each page are followed at once
// by a navigation (isComplete → navigate) and would otherwise never be read.
async function recordBubbles(context, bubbleLog) {
  await context.exposeBinding('__walk04Bubble', ({ page }, text) => {
    bubbleLog.push({ path: new URL(page.url()).pathname, text });
  });
  await context.addInitScript(() => {
    const seen = new WeakSet();
    const scan = () => {
      for (const el of document.querySelectorAll('[data-testid^="message-bot-"]')) {
        if (seen.has(el)) continue;
        seen.add(el);
        window.__walk04Bubble((el.innerText || '').replace(/\s+/g, ' ').trim());
      }
    };
    new MutationObserver(scan).observe(document, { childList: true, subtree: true });
  });
}

const bubblesOn = (bubbleLog, pathname) => bubbleLog.filter((b) => b.path === pathname).map((b) => b.text);

async function newContext(browser, apiLog, bubbleLog) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  await recordBubbles(context, bubbleLog);
  await context.addInitScript((speed) => {
    const orig = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...args) => orig(fn, Math.max(0, (Number(ms) || 0) / speed), ...args);
  }, SPEED);
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    if (url.origin !== new URL(BASE).origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/backend/upsell/user-data') {
      const sid = url.searchParams.get('session_id');
      apiLog.push({ method: req.method(), path: url.pathname, sid, served: !!SESSIONS[sid] });
      if (!SESSIONS[sid]) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"Order not found"}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSIONS[sid]) });
    }
    // Everything else under /api — the charge, fallback-checkout, shipping, the Claude
    // reading, analytics — is logged and ABORTED. Nothing is ever charged.
    apiLog.push({ method: req.method(), path: url.pathname, body: req.postData() || null, aborted: true });
    return route.abort();
  });
  return context;
}

const browser = await chromium.launch();
const transcripts = {};
try {
  // ════════════════════════ U1 → U2 Path B ════════════════════════
  {
    const apiLog = [];
    const bubbleLog = [];
    const context = await newContext(browser, apiLog, bubbleLog);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto(`${BASE}/offers/upsell/welcome1?session_id=cs_test_walk04_u1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const renders = await page.getByTestId('page-upsell').waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
    check('U1: welcome1 renders the chat (stubbed 04 session)', renders, renders ? '' : flat(await page.locator('body').innerText()).slice(0, 160));
    if (!renders) {
      await shot(page, 'u1-00-did-not-render');
      throw new Error('welcome1 did not render — see u1-00-did-not-render.png');
    }

    await waitText(page, 'most likely to cost you this');
    await shot(page, 'u1-01-confirmation');
    await waitText(page, 'easy to talk out of it');
    await shot(page, 'u1-02-gap');
    let btn = await waitReplies(page, 'yes', 'U1 Q1');
    await shot(page, 'u1-03-risk-question1');
    await btn.click();
    await waitText(page, 'A Protection Ritual.');
    await shot(page, 'u1-04-after-q1-solution');
    btn = await waitReplies(page, 'yes', 'U1 Q2');
    await shot(page, 'u1-05-lava-stone-question2');
    await btn.click();
    await waitText(page, 'Seven leaves is more than enough');
    await shot(page, 'u1-06-ritual');
    btn = await waitReplies(page, 'yes', 'U1 Q3');
    await shot(page, 'u1-07-feel-question3');
    await btn.click();
    await waitText(page, "won't move you off your days");
    await shot(page, 'u1-08-left-wrist-block');

    await page.getByTestId('button-upsell-accept').waitFor({ state: 'visible', timeout: 90000 });
    await page.waitForTimeout(400);
    const acceptOn = await fullyOnScreen(page, 'button-upsell-accept');
    const declineOn = await fullyOnScreen(page, 'button-upsell-decline');
    check('U1: accept + decline buttons fully on screen', acceptOn.ok && declineOn.ok);
    check('U1: accept button carries 04’s label', flat(await page.getByTestId('text-accept-button').innerText()) === 'Yes, guard my quiet days');
    await shot(page, 'u1-09-offer-cta');
    check('U1: no horizontal scroll', await noHorizontalScroll(page));
    await fullTranscriptShot(page, 'page-upsell', 'container-chat', 'u1-full-to-cta');

    // ACCEPT once: the charge is aborted, so the hook says so and puts the CTA back.
    await page.getByTestId('button-upsell-accept').click();
    await waitText(page, 'Something went wrong');
    await page.getByTestId('button-upsell-accept').waitFor({ state: 'visible', timeout: 30000 });
    const charge1 = apiLog.find((e) => e.path === '/api/backend/upsell/charge');
    check(
      'U1: accept POSTs the BACKEND charge (aborted, logged) with this session and no trackdesk id',
      !!charge1 && charge1.aborted && /cs_test_walk04_u1/.test(charge1.body || '') && !/trackdesk/i.test(charge1.body || ''),
      charge1 ? charge1.body : 'no charge call',
    );
    await shot(page, 'u1-10-accept-charge-aborted');

    await page.getByTestId('button-upsell-decline').click();
    await waitText(page, "it's already in your days", 30000);
    await shot(page, 'u1-11-soft-decline');

    await page.waitForURL(/\/offers\/upsell\/welcome2\?session_id=cs_test_walk04_u1/, { timeout: 60000 });
    transcripts.u1 = bubblesOn(bubbleLog, '/offers/upsell/welcome1');
    check('U1: ends on 04’s soft decline', transcripts.u1[transcripts.u1.length - 1] === 'Take care of yourself, dear.', transcripts.u1.at(-1));
    check('U1 → welcome2 with the same session', true, new URL(page.url()).pathname + new URL(page.url()).search);

    // ── U2, Path B (declined U1) ──
    await page.getByTestId('page-upsell2').waitFor({ timeout: 60000 });
    await waitText(page, 'Before I turn your cup');
    await shot(page, 'u2b-01-path-b-open');
    btn = await waitReplies(page, 'maybe', 'U2·B Q1');
    await shot(page, 'u2b-02-gap-question1');
    await btn.click();
    await waitText(page, 'I knew it when I saw the butterfly');
    await shot(page, 'u2b-03-introduce');
    btn = await waitReplies(page, 'more', 'U2·B Q2');
    await shot(page, 'u2b-04-stones-question2');
    await btn.click();
    await waitText(page, "It won't walk him across that bridge");
    await shot(page, 'u2b-05-three-leaves-right-wrist');
    btn = await waitReplies(page, 'maybe', 'U2·B Q3');
    await shot(page, 'u2b-06-what-you-receive-question3');
    await btn.click();
    await page.getByTestId('button-upsell2-accept').waitFor({ state: 'visible', timeout: 90000 });
    await page.waitForTimeout(400);
    check('U2·B: accept + decline buttons fully on screen',
      (await fullyOnScreen(page, 'button-upsell2-accept')).ok && (await fullyOnScreen(page, 'button-upsell2-decline')).ok);
    await shot(page, 'u2b-07-price-cta');
    check('U2·B: no horizontal scroll', await noHorizontalScroll(page));
    const u2bTexts = await botTexts(page);
    check('U2·B: did NOT show the lava-stone circuit line (Path A only)', !u2bTexts.some((t) => t.includes('complete circuit')));
    await fullTranscriptShot(page, 'page-upsell2', 'container-chat-upsell2', 'u2b-full-to-cta');

    await page.getByTestId('button-upsell2-decline').click();
    await page.getByTestId('button-upsell2-downsell-decline').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(400);
    check('U2·B: downsell buttons fully on screen',
      (await fullyOnScreen(page, 'button-upsell2-downsell-accept')).ok && (await fullyOnScreen(page, 'button-upsell2-downsell-decline')).ok);
    check('U2·B: downsell decline carries 04’s label',
      flat(await page.getByTestId('text-decline-downsell').innerText()) === 'No thanks, just my reading');
    await shot(page, 'u2b-08-downsell');
    await page.getByTestId('button-upsell2-downsell-decline').click();
    await waitText(page, 'Your reading stands on its own', 30000);
    await shot(page, 'u2b-09-soft-decline');
    await page.waitForURL((u) => u.pathname === SUCCESS_PATH, { timeout: 60000 });
    transcripts.u2b = bubblesOn(bubbleLog, '/offers/upsell/welcome2');
    check('U2·B: ends on 04’s soft decline', /don't send him anything until your days arrive/.test(transcripts.u2b.at(-1) || ''), transcripts.u2b.at(-1));
    check('U2·B → 04’s successPath with ?s=', new URL(page.url()).searchParams.get('s') === 'cs_test_walk04_u1', page.url().replace(BASE, ''));

    const reading = apiLog.filter((e) => e.path === '/api/upsell2/reading');
    check('U1/U2·B: no Claude reading call (MANIFEST stages skipped)', reading.length === 0);
    check('U1/U2·B: no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
    transcripts.apiLog_u1_u2b = apiLog;
    await context.close();
  }

  // ════════════════════════ U2 Path A ════════════════════════
  {
    const apiLog = [];
    const bubbleLog = [];
    const context = await newContext(browser, apiLog, bubbleLog);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto(`${BASE}/offers/upsell/welcome2?session_id=cs_test_walk04_pathA`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('page-upsell2').waitFor({ timeout: 60000 });
    await waitText(page, 'Your reading and your stone.');
    await shot(page, 'u2a-01-path-a-open');
    await waitText(page, 'what goes OUT from you');
    await shot(page, 'u2a-02-path-a-hinge');
    let btn = await waitReplies(page, 'yes', 'U2·A Q1');
    await shot(page, 'u2a-03-gap-question1');
    await btn.click();
    btn = await waitReplies(page, 'yes', 'U2·A Q2');
    await btn.click();
    await waitText(page, 'complete circuit');
    await shot(page, 'u2a-04-three-leaves-and-circuit');
    btn = await waitReplies(page, 'what', 'U2·A Q3');
    await btn.click();
    await page.getByTestId('button-upsell2-accept').waitFor({ state: 'visible', timeout: 90000 });
    await page.waitForTimeout(400);
    check('U2·A: accept + decline buttons fully on screen',
      (await fullyOnScreen(page, 'button-upsell2-accept')).ok && (await fullyOnScreen(page, 'button-upsell2-decline')).ok);
    await shot(page, 'u2a-05-price-cta');
    check('U2·A: no horizontal scroll', await noHorizontalScroll(page));
    await fullTranscriptShot(page, 'page-upsell2', 'container-chat-upsell2', 'u2a-full-to-cta');

    await page.getByTestId('button-upsell2-accept').click();
    await waitText(page, 'Something went wrong');
    const charge2 = apiLog.find((e) => e.path === '/api/backend/upsell/charge');
    check(
      'U2·A: accept POSTs the BACKEND bracelet charge (aborted, logged)',
      !!charge2 && charge2.aborted && /"product":"be_bracelet"/.test(charge2.body || '') && /"tier":"full"/.test(charge2.body || ''),
      charge2 ? charge2.body : 'no charge call',
    );
    await shot(page, 'u2a-06-accept-charge-aborted');
    transcripts.u2a = bubblesOn(bubbleLog, '/offers/upsell/welcome2');

    check('U2·A: no Claude reading call (MANIFEST stages skipped)', !apiLog.some((e) => e.path === '/api/upsell2/reading'));
    check('U2·A: no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
    transcripts.apiLog_u2a = apiLog;
    await context.close();
  }
} catch (err) {
  check('walk completed', false, err instanceof Error ? err.message : String(err));
} finally {
  await browser.close();
}

// ── Copy checks over every bubble Evelyn actually sent ──
for (const [key, texts] of Object.entries(transcripts)) {
  if (key.startsWith('apiLog')) continue;
  const bad = badBubbles(texts);
  check(`${key}: ${texts.length} bubbles, none breaks a 04 copy rule`, texts.length > 0 && bad.length === 0, bad.slice(0, 3).join(' | '));
  check(`${key}: "Sarah" merged, no "Friend"`, texts.every((t) => !/\bFriend\b/.test(t)) && texts.some((t) => t.includes('Sarah')));
}

fs.writeFileSync(path.join(OUT, 'transcripts.json'), JSON.stringify(transcripts, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== ${failed === 0 ? `ALL ${results.length} CHECKS PASS` : `${failed} of ${results.length} FAILED`} ===`);
console.log(`screenshots: ${OUT}`);
process.exit(failed === 0 ? 0 : 1);
