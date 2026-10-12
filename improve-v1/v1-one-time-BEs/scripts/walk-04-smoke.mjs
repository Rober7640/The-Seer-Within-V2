import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Smoke walk for offer 04 (The Turn — a tea-leaf reading at one fixed price under a $35 / $45
// split test; operator 2026-10-11: no price hike, the day ladder is gone). Workflow step A8.
//
//   BASE=http://localhost:5094 LIVE_BASE=http://localhost:5095 \
//     node improve-v1/v1-one-time-BEs/scripts/walk-04-smoke.mjs [evidence-folder]
//
// Two Vite dev servers, CLIENT ONLY (no Express, no .env, no database):
//   BASE       `npx vite dev --port 5094` — the shipped default: checkout is DARK, so the
//              booking buttons log `[preview] would checkout {…}` and stop.
//   LIVE_BASE  `VITE_BACKEND_CHECKOUT_LIVE=true npx vite dev --port 5095` — used ONLY to prove the
//              409 price_changed round-trip, which a dark build never reaches (it never POSTs).
//              Its checkout POST is STUBBED here: 409 once, then a 200 pointing at a local stub
//              page. Nothing reaches Stripe — there is no server behind it at all.
//
// ⛔ SAFETY. Refuses a non-local BASE/LIVE_BASE unless ALLOW_REMOTE=1. Every /api request is
// answered by a stub in this file; anything else that isn't the dev server is aborted (no
// Facebook, PostHog, Clarity, GTM, Google Fonts). It buys nothing.
//
// Proves, at 390×844 (phone) and 1280×800 (desktop):
//   booking page  /offers/wiccan/tea-reading
//     - headline, image, price line, the ONE tick and the button sit inside the first 844px
//       (phone), unticked — and prints each one's measured y
//     - the button is aria-disabled until the tick, and a tap before then charges nothing
//     - the bump is NOT on the page before the tick, and is never pre-checked; ticked, it reads the
//       Double Turning word for word (intangible — operator 2026-10-11)
//     - ⛔ NO CUP PICK, ticked or not (operator 2026-10-11: the server draws the cup) — no picker,
//       no cup names, no "which sounds like" question
//     - only her arm's price, $12.77 and their total ever appear as prices; NO ladder copy
//       ("today's price", "went up", the drying-leaves reason-why section)
//     - the price request carries her visitor id (?subject=)
//     - ?arm=A / ?arm=B shows $35 / $45 (each screenshotted on the first screen), and the click
//       carries quotedArm = the arm shown
//     - the click logs [preview] with offer/treatment/bump/quotedArm/fn/c and NO price, NO cup
//     - a price that fails to load shows a retry line and keeps the button disabled; retry works
//     - ?cancelled=1 says nothing has been taken
//     - LIVE_BASE: the checkout's expSubject is the SAME id the price request carried; 409
//       price_changed shows the server's price + "press again", and the re-press sends its arm
//   booking chat  /offers/wiccan/tea-reading/chat
//     - opens on the typing indicator; one line at a time; the long line + card ≥ 1.2s
//     - three statements, price third ("Yes — I'll pay $35, once." — no reason-why); button absent
//       until all ticked
//     - after the card: "Good." → "One more thing before I start." → the bump turn, BELOW the card;
//       ⛔ no cup question, no quick replies, no bubble of hers
//     - the bump turn is the Double Turning question, ending "?"; "Yes, double the strength" /
//       "No, just my reading"
//     - both bump answers log [preview] with treatment chat, and NO cup
//     - a refresh resumes without greeting her back; ?cancelled=1 says nothing has been taken
//   receipt  /offers/wiccan/tea-reading/success?s=…   (order lookup STUBBED)
//     - bump / no bump × name / no name; the poll rides out two 402s; no ?s= → fallback
//     - the Double Turning P.S. for bump buyers only — no link, "nothing extra to look out for"
//     - no price anywhere on the receipt; ⛔ no "Your reading follows …" line and no cup's name,
//       even when the (stubbed) order still carries a `cup`
//   /still-cup  the retired Still Cup page is GONE (the bump is intangible) — nothing renders it
//   V1 funnel  /  — still renders (rule 5: it is live)
//
// Screenshots → the folder given as the first argument (relative to the repo root), else
// improve-v1/evidence/04-tea-reading-2026-10-11/

const BASE = (process.env.BASE || 'http://localhost:5094').replace(/\/$/, '');
const LIVE_BASE = (process.env.LIVE_BASE || 'http://localhost:5095').replace(/\/$/, '');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const OUT = process.argv[2]
  ? path.resolve(REPO, process.argv[2])
  : path.resolve(HERE, '../../evidence/04-tea-reading-2026-10-11');
const ROOT = '/offers/wiccan/tea-reading';

for (const b of [BASE, LIVE_BASE]) {
  const host = new URL(b).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(host) && process.env.ALLOW_REMOTE !== '1') {
    console.error(`Refusing to walk ${b}: not local. Set ALLOW_REMOTE=1 if you really mean it.`);
    process.exit(2);
  }
}
fs.mkdirSync(OUT, { recursive: true });

