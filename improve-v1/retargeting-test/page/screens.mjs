// Screenshot the /fb-tarot retargeting page (the offer page) at phone + desktop width.
// Re-run after any copy change to content/tarotRetargetOffer.ts.
//
//   LOCAL_BASE_URL=http://127.0.0.1:5066 node improve-v1/retargeting-test/page/screens.mjs
//   NAMED=1 …   seed a stored first name for the main run
//
// LOCAL ONLY (refuses any other host). Meta + PostHog are blocked, /api/checkout is
// never called (the buy button is only pressed with an empty name).
// Writes PNGs next to this file in ./screens and prints a layout check per shot
// (horizontal overflow, offer buttons inside the viewport).

import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.LOCAL_BASE_URL || 'http://127.0.0.1:5066';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error(`REFUSING to run against ${BASE} — localhost sandbox only.`);
  process.exit(2);
}
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screens');
const HOOK = process.env.HOOK || 'cards-return';
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];
const SLOW = { timeout: 120_000 };
const problems = [];

async function newPage(browser, vp, seedName) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  await ctx.route('**://*.facebook.com/**', (r) => r.abort());
  await ctx.route('**://connect.facebook.net/**', (r) => r.abort());
  await ctx.route('**://*.posthog.com/**', (r) => r.abort());
  if (seedName) {
    await ctx.addInitScript((name) => {
      if (sessionStorage.getItem('__seeded')) return;
      sessionStorage.setItem('__seeded', '1');
      localStorage.setItem('seer_conversation', JSON.stringify({
        state: { state: 'EMAIL_CAPTURE', messages: [], userData: { firstName: name } },
        timestamp: Date.now(),
      }));
    }, seedName);
  }
  return { ctx, page: await ctx.newPage() };
}

async function shot(page, vp, name, { full = true, file: fileName } = {}) {
  await page.waitForTimeout(500);
  const file = path.join(OUT, fileName ?? `${vp.name}-${name}.png`);
  await page.screenshot({ path: file, fullPage: full });
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  const note = m.sw > m.cw ? ` ⚠ horizontal overflow ${m.sw}>${m.cw}` : '';
  const label = fileName ?? `${vp.name}-${name}.png`;
  if (note) problems.push(`${label}:${note}`);
  console.log(`  ${label}${note}`);
}

// The offer page: top, offer box, includes + steps, doubts, the second
// CTA, the name error, the full page, and the cancelled return. Also checks the price
// is reachable within ~1.5 screens and that no card image is on the page.
async function offerShots(browser, vp) {
  const tag = (n) => `offer-${vp.name}-${n}`;
  const shotAt = async (page, testId, name, block = 'start') => {
    await page.getByTestId(testId).first().evaluate((el, b) => el.scrollIntoView({ block: b }), block);
    await page.waitForTimeout(500);
    await shot(page, vp, '', { full: false, file: `${tag(name)}.png` });
  };
  {
    const { ctx, page } = await newPage(browser, vp, process.env.NAMED ? 'Rosa' : undefined);
    await page.goto(`${BASE}/fb-tarot/b?src=retarget&hook=${HOOK}`);
    await page.getByTestId('retarget-offer-page').waitFor(SLOW);
    await page.waitForTimeout(600);
    await shot(page, vp, '', { full: false, file: `${tag('1-top')}.png` });
    const priceBox = await page.getByTestId('offer-price-now-1').boundingBox();
    const btnBox = await page.getByTestId('offer-button-1').boundingBox();
    console.log(`    price top ${Math.round(priceBox?.y ?? -1)}px, button bottom ${Math.round((btnBox?.y ?? 0) + (btnBox?.height ?? 0))}px (1.5 screens = ${Math.round(vp.height * 1.5)}px)`);
    if (!priceBox || priceBox.y + priceBox.height > vp.height * 1.5) problems.push(`${vp.name}: offer price not within 1.5 screens`);
    const cardImgs = await page.locator('img[src*="mhf"], img[src*="tarot"], [style*="mhf"]').count();
    if (cardImgs) problems.push(`${vp.name}: ${cardImgs} card image(s) on the offer page`);
    await shotAt(page, 'offer-box', '2-offer-box', 'center');
    await shotAt(page, 'offer-includes', '3a-includes', 'start');
    await shotAt(page, 'offer-steps', '3b-steps', 'start');
    await shotAt(page, 'offer-why', '3c-why', 'start');
    await shotAt(page, 'offer-doubts', '4-doubts', 'start');
    await shotAt(page, 'offer-cta-2', '5-cta-2', 'center');
    await shotAt(page, 'offer-signoff', '6-signoff-ps', 'start');
    await page.getByTestId('offer-button-2').click();
    await page.getByTestId('offer-name-error-2').waitFor();
    await page.getByTestId('offer-cta-2').evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await shot(page, vp, '', { full: false, file: `${tag('7-cta-name-error')}.png` });
    for (const id of ['offer-button-1', 'offer-button-2']) {
      const box = await page.getByTestId(id).boundingBox();
      if (!box || box.x < 0 || box.x + box.width > vp.width) problems.push(`${vp.name}: ${id} outside viewport width`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, vp, '', { full: true, file: `${tag('0-full')}.png` });
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage(browser, vp, 'Rosa');
    await page.goto(`${BASE}/fb-tarot/b?src=retarget&hook=${HOOK}&cancelled=1`);
    await page.getByTestId('offer-cta-1').waitFor(SLOW);
    await page.waitForTimeout(900);
    await shot(page, vp, '', { full: false, file: `${tag('8-cancelled-return')}.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await shot(page, vp, '', { full: false, file: `${tag('8b-cancelled-top-named')}.png` });
    await ctx.close();
  }
}

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    console.log(`\n${vp.name} ${vp.width}x${vp.height}`);
    await offerShots(browser, vp);
  }
} finally {
  await browser.close();
}
console.log(problems.length ? `\nPROBLEMS:\n  ${problems.join('\n  ')}` : '\nlayout checks: OK');
process.exit(problems.length ? 1 : 0);
