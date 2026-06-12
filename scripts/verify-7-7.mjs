// End-to-end verification of the 7/7 promo on local (dev server on :5000).
//   promo7-tester@local.test → fresh non-buyer, NO grants → claim on /7-7 → 420/persona
//
// Asserts (API level — deterministic):
//   1. starts with 0 promo coins
//   2. POST /promo-claim grants exactly 420 to EVERY active persona (7:00 each)
//   3. claim is idempotent (re-claim does not stack)
// Asserts (render level — Playwright):
//   4. /7-7 shows the "The 7/7 Portal" headline + "7 FREE minutes" banner + a 7:00 badge
//
// Run with: node scripts/verify-7-7.mjs
//
// Prereq: npx tsx scripts/seed-promo7-local-test.ts  (clean test user)

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';
const PER_PERSONA = 420; // 7 min @ 60 coins/min

let fail = 0;
const ok = (n, c, x) => { c ? console.log(`✓ ${n}`) : (fail++, console.error(`✗ ${n}`, x ?? '')); };

async function token(email) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPromo123!' }),
  });
  return (await r.json()).token;
}
async function balances(tok) {
  const r = await fetch(`${BASE}/api/chat-service/promo-balances`, { headers: { Authorization: `Bearer ${tok}` } });
  return (await r.json()).balances || {};
}
async function claim(tok) {
  const r = await fetch(`${BASE}/api/chat-service/promo-claim`, {
    method: 'POST', headers: { Authorization: `Bearer ${tok}` },
  });
  return r.json();
}

(async () => {
  const tok = await token('promo7-tester@local.test');
  if (!tok) { console.error('Could not log in promo7-tester@local.test — run the seeder first.'); process.exit(1); }

  // 1. starts empty
  const before = await balances(tok);
  ok('starts with 0 promo coins', Object.values(before).reduce((a, b) => a + b, 0) === 0, before);

  // 2. claim grants 420 to every active persona
  await claim(tok);
  const after = await balances(tok);
  const vals = Object.values(after);
  ok('claim granted at least one persona', vals.length > 0, after);
  ok(`every persona has exactly ${PER_PERSONA} (7:00)`, vals.length > 0 && vals.every(v => v === PER_PERSONA), after);
  console.log(`  → ${vals.length} personas × ${PER_PERSONA} = ${vals.reduce((a, b) => a + b, 0)} promo coins`);

  // 3. idempotent — re-claim must not stack
  await claim(tok);
  const again = Object.values(await balances(tok));
  ok('re-claim does NOT stack (still 420 each)', again.every(v => v === PER_PERSONA), again);

  // 4. render
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem('seer_auth_token', t), tok);
  await page.goto(`${BASE}/7-7`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const txt = await page.innerText('body');
  await browser.close();

  ok('/7-7 shows "7/7 Portal" headline', /7\/7 Portal/i.test(txt), txt.slice(0, 200));
  ok('/7-7 shows "7 FREE minutes" banner', /7 FREE minutes/i.test(txt));
  ok('/7-7 shows a 7:00 free badge', /7:00\s*free/i.test(txt));

  console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' FAILED'} ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
