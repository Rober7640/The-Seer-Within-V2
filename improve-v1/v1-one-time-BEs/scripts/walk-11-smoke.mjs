import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Walk for offer 11 (The Unsent Letter): the booking page at four phone sizes, the shared upsell
// pages with 11's copy, and the receipt.
//
//   npx vite dev --port 5096 --strictPort        # Vite ALONE — no Express, no database
//   BASE=http://localhost:5096 node improve-v1/v1-one-time-BEs/scripts/walk-11-smoke.mjs
//
// Booking page, at 390×844, 390×664, 375×667, 360×740:
//   measures where price, fields, bump, total and button sit on the FIRST screen, then what ticking
//   the bump does to the total and whether the page brings the button into view; a press with nothing done, every field
//   error, the press that logs and stops, and ?cancelled=1.
// Upsells, at 390×844, every API stubbed in the browser:
//   U1 → decline → U2 Path B → downsell → decline → 11's receipt; U2 Path A; a buyer with no ?fn=.
// Receipt: each state, stubbed.
//
// Scans every rendered page for: numerology, journey, energy, clearing, our conversation, blank
// merge tokens, "undefined", "null", NaN. Records page errors.
//
// ⛔ SAFETY. Refuses a non-local BASE. Every /api call is served from the stubs below or ABORTED
// and logged — the charge, fallback-checkout and shipping included. Every other host is aborted,
// except Google Fonts: the page's real fonts decide how the lines wrap, so a measurement without
// them is a guess. BACKEND_CHECKOUT_LIVE stays false here, so the booking button logs and stops.
//
// Screenshots + measurements.json + transcripts.json →
//   improve-v1/v1-one-time-BEs/docs/11/booking-page/screens/

const BASE = (process.env.BASE || 'http://localhost:5096').replace(/\/$/, '');
const SPEED = Number(process.env.SPEED || 12);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../docs/11/booking-page/screens');
const BOOKING = '/tarot/unsent-letter';
const SUCCESS = '/tarot/unsent-letter/success';
const PHONES = [
  { width: 390, height: 844, mock: 653 },
  { width: 390, height: 664, mock: 653 },
  { width: 375, height: 667, mock: 653 },
  { width: 360, height: 740, mock: 696 },
];
const CHAT_VIEWPORT = { width: 390, height: 844 };

if (!['localhost', '127.0.0.1', '::1'].includes(new URL(BASE).hostname)) {
  console.error(`Refusing to walk ${BASE}: not local.`);
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
};
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
const round = (n) => Math.round(n);

