import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Smoke walk for offer 09 (the Heart Cleanser Love Charm) — the two NEW routes.
//
//   BASE=http://localhost:5091 node improve-v1/v1-one-time-BEs/scripts/walk-09-smoke.mjs
//
// Proves, at desktop (1280) and mobile (390):
//   booking  /offers/heart-cleanser?c=21&fn=Smoke
//     - renders, with the studio close-up (rosequartz-page-570) loaded
//     - four statements (09-C1-ticks-rewrite, Version 2) and NO request block
//     - the page text never says "Stripe" or "One payment of $59"; the small print carries the
//       shipping sentence word for word
//     - the order bump (09-C3, Reiki charging) is HIDDEN until every statement is ticked, then UNTICKED, with its
//       "+$11.11" line; the total reads $59.00
//     - NO checkout button until all four statements are ticked, then one
//     - the button can be brought fully on screen (not trapped below the fold)
//     - clicking it with checkout dark logs the [preview] line, carrying
//       offer=heart-cleanser, bump=false and letterCode=21, and does NOT navigate
//     - ticking the bump: total $70.11, button still there, small print unchanged, the next click
//       carries bump=true; unticking returns the total to $59.00
//     - no horizontal scroll; prints the page height (locked and unlocked)
//   receipt  /offers/heart-cleanser/success            (no ?s=)
//            /offers/heart-cleanser/success?s=cs_test_… (an order that isn't there)
//     - both show 09-T1's fallback, never receipt lines
//   receipt  ?s=cs_test_smoke_bump / ?s=cs_test_smoke_nobump (order lookup STUBBED in the browser)
//     - the "Added: Reiki charging…" line shows for the bump order only
//
// ⛔ SAFETY. Refuses a non-local BASE unless ALLOW_REMOTE=1. Every request that isn't
// to BASE or the S3 image host is aborted (no Facebook, PostHog, Clarity, GTM,
// Trackdesk), and POST /api/backend/checkout is aborted too — so even a build with
// checkout LIVE can never reach Stripe from this script. It buys nothing.
//
// Screenshots → improve-v1/evidence/09-booking-2026-09-15/

const BASE = (process.env.BASE || 'http://localhost:5091').replace(/\/$/, '');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../evidence/09-booking-2026-09-15');
const IMAGE_HOST = 'luna-assets-tsw.s3.ap-southeast-2.amazonaws.com';
const BOOKING = `${BASE}/offers/heart-cleanser?c=21&fn=Smoke`;

// 09-C1 (09-C1-ticks-rewrite, Version 2), word for word.
const STATEMENT_COUNT = 4;
const LOCKED_HINT = 'Tick all four boxes above to show the button.';
const SHIPPING_SENTENCE =
  'ships within 2 business days, then arrives in 7–14 days in the US and 2–4 weeks everywhere else';
// Lines from the removed request paragraph — none may render.
const REQUEST_LINES = ["Evelyn — I've thought about the wish I'll write.", 'So please —', 'the seven words'];

// 09-C3, word for word.
const BUMP_LABEL = "Yes — have Evelyn charge my charm with Reiki before it's packed.";
const BUMP_LINE = "+$11.11 · Before it's packed, Evelyn holds my charm in her hands and gives it Reiki for love.";
const RECEIPT_BUMP = 'Added: Reiki charging by Evelyn before packing, $11.11';

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

async function guard(context) {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/backend/checkout')) return route.abort();
    if (url.origin === new URL(BASE).origin || url.hostname === IMAGE_HOST) return route.continue();
    if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    return route.abort();
  });
}

async function noHorizontalScroll(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return { ok: doc.scrollWidth <= window.innerWidth, scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth };
  });
}

const pageHeight = (page) => page.evaluate(() => document.documentElement.scrollHeight);

const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

async function waitForPreviews(previews, n) {
  const deadline = Date.now() + 5000;
  while (previews.length < n && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
}

const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
];

// A verified 09 order, served to the BROWSER only (page.route) — no server, no database.
const STUB_ORDER = {
  reference: 'SMOKE915',
  offer: 'heart-cleanser',
  offerNumber: '09',
  firstName: 'Smoke',
  amountCents: 5900,
  readingCents: 5900,
  bumpPurchased: false,
  bumpCents: 0,
  bumpProductKey: null,
  status: 'paid',
  shipping: 'Sarah Lee\n14 Rosewood Avenue\nAustin, TX 78701\nUS',
};
const STUBS = {
  cs_test_smoke_bump: { ...STUB_ORDER, amountCents: 7011, bumpPurchased: true, bumpCents: 1111, bumpProductKey: 'reiki_charge' },
  cs_test_smoke_nobump: STUB_ORDER,
};

