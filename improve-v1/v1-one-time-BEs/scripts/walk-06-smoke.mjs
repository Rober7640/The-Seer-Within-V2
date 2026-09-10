import { chromium } from 'playwright';
// Render-smoke for offer 06 (the Wishing Bracelet / Pixiu). Mirrors
// walk-03-smoke.mjs. Proves the two NEW pixiu routes render without a page
// error and carry their load-bearing copy; the shared upsell leg is 03's
// already-proven engine (offer resolved from the session), so it is not
// re-smoked here.
const BASE = process.env.BASE || 'http://localhost:5051';
const pages = [
  {
    name: 'booking (page-only)',
    url: `${BASE}/offers/wiccan/wishing-bracelet`,
    expect: /wishing bracelet|send me the seal|closed purse|agree to all five/i,
  },
  {
    name: 'thank-you receipt (fake session → generic fallback)',
    url: `${BASE}/offers/wiccan/wishing-bracelet/success?s=cs_test_fake123`,
    expect: /wishing bracelet is yours|what's coming|bixie|business days/i,
  },
];
const browser = await chromium.launch();
let fail = 0;
for (const p of pages) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 120));
  });
  let status = '?';
  try {
    const resp = await page.goto(p.url, { waitUntil: 'networkidle', timeout: 20000 });
    status = resp?.status();
    await page.waitForTimeout(1500);
    const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const rendered = body.length > 20;
    const matched = p.expect.test(body);
    const hardErr = errors.filter((e) => e.startsWith('PAGEERROR')).length;
    const ok = rendered && matched && hardErr === 0;
    if (!ok) fail++;
    console.log(`\n[${ok ? 'PASS' : 'FAIL'}] ${p.name}`);
    console.log(`  http=${status} rendered=${rendered} matched-expected=${matched} pageerrors=${hardErr}`);
    console.log(`  snippet: ${body.slice(0, 140)}`);
    if (errors.length) console.log('  errs: ' + errors.slice(0, 3).join(' | '));
  } catch (e) {
    fail++;
    console.log(`\n[FAIL] ${p.name} — ${e.message}`);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n=== ${fail === 0 ? 'ALL SMOKE PAGES OK' : fail + ' FAILED'} ===`);
process.exit(fail === 0 ? 0 : 1);
