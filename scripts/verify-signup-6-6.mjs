// Verifies a BRAND-NEW signup gets the 6 min immediately on /6-6 (no verification wall).
// Mirrors the frontend: register (returns a token even though unverified) → land on /6-6
// authenticated → claim fires.
//
// Run with: node scripts/verify-signup-6-6.mjs   (dev server on :5000)

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';

async function promoCoins(tok) {
  const r = await fetch(`${BASE}/api/chat-service/promo-balances`, { headers: { Authorization: `Bearer ${tok}` } });
  const { balances } = await r.json();
  return Object.values(balances || {}).reduce((a, b) => a + b, 0);
}
let fail = 0;
const ok = (n, c, x) => { c ? console.log(`✓ ${n}`) : (fail++, console.error(`✗ ${n}`, x ?? '')); };

(async () => {
  // Brand-new email — register via the same API the signup modal calls
  const email = `signup-6-6-${Date.now()}@local.test`;
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPromo123!', firstName: 'NewSignup' }),
  });
  const data = await reg.json();
  ok('register returned a token (authenticated)', !!data.token, data);
  ok('register flagged requiresVerification (unverified)', data.requiresVerification === true, data);
  ok('brand-new user starts with 0 promo coins', await promoCoins(data.token) === 0);

  // Simulate staying on /6-6 authenticated (what the modal now does instead of the verify wall)
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem('seer_auth_token', t), data.token);
  await page.goto(`${BASE}/6-6`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const txt = await page.innerText('body').catch(() => '');
  ok('/6-6 shows 6:00 free badge for the new signup', /6:00\s*free/i.test(txt));
  await browser.close();

  ok('new (unverified) signup now has 6×360 = 2160 promo coins', await promoCoins(data.token) === 2160, await promoCoins(data.token));

  console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' FAILED'} ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