// ── What no rendered page may say ──
const BANNED = [
  ['numerology', /numerolog/i],
  ['journey', /\bjourney/i],
  ['energy', /\benerg(?:y|ies|etic)\b/i],
  ['clearing', /\bclearing\b/i],
  ['our conversation', /our conversation/i],
  ['blank token', /\{[a-zA-Z_]*\}|\{\{|%[A-Z_]+%/],
  ['bad merge', /\bundefined\b|\bNaN\b|\[object Object\]/],
];
const scan = (label, text) => {
  const hits = BANNED.filter(([, re]) => re.test(text)).map(([name]) => name);
  check(`${label}: no banned word or blank token`, hits.length === 0, hits.join(', '));
};

// ── Sessions and orders, as the server returns them ──
const BASE_SESSION = {
  firstName: 'Sarah',
  email: 'walk11@example.test',
  offer: 'unsent-letter',
  funnel: null,
  bucket: null,
  personName: null,
  upsell1PriceCents: 4700,
  upsell2PriceCents: 4700,
  upsell2DownsellCents: 3000,
  hasSavedCard: true,
};
const ADDRESS = { name: 'Sarah Walk', line1: '14 Rosewood Avenue', city: 'Austin', state: 'TX', postal: '78701', country: 'US' };
const SESSIONS = {
  cs_test_walk11_u1: { ...BASE_SESSION, upsellPurchased: false, hasShipping: false, shipping: null },
  cs_test_walk11_pathA: { ...BASE_SESSION, upsellPurchased: true, hasShipping: true, shipping: ADDRESS },
  cs_test_walk11_noname: { ...BASE_SESSION, firstName: 'Friend', upsellPurchased: false, hasShipping: false, shipping: null },
};
const order = (o = {}) => ({
  order: { offer: 'unsent-letter', offerNumber: '11', status: 'paid', firstName: 'Sarah', bumpPurchased: false, deliveredAt: null, deliveryHours: 24, ...o },
});
// POST /api/backend/unsent-letter/gift-handoff. ⚠ The 5097 stub proxy needs the same route.
const GIFTS = {
  cs_receipt_plain: [200, { mode: 'login', token: 'walk-token' }],
  cs_receipt_bump: [200, { mode: 'signup', email: 'sarah@example.com', firstName: 'Sarah' }],
  cs_receipt_delivered: [200, { mode: 'login', token: 'walk-token' }],
  cs_receipt_noname: [500, { error: 'Failed to build the handoff' }],
};
const ORDERS = {
  cs_test_walk11_u1: [200, order()],
  cs_receipt_plain: [200, order()],
  cs_receipt_bump: [200, order({ bumpPurchased: true })],
  cs_receipt_delivered: [200, order({ deliveredAt: '2026-11-02T10:00:00Z' })],
  cs_receipt_noname: [200, order({ firstName: null })],
  cs_receipt_other: [404, { error: 'Order not found' }],
};

// Every Evelyn bubble, as it appears, keyed by the page it appeared on. A MutationObserver rather
// than a read at the end: the last bubbles of each page are followed at once by a navigation.
async function recordBubbles(context, bubbleLog) {
  await context.exposeBinding('__walk11Bubble', ({ page }, text) => {
    bubbleLog.push({ path: new URL(page.url()).pathname, text });
  });
  await context.addInitScript(() => {
    const seen = new WeakSet();
    const scan = () => {
      for (const el of document.querySelectorAll('[data-testid^="message-bot-"]')) {
        if (seen.has(el)) continue;
        seen.add(el);
        window.__walk11Bubble((el.innerText || '').replace(/\s+/g, ' ').trim());
      }
    };
    new MutationObserver(scan).observe(document, { childList: true, subtree: true });
  });
}

async function newContext(browser, viewport, apiLog, consoleLog, bubbleLog) {
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  if (bubbleLog) await recordBubbles(context, bubbleLog);
  await context.addInitScript((speed) => {
    const orig = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...args) => orig(fn, Math.max(0, (Number(ms) || 0) / speed), ...args);
  }, SPEED);
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.continue();
    if (url.origin !== new URL(BASE).origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/backend/upsell/user-data') {
      const sid = url.searchParams.get('session_id');
      apiLog.push({ path: url.pathname, sid });
      if (!SESSIONS[sid]) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"Order not found"}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSIONS[sid]) });
    }
    if (url.pathname === '/api/backend/unsent-letter/gift-handoff') {
      const sid = JSON.parse(req.postData() || '{}').sessionId;
      const [status, body] = GIFTS[sid] ?? [404, { error: 'Order not found' }];
      apiLog.push({ method: req.method(), path: url.pathname, sid });
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    }
    if (url.pathname.startsWith('/api/backend/order/')) {
      const sid = decodeURIComponent(url.pathname.split('/').pop());
      const [status, body] = ORDERS[sid] ?? [404, { error: 'Order not found' }];
      apiLog.push({ path: url.pathname, query: url.search });
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    }
    apiLog.push({ method: req.method(), path: url.pathname, body: req.postData() || null, aborted: true });
    return route.abort();
  });
  const page = await context.newPage();
  page.on('console', (m) => consoleLog?.push(m.text()));
  return { context, page };
}

const measure = async (page, testId) => {
  const box = await page.getByTestId(testId).boundingBox();
  return box ? { top: round(box.y), bottom: round(box.y + box.height) } : null;
};
const onScreen = (m, height) => !!m && m.top >= 0 && m.bottom <= height;
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const fontsReady = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  return ['Playfair Display', 'Inter'].map((f) => [...document.fonts].some((x) => x.family.includes(f) && x.status === 'loaded'));
});