const ARMS = { A: 3500, B: 4500 };
const label = (cents) => (cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`);
const BUMP_CENTS = 1277;
// The Double Turning (operator 2026-10-11), word for word — 04-C1 v2, 04-C2 and 04-T1.
const BUMP_PAGE = {
  label: 'Yes, double the strength of my reading',
  note: 'Evelyn reads your cup a second time and puts twice the strength into your reading. Same reading, same 21 days. It just works twice as hard: the quiet days hold better, and your one message lands harder.',
};
const BUMP_CHAT = {
  body: 'I can read your cup a second time, to put twice the strength into your reading. Same reading, same twenty-one days, just working twice as hard for you. Shall I do that?',
  accept: 'Yes, double the strength',
  decline: 'No, just my reading',
};
const RECEIPT_PS = "P.S. You added a Double Turning. I'll read your cup a second time before I send your reading. There's nothing extra to look out for.";

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
};
const info = (msg) => console.log(`[info] ${msg}`);
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dollars = (text) => [...new Set(text.match(/\$\d+(?:,\d{3})*(?:\.\d{2})?/g) ?? [])];
// The three interpretations' names and the old pick's words — none may appear on any 04 screen.
const CUP_NAMES = /Turned Handle|Divided Rim|Sunken Leaf/;
const PICK_WORDS = /Which sounds like|which cup is yours|you choose|decides which reading/i;
// The retired day ladder's copy (operator 2026-10-11: no price hike) — none may appear on any 04 screen.
const LADDER_COPY = /today'?s price|today'?s rung|\brungs?\b|price ladder|went up|goes up|as the leaves dry|takes more of your night/i;
/** No picker of any kind on the page: neither the page's fieldset nor the chat's quick replies. */
async function noCupPick(page) {
  const pickers = await page.locator('[data-testid="cup-pick"], [data-testid^="cup-reply"], [data-testid^="cup-turned"], [data-testid^="cup-divided"], [data-testid^="cup-sunken"], [data-testid="cup-replies"]').count();
  const text = await page.locator('body').innerText();
  return { ok: pickers === 0 && !CUP_NAMES.test(text) && !PICK_WORDS.test(text), pickers, names: text.match(CUP_NAMES)?.[0] ?? null, words: text.match(PICK_WORDS)?.[0] ?? null };
}

// ── the stubbed API ───────────────────────────────────────────────────────────────────────
const ORDER = {
  reference: 'SMOKE411',
  offer: 'tea-reading',
  offerNumber: '04',
  email: 'smoke@example.com',
  status: 'paid',
  deliveryHours: 24,
  deliveredAt: null,
  readingCents: 3500,
  bumpProductKey: null,
  bumpCents: 0,
};
const ORDERS = {
  cs_test_04_bump_named: { ...ORDER, firstName: 'Sarah', bumpPurchased: true, bumpCents: 1277, amountCents: 4777, bumpProductKey: 'double_turning', cup: 'sunken-leaf' },
  cs_test_04_nobump_named: { ...ORDER, firstName: 'Sarah', bumpPurchased: false, amountCents: 3500, cup: 'divided-rim' },
  cs_test_04_bump_noname: { ...ORDER, firstName: null, bumpPurchased: true, bumpCents: 1277, amountCents: 4777, bumpProductKey: 'double_turning', cup: 'turned-handle' },
  cs_test_04_nobump_noname: { ...ORDER, firstName: null, bumpPurchased: false, amountCents: 3500, cup: 'divided-rim' },
  cs_test_04_pending: { ...ORDER, firstName: 'Sarah', bumpPurchased: false, amountCents: 3500, cup: 'divided-rim' },
};

/** Per-context stub state, so each walk can steer the price and checkout answers. */
function makeStubs(origin) {
  const state = {
    priceMode: 'ok', // 'ok' | 'fail' | 'slow'
    priceSubjects: [], // the ?subject= each price request carried
    checkoutBodies: [],
    checkoutAnswers: [], // queue of { status, body }
    pendingCalls: 0,
  };
  const handler = async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    if (url.origin !== origin) return route.abort();

    if (url.pathname === '/__stripe_stub') {
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title><h1>Stripe stub</h1>' });
    }
    if (url.pathname === `/api/backend/offers/tea-reading/price`) {
      if (state.priceMode === 'fail') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"x"}' });
      if (state.priceMode === 'slow') await sleep(2500);
      state.priceSubjects.push(url.searchParams.get('subject'));
      // The real endpoint resolves her arm from ?subject= (a draft test ⇒ A); ?arm= is the preview.
      const asked = (url.searchParams.get('arm') || '').toUpperCase();
      const arm = asked in ARMS ? asked : 'A';
      const body = { offer: 'tea-reading', arm, cents: ARMS[arm], label: label(ARMS[arm]), ...(asked in ARMS ? { preview: true } : {}) };
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify(body) });
    }
    if (url.pathname === '/api/backend/checkout' && req.method() === 'POST') {
      state.checkoutBodies.push(req.postDataJSON());
      const answer = state.checkoutAnswers.shift() ?? { status: 400, body: { error: 'not ready', code: 'not_ready' } };
      return route.fulfill({ status: answer.status, contentType: 'application/json', body: JSON.stringify(answer.body) });
    }
    if (url.pathname.startsWith('/api/backend/order/')) {
      const id = decodeURIComponent(url.pathname.split('/').pop());
      if (url.searchParams.get('offer') !== 'tea-reading') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (id === 'cs_test_04_pending' && state.pendingCalls++ < 2) {
        return route.fulfill({ status: 402, contentType: 'application/json', body: '{"error":"This order has not been paid."}' });
      }
      if (ORDERS[id]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ order: ORDERS[id] }) });
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"Order not found."}' });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.continue();
  };
  return { state, handler };
}

async function noHorizontalScroll(page) {
  return page.evaluate(() => ({
    ok: document.documentElement.scrollWidth <= window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
}

/** Absolute page y of an element's bottom edge (scroll-independent). */
async function bottomY(locator) {
  return locator.evaluate((el) => Math.round(el.getBoundingClientRect().bottom + window.scrollY)).catch(() => null);
}

function watchPreviews(page) {
  const previews = [];
  page.on('console', async (msg) => {
    if (!msg.text().startsWith('[preview] would checkout')) return;
    const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => null)));
    previews.push(args[1] ?? null);
  });
  return previews;
}

async function waitForCount(arr, n, ms = 5000) {
  const deadline = Date.now() + ms;
  while (arr.length < n && Date.now() < deadline) await sleep(50);
}

const VIEWPORTS = [
  { label: 'phone', width: 390, height: 844 },
  { label: 'desktop', width: 1280, height: 800 },
];

const measurements = {};

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    console.log(`\n══ ${vp.label} (${vp.width}×${vp.height}) ══`);
    const shot = (name, page, opts = {}) => page.screenshot({ path: path.join(OUT, `${name}-${vp.label}.png`), ...opts });

    // ═══ 1. BOOKING PAGE (dark build) ═══
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const stubs = makeStubs(new URL(BASE).origin);
      await context.route('**/*', stubs.handler);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const previews = watchPreviews(page);

      await page.goto(`${BASE}${ROOT}?c=61&fn=Smoke`, { waitUntil: 'domcontentloaded' });
      const price = page.getByTestId('text-price');
      await price.waitFor({ timeout: 20000 }).catch(() => {});
      await page.waitForFunction(() => document.querySelector('[data-testid="figure-cup"] img')?.complete, null, { timeout: 10000 }).catch(() => {});
      await page.evaluate(() => window.scrollTo(0, 0));

      const h1 = page.locator('h1');
      check(`${vp.label}: booking renders its claim headline`, flat(await h1.innerText().catch(() => '')) === 'Your cup knows which week to speak in');
      check(`${vp.label}: arm A's $35 from the price endpoint`, flat(await price.innerText().catch(() => '')) === '$35');
      const subject = stubs.state.priceSubjects[0];
      check(`${vp.label}: the price request carries her visitor id (?subject=)`, typeof subject === 'string' && subject.length > 8, String(subject));
      const priceLine = flat(await page.getByTestId('text-price-line').innerText().catch(() => ''));
      check(`${vp.label}: the price line reads "$35 | Paid once / Your reading within 24 hours" — no "today's price"`, priceLine === '$35 Paid once Your reading within 24 hours', priceLine);
      const fullText = await page.locator('body').innerText();
      check(
        `${vp.label}: NO ladder copy anywhere on the page, and no "Why today's price" section`,
        !LADDER_COPY.test(fullText) && (await page.getByTestId('section-why-the-price').count()) === 0,
        fullText.match(LADDER_COPY)?.[0] ?? '',
      );
      check(`${vp.label}: the small print starts "Paid once · Within 24 hours"`, flat(await page.getByTestId('text-small-print').innerText()).startsWith('Paid once · Within 24 hours ·'));
      const imgOk = await page.locator('[data-testid="figure-cup"] img').evaluate((el) => el.naturalWidth > 0 && el.src.endsWith('/tea-reading/esl-cup-3x2.jpg')).catch(() => false);
      check(`${vp.label}: the letter's cup photo loads`, imgOk);

      // The first screen, unticked.
      const button = page.getByTestId('button-checkout');
      const tick = page.getByTestId('checkbox-ready');
      const ys = {
        headline: await bottomY(h1),
        image: await bottomY(page.getByTestId('figure-cup')),
        priceLine: await bottomY(page.getByTestId('text-price-line')),
        tick: await bottomY(tick),
        button: await bottomY(button),
      };
      const buttonTop = await button.evaluate((el) => Math.round(el.getBoundingClientRect().top + window.scrollY));
      measurements[vp.label] = { ...ys, buttonTop };
      info(`${vp.label}: bottom edges unticked — ${JSON.stringify(ys)}; button top ${buttonTop}px`);
      if (vp.label === 'phone') {
        const all = Object.values(ys).every((y) => y !== null && y <= vp.height);
        check(`phone: headline, image, price line, tick and button all inside the first ${vp.height}px (unticked)`, all, `button bottom ${ys.button}px`);
      } else {
        // The lock is the PHONE's first screen. Desktop keeps 09 v2's roomier masthead; recorded only.
        info(`desktop: unticked button bottom ${ys.button}px of a ${vp.height}px screen (not a lock)`);
      }

      check(`${vp.label}: button is aria-disabled before the tick`, (await button.getAttribute('aria-disabled')) === 'true');
      check(`${vp.label}: the locked hint shows`, await page.getByTestId('text-locked-hint').isVisible());
      check(`${vp.label}: no bump on the page before the tick`, (await page.getByTestId('checkbox-bump').count()) === 0);
      let pick = await noCupPick(page);
      check(`${vp.label}: no cup pick on the page (unticked) — no picker, no cup names, no question`, pick.ok, JSON.stringify(pick));
      const unticked = dollars(await page.locator('body').innerText());
      check(`${vp.label}: unticked, the only price on the page is her arm's`, unticked.length === 1 && unticked[0] === '$35', unticked.join(' '));
      let hs = await noHorizontalScroll(page);
      check(`${vp.label}: no horizontal scroll (unticked)`, hs.ok, `scrollWidth=${hs.scrollWidth}`);
      await shot('booking-unticked-first-screen', page);

      // `force`: Playwright counts aria-disabled as not enabled, but a real tap still lands (the
      // button is deliberately NOT natively disabled, so the tap can point her at the tick).
      await button.click({ force: true });
      await sleep(400);
      check(`${vp.label}: a tap before the tick charges nothing (no [preview] line)`, previews.length === 0);
      check(`${vp.label}: and points her at the tick`, (await tick.getAttribute('class')).includes('ring-2'));

      // Tick.
      await tick.locator('input').check();
      await sleep(700); // the smooth scroll back to the button
      const bump = page.getByTestId('checkbox-bump');
      const bumpBox = bump.locator('input');
      check(`${vp.label}: the bump appears after the tick`, (await bump.count()) === 1);
      check(`${vp.label}: the bump is NOT pre-checked`, (await bumpBox.count()) === 1 && !(await bumpBox.isChecked()));
      const bumpText = flat(await bump.innerText());
      check(
        `${vp.label}: the bump is the Double Turning, word for word — and no Still Cup`,
        bumpText.includes(`${BUMP_PAGE.label} · +$12.77`) && bumpText.includes(BUMP_PAGE.note) && !/still cup/i.test(await page.locator('body').innerText()),
        bumpText.slice(0, 120),
      );
      pick = await noCupPick(page);
      check(`${vp.label}: ticked, still no cup pick — the bump comes straight after the tick`, pick.ok, JSON.stringify(pick));
      check(`${vp.label}: the button is live once ticked`, (await button.getAttribute('aria-disabled')) === 'false');
      const box = await button.boundingBox();
      measurements[vp.label].tickedButtonViewport = box ? { top: Math.round(box.y), bottom: Math.round(box.y + box.height) } : null;
      measurements[vp.label].tickedButtonBottom = await bottomY(button);
      info(`${vp.label}: ticked — button at y=${box ? Math.round(box.y) : '?'}–${box ? Math.round(box.y + box.height) : '?'}px in the viewport (page bottom edge ${measurements[vp.label].tickedButtonBottom}px)`);
      check(`${vp.label}: after ticking, the button is back on screen`, !!box && box.y >= 0 && box.y + box.height <= vp.height, box ? `y=${Math.round(box.y)}` : '');
      check(`${vp.label}: total reads $35`, flat(await page.getByTestId('text-total').innerText()) === '$35');

      await button.click();
      await waitForCount(previews, 1);
      const p1 = previews[0];
      check(
        `${vp.label}: click logs [preview] — tea-reading, page, bump false, quotedArm A, fn + c, no price, no day, NO cup`,
        !!p1 && p1.offer === 'tea-reading' && p1.treatment === 'page' && p1.bump === false && p1.quotedArm === 'A' && !('quotedDay' in p1) && !('cup' in p1) && p1.firstName === 'Smoke' && p1.letterCode === '61' && p1.amountCents == null,
        JSON.stringify(p1),
      );
      check(`${vp.label}: click does not navigate`, page.url().startsWith(`${BASE}${ROOT}`));

      // Tick the bump.
      await bumpBox.check();
      check(`${vp.label}: with the bump ticked the total is $47.77`, flat(await page.getByTestId('text-total').innerText()) === '$47.77');
      const ticked = dollars(await page.locator('body').innerText()).sort();
      const allowed = new Set([label(ARMS.A), label(BUMP_CENTS), label(ARMS.A + BUMP_CENTS)]);
      check(`${vp.label}: ticked, the only prices are her arm's, $12.77 and their total`, ticked.every((d) => allowed.has(d)), ticked.join(' '));
      await button.scrollIntoViewIfNeeded();
      await shot('booking-ticked-with-bump', page);
      await shot('booking-ticked-with-bump-fullpage', page, { fullPage: true });
      await button.click();
      await waitForCount(previews, 2);
      const p2 = previews[1];
      check(`${vp.label}: the next click carries bump true, and still no cup`, !!p2 && p2.bump === true && !('cup' in p2) && p2.quotedArm === 'A', JSON.stringify(p2));

      await tick.locator('input').uncheck();
      check(`${vp.label}: unticking hides the bump and disables the button`, (await bump.count()) === 0 && (await button.getAttribute('aria-disabled')) === 'true');
      await tick.locator('input').check();
      check(`${vp.label}: re-ticking brings the bump back UNTICKED`, (await bumpBox.count()) === 1 && !(await bumpBox.isChecked()));
      hs = await noHorizontalScroll(page);
      check(`${vp.label}: no horizontal scroll (ticked)`, hs.ok, `scrollWidth=${hs.scrollWidth}`);
      measurements[vp.label].pageHeightTicked = await page.evaluate(() => document.documentElement.scrollHeight);

      // ── each arm, via ?arm= (a preview of the display only — the server honours it only while
      //    the offer is dark, and checkout never reads it) ──
      for (const arm of ['A', 'B']) {
        const p = await context.newPage();
        const pv = watchPreviews(p);
        await p.goto(`${BASE}${ROOT}?arm=${arm}&c=61&fn=Smoke`, { waitUntil: 'domcontentloaded' });
        await p.getByTestId('text-price').waitFor({ timeout: 15000 }).catch(() => {});
        await p.waitForFunction(() => document.querySelector('[data-testid="figure-cup"] img')?.complete, null, { timeout: 10000 }).catch(() => {});
        await p.evaluate(() => window.scrollTo(0, 0));
        const shown = flat(await p.getByTestId('text-price').innerText().catch(() => ''));
        const lineArm = await p.getByTestId('text-price-line').getAttribute('data-arm');
        const armButtonBottom = await bottomY(p.getByTestId('button-checkout'));
        measurements[vp.label][`arm${arm}ButtonBottom`] = armButtonBottom;
        info(`${vp.label}: ?arm=${arm} — unticked button bottom ${armButtonBottom}px`);
        if (vp.label === 'phone') check(`phone: ?arm=${arm} keeps the button inside the first ${vp.height}px (unticked)`, armButtonBottom !== null && armButtonBottom <= vp.height, `${armButtonBottom}px`);
        const armText = await p.locator('body').innerText();
        check(`${vp.label}: ?arm=${arm} — no ladder copy`, !LADDER_COPY.test(armText), armText.match(LADDER_COPY)?.[0] ?? '');
        await p.screenshot({ path: path.join(OUT, `booking-arm-${arm}-${vp.label}.png`) });
        await p.getByTestId('checkbox-ready').locator('input').check();
        const total = flat(await p.getByTestId('text-total').innerText());
        await p.getByTestId('checkbox-bump').locator('input').check();
        const totalWithBump = flat(await p.getByTestId('text-total').innerText());
        await p.getByTestId('button-checkout').click();
        await waitForCount(pv, 1);
        const pageDollars = dollars(await p.locator('body').innerText());
        const other = label(ARMS[arm === 'A' ? 'B' : 'A']);
        check(
          `${vp.label}: ?arm=${arm} shows ${label(ARMS[arm])} (total ${label(ARMS[arm])}, ${label(ARMS[arm] + BUMP_CENTS)} with the bump), sends quotedArm ${arm}, never prints ${other}`,
          shown === label(ARMS[arm]) && lineArm === arm && total === label(ARMS[arm]) && totalWithBump === label(ARMS[arm] + BUMP_CENTS) &&
            pv[0]?.quotedArm === arm && pv[0]?.bump === true &&
            pageDollars.every((d) => d === label(ARMS[arm]) || d === '$12.77' || d === label(ARMS[arm] + BUMP_CENTS)) && !pageDollars.includes(other),
          `${shown} arm=${lineArm} total=${total}/${totalWithBump} quotedArm=${pv[0]?.quotedArm} prices=${pageDollars.join(' ')}`,
        );
        await p.close();
      }

      // ── loading, then failure + retry ──
      {
        stubs.state.priceMode = 'slow';
        const p = await context.newPage();
        await p.goto(`${BASE}${ROOT}`, { waitUntil: 'domcontentloaded' });
        await p.getByTestId('price-loading').waitFor({ timeout: 5000 }).catch(() => {});
        const loadingText = await p.locator('body').innerText();
        check(`${vp.label}: while the price loads — a blank bar, no number, button disabled`, (await p.getByTestId('price-loading').count()) === 1 && dollars(loadingText).length === 0 && (await p.getByTestId('button-checkout').isDisabled()));
        await p.screenshot({ path: path.join(OUT, `booking-price-loading-${vp.label}.png`) });
        await p.close();

        stubs.state.priceMode = 'fail';
        const f = await context.newPage();
        await f.goto(`${BASE}${ROOT}`, { waitUntil: 'domcontentloaded' });
        await f.getByTestId('text-price-failed').waitFor({ timeout: 10000 }).catch(() => {});
        await f.getByTestId('checkbox-ready').locator('input').check();
        check(`${vp.label}: a failed price shows the retry line and keeps the button disabled (even ticked)`, (await f.getByTestId('text-price-failed').isVisible()) && (await f.getByTestId('button-checkout').isDisabled()));
        await f.evaluate(() => window.scrollTo(0, 0));
        await f.screenshot({ path: path.join(OUT, `booking-price-failed-${vp.label}.png`) });
        stubs.state.priceMode = 'ok';
        await f.getByTestId('button-price-retry').click();
        await f.getByTestId('text-price').waitFor({ timeout: 10000 }).catch(() => {});
        check(`${vp.label}: Try again loads the price and enables the button`, flat(await f.getByTestId('text-price').innerText().catch(() => '')) === '$35' && !(await f.getByTestId('button-checkout').isDisabled()));
        await f.close();
      }

      // ── back from the secure checkout page ──
      {
        const p = await context.newPage();
        await p.goto(`${BASE}${ROOT}?cancelled=1`, { waitUntil: 'domcontentloaded' });
        await p.getByTestId('text-price').waitFor({ timeout: 15000 }).catch(() => {});
        await p.waitForFunction(() => document.querySelector('[data-testid="figure-cup"] img')?.complete, null, { timeout: 10000 }).catch(() => {});
        const note = flat(await p.getByTestId('text-cancelled').innerText().catch(() => ''));
        const btn = await bottomY(p.getByTestId('button-checkout'));
        check(`${vp.label}: ?cancelled=1 says nothing has been taken, tick unticked`, note.includes('Nothing has been taken') && !(await p.getByTestId('checkbox-ready').locator('input').isChecked()));
        info(`${vp.label}: ?cancelled=1 button bottom ${btn}px`);
        if (vp.label === 'phone') check('phone: ?cancelled=1 still keeps the button inside the first screen', btn !== null && btn <= vp.height, `${btn}px`);
        await p.screenshot({ path: path.join(OUT, `booking-cancelled-${vp.label}.png`) });
        await p.close();
      }

      check(`${vp.label}: booking page has no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
      await context.close();
    }

    // ═══ 2. 409 price_changed (live-flag build, checkout stubbed) ═══
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const stubs = makeStubs(new URL(LIVE_BASE).origin);
      await context.route('**/*', stubs.handler);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // The server would charge arm B (the test started while her page showed A): 409 once, with $45.
      stubs.state.checkoutAnswers.push(
        { status: 409, body: { error: 'The price has changed since this page was opened. Please check it and press the button again.', code: 'price_changed', current: { arm: 'B', cents: 4500, label: '$45' } } },
        { status: 200, body: { url: `${LIVE_BASE}/__stripe_stub` } },
      );
      await page.goto(`${LIVE_BASE}${ROOT}?c=61&fn=Smoke`, { waitUntil: 'domcontentloaded' });
      await page.getByTestId('text-price').waitFor({ timeout: 20000 }).catch(() => {});
      await page.getByTestId('checkbox-ready').locator('input').check();
      await sleep(600);
      await page.getByTestId('button-checkout').click();
      await page.getByTestId('text-price-changed').waitFor({ timeout: 10000 }).catch(() => {});
      const notice = flat(await page.getByTestId('text-price-changed').innerText().catch(() => ''));
      const first = stubs.state.checkoutBodies[0];
      check(`${vp.label}: live — the first press posted quotedArm A, no day, no cup, no price`, !!first && first.offer === 'tea-reading' && first.quotedArm === 'A' && first.quotedDay === undefined && first.cup === undefined && first.amountCents === undefined && first.treatment === 'page', JSON.stringify(first));
      const priceSubject = stubs.state.priceSubjects[0];
      check(`${vp.label}: live — checkout's expSubject is the SAME visitor id the price request carried`, typeof priceSubject === 'string' && priceSubject.length > 8 && first?.expSubject === priceSubject, `${priceSubject} vs ${first?.expSubject}`);
      check(`${vp.label}: live — 409 shows the server's price and asks her to press again (no "today", no "went up")`, notice.includes('$45') && /press TURN MY CUP again/i.test(notice) && !LADDER_COPY.test(notice), notice);
      check(`${vp.label}: live — the price line and total now read $45`, flat(await page.getByTestId('text-price').innerText()) === '$45' && flat(await page.getByTestId('text-total').innerText()) === '$45');
      check(`${vp.label}: live — still on the booking page (nothing charged)`, page.url().startsWith(`${LIVE_BASE}${ROOT}`));
      await page.getByTestId('text-price-changed').evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await shot('booking-price-changed', page);
      await page.getByTestId('button-checkout').click();
      await page.waitForURL(`${LIVE_BASE}/__stripe_stub`, { timeout: 10000 }).catch(() => {});
      const second = stubs.state.checkoutBodies[1];
      check(`${vp.label}: live — the re-press sends the server's arm (B), the same visitor id, and goes on`, !!second && second.quotedArm === 'B' && second.expSubject === first?.expSubject && page.url() === `${LIVE_BASE}/__stripe_stub`, JSON.stringify(second));
      check(`${vp.label}: live — no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
      await context.close();
    }

    // ═══ 3. BOOKING CHAT (dark build) ═══
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const stubs = makeStubs(new URL(BASE).origin);
      await context.route('**/*', stubs.handler);
      const errors = [];

      // Watch the opening on its own page, opened with `commit` so we look before React mounts.
      const reveal = await context.newPage();
      reveal.on('pageerror', (e) => errors.push(e.message));
      // An in-page recorder: every change in (typing indicator, lines on screen, card) with its
      // time, so each line's typing time is measured in the page, not through Playwright's polls.
      await reveal.addInitScript(() => {
        window.__chatLog = [];
        new MutationObserver(() => {
          const row = {
            t: performance.now(),
            typing: !!document.querySelector('[data-testid="indicator-typing"]'),
            lines: document.querySelectorAll('[data-testid="message-evelyn"]').length,
            gate: !!document.querySelector('[data-testid="commitment-gate"]'),
          };
          const last = window.__chatLog[window.__chatLog.length - 1];
          if (!last || last.typing !== row.typing || last.lines !== row.lines || last.gate !== row.gate) window.__chatLog.push(row);
        }).observe(document, { childList: true, subtree: true });
      });
      await reveal.goto(`${BASE}${ROOT}/chat?c=61&fn=Smoke`, { waitUntil: 'commit' });
      await reveal.waitForSelector('[data-testid="indicator-typing"]', { timeout: 15000 }).catch(() => {});
      check(`${vp.label}: chat opens on her already writing, nothing said yet`, (await reveal.getByTestId('indicator-typing').count()) === 1 && (await reveal.getByTestId('message-evelyn').count()) === 0);
      await shot('chat-opening-typing', reveal);
      const tLine1 = Date.now();
      await reveal.waitForSelector('[data-testid="message-evelyn"]');
      const line1Ms = Date.now() - tLine1;
      check(`${vp.label}: her first line lands alone, no card yet`, (await reveal.getByTestId('message-evelyn').count()) === 1 && (await reveal.getByTestId('commitment-gate').count()) === 0);
      await reveal.waitForSelector('[data-testid="indicator-typing"]', { timeout: 3000 });
      const t0 = Date.now();
      await reveal.waitForFunction(() => document.querySelectorAll('[data-testid="message-evelyn"]').length >= 2);
      const line2Ms = Date.now() - t0;
      await reveal.waitForSelector('[data-testid="commitment-gate"]', { timeout: 10000 });
      const longLineMs = Date.now() - t0;
      info(`${vp.label}: line 1 (20 chars) ~${line1Ms}ms · line 2 (51 chars) ~${line2Ms}ms · line 2 + line 3 + card ${longLineMs}ms`);
      check(`${vp.label}: the long line + the card take ≥ 1.2s (not a flat delay)`, longLineMs >= 1200, `${longLineMs}ms`);
      check(`${vp.label}: all three of her lines arrived before the card`, (await reveal.getByTestId('message-evelyn').count()) === 3);
      const log = await reveal.evaluate(() => window.__chatLog);
      const typed = [1, 2, 3].map((k) => {
        const start = log.find((r) => r.typing && r.lines === k - 1);
        const landed = log.find((r) => r.lines === k);
        return start && landed ? Math.round(landed.t - start.t) : null;
      });
      const cardStart = log.find((r) => r.typing && r.lines === 3);
      const cardAt = log.find((r) => r.gate);
      const cardBeat = cardStart && cardAt ? Math.round(cardAt.t - cardStart.t) : null;
      measurements[`chat-${vp.label}`] = { typedMs: typed, cardBeatMs: cardBeat };
      info(`${vp.label}: typing time per line, in-page — ${typed.join(' / ')}ms for 20 / 51 / 48 characters; card beat ${cardBeat}ms`);
      check(
        `${vp.label}: each line is typed (indicator first), paced on length — the 51-char line takes longer than the 20-char one`,
        typed.every((ms) => ms !== null && ms >= 600 && ms <= 2300) && typed[1] > typed[0],
        typed.join(' / '),
      );
      check(`${vp.label}: the card gets its own beat after the last line`, cardBeat !== null && cardBeat >= 600, `${cardBeat}ms`);
      await reveal.close();

      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      const previews = watchPreviews(page);
      // A fresh tab: sessionStorage is per tab, so this one starts from the greeting too.
      await page.goto(`${BASE}${ROOT}/chat?c=61&fn=Smoke`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="commitment-gate"]', { timeout: 15000 });
      await page.getByTestId('text-gate-price').waitFor({ timeout: 10000 }).catch(() => {});
      const title = flat(await page.getByTestId('text-thread-title').innerText());
      check(`${vp.label}: thread title says confirm, never confirmed`, /confirm your booking/i.test(title) && !/confirmed|receipt/i.test(title), title);
      const statements = page.locator('[data-testid^="checkbox-statement-"]');
      check(`${vp.label}: three statements`, (await statements.count()) === 3);
      const statement3 = flat(await page.getByTestId('checkbox-statement-2').innerText());
      check(`${vp.label}: the price is the third statement — "Yes — I'll pay $35, once." and nothing more`, statement3 === "Yes — I'll pay $35, once.", statement3);
      const smallPrint = flat(await page.getByTestId('text-small-print').innerText());
      check(`${vp.label}: the card's small print is "Paid once. …" — no "at today's price"`, smallPrint === "Paid once. Your reading arrives within 24 hours. You don't need to send anything.", smallPrint);
      const cardText = await page.locator('body').innerText();
      check(`${vp.label}: NO ladder copy anywhere in the chat`, !LADDER_COPY.test(cardText), cardText.match(LADDER_COPY)?.[0] ?? '');
      check(`${vp.label}: the button is absent until every box is ticked`, (await page.getByTestId('button-checkout').count()) === 0);
      await sleep(400);
      await shot('chat-card', page);
      for (let i = 0; i < 3; i++) await statements.nth(i).locator('input').check();
      check(`${vp.label}: the button appears once all three are ticked`, (await page.getByTestId('button-checkout').count()) === 1);
      const chatDollars = dollars(await page.locator('body').innerText());
      check(`${vp.label}: the card prints only her arm's price`, chatDollars.every((d) => d === '$35'), chatDollars.join(' '));
      await page.getByTestId('button-checkout').click();

      await page.waitForSelector('[data-testid="order-bump"]', { timeout: 15000 });
      // Both edges read in ONE frame — the thread scrolls smoothly, so two separate reads can disagree.
      const below = await page.evaluate(() => {
        const card = document.querySelector('[data-testid="commitment-gate"]')?.getBoundingClientRect();
        const good = [...document.querySelectorAll('[data-testid="message-evelyn"]')].find((el) => el.textContent.trim() === 'Good.');
        const g = good?.getBoundingClientRect();
        return card && g ? { cardBottom: Math.round(card.bottom), goodTop: Math.round(g.top) } : null;
      });
      check(`${vp.label}: what Evelyn says after the card lands BELOW it`, !!below && below.goodTop >= below.cardBottom - 2, JSON.stringify(below));
      const afterCard = await page.evaluate(() => {
        const lines = [...document.querySelectorAll('[data-testid="message-evelyn"]')].map((el) => el.textContent.trim());
        return lines.slice(lines.indexOf('Good.'));
      });
      check(`${vp.label}: after the card — "Good." then "One more thing before I start.", then the bump`, JSON.stringify(afterCard) === JSON.stringify(['Good.', 'One more thing before I start.']), JSON.stringify(afterCard));
      const chatPick = await noCupPick(page);
      check(`${vp.label}: no cup question in the chat — no quick replies, no cup names, no bubble of hers`, chatPick.ok && (await page.getByTestId('message-her').count()) === 0, JSON.stringify(chatPick));
      check(`${vp.label}: the bump turn shows +$12.77 and the $47.77 total`, flat(await page.getByTestId('order-bump').innerText()).includes('+ $12.77') && flat(await page.getByTestId('text-bump-total').innerText()) === '$47.77 total');
      const bumpTurn = flat(await page.getByTestId('order-bump').innerText());
      check(
        `${vp.label}: the bump turn is the Double Turning question (ends "?"), with "${BUMP_CHAT.accept}" / "${BUMP_CHAT.decline}"`,
        bumpTurn.includes(BUMP_CHAT.body) && BUMP_CHAT.body.endsWith('?') && flat(await page.getByTestId('button-bump-accept').innerText()) === BUMP_CHAT.accept && flat(await page.getByTestId('button-bump-decline').innerText()) === BUMP_CHAT.decline && !/still cup/i.test(bumpTurn),
        bumpTurn.slice(0, 120),
      );
      await sleep(500);
      await shot('chat-bump-turn', page);
      await page.getByTestId('button-bump-decline').click();
      await waitForCount(previews, 1);
      const d = previews[0];
      check(`${vp.label}: "No, just my reading" logs [preview] — chat, bump false, quotedArm A, fn + c, NO cup`, !!d && d.offer === 'tea-reading' && d.treatment === 'chat' && d.bump === false && d.quotedArm === 'A' && !('quotedDay' in d) && !('cup' in d) && d.firstName === 'Smoke' && d.letterCode === '61', JSON.stringify(d));
      await page.getByTestId('button-bump-accept').click();
      await waitForCount(previews, 2);
      check(`${vp.label}: "${BUMP_CHAT.accept}" logs bump true, NO cup`, previews[1]?.bump === true && previews[1]?.treatment === 'chat' && !('cup' in (previews[1] ?? {})), JSON.stringify(previews[1]));
      let hs = await noHorizontalScroll(page);
      check(`${vp.label}: chat has no horizontal scroll`, hs.ok, `scrollWidth=${hs.scrollWidth}`);

      // A refresh: she never left. Back at the card, nothing ticked, no "welcome back".
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="commitment-gate"]', { timeout: 15000 });
      const refreshed = flat(await page.locator('body').innerText());
      check(`${vp.label}: a refresh resumes at the card without greeting her back`, refreshed.includes("I'm still here, dear.") && !/There you are|again|taken/i.test(refreshed.split('Before I turn your cup')[0]));
      const anyTicked = await page.locator('[data-testid^="checkbox-statement-"] input').evaluateAll((els) => els.some((e) => e.checked));
      check(`${vp.label}: and every box is unticked (consent is never restored)`, !anyTicked && (await page.getByTestId('order-bump').count()) === 0);

      // Back from the secure checkout page.
      await page.goto(`${BASE}${ROOT}/chat?cancelled=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="commitment-gate"]', { timeout: 15000 });
      await page.getByTestId('text-gate-price').waitFor({ timeout: 10000 }).catch(() => {});
      const back = flat(await page.locator('body').innerText());
      check(`${vp.label}: ?cancelled=1 greets her back and says nothing has been taken`, back.includes('There you are again, dear.') && back.includes('Nothing has been taken'));
      await sleep(400);
      await page.evaluate(() => document.querySelector('.overflow-y-auto')?.scrollTo(0, 0));
      await shot('chat-cancelled-resume', page);

      // From the ?cancelled=1 resume too: card → bump, with no cup question in between.
      const resumed = await context.newPage();
      await resumed.goto(`${BASE}${ROOT}/chat?cancelled=1`, { waitUntil: 'domcontentloaded' });
      await resumed.waitForSelector('[data-testid="text-gate-price"]', { timeout: 15000 });
      for (let i = 0; i < 3; i++) await resumed.locator(`[data-testid="checkbox-statement-${i}"] input`).check();
      await resumed.getByTestId('button-checkout').click();
      await resumed.waitForSelector('[data-testid="order-bump"]', { timeout: 15000 });
      const resumedPick = await noCupPick(resumed);
      check(`${vp.label}: the resumed chat goes card → bump, no cup question`, resumedPick.ok && (await resumed.getByTestId('message-her').count()) === 0, JSON.stringify(resumedPick));
      await resumed.close();

      check(`${vp.label}: chat has no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
      await context.close();
    }

    // ═══ 4. 409 in the chat (live-flag build) ═══
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const stubs = makeStubs(new URL(LIVE_BASE).origin);
      await context.route('**/*', stubs.handler);
      stubs.state.checkoutAnswers.push(
        { status: 409, body: { error: 'moved', code: 'price_changed', current: { arm: 'B', cents: 4500, label: '$45' } } },
        { status: 200, body: { url: `${LIVE_BASE}/__stripe_stub` } },
      );
      const page = await context.newPage();
      await page.goto(`${LIVE_BASE}${ROOT}/chat?cancelled=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="text-gate-price"]', { timeout: 15000 });
      for (let i = 0; i < 3; i++) await page.locator(`[data-testid="checkbox-statement-${i}"] input`).check();
      await page.getByTestId('button-checkout').click();
      await page.waitForSelector('[data-testid="order-bump"]', { timeout: 15000 });
      await page.getByTestId('button-bump-accept').click();
      await page.getByTestId('text-price-changed').waitFor({ timeout: 10000 }).catch(() => {});
      const notice = flat(await page.getByTestId('text-price-changed').innerText().catch(() => ''));
      check(`${vp.label}: live chat — 409 names the server's price and asks her to press again`, notice.includes('$45') && /press your answer again/i.test(notice) && !LADDER_COPY.test(notice), notice);
      check(`${vp.label}: live chat — the card's price and the bump total move to $45`, flat(await page.getByTestId('text-gate-price').innerText()) === '$45' && flat(await page.getByTestId('text-bump-total').innerText()) === '$57.77 total');
      await sleep(300);
      await shot('chat-price-changed', page);
      await page.getByTestId('button-bump-accept').click();
      await page.waitForURL(`${LIVE_BASE}/__stripe_stub`, { timeout: 10000 }).catch(() => {});
      const [a, b] = stubs.state.checkoutBodies;
      check(`${vp.label}: live chat — quotedArm A then B, one visitor id, treatment chat, NO cup posted`, a?.quotedArm === 'A' && b?.quotedArm === 'B' && !!a?.expSubject && a.expSubject === b?.expSubject && a.expSubject === stubs.state.priceSubjects[0] && b?.treatment === 'chat' && a?.cup === undefined && b?.cup === undefined && b?.bump === true, JSON.stringify(b));
      await context.close();
    }

    // ═══ 5. RECEIPT (dark build, order lookup stubbed) ═══
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const stubs = makeStubs(new URL(BASE).origin);
      await context.route('**/*', stubs.handler);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      // The stubbed orders still carry a `cup` (as an older server sent) — the receipt must drop it.
      const cases = [
        ['bump-named', 'cs_test_04_bump_named', { name: 'Sarah', bump: true }],
        ['nobump-named', 'cs_test_04_nobump_named', { name: 'Sarah', bump: false }],
        ['bump-noname', 'cs_test_04_bump_noname', { name: 'dear', bump: true }],
        ['nobump-noname', 'cs_test_04_nobump_noname', { name: 'dear', bump: false }],
      ];
      for (const [name, sid, want] of cases) {
        await page.goto(`${BASE}${ROOT}/success?s=${sid}`, { waitUntil: 'domcontentloaded' });
        const card = page.getByTestId('card-thankyou-tea-reading');
        await card.waitFor({ timeout: 15000 }).catch(() => {});
        const text = flat(await page.locator('body').innerText());
        const ps = page.getByTestId('text-bump-ps');
        check(
          `${vp.label}: receipt (${name}) — "Thank you, ${want.name}.", title "${want.name} — your cup is turned", within 24 hours`,
          text.includes(`Thank you, ${want.name}.`) && flat(await page.getByTestId('text-delivery-title').innerText()) === `${want.name} — your cup is turned` && text.includes('within 24 hours'),
        );
        check(
          `${vp.label}: receipt (${name}) — no "Your reading follows" line, no cup's name`,
          !/follows/i.test(text) && !CUP_NAMES.test(text) && (await page.getByTestId('text-receipt-cup').count()) === 0,
          text.match(/[^.]*follows[^.]*/i)?.[0] ?? text.match(CUP_NAMES)?.[0] ?? '',
        );
        check(
          `${vp.label}: receipt (${name}) ${want.bump ? 'shows' : 'does not show'} the Double Turning P.S. — never a link, never the Still Cup`,
          (want.bump
            ? (await ps.count()) === 1 && flat(await ps.innerText()) === RECEIPT_PS && (await ps.locator('a').count()) === 0
            : (await ps.count()) === 0 && !text.includes('Double Turning')) &&
            !/still cup/i.test(text) && (await page.locator('a[href*="still-cup"]').count()) === 0,
        );
        check(`${vp.label}: receipt (${name}) — no price, no "tomorrow"/"by morning"`, dollars(text).length === 0 && !/tomorrow|by morning/i.test(text));
        const hs = await noHorizontalScroll(page);
        check(`${vp.label}: receipt (${name}) no horizontal scroll`, hs.ok, `scrollWidth=${hs.scrollWidth}`);
        await shot(`receipt-${name}`, page, { fullPage: true });
      }

      // The poll rides out two 402s (the webhook race).
      await page.goto(`${BASE}${ROOT}/success?s=cs_test_04_pending`, { waitUntil: 'domcontentloaded' });
      const sawLoading = await page.getByTestId('receipt-loading').waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
      await page.getByTestId('card-thankyou-tea-reading').waitFor({ timeout: 15000 }).catch(() => {});
      check(`${vp.label}: receipt polls through two 402s to the verified receipt`, sawLoading && (await page.getByTestId('card-thankyou-tea-reading').count()) === 1 && stubs.state.pendingCalls >= 3, `lookups=${stubs.state.pendingCalls}`);

      for (const [name, suffix] of [['no-s', ''], ['unknown-s', '?s=cs_test_04_not_an_order']]) {
        await page.goto(`${BASE}${ROOT}/success${suffix}`, { waitUntil: 'domcontentloaded' });
        await page.getByTestId('card-receipt-fallback').waitFor({ timeout: 15000 }).catch(() => {});
        const text = flat(await page.locator('body').innerText());
        check(`${vp.label}: receipt (${name}) shows the safe fallback — no title box, no cup, no P.S.`, (await page.getByTestId('card-receipt-fallback').count()) === 1 && !text.includes('your cup is turned') && !text.includes('Double Turning') && !/still cup/i.test(text) && !CUP_NAMES.test(text));
        await shot(`receipt-fallback-${name}`, page);
      }
      check(`${vp.label}: receipt has no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
      await context.close();
    }

    // ═══ 6. NO STILL CUP PAGE + the live V1 funnel ═══
    // The bump is the Double Turning (operator 2026-10-11): intangible, so the old Still Cup page,
    // its route and its link are gone. Its URL must render no Still Cup.
    {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const stubs = makeStubs(new URL(BASE).origin);
      await context.route('**/*', stubs.handler);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${BASE}${ROOT}/still-cup`, { waitUntil: 'domcontentloaded' });
      await sleep(1500); // give a lazy route the time it would need to render
      const text = flat(await page.locator('body').innerText());
      check(
        `${vp.label}: the retired /still-cup renders no Still Cup page`,
        (await page.getByTestId('still-cup').count()) === 0 && (await page.getByTestId('still-cup-step').count()) === 0 && !/still cup/i.test(text),
        text.slice(0, 80),
      );
      check(`${vp.label}: /still-cup has no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));

      const v1 = await context.newPage();
      const v1Errors = [];
      v1.on('pageerror', (e) => v1Errors.push(e.message));
      await v1.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await v1.getByTestId('img-avatar-landing').waitFor({ timeout: 20000 }).catch(() => {});
      check(`${vp.label}: the live V1 funnel at / still renders`, await v1.getByTestId('img-avatar-landing').isVisible().catch(() => false), v1Errors.slice(0, 1).join(''));
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log('\nmeasurements (px):', JSON.stringify(measurements));
console.log(`\n=== ${failed === 0 ? `ALL ${results.length} CHECKS PASS` : `${failed} of ${results.length} FAILED`} ===`);
console.log(`screenshots: ${OUT}`);
process.exit(failed === 0 ? 0 : 1);
