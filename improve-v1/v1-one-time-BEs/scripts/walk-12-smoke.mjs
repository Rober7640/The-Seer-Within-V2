import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Walk for offer 12 (Lucky Numbers): the booking page at four phone sizes, the shared upsell pages
// with 12's copy (U1 = Evelyn's Wish Ritual + citrine bracelet, with its $30 downsell), and the
// receipt. Modelled on walk-11-smoke.mjs.
//
//   npx vite dev --port 5098 --strictPort --host 127.0.0.1   # Vite ALONE — no Express, no database
//   BASE=http://127.0.0.1:5098 node improve-v1/v1-one-time-BEs/scripts/walk-12-smoke.mjs
//
// ⛔ Ports 5096/5097 belong to another preview. This walk uses 5098 only.
//
// Booking page, at 390×844, 390×664, 375×667, 360×740:
//   measures where price, fields, bump, total and button sit on the FIRST screen, then what ticking
//   the bump does to the total and whether the page brings the button into view; a press with
//   nothing done, every field error, the press that logs and stops (arm A ?c=3), and ?cancelled=1.
//   Arm B (?c=13) once, at 390×844: the same page, and its code reaches the checkout request.
// Upsells, at 390×844, every API stubbed in the browser:
//   U1 → accept (charge aborted) → decline → the $30 downsell → its accept (aborted) → its decline
//   → U2 Path B → downsell → decline → 12's receipt; U2 Path A (has the citrine); a buyer with no
//   ?fn=; and 11's U1 as the CONTROL: a decline there goes straight to the soft decline, no downsell.
// Receipt: each state, stubbed, with the 15-minute Evelyn gift (operator 2026-11-03): the card on a
//   verified order (login link, prefilled signup, delivered line), none when the handoff fails, none
//   on the fallback, and the voucher's link on the real lander under 12's tag.
//
// Scans every rendered page for: tarot, lava, journey, energy, clearing, our conversation, a win or
// a sum, blank merge tokens, "undefined", NaN. Records page errors.
//
// ⛔ SAFETY. Refuses a non-local BASE. Every /api call is served from the stubs below or ABORTED
// and logged — the charge, fallback-checkout and shipping included. Every other host is aborted,
// except Google Fonts. BACKEND_CHECKOUT_LIVE stays false, so the booking button logs and stops.
//
// Screenshots + measurements.json + transcripts.json →
//   improve-v1/v1-one-time-BEs/docs/12/booking-page/screens/

const BASE = (process.env.BASE || 'http://127.0.0.1:5098').replace(/\/$/, '');
const SPEED = Number(process.env.SPEED || 12);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../docs/12/booking-page/screens');
const BOOKING = '/numerology/lucky-numbers';
const SUCCESS = '/numerology/lucky-numbers/success';
const PHONES = [
  { width: 390, height: 844 },
  { width: 390, height: 664 },
  { width: 375, height: 667 },
  { width: 360, height: 740 },
];
const CHAT_VIEWPORT = { width: 390, height: 844 };

if (!['localhost', '127.0.0.1', '::1'].includes(new URL(BASE).hostname)) {
  console.error(`Refusing to walk ${BASE}: not local.`);
  process.exit(2);
}
if (['5096', '5097'].includes(new URL(BASE).port)) {
  console.error(`Refusing ${BASE}: ports 5096/5097 belong to another preview.`);
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const checkoutLogs = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
};
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
const round = (n) => Math.round(n);

// Evelyn's real photo (400×400 /evelyn-avatar.png), loaded — never the broken -new.png screenshot.
const evelynPhotoOk = (page, testId) =>
  page.getByTestId(testId).first().evaluate((img) =>
    img.complete && img.naturalWidth === 400 && img.naturalHeight === 400 && img.getAttribute('src') === '/evelyn-avatar.png')
    .catch(() => false);
// On the upsell chats: exactly one small photo per run of hers, beside her LATEST row of that run.
const chatAvatarOk = (page) =>
  page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-testid^="message-"]')];
    const photos = document.querySelectorAll('[data-testid="img-bubble-evelyn"]');
    const last = rows[rows.length - 1];
    return photos.length >= 1 && !!last && !last.dataset.testid.startsWith('message-user-') &&
      !!last.querySelector('[data-testid="img-bubble-evelyn"]') &&
      photos[0].getAttribute('src') === '/evelyn-avatar.png';
  });