// ════════════════════════ The booking page, at each phone ════════════════════════
async function walkBooking(browser, phone, measurements) {
  const { width, height, mock } = phone;
  const tag = `${width}x${height}`;
  const apiLog = [];
  const consoleLog = [];
  const { context, page } = await newContext(browser, { width, height }, apiLog, consoleLog);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(`${BASE}${BOOKING}?c=3&fn=Sarah`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByTestId('button-checkout').waitFor({ timeout: 60000 });
  const fonts = await fontsReady(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `booking-${tag}-1-first-screen.png`) });

  const first = {
    price: await measure(page, 'text-price-line'),
    nameInput: await measure(page, 'input-birth-name'),
    dob: await measure(page, 'input-dob-year'),
    bump: await measure(page, 'checkbox-bump'),
    total: await measure(page, 'text-total'),
    button: await measure(page, 'button-checkout'),
    hint: await measure(page, 'text-locked-hint'),
  };
  const h1 = await page.locator('h1').boundingBox();
  const h1Line = await page.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
  const titleLines = Math.round(h1.height / h1Line);
  check(`${tag}: price and both fields on the first screen`,
    ['price', 'nameInput', 'dob'].every((k) => onScreen(first[k], height)),
    `price bottom ${first.price?.bottom}px, screen ${height}px`);
  // A measurement, not a test: on shorter phones the button starts below the screen by design.
  console.log(`   ${tag}: bump bottom ${first.bump?.bottom}px, total ${first.total?.bottom}px, button ${first.button?.bottom}px, hint ${first.hint?.bottom}px, screen ${height}px`);
  check(`${tag}: title on one line`, titleLines === 1, `${titleLines} lines`);
  check(`${tag}: real fonts loaded (Playfair, Inter)`, fonts.every(Boolean), JSON.stringify(fonts));
  check(`${tag}: no sideways scroll`, await noSideScroll(page));
  check(`${tag}: bump and total show from the start, bump never pre-ticked`,
    !(await page.getByTestId('checkbox-bump').locator('input').isChecked()) &&
      flat(await page.getByTestId('text-total').innerText()) === '$35.00');
  check(`${tag}: the bump sits above the total and the button`,
    first.bump.bottom <= first.total.top && first.total.bottom <= first.button.top);
  check(`${tag}: the bump is the only box, with no Yes tick`,
    (await page.locator('input[type=checkbox]').count()) === 1 && (await page.getByTestId('checkbox-ready').count()) === 0 &&
      !/say.so/.test(await page.locator('body').innerText()));
  check(`${tag}: the hint doesn't mention a tick`, flat(await page.getByTestId('text-locked-hint').innerText()) === 'Fill in both boxes to continue.');
  check(`${tag}: price printed from the catalog`, flat(await page.getByTestId('text-price').innerText()) === '$35');
  const inputSizes = await page.locator('input[type=text]').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
  check(`${tag}: every input at 16px or more, so iOS won't zoom`, inputSizes.length === 4 && inputSizes.every((s) => s >= 16), inputSizes.join(','));

  // A press with nothing done jumps to the first thing missing, and says what's wrong.
  await page.getByTestId('button-checkout').click({ force: true }); // aria-disabled: a real tap still lands
  const focused = await page.evaluate(() => document.activeElement?.id);
  const nameErr = flat(await page.getByTestId('birth-name-error').innerText());
  check(`${tag}: empty press jumps to the birth name`, focused === 'birth-name', focused);
  check(`${tag}: empty press shows Marcus's name error above the box`,
    nameErr === 'Error: please enter your first and last name as it is on your birth certificate.', nameErr);
  await page.screenshot({ path: path.join(OUT, `booking-${tag}-2-empty-press.png`) });

  // Each field error, on press only; typing clears it.
  const cases = [
    [{ name: 'Sarah', m: '03', d: '14', y: '1961' }, 'birth-name-error', 'Error: please enter your first and last name as it is on your birth certificate.'],
    [{ name: 'Sarah Miller', m: '13', d: '14', y: '1961' }, 'dob-error', 'Error: enter the month as a number from 1 to 12.'],
    [{ name: 'Sarah Miller', m: '03', d: '32', y: '1961' }, 'dob-error', 'Error: enter the day as a number from 1 to 31.'],
    [{ name: 'Sarah Miller', m: '03', d: '14', y: '61' }, 'dob-error', 'Error: the year should have four numbers, for example 1961.'],
    [{ name: 'Sarah Miller', m: '06', d: '31', y: '1961' }, 'dob-error', 'Error: that month does not have that many days — please check the day.'],
  ];
  const fill = async ({ name, m, d, y }) => {
    await page.getByTestId('input-birth-name').fill(name);
    await page.getByTestId('input-dob-month').fill(m);
    await page.getByTestId('input-dob-day').fill(d);
    await page.getByTestId('input-dob-year').fill(y);
  };
  let errorsOk = true;
  for (const [values, id, words] of cases) {
    await fill(values);
    await page.getByTestId('button-checkout').click({ force: true }); // aria-disabled: a real tap still lands
    const got = flat(await page.getByTestId(id).innerText().catch(() => ''));
    if (got !== words) { errorsOk = false; console.log(`   wanted "${words}" got "${got}"`); }
  }
  check(`${tag}: all five field errors, word for word`, errorsOk);

  // Filled: the button is live with no tick at all, and the bump is still unticked.
  await fill({ name: 'Sarah Jane Miller', m: '03', d: '14', y: '1961' });
  check(`${tag}: typing clears the error`, (await page.getByTestId('dob-error').count()) === 0);
  const live = async () => (await page.getByTestId('button-checkout').getAttribute('aria-disabled')) === 'false' &&
    (await page.getByTestId('text-locked-hint').count()) === 0;
  const bumpState = async () => ({
    bump: await page.getByTestId('checkbox-bump').locator('input').isChecked(),
    total: flat(await page.getByTestId('text-total').innerText()),
  });
  const is = (got, bump, total) => got.bump === bump && got.total === total;
  check(`${tag}: both fields filled, the button is live with no tick`, await live());
  check(`${tag}: filled, the bump is still unticked, total $35.00`, is(await bumpState(), false, '$35.00'));
  await page.locator('html').evaluate(() => document.activeElement?.blur());

  // One click on the bump: it toggles, the total follows, and the button comes into view.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const beforeBump = await page.evaluate(() => window.scrollY);
  await page.getByTestId('checkbox-bump').click();
  await page.waitForTimeout(900);
  const afterBump = await measure(page, 'button-checkout');
  const scrollY = await page.evaluate(() => window.scrollY);
  const buttonInPage = afterBump.bottom + scrollY;
  check(`${tag}: one click on the bump, total $47.77`, is(await bumpState(), true, '$47.77'));
  check(`${tag}: after the bump tick the button is on screen`, onScreen(afterBump, height),
    `button page-bottom ${buttonInPage}px, scrolled ${scrollY - beforeBump}px, on-screen bottom ${afterBump.bottom}px`);
  await page.screenshot({ path: path.join(OUT, `booking-${tag}-3-ticked.png`) });

  // Off again: only the bump and the total change.
  await page.getByTestId('checkbox-bump').click();
  check(`${tag}: a second click takes it off, total $35.00`, is(await bumpState(), false, '$35.00'));
  check(`${tag}: the button stays live with the bump off`, await live());
  await page.getByTestId('checkbox-bump').click();
  check(`${tag}: and back on, total $47.77`, is(await bumpState(), true, '$47.77'));

  // The press logs and stops.
  await page.getByTestId('button-checkout').click({ force: true }); // aria-disabled: a real tap still lands
  await page.waitForTimeout(300);
  const log = consoleLog.filter((l) => l.includes('would checkout')).join(' ');
  check(`${tag}: the button logs and stops`, log.includes('unsent-letter') && !page.url().includes('stripe'), log.slice(0, 120));
  check(`${tag}: the log carries no birth name or date`, !/Miller|1961/.test(log));
  check(`${tag}: no /api/backend/checkout call`, !apiLog.some((e) => e.path === '/api/backend/checkout'));
  const url = page.url();
  check(`${tag}: nothing she typed is in the URL`, !/Miller|1961/.test(url));
  const localHas = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  check(`${tag}: nothing she typed is in localStorage`, !/Miller|1961/.test(localHas));

  scan(`${tag} booking`, await page.locator('body').innerText());
  await page.screenshot({ path: path.join(OUT, `booking-${tag}-4-full.png`), fullPage: true });

  // Back from Stripe's Cancel.
  await page.goto(`${BASE}${BOOKING}?cancelled=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByTestId('text-cancelled').waitFor({ timeout: 30000 });
  check(`${tag}: ?cancelled=1 brings her details back, not the bump`,
    (await page.getByTestId('input-birth-name').inputValue()) === 'Sarah Jane Miller' &&
      (await page.getByTestId('input-dob-year').inputValue()) === '1961' &&
      !(await page.getByTestId('checkbox-bump').locator('input').isChecked()));
  check(`${tag}: cancelled line word for word`,
    flat(await page.getByTestId('text-cancelled').innerText()) === "You haven't been charged. Your details are still here.");
  const cancelled = await measure(page, 'text-price-line');
  check(`${tag}: the price on the first screen with the cancelled line`, onScreen(cancelled, height), `bottom ${cancelled?.bottom}px`);
  check(`${tag}: back from checkout the button is live, her details being there`,
    (await page.getByTestId('button-checkout').getAttribute('aria-disabled')) === 'false');
  await page.screenshot({ path: path.join(OUT, `booking-${tag}-5-cancelled.png`) });

  // A plain visit shows nothing, and forgets it.
  await page.goto(`${BASE}${BOOKING}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByTestId('button-checkout').waitFor({ timeout: 30000 });
  check(`${tag}: a plain visit starts empty`, (await page.getByTestId('input-birth-name').inputValue()) === '');
  await page.getByTestId('checkbox-bump').click();
  check(`${tag}: the bump doesn't open the button: it still needs the fields`,
    flat(await page.getByTestId('text-total').innerText()) === '$47.77' &&
      (await page.getByTestId('button-checkout').getAttribute('aria-disabled')) === 'true' &&
      (await page.getByTestId('text-locked-hint').count()) === 1);
  check(`${tag}: no page errors`, pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  measurements.push({
    viewport: tag,
    mockButtonBottom: mock,
    realButtonBottom: first.button?.bottom,
    bumpBottom: first.bump?.bottom,
    totalBottom: first.total?.bottom,
    hintBottom: first.hint?.bottom,
    priceBottom: first.price?.bottom,
    titleLines,
    afterBump: { buttonPageBottom: buttonInPage, scrolledBy: scrollY - beforeBump, onScreenBottom: afterBump.bottom },
    cancelledPriceBottom: cancelled?.bottom,
  });
  await context.close();
}

// ════════════════════════ The conversations ════════════════════════
const texts = (page) => page.locator('[data-testid^="message-bot-"]').allInnerTexts().then((a) => a.map(flat));

/** Taps through replies and pause buttons until the wanted button shows. */
async function driveTo(page, testId, choose = () => 'yes') {
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    if (await page.getByTestId(testId).isVisible().catch(() => false)) return true;
    const pause = page.getByTestId('button-quick-reply-continue');
    if (await pause.isVisible().catch(() => false)) {
      if (await pause.isEnabled().catch(() => false)) await pause.click().catch(() => {});
    } else {
      const reply = page.getByTestId(`button-quick-reply-${choose()}`);
      if (await reply.isVisible().catch(() => false)) {
        if (await reply.isEnabled().catch(() => false)) await reply.click().catch(() => {});
      }
    }
    await page.waitForTimeout(120);
  }
  return false;
}

