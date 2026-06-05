// End-to-end: the claim only fires via /6-6, never via /personas/login.
//   claim-e2e@local.test   → fresh non-buyer, no grants → lands on /6-6 → should get 6:00
//   nopromo-tester@local.test → lands on /personas only → should get NOTHING
//
// Run with: node scripts/verify-claim-e2e.mjs   (dev server on :5000)

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';

async function token(email) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPromo123!' }),
  });
  return (await r.json()).token;
}
async function promoCoins(tok) {
  const r = await fetch(`${BASE}/api/chat-service/promo-balances`, { headers: { Authorization: `Bearer ${tok}` } });
  const { balances } = await r.json();
  return Object.values(balances || {}).reduce((a, b) => a + b, 0);
}
async function visit(browser, path, tok) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem('seer_auth_token', t), tok);
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500); // let claim + balance effects run
  const txt = await page.innerText('body');
  await ctx.close();
  return txt;
}
let fail = 0;
const ok = (n, c, x) => { c ? console.log(`✓ ${n}`) : (fail++, console.error(`✗ ${n}`, x ?? '')); };

(async () => {
  const e2e = await token('claim-e2e@local.test');
  const nop = await token('nopromo-tester@local.test');
  const browser = await chromium.launch();

  ok('claim-e2e starts with 0 promo coins', await promoCoins(e2e) === 0);

  // Land on /6-6 → claim should fire
  const sixTxt = await visit(browser, '/6-6', e2e);
  ok('/6-6 shows 6:00 free badge after claim', /6:00\s*free/i.test(sixTxt));
  ok('claim-e2e now has 6×360 = 2160 promo coins', await promoCoins(e2e) === 2160, await promoCoins(e2e));

  // nopromo-tester visits ONLY /personas → must NOT get a grant
  const before = await promoCoins(nop);
  const persTxt = await visit(browser, '/personas', nop);
  const after = await promoCoins(nop);
  ok('/personas did NOT grant promo (still 0)', before === 0 && after === 0, { before, after });
  ok('/personas shows no 6:00 badge for no-grant user', !/6:00\s*free/i.test(persTxt));

  await browser.close();
  console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' FAILED'} ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