// ── What no rendered page may say ──
const BANNED = [
  ['tarot', /\btarot\b/i],
  ['lava', /\blava\b|volcan/i],
  ['win or sum', /jackpot|lottery|\bcheque\b|\bwealth\b|abundance/i],
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
  email: 'walk12@example.test',
  offer: 'lucky-numbers',
  funnel: null,
  bucket: null,
  personName: null,
  upsell1PriceCents: 4700,
  upsell2PriceCents: 4700,
  upsell2DownsellCents: 3000,
  hasSavedCard: true,
  // 12's own U1 product: what the real /upsell/user-data returns for a lucky-numbers session.
  upsell1Product: 'be_citrine_wish_ritual',
  upsell1DownsellCents: 3000,
};
// The control: 11's session, exactly as the server returns it (no upsell1Product key).
const ELEVEN_SESSION = (({ upsell1Product, upsell1DownsellCents, ...rest }) => ({ ...rest, offer: 'unsent-letter' }))(BASE_SESSION);
const ADDRESS = { name: 'Sarah Walk', line1: '14 Rosewood Avenue', city: 'Austin', state: 'TX', postal: '78701', country: 'US' };
const SESSIONS = {
  cs_test_walk12_u1: { ...BASE_SESSION, upsellPurchased: false, hasShipping: false, shipping: null },
  cs_test_walk12_pathA: { ...BASE_SESSION, upsellPurchased: true, hasShipping: true, shipping: ADDRESS },
  cs_test_walk12_noname: { ...BASE_SESSION, firstName: 'Friend', upsellPurchased: false, hasShipping: false, shipping: null },
  cs_test_walk11_control: { ...ELEVEN_SESSION, upsellPurchased: false, hasShipping: false, shipping: null },
};
const order = (o = {}) => ({
  order: { offer: 'lucky-numbers', offerNumber: '12', status: 'paid', firstName: 'Sarah', bumpPurchased: false, deliveredAt: null, deliveryHours: 24, ...o },
});
// POST /api/backend/lucky-numbers/gift-handoff, as walk-11 stubs 11's.
const GIFTS = {
  cs_test_walk12_u1: [200, { mode: 'login', token: 'walk-token' }],
  cs_receipt_plain: [200, { mode: 'login', token: 'walk-token' }],
  cs_receipt_bump: [200, { mode: 'signup', email: 'sarah@example.com', firstName: 'Sarah' }],
  cs_receipt_delivered: [200, { mode: 'login', token: 'walk-token' }],
  cs_receipt_noname: [500, { error: 'Failed to build the handoff' }],
};
const ORDERS = {
  cs_test_walk12_u1: [200, order()],
  cs_receipt_plain: [200, order()],
  cs_receipt_bump: [200, order({ bumpPurchased: true })],
  cs_receipt_delivered: [200, order({ deliveredAt: '2026-11-02T10:00:00Z' })],
  cs_receipt_noname: [200, order({ firstName: null })],
  cs_receipt_other: [404, { error: 'Order not found' }],
};