async function walkConversations(browser, transcripts) {
  // U1 → U2 Path B → the receipt.
  {
    const apiLog = [];
    const bubbleLog = [];
    const { context, page } = await newContext(browser, CHAT_VIEWPORT, apiLog, null, bubbleLog);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const bubblesOn = (pathname) => [...new Set(bubbleLog.filter((b) => b.path === pathname).map((b) => b.text))];

    await page.goto(`${BASE}/offers/upsell/welcome1?session_id=cs_test_walk11_u1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('page-upsell').waitFor({ timeout: 60000 });
    await page.getByText("there's one thing your reading won't do", { exact: false }).last().waitFor({ timeout: 90000 });
    await page.screenshot({ path: path.join(OUT, 'u1-1-confirmation.png') });
    check('U1: reached the CTA', await driveTo(page, 'button-upsell-accept'));
    await page.waitForTimeout(400);
    const body = await page.locator('body').innerText();
    check('U1: the reassurance line is 11’s', body.includes('Take your time.') && !body.includes('This is your journey'));
    check('U1: accept label is 11’s', flat(await page.getByTestId('text-accept-button').innerText()) === "Yes, protect what's coming back");
    check('U1: no sideways scroll', await noSideScroll(page));
    const u1Cta = await measure(page, 'container-upsell-cta');
    check('U1: CTA on screen', onScreen(u1Cta, CHAT_VIEWPORT.height), JSON.stringify(u1Cta));
    await page.screenshot({ path: path.join(OUT, 'u1-2-cta.png') });
    scan('U1 at the CTA', body);

    await page.getByTestId('button-upsell-accept').click();
    await page.getByText('Something went wrong', { exact: false }).last().waitFor({ timeout: 30000 }).catch(() => {});
    const charge = apiLog.find((e) => e.path === '/api/backend/upsell/charge');
    check('U1: accept reaches the backend charge, aborted by the walk', !!charge?.aborted, charge?.body ?? 'no call');
    await page.getByTestId('button-upsell-decline').waitFor({ state: 'visible', timeout: 30000 });
    await page.getByTestId('button-upsell-decline').click();
    await page.waitForURL(/\/offers\/upsell\/welcome2\?session_id=cs_test_walk11_u1/, { timeout: 60000 });
    check('U1 → welcome2 with the same session', true);
    check('U1: ends on 11’s soft decline', bubblesOn('/offers/upsell/welcome1').at(-1) === 'Take care of yourself, dear. And leave your phone where it is.', bubblesOn('/offers/upsell/welcome1').at(-1));

    await page.getByTestId('page-upsell2').waitFor({ timeout: 60000 });
    check('U2·B: reached the CTA', await driveTo(page, 'button-upsell2-accept'));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, 'u2b-1-cta.png') });
    scan('U2·B at the CTA', await page.locator('body').innerText());
    check('U2·B: no sideways scroll', await noSideScroll(page));
    check('U2·B: did not show the lava-stone circuit line', !bubblesOn('/offers/upsell/welcome2').some((t) => t.includes('complete circuit')));

    await page.getByTestId('button-upsell2-decline').click();
    await page.getByTestId('button-upsell2-downsell-decline').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(400);
    const downsellBody = await page.locator('body').innerText();
    check('U2·B: the downsell line is 11’s', downsellBody.includes('Same eight stones. Just prepared differently.') && !/manifestation energy/i.test(downsellBody));
    check('U2·B: decline label is 11’s', flat(await page.getByTestId('text-decline-downsell').innerText()) === 'No thanks, just my letter');
    await page.screenshot({ path: path.join(OUT, 'u2b-2-downsell.png') });
    scan('U2·B at the downsell', downsellBody);
    await page.getByTestId('button-upsell2-downsell-decline').click();
    await page.waitForURL((u) => u.pathname === SUCCESS, { timeout: 60000 });
    check('U2·B: ends on 11’s soft decline', bubblesOn('/offers/upsell/welcome2').at(-1) === "Take care. You don't owe them a word.", bubblesOn('/offers/upsell/welcome2').at(-1));
    check('U2·B → 11’s receipt with ?s=', new URL(page.url()).searchParams.get('s') === 'cs_test_walk11_u1', page.url().replace(BASE, ''));
    await page.getByTestId('card-thankyou-unsent-letter').waitFor({ timeout: 30000 });
    check('The chain ends on her own receipt', flat(await page.getByTestId('text-delivery-title').innerText()) === 'Sarah — your letter is written out');

    check('U1/U2·B: no Claude reading call', !apiLog.some((e) => e.path === '/api/upsell2/reading'));
    check('U1/U2·B: no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
    transcripts.u1 = bubblesOn('/offers/upsell/welcome1');
    transcripts.u2b = bubblesOn('/offers/upsell/welcome2');
    await context.close();
  }

  // U2 Path A: she took the stone.
  {
    const apiLog = [];
    const { context, page } = await newContext(browser, CHAT_VIEWPORT, apiLog);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto(`${BASE}/offers/upsell/welcome2?session_id=cs_test_walk11_pathA`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('page-upsell2').waitFor({ timeout: 60000 });
    check('U2·A: reached the CTA', await driveTo(page, 'button-upsell2-accept'));
    await page.waitForTimeout(400);
    const a = await texts(page);
    check('U2·A: opens on 11’s Path A', a.some((t) => t.includes('both are booked. Your reading and your stone.')));
    check('U2·A: shows the circuit line', a.some((t) => t.includes('complete circuit')));
    await page.screenshot({ path: path.join(OUT, 'u2a-1-cta.png') });
    scan('U2·A at the CTA', await page.locator('body').innerText());
    await page.getByTestId('button-upsell2-accept').click();
    await page.getByText('Something went wrong', { exact: false }).last().waitFor({ timeout: 30000 }).catch(() => {});
    const charge = apiLog.find((e) => e.path === '/api/backend/upsell/charge');
    check('U2·A: accept reaches the bracelet charge, aborted by the walk', !!charge?.aborted && /be_bracelet/.test(charge.body || ''), charge?.body ?? 'no call');
    check('U2·A: no Claude reading call', !apiLog.some((e) => e.path === '/api/upsell2/reading'));
    check('U2·A: no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
    transcripts.u2a = a;
    await context.close();
  }

  // No ?fn=: she's "dear", never "Friend".
  {
    const { context, page } = await newContext(browser, CHAT_VIEWPORT, []);
    await page.goto(`${BASE}/offers/upsell/welcome1?session_id=cs_test_walk11_noname`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByText("It's done, dear", { exact: false }).last().waitFor({ timeout: 60000 }).catch(() => {});
    const t = await texts(page);
    check('No ?fn=: U1 opens "It\'s done, dear"', t.some((x) => x.startsWith("It's done, dear.")), t[0]);
    check('No ?fn=: never "Friend"', !t.some((x) => /\bFriend\b/.test(x)));
    await context.close();
  }

  for (const [key, list] of Object.entries(transcripts)) {
    check(`${key}: ${list.length} bubbles, "Sarah" merged, no "Friend"`,
      list.length > 0 && list.some((t) => t.includes('Sarah')) && list.every((t) => !/\bFriend\b/.test(t)));
    scan(`${key} every bubble`, list.join('\n'));
    const reveal = list.filter((t) => /\bnerve\b|\btrust|\blaugh|\bsafe\b|\bfreedom\b|looked after|\bworth\b|\bsoftness\b/i.test(t));
    check(`${key}: no reveal word`, reveal.length === 0, reveal.slice(0, 2).join(' | '));
  }
}

// ════════════════════════ The receipt ════════════════════════
async function walkReceipt(browser) {
  const apiLog = [];
  const { context, page } = await newContext(browser, CHAT_VIEWPORT, apiLog);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const open = async (sid) => {
    await page.goto(`${BASE}${SUCCESS}${sid ? `?s=${sid}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="card-thankyou-unsent-letter"], [data-testid="card-receipt-fallback"]').first().waitFor({ timeout: 30000 });
    return page.locator('body').innerText();
  };

  let body = await open('cs_receipt_plain');
  check('Receipt: names her, the title and the confirmed subject',
    body.includes('Thank you, Sarah.') && body.includes('Sarah — your letter is written out') && body.includes('Your Unsent Letter reading is confirmed'));
  check('Receipt: says within 24 hours', body.includes('within 24 hours'));
  check('Receipt: no P.S. without the bump', (await page.getByTestId('text-bump-ps').count()) === 0);
  check('Receipt: no price', !/\$\d/.test(body));
  check('Receipt: asks for this offer', apiLog.some((e) => e.query === '?offer=unsent-letter'));
  scan('Receipt', body);
  await page.getByTestId('card-letter-gift').waitFor({ timeout: 10000 });
  body = await page.locator('body').innerText();
  check('Receipt gift: the writing line', flat(await page.getByTestId('text-gift-line').innerText()) === 'While I write, come and talk to me. The first 15 minutes are on me.');
  check('Receipt gift: the voucher, with no price', flat(body).includes('15 minutes of free chat') && flat(body).includes('with Evelyn Cross') && !/\$\d/.test(body));
  const loginHref = await page.getByTestId('link-letter-gift').getAttribute('href');
  check('Receipt gift: a login link under 11’s tag', loginHref.startsWith('/evelyn?token=walk-token&campaign=be11-ty-evelyn&'), loginHref);
  check('Receipt gift: no sideways scroll', await noSideScroll(page));
  scan('Receipt gift', body);
  await page.screenshot({ path: path.join(OUT, 'receipt-1-plain.png'), fullPage: true });

  body = await open('cs_receipt_bump');
  check('Receipt: the bump P.S.', flat(await page.getByTestId('text-bump-ps').innerText()).startsWith('P.S. You added Closing the Door.'));
  await page.getByTestId('card-letter-gift').waitFor({ timeout: 10000 });
  const signupHref = await page.getByTestId('link-letter-gift').getAttribute('href');
  check('Receipt gift: a new buyer gets a prefilled signup', signupHref.startsWith('/evelyn?campaign=be11-ty-evelyn&') && signupHref.includes('email=sarah%40example.com') && signupHref.includes('name=Sarah'), signupHref);
  await page.screenshot({ path: path.join(OUT, 'receipt-2-bump.png'), fullPage: true });

  body = await open('cs_receipt_delivered');
  check('Receipt: delivered variant', body.includes("It's written out, and your reading's been sent.") && !body.includes('on my table'));
  await page.getByTestId('card-letter-gift').waitFor({ timeout: 10000 });
  body = await page.locator('body').innerText();
  check('Receipt gift: delivered, it still works and says nothing about writing',
    flat(await page.getByTestId('text-gift-line').innerText()) === "Once you've read it, come and talk to me. The first 15 minutes are on me." && !body.includes('While I write'));
  await page.screenshot({ path: path.join(OUT, 'receipt-3-delivered.png'), fullPage: true });

  body = await open('cs_receipt_noname');
  check('Receipt: no name is "dear"', body.includes('Thank you, dear.') && body.includes('dear — your letter is written out'));
  await page.waitForResponse((r) => r.url().includes('gift-handoff')).catch(() => {});
  await page.waitForTimeout(300);
  check('Receipt gift: a failed handoff shows no voucher', (await page.getByTestId('card-letter-gift').count()) === 0);

  body = await open('cs_receipt_other');
  check('Receipt: another offer’s session gets the fallback', (await page.getByTestId('card-receipt-fallback').count()) === 1 && !body.includes('within 24 hours'));
  scan('Receipt fallback', body);
  await page.waitForTimeout(300);
  check('Receipt gift: never on the fallback', (await page.getByTestId('card-letter-gift').count()) === 0);
  await page.screenshot({ path: path.join(OUT, 'receipt-4-fallback.png'), fullPage: true });

  await open('');
  check('Receipt: no ?s= gets the fallback', (await page.getByTestId('card-receipt-fallback').count()) === 1);
  check('Receipt: no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  // The voucher's link, on the real lander: a thank-you arrival, straight to Evelyn, no quiz.
  await page.goto(`${BASE}/evelyn?campaign=be11-ty-evelyn&utm_source=be11_ty&email=sarah%40example.com`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => /Connecting you with Evelyn|Continue to Evelyn/.test(document.body.innerText) || document.querySelector('[data-testid="button-evelyn-ty-retry"]'), null, { timeout: 30000 }).catch(() => {});
  const lander = await page.locator('body').innerText();
  check('Receipt gift: the lander treats it as a thank-you arrival, no quiz',
    /Connecting you with Evelyn|Continue to Evelyn/.test(lander) || (await page.getByTestId('button-evelyn-ty-retry').count()) === 1, flat(lander).slice(0, 100));
  const start = apiLog.find((e) => e.path === '/api/evelyn-lander/start');
  check('Receipt gift: /start records 11’s tag, so the gift and the brief can find her', (start?.body || '').includes('"campaign":"be11-ty-evelyn"'), (start?.body || 'no call').slice(0, 120));
  await context.close();
}

const browser = await chromium.launch();
const measurements = [];
const transcripts = {};
try {
  for (const phone of PHONES) await walkBooking(browser, phone, measurements);
  await walkReceipt(browser);
  await walkConversations(browser, transcripts);
} catch (err) {
  check('walk completed', false, err instanceof Error ? err.message : String(err));
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify(measurements, null, 2));
fs.writeFileSync(path.join(OUT, 'transcripts.json'), JSON.stringify(transcripts, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${failed.length === 0 ? `ALL ${results.length} CHECKS PASS` : `${failed.length} of ${results.length} FAILED`} ===`);
for (const f of failed) console.log(`  FAIL ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
console.log(JSON.stringify(measurements));
process.exit(failed.length === 0 ? 0 : 1);