const heights = [];

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    console.log(`\n── ${vp.label} (${vp.width}×${vp.height}) ──`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await guard(context);
    const page = await context.newPage();
    const pageErrors = [];
    const previews = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', async (msg) => {
      if (!msg.text().startsWith('[preview] would checkout')) return;
      const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => null)));
      previews.push(args[1] ?? null);
    });
    // Page routes win over the context guard: only these two session ids are stubbed.
    await page.route(
      (url) => url.pathname.startsWith('/api/backend/order/') && decodeURIComponent(url.pathname.split('/').pop()) in STUBS,
      (route) => {
        const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop());
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ order: STUBS[id] }) });
      },
    );

    // ── booking ──
    await page.goto(BOOKING, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const heading = page.getByRole('heading', { name: 'Your Heart Cleanser Love Charm' });
    await heading.waitFor({ timeout: 20000 }).catch(() => {});
    check(`${vp.label}: booking renders its title`, await heading.isVisible().catch(() => false));

    const img = page.locator('[data-testid="figure-charm"] img');
    await img.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="figure-charm"] img');
        return el && el.complete;
      },
      null,
      { timeout: 15000 },
    ).catch(() => {});
    const imgInfo = await img.evaluate((el) => ({ src: el.src, w: el.naturalWidth })).catch(() => ({ src: '', w: 0 }));
    check(
      `${vp.label}: only the studio close-up, loaded`,
      /rosequartz-page-570\.jpg$/.test(imgInfo.src) && imgInfo.w > 0 && (await page.locator('img[src*="rosequartz2"], img[src*="rosequartz3"], img[src$=".gif"]').count()) === 0,
      `naturalWidth=${imgInfo.w}`,
    );

    const boxes = page.locator('[data-testid^="checkbox-statement-"] input[type="checkbox"]');
    const button = page.getByTestId('button-checkout');
    const total = page.getByTestId('text-total');
    const smallPrint = page.getByTestId('text-small-print');
    const bumpCard = page.getByTestId('checkbox-bump');
    const bumpBox = bumpCard.locator('input[type="checkbox"]');
    check(`${vp.label}: ${STATEMENT_COUNT} statements`, (await boxes.count()) === STATEMENT_COUNT, `count=${await boxes.count()}`);
    check(
      `${vp.label}: no button before any tick (locked hint shown)`,
      (await button.count()) === 0 && (await page.getByTestId('text-locked-hint').isVisible()),
    );
    check(
      `${vp.label}: grey hint is 09-C1's`,
      flat(await page.getByTestId('text-locked-hint').innerText().catch(() => '')) === LOCKED_HINT,
    );
    check(`${vp.label}: total line reads $59.00`, flat(await total.innerText().catch(() => '')) === '$59.00');

    const bodyText = flat(await page.locator('body').innerText().catch(() => ''));
    const requestLeft = REQUEST_LINES.filter((l) => bodyText.includes(l));
    check(`${vp.label}: no request block`, requestLeft.length === 0, requestLeft.join(' | '));
    check(
      `${vp.label}: page text never says "Stripe" or "One payment of $59"`,
      !/stripe/i.test(bodyText) && !/one payment of \$59/i.test(bodyText),
    );
    const smallPrintText = flat(await smallPrint.innerText().catch(() => ''));
    check(
      `${vp.label}: small print carries the shipping sentence and names no amount`,
      smallPrintText.includes(SHIPPING_SENTENCE) && !/\$/.test(smallPrintText),
      smallPrintText.slice(0, 80),
    );

    // ── the order bump is HIDDEN until every statement is ticked (Joel, 2026-09-16) ──
    check(`${vp.label}: order bump is NOT on the page before the ticks`, (await bumpBox.count()) === 0);

    let hs = await noHorizontalScroll(page);
    check(`${vp.label}: no horizontal scroll (locked)`, hs.ok, `scrollWidth=${hs.scrollWidth} innerWidth=${hs.innerWidth}`);

    await page.evaluate(() => window.scrollTo(0, 0));
    const lockedHeight = await pageHeight(page);
    await page.screenshot({ path: path.join(OUT, `booking-locked-${vp.label}.png`), fullPage: true });

    let hiddenUntilLast = true;
    for (let i = 0; i < STATEMENT_COUNT; i++) {
      await boxes.nth(i).check();
      const count = await button.count();
      if (i < STATEMENT_COUNT - 1 && count !== 0) hiddenUntilLast = false;
    }
    check(`${vp.label}: button stays absent through ${STATEMENT_COUNT - 1} ticks`, hiddenUntilLast);
    check(`${vp.label}: button appears after tick ${STATEMENT_COUNT}`, (await button.count()) === 1 && (await button.isVisible()));
    check(`${vp.label}: button text unchanged`, flat(await button.innerText().catch(() => '')).startsWith('SEND ME MY LOVE CHARM'));

    // ── the order bump appears with the button, unticked ──
    const bumpShown = (await bumpBox.count()) === 1;
    check(`${vp.label}: order bump appears after tick ${STATEMENT_COUNT}`, bumpShown);
    check(`${vp.label}: order bump is UNTICKED when it appears`, bumpShown && !(await bumpBox.isChecked()));
    const bumpText = flat(await bumpCard.innerText().catch(() => ''));
    check(
      `${vp.label}: bump label and "+$11.11" line are 09-C3's`,
      bumpText.includes(BUMP_LABEL) && bumpText.includes(BUMP_LINE) && bumpText.includes('No extra wait.'),
      bumpText.slice(0, 140),
    );
    if (bumpShown) {
      const bumpBoxRect = await bumpCard.boundingBox();
      const totalRect = await total.boundingBox();
      check(
        `${vp.label}: the bump sits directly above the total`,
        !!bumpBoxRect && !!totalRect && totalRect.y > bumpBoxRect.y && totalRect.y - (bumpBoxRect.y + bumpBoxRect.height) < 120,
        bumpBoxRect && totalRect ? `gap=${Math.round(totalRect.y - (bumpBoxRect.y + bumpBoxRect.height))}px` : 'no box',
      );
      const lastStatementRect = await page.getByTestId(`checkbox-statement-${STATEMENT_COUNT - 1}`).boundingBox();
      check(
        `${vp.label}: the bump follows the last statement directly (no block between)`,
        !!lastStatementRect && !!bumpBoxRect && bumpBoxRect.y - (lastStatementRect.y + lastStatementRect.height) < 60,
        lastStatementRect && bumpBoxRect ? `gap=${Math.round(bumpBoxRect.y - (lastStatementRect.y + lastStatementRect.height))}px` : 'no box',
      );
      await bumpCard.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: path.join(OUT, `booking-bump-unticked-${vp.label}.png`) });
    }

    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    check(
      `${vp.label}: button can sit fully on screen (not stuck below the fold)`,
      !!box && box.y >= 0 && box.y + box.height <= vp.height,
      box ? `y=${Math.round(box.y)} h=${Math.round(box.height)}` : 'no box',
    );
    await page.screenshot({ path: path.join(OUT, `booking-button-${vp.label}.png`) });

    hs = await noHorizontalScroll(page);
    check(`${vp.label}: no horizontal scroll (unlocked)`, hs.ok, `scrollWidth=${hs.scrollWidth} innerWidth=${hs.innerWidth}`);
    await page.evaluate(() => window.scrollTo(0, 0));
    const unlockedHeight = await pageHeight(page);
    heights.push({ viewport: vp.label, width: vp.width, lockedHeight, unlockedHeight, screens: +(unlockedHeight / vp.height).toFixed(2) });
    console.log(`[info] ${vp.label}: page height locked=${lockedHeight}px unlocked=${unlockedHeight}px (${(unlockedHeight / vp.height).toFixed(2)} × ${vp.height}px screen)`);
    await page.screenshot({ path: path.join(OUT, `booking-unlocked-${vp.label}.png`), fullPage: true });

    const before = page.url();
    await button.click();
    await waitForPreviews(previews, 1);
    await page.waitForTimeout(1500);
    const preview = previews[0];
    check(
      `${vp.label}: click logs the preview (checkout dark) with offer/bump/letter code`,
      !!preview && preview.offer === 'heart-cleanser' && preview.bump === false && preview.treatment === 'page' && preview.letterCode === '21' && preview.firstName === 'Smoke',
      preview ? JSON.stringify(preview) : 'no [preview] line — is BACKEND_CHECKOUT_LIVE on for this build?',
    );
    check(`${vp.label}: click does not navigate`, page.url() === before, page.url());

    // ── the order bump, ticked ──
    if (bumpShown) {
      await bumpBox.check();
      check(`${vp.label}: ticking the bump makes the total $70.11`, flat(await total.innerText()) === '$70.11', flat(await total.innerText()));
      check(`${vp.label}: the button is still there with the bump ticked`, (await button.count()) === 1);
      check(
        `${vp.label}: small print unchanged with the bump ticked (still true at $70.11)`,
        flat(await smallPrint.innerText().catch(() => '')) === smallPrintText,
      );
      await bumpCard.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: path.join(OUT, `booking-bump-ticked-${vp.label}.png`) });

      await button.click();
      await waitForPreviews(previews, 2);
      const withBump = previews[1];
      check(
        `${vp.label}: click with the bump ticked sends bump: true (and no price)`,
        !!withBump && withBump.offer === 'heart-cleanser' && withBump.bump === true && withBump.letterCode === '21' && withBump.amountCents == null,
        withBump ? JSON.stringify(withBump) : 'no second [preview] line',
      );

      await bumpBox.uncheck();
      check(`${vp.label}: unticking the bump returns the total to $59.00`, flat(await total.innerText()) === '$59.00');

      // Unticking a statement hides the bump again; re-ticking brings it back UNTICKED.
      await bumpBox.check();
      await boxes.nth(0).uncheck();
      check(
        `${vp.label}: unticking a statement hides the bump and the button, total back to $59.00`,
        (await bumpBox.count()) === 0 && (await button.count()) === 0 && flat(await total.innerText()) === '$59.00',
        flat(await total.innerText()),
      );
      await boxes.nth(0).check();
      check(
        `${vp.label}: re-ticking brings the bump back UNTICKED (never as she left it)`,
        (await bumpBox.count()) === 1 && !(await bumpBox.isChecked()) && flat(await total.innerText()) === '$59.00',
      );
    } else {
      check(`${vp.label}: ticking the bump makes the total $70.11`, false, 'no bump checkbox');
      check(`${vp.label}: click with the bump ticked sends bump: true (and no price)`, false, 'no bump checkbox');
    }
    check(`${vp.label}: booking has no page errors`, pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

    // ── receipt: no ?s= / an order that isn't there ──
    for (const [label, suffix] of [
      ['no-s', ''],
      ['unknown-s', '?s=cs_test_smoke_not_a_real_order'],
    ]) {
      const errorsBefore = pageErrors.length;
      await page.goto(`${BASE}/offers/heart-cleanser/success${suffix}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const fallback = page.getByTestId('card-receipt-fallback');
      await fallback.waitFor({ timeout: 20000 }).catch(() => {});
      const text = flat(await page.locator('body').innerText().catch(() => ''));
      check(
        `${vp.label}: receipt (${label}) shows the safe fallback, no receipt lines`,
        (await fallback.isVisible().catch(() => false)) &&
          text.includes("I can't show your order details") &&
          !text.includes('Your receipt') &&
          !text.includes('Paid:') &&
          !text.includes('Added:'),
        `reason=${await fallback.getAttribute('data-reason').catch(() => '?')}`,
      );
      hs = await noHorizontalScroll(page);
      check(`${vp.label}: receipt (${label}) no horizontal scroll`, hs.ok, `scrollWidth=${hs.scrollWidth}`);
      check(`${vp.label}: receipt (${label}) no page errors`, pageErrors.length === errorsBefore, pageErrors.slice(errorsBefore).join(' | '));
      await page.screenshot({ path: path.join(OUT, `receipt-${label}-${vp.label}.png`), fullPage: true });
    }

    // ── receipt: a verified order with and without the bump (lookup stubbed above) ──
    for (const [label, sessionId, tookBump] of [
      ['bump', 'cs_test_smoke_bump', true],
      ['no-bump', 'cs_test_smoke_nobump', false],
    ]) {
      const errorsBefore = pageErrors.length;
      await page.goto(`${BASE}/offers/heart-cleanser/success?s=${sessionId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const card = page.getByTestId('card-thankyou-heart-cleanser');
      await card.waitFor({ timeout: 20000 }).catch(() => {});
      const receipt = flat(await page.getByTestId('block-receipt').innerText().catch(() => ''));
      const line = page.getByTestId('text-receipt-bump');
      check(
        `${vp.label}: verified receipt (${label}) ${tookBump ? 'shows' : 'does not show'} the Added line`,
        (await card.isVisible().catch(() => false)) &&
          receipt.includes('Paid: $59 (free shipping)') &&
          (tookBump ? (await line.count()) === 1 && receipt.includes(RECEIPT_BUMP) : (await line.count()) === 0 && !receipt.includes('Added:')),
        receipt.slice(0, 160),
      );
      check(`${vp.label}: verified receipt (${label}) no page errors`, pageErrors.length === errorsBefore, pageErrors.slice(errorsBefore).join(' | '));
      await page.getByTestId('block-receipt').evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
      await page.screenshot({ path: path.join(OUT, `receipt-verified-${label}-${vp.label}.png`) });
    }

    await context.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log('\npage heights:', JSON.stringify(heights));
console.log(`\n=== ${failed === 0 ? `ALL ${results.length} CHECKS PASS` : `${failed} of ${results.length} FAILED`} ===`);
console.log(`screenshots: ${OUT}`);
process.exit(failed === 0 ? 0 : 1);