// Every Evelyn bubble, as it appears, keyed by the page it appeared on. A MutationObserver rather
// than a read at the end: the last bubbles of each page are followed at once by a navigation.
async function recordBubbles(context, bubbleLog) {
  await context.exposeBinding('__walk12Bubble', ({ page }, text) => {
    bubbleLog.push({ path: new URL(page.url()).pathname, text });
  });
  await context.addInitScript(() => {
    const seen = new WeakSet();
    const scan = () => {
      for (const el of document.querySelectorAll('[data-testid^="message-bot-"]')) {
        if (seen.has(el)) continue;
        seen.add(el);
        window.__walk12Bubble((el.innerText || '').replace(/\s+/g, ' ').trim());
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
    if (url.pathname === '/api/backend/lucky-numbers/gift-handoff') {
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
  page.on('console', async (m) => {
    consoleLog?.push(m.text());
    // The preview log's object, in full (text() truncates it): the request the button would send.
    if (m.text().includes('would checkout')) {
      const obj = await m.args()[1]?.jsonValue().catch(() => null);
      if (obj) checkoutLogs.push(obj);
    }
  });
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
  const { width, height } = phone;
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
  check(`Booking ${tag}: Evelyn's photo beside her quote`, await evelynPhotoOk(page, 'img-booking-evelyn'));

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
  // 12's title is the operator's full sentence: it wraps. Recorded, not tested.
  console.log(`   ${tag}: title ${titleLines} lines`);
  check(`${tag}: the headline is the operator's`, flat(await page.locator('h1').innerText()).startsWith('Give me one evening'));
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
  check(`${tag}: the button logs and stops`, log.includes('lucky-numbers') && !page.url().includes('stripe'), log.slice(0, 120));
  const req = checkoutLogs.at(-1);
  check(`${tag}: arm A's ?c=3 reaches the checkout request`, req?.offer === 'lucky-numbers' && req?.letterCode === '3', JSON.stringify(req));
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
    buttonTop: first.button?.top,
    buttonBottom: first.button?.bottom,
    buttonOnFirstScreen: onScreen(first.button, height),
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

// ════════════════════════ Arm B lands on the same page ════════════════════════
async function walkArmB(browser) {
  const consoleLog = [];
  const { context, page } = await newContext(browser, { width: 390, height: 844 }, [], consoleLog);
  await page.goto(`${BASE}${BOOKING}?c=13&fn=Sarah`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByTestId('button-checkout').waitFor({ timeout: 60000 });
  check('Arm B (?c=13): the same headline', flat(await page.locator('h1').innerText()).startsWith('Give me one evening'));
  await page.getByTestId('input-birth-name').fill('Sarah Jane Miller');
  await page.getByTestId('input-dob-month').fill('03');
  await page.getByTestId('input-dob-day').fill('14');
  await page.getByTestId('input-dob-year').fill('1961');
  await page.getByTestId('button-checkout').click({ force: true });
  await page.waitForTimeout(300);
  const log = consoleLog.filter((l) => l.includes('would checkout')).join(' ');
  const req = checkoutLogs.at(-1);
  check('Arm B: ?c=13 reaches the checkout request', req?.offer === 'lucky-numbers' && req?.letterCode === '13', JSON.stringify(req));
  scan('Arm B booking', await page.locator('body').innerText());
  await page.screenshot({ path: path.join(OUT, 'booking-armB-390x844.png') });
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
  // U1 (with its downsell) → U2 Path B → the receipt.
  {
    const apiLog = [];
    const bubbleLog = [];
    const { context, page } = await newContext(browser, CHAT_VIEWPORT, apiLog, null, bubbleLog);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const bubblesOn = (pathname) => [...new Set(bubbleLog.filter((b) => b.path === pathname).map((b) => b.text))];

    await page.goto(`${BASE}/offers/upsell/welcome1?session_id=cs_test_walk12_u1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('page-upsell').waitFor({ timeout: 60000 });
    await page.getByText("there's one thing your reading can't do for you", { exact: false }).last().waitFor({ timeout: 90000 });
    await page.screenshot({ path: path.join(OUT, 'u1-1-confirmation.png') });
    // "maybe": the middle reply must reach its own branch, not the default.
    check('U1: reached the CTA', await driveTo(page, 'button-upsell-accept', () => 'maybe'));
    await page.waitForTimeout(400);
    const body = await page.locator('body').innerText();
    const u1Bubbles = bubblesOn('/offers/upsell/welcome1');
    check('U1: the "maybe" reply reached its own branch', u1Bubbles.includes("Most women have one. It's just gone quiet."));
    check('U1: the price comes from the server: "Your Wish Ritual is $47, Sarah."', u1Bubbles.includes('Your Wish Ritual is $47, Sarah.'));
    // U1's copy shows the citrine bracelet (upsellCopy/luckyNumbers.ts stoneImage, unit-tested there).
    const u1Images = await page.locator('[data-testid^="message-image-"]').evaluateAll((els) =>
      els.map((el) => (el.tagName === 'IMG' ? el.getAttribute('src') : el.querySelector('img')?.getAttribute('src')) || ''));
    check('U1: the citrine bracelet picture, never lava', u1Images.length === 1 && /citrine-wish-bracelet/.test(u1Images[0]) && !/lava/i.test(u1Images[0]), u1Images.join(', '));
    check('U1: the reassurance line is "Take your time."', body.includes('Take your time.') && !body.includes('This is your journey'));
    check('U1: accept label is 12’s', flat(await page.getByTestId('text-accept-button').innerText()) === 'Yes, do my Wish Ritual');
    check('U1: no sideways scroll', await noSideScroll(page));
    check('U1: header shows Evelyn — photo and name', await evelynPhotoOk(page, 'img-header-evelyn') &&
      flat(await page.getByTestId('text-header-name').innerText()) === 'Evelyn Cross');
    check('U1: her photo sits beside her latest bubble', await chatAvatarOk(page));
    const u1Cta = await measure(page, 'container-upsell-cta');
    check('U1: CTA on screen', onScreen(u1Cta, CHAT_VIEWPORT.height), JSON.stringify(u1Cta));
    await page.screenshot({ path: path.join(OUT, 'u1-2-cta.png') });
    scan('U1 at the CTA', body);

    // Accept: the charge names the Wish Ritual, full price. The walk aborts it.
    await page.getByTestId('button-upsell-accept').click();
    await page.getByText('Something went wrong', { exact: false }).last().waitFor({ timeout: 30000 }).catch(() => {});
    const charge = apiLog.find((e) => e.path === '/api/backend/upsell/charge');
    const chargeBody = JSON.parse(charge?.body || '{}');
    check('U1: accept charges be_citrine_wish_ritual at full price (aborted by the walk)',
      !!charge?.aborted && chargeBody.product === 'be_citrine_wish_ritual' && !('tier' in chargeBody), charge?.body ?? 'no call');

    // Decline → the downsell.
    await page.getByTestId('button-upsell-decline').waitFor({ state: 'visible', timeout: 30000 });
    await page.getByTestId('button-upsell-decline').click();
    await page.getByTestId('button-upsell2-downsell-accept').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(400);
    const downBody = await page.locator('body').innerText();
    check('U1 downsell: "I\'ll do it for $30 instead." from {downsellPrice}', bubblesOn('/offers/upsell/welcome1').includes("I'll do it for $30 instead."));
    check('U1 downsell: the button says $30, from the token', flat(await page.getByTestId('text-accept-downsell').innerText()) === 'Yes, do my Wish Ritual for $30');
    check('U1 downsell: the price note names the bracelet (priceNoteItem)', downBody.includes('$30 includes charged citrine bracelet + free shipping'));
    check('U1 downsell: decline label', flat(await page.getByTestId('text-decline-downsell').innerText()) === 'No thanks, just my reading');
    check('U1 downsell: no reassurance line above it (empty on purpose)', !/manifestation energy/i.test(downBody));
    check('U1 downsell: still on welcome1', new URL(page.url()).pathname === '/offers/upsell/welcome1');
    const downCta = await measure(page, 'container-upsell2-downsell-cta');
    check('U1 downsell: its button on screen', onScreen(downCta, CHAT_VIEWPORT.height), JSON.stringify(downCta));
    await page.screenshot({ path: path.join(OUT, 'u1-3-downsell.png') });
    scan('U1 at the downsell', downBody);

    // Downsell accept: the same product, tier downsell. Aborted.
    const before = apiLog.length;
    await page.getByTestId('button-upsell2-downsell-accept').click();
    await page.getByTestId('button-upsell2-downsell-decline').waitFor({ state: 'visible', timeout: 30000 });
    const dCharge = apiLog.slice(before).find((e) => e.path === '/api/backend/upsell/charge');
    const dBody = JSON.parse(dCharge?.body || '{}');
    check('U1 downsell: accept charges be_citrine_wish_ritual on the downsell tier (aborted)',
      !!dCharge?.aborted && dBody.product === 'be_citrine_wish_ritual' && dBody.tier === 'downsell', dCharge?.body ?? 'no call');
    check('U1 downsell: her reply bubble names $30', (await page.locator('[data-testid^="message-user-"]').allInnerTexts()).map(flat).includes('Yes, do my Wish Ritual for $30'));

    await page.getByTestId('button-upsell2-downsell-decline').click();
    await page.waitForURL(/\/offers\/upsell\/welcome2\?session_id=cs_test_walk12_u1/, { timeout: 60000 });
    check('U1 → welcome2 with the same session', true);
    check('U1: ends on 12’s soft decline', bubblesOn('/offers/upsell/welcome1').at(-1) === 'Take care of yourself, dear.', bubblesOn('/offers/upsell/welcome1').at(-1));

    await page.getByTestId('page-upsell2').waitFor({ timeout: 60000 });
    check('U2·B: reached the CTA', await driveTo(page, 'button-upsell2-accept'));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, 'u2b-1-cta.png') });
    scan('U2·B at the CTA', await page.locator('body').innerText());
    check('U2·B: no sideways scroll', await noSideScroll(page));
    const u2b = bubblesOn('/offers/upsell/welcome2');
    check('U2·B: opens on 12’s Path B', u2b.some((t) => t.startsWith("Sarah... that's your call")));
    check('U2·B: never names the citrine bracelet', !u2b.some((t) => /your citrine|citrine bracelet|second bracelet|one wish/i.test(t)));
    check('U2·B: no circuit or Path A line', !u2b.some((t) => /complete circuit|holds your one wish/.test(t)));

    await page.getByTestId('button-upsell2-decline').click();
    await page.getByTestId('button-upsell2-downsell-decline').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(400);
    const downsellBody = await page.locator('body').innerText();
    check('U2·B: the downsell line is 12’s', downsellBody.includes('Same eight stones. Just prepared differently.') && !/manifestation energy/i.test(downsellBody));
    check('U2·B: decline label is 12’s', flat(await page.getByTestId('text-decline-downsell').innerText()) === 'No thanks, just my numbers');
    check('U2·B: the downsell button keeps V1 U2’s words', flat(await page.getByTestId('text-accept-downsell').innerText()) === 'Yes, send it to me for $30');
    await page.screenshot({ path: path.join(OUT, 'u2b-2-downsell.png') });
    scan('U2·B at the downsell', downsellBody);
    await page.getByTestId('button-upsell2-downsell-decline').click();
    await page.waitForURL((u) => u.pathname === SUCCESS, { timeout: 60000 });
    check('U2·B: ends on 12’s soft decline', bubblesOn('/offers/upsell/welcome2').at(-1) === "Take care. And remember your promise: turn up, don't chase.", bubblesOn('/offers/upsell/welcome2').at(-1));
    check('U2·B → 12’s receipt with ?s=', new URL(page.url()).searchParams.get('s') === 'cs_test_walk12_u1', page.url().replace(BASE, ''));
    await page.getByTestId('card-thankyou-lucky-numbers').waitFor({ timeout: 30000 });
    check('The chain ends on her own receipt', flat(await page.getByTestId('text-delivery-title').innerText()) === 'Sarah — your lucky numbers are worked out');

    check('U1/U2·B: no Claude reading call', !apiLog.some((e) => e.path === '/api/upsell2/reading'));
    check('U1/U2·B: no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
    transcripts.u1 = bubblesOn('/offers/upsell/welcome1');
    transcripts.u2b = bubblesOn('/offers/upsell/welcome2');
    await context.close();
  }

  // U2 Path A: she took the Wish Ritual, so she has a citrine bracelet coming.
  {
    const apiLog = [];
    const { context, page } = await newContext(browser, CHAT_VIEWPORT, apiLog);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto(`${BASE}/offers/upsell/welcome2?session_id=cs_test_walk12_pathA`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('page-upsell2').waitFor({ timeout: 60000 });
    check('U2·A: reached the CTA', await driveTo(page, 'button-upsell2-accept'));
    await page.waitForTimeout(400);
    const a = await texts(page);
    check('U2·A: opens on 12’s Path A', a.some((t) => t.startsWith('Sarah... both are booked.')));
    check('U2·A: names the second bracelet head-on', a.some((t) => t.includes("I'm about to offer you a second bracelet")));
    check('U2·A: says what each bracelet does', a.some((t) => t.includes('your citrine on your left holds your one wish, and this one on your right gets you out to meet it')));
    check('U2·A: no lava line', !a.some((t) => /lava|complete circuit/i.test(t)));
    check('U2·A: header shows Evelyn — photo and name', await evelynPhotoOk(page, 'img-header-evelyn') &&
      flat(await page.getByTestId('text-header-name').innerText()) === 'Evelyn Cross');
    check('U2·A: her photo sits beside her latest bubble', await chatAvatarOk(page));
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
    await page.goto(`${BASE}/offers/upsell/welcome1?session_id=cs_test_walk12_noname`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByText("It's done, dear", { exact: false }).last().waitFor({ timeout: 60000 }).catch(() => {});
    const t = await texts(page);
    check('No ?fn=: U1 opens "It\'s done, dear"', t.some((x) => x.startsWith("It's done, dear.")), t[0]);
    check('No ?fn=: never "Friend"', !t.some((x) => /\bFriend\b/.test(x)));
    await context.close();
  }

  // CONTROL — 11's U1, on the same engine: the downsell must stay OFF. A decline goes straight to
  // 11's soft decline and on to welcome2, the lava picture still shows, and the charge body is lean.
  {
    const apiLog = [];
    const bubbleLog = [];
    const { context, page } = await newContext(browser, CHAT_VIEWPORT, apiLog, null, bubbleLog);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    let downsellSeen = false;
    await page.goto(`${BASE}/offers/upsell/welcome1?session_id=cs_test_walk11_control`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('page-upsell').waitFor({ timeout: 60000 });
    check('Control (11): reached the CTA', await driveTo(page, 'button-upsell-accept'));
    check('Control (11): the lava picture still shows (stoneImage unset)', (await page.locator('[data-testid^="message-image-"]').count()) === 1);
    await page.getByTestId('button-upsell-accept').click();
    await page.getByText('Something went wrong', { exact: false }).last().waitFor({ timeout: 30000 }).catch(() => {});
    const charge = apiLog.find((e) => e.path === '/api/backend/upsell/charge');
    check('Control (11): the charge body is the lean one, byte for byte',
      charge?.body === JSON.stringify({ checkoutSessionId: 'cs_test_walk11_control', email: 'walk12@example.test' }), charge?.body ?? 'no call');
    await page.getByTestId('button-upsell-decline').waitFor({ state: 'visible', timeout: 30000 });
    await page.getByTestId('button-upsell-decline').click();
    const watch = setInterval(async () => {
      if (await page.getByTestId('container-upsell2-downsell-cta').count().catch(() => 0)) downsellSeen = true;
    }, 100);
    await page.waitForURL(/\/offers\/upsell\/welcome2\?session_id=cs_test_walk11_control/, { timeout: 60000 }).catch(() => {});
    clearInterval(watch);
    const u1 = [...new Set(bubbleLog.filter((b) => b.path === '/offers/upsell/welcome1').map((b) => b.text))];
    check('Control (11): a decline never shows a downsell', !downsellSeen && !u1.some((t) => /meet you halfway/.test(t)));
    check('Control (11): straight to 11’s soft decline, then welcome2',
      u1.at(-1) === 'Take care of yourself, dear. And leave your phone where it is.' && new URL(page.url()).pathname === '/offers/upsell/welcome2', u1.at(-1));
    check('Control (11): no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
    await context.close();
  }

  for (const [key, list] of Object.entries(transcripts)) {
    check(`${key}: ${list.length} bubbles, "Sarah" merged, no "Friend"`,
      list.length > 0 && list.some((t) => t.includes('Sarah')) && list.every((t) => !/\bFriend\b/.test(t)));
    scan(`${key} every bubble`, list.join('\n'));
    const wins = list.filter((t) => /\bwin\b/i.test(t) && !/won't win|Not to win/.test(t));
    check(`${key}: "win" only ever in a denial`, wins.length === 0, wins.slice(0, 2).join(' | '));
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
    await page.locator('[data-testid="card-thankyou-lucky-numbers"], [data-testid="card-receipt-fallback"]').first().waitFor({ timeout: 30000 });
    return page.locator('body').innerText();
  };

  let body = await open('cs_receipt_plain');
  check('Receipt: names her, the title and the confirmed subject',
    body.includes('Thank you, Sarah.') && body.includes('Sarah — your lucky numbers are worked out') && body.includes('Your Lucky Numbers reading is confirmed'));
  check('Receipt: 12-T1’s lines', body.includes('You asked for your own numbers, and that was the right call.') && body.includes('Leave your PIN as it is till your reading comes.'));
  check('Receipt: says within 24 hours', body.includes('within 24 hours'));
  check('Receipt: no P.S. without the bump', (await page.getByTestId('text-bump-ps').count()) === 0);
  check('Receipt: no price', !/\$\d/.test(body));
  check('Receipt: asks for this offer', apiLog.some((e) => e.query === '?offer=lucky-numbers'));
  check('Receipt: no sideways scroll', await noSideScroll(page));
  scan('Receipt', body);
  // The gift (12-T1-gift): shows for a verified order, under the receipt.
  await page.getByTestId('card-numbers-gift').waitFor({ timeout: 10000 });
  body = await page.locator('body').innerText();
  check('Receipt gift: shows for a verified order', (await page.getByTestId('card-numbers-gift').count()) === 1);
  check('Receipt gift: asks 12’s own handoff with this session',
    apiLog.some((e) => e.method === 'POST' && e.path === '/api/backend/lucky-numbers/gift-handoff' && e.sid === 'cs_receipt_plain'));
  check('Receipt gift: the working-out line', flat(await page.getByTestId('text-gift-line').innerText()) === 'While I work out your numbers, come and talk to me. The first 15 minutes are on me.');
  check('Receipt gift: the voucher, with no price', flat(body).includes('15 minutes of free chat') && flat(body).includes('with Evelyn Cross') && !/\$\d/.test(body));
  check('Receipt gift: the button', flat(await page.getByTestId('link-numbers-gift').innerText()) === 'Claim my 15 free minutes →');
  check('Receipt gift: her headline, with her name', flat(await page.getByTestId('text-gift-headline').innerText()) === 'Come and talk to me, Sarah.');
  check('Receipt gift: three things to bring, none asks for a number',
    (await page.getByTestId('list-gift-bring').locator('li').count()) === 3 &&
    !/\b(number|numbers|pin|date|days?)\b/i.test(await page.getByTestId('list-gift-bring').innerText()));
  check('Receipt gift: the note under the button', flat(await page.getByTestId('text-gift-note').innerText()) === 'A private chat, just you and me. Your 15 minutes are already set aside.');
  check('Receipt gift: Evelyn’s real photo loads (not the old screenshot file)',
    await page.getByTestId('img-gift-evelyn').evaluate((img) => img.complete && img.naturalWidth === 400 && img.naturalHeight === 400 && img.getAttribute('src') === '/evelyn-avatar.png'));
  const loginHref = await page.getByTestId('link-numbers-gift').getAttribute('href');
  check('Receipt gift: a login link under 12’s tag and UTM',
    loginHref === '/evelyn?token=walk-token&campaign=be12-ty-evelyn&utm_source=be12_ty&utm_medium=thankyou&utm_campaign=evelyn_15', loginHref);
  check('Receipt gift: sits under the receipt',
    await page.evaluate(() => {
      const r = document.querySelector('[data-testid="card-thankyou-lucky-numbers"]');
      const g = document.querySelector('[data-testid="card-numbers-gift"]');
      return !!r && !!g && r.getBoundingClientRect().bottom <= g.getBoundingClientRect().top;
    }));
  check('Receipt gift: no sideways scroll', await noSideScroll(page));
  scan('Receipt gift', body);
  await page.screenshot({ path: path.join(OUT, 'receipt-1-plain.png'), fullPage: true });

  body = await open('cs_receipt_bump');
  check('Receipt: the bump P.S.', flat(await page.getByTestId('text-bump-ps').innerText()) === "P.S. You added The Full Year. It's the last page of your reading: every lucky day you've got in 2027, on one calendar page.");
  await page.getByTestId('card-numbers-gift').waitFor({ timeout: 10000 });
  const signupHref = await page.getByTestId('link-numbers-gift').getAttribute('href');
  check('Receipt gift: a new buyer gets a prefilled signup', signupHref.startsWith('/evelyn?campaign=be12-ty-evelyn&') && signupHref.includes('email=sarah%40example.com') && signupHref.includes('name=Sarah'), signupHref);
  await page.screenshot({ path: path.join(OUT, 'receipt-2-bump.png'), fullPage: true });

  body = await open('cs_receipt_delivered');
  check('Receipt: delivered variant', body.includes("Your numbers are worked out, and your reading's been sent.") && !body.includes('on my table'));
  await page.getByTestId('card-numbers-gift').waitFor({ timeout: 10000 });
  body = await page.locator('body').innerText();
  check('Receipt gift: delivered, it still works and says nothing about working them out',
    flat(await page.getByTestId('text-gift-line').innerText()) === "Once you've read your numbers, come and talk to me. The first 15 minutes are on me." && !body.includes('While I work out'));
  await page.screenshot({ path: path.join(OUT, 'receipt-3-delivered.png'), fullPage: true });

  body = await open('cs_receipt_noname');
  check('Receipt: no name is "dear"', body.includes('Thank you, dear.') && body.includes('dear — your lucky numbers are worked out'));
  await page.waitForResponse((r) => r.url().includes('gift-handoff')).catch(() => {});
  await page.waitForTimeout(300);
  check('Receipt gift: a failed handoff shows no voucher', (await page.getByTestId('card-numbers-gift').count()) === 0);

  body = await open('cs_receipt_other');
  check('Receipt: another offer’s session gets the fallback', (await page.getByTestId('card-receipt-fallback').count()) === 1 && !body.includes('within 24 hours') && body.includes('Your Lucky Numbers reading is confirmed'));
  scan('Receipt fallback', body);
  await page.waitForTimeout(300);
  check('Receipt gift: never on the fallback', (await page.getByTestId('card-numbers-gift').count()) === 0 && !/15 minutes|free chat|Talk to Evelyn|Claim my|Come and talk/i.test(body));
  await page.screenshot({ path: path.join(OUT, 'receipt-4-fallback.png'), fullPage: true });

  await open('');
  check('Receipt: no ?s= gets the fallback', (await page.getByTestId('card-receipt-fallback').count()) === 1);
  check('Receipt gift: the fallback never asks for a handoff for another offer’s session',
    !apiLog.some((e) => e.path === '/api/backend/lucky-numbers/gift-handoff' && e.sid === 'cs_receipt_other'));
  check('Receipt: no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  // The voucher's link, on the real lander: a thank-you arrival, straight to Evelyn, no quiz.
  await page.goto(`${BASE}/evelyn?campaign=be12-ty-evelyn&utm_source=be12_ty&email=sarah%40example.com`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => /Connecting you with Evelyn|Continue to Evelyn/.test(document.body.innerText) || document.querySelector('[data-testid="button-evelyn-ty-retry"]'), null, { timeout: 30000 }).catch(() => {});
  const lander = await page.locator('body').innerText();
  check('Receipt gift: the lander treats it as a thank-you arrival, no quiz',
    /Connecting you with Evelyn|Continue to Evelyn/.test(lander) || (await page.getByTestId('button-evelyn-ty-retry').count()) === 1, flat(lander).slice(0, 100));
  const start = apiLog.find((e) => e.path === '/api/evelyn-lander/start');
  check('Receipt gift: /start records 12’s tag, so the gift and the brief can find her', (start?.body || '').includes('"campaign":"be12-ty-evelyn"'), (start?.body || 'no call').slice(0, 120));
  await context.close();
}

const browser = await chromium.launch();
const measurements = [];
const transcripts = {};
try {
  for (const phone of PHONES) await walkBooking(browser, phone, measurements);
  await walkArmB(browser);
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
