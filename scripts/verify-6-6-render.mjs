// Headless render check for the "promo follows the user" model (Option A).
// Promo badge is driven by the user's ACTUAL per-guide promo balance, on every surface.
//
// Expectations:
//   /6-6 logged OUT (no grant)        → NO "6:00 free" per-card badge (no false promise)
//   /6-6 logged IN  (promo-tester)    → "6:00 free" badges, NO "mins free" default
//   /personas logged IN (promo-tester)→ "6:00 free" badges, NO "mins free" (promo follows user)
//   /personas logged IN (nopromo)     → NO promo badge, "mins free" default shows (UNCHANGED)
//
// Run with: node scripts/verify-6-6-render.mjs   (dev server on :5000)

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';

async function tokenFor(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPromo123!' }),
  });
  const j = await res.json();
  return j.token;
}

async function bodyText(browser, path, token) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  if (token) await page.addInitScript((t) => localStorage.setItem('seer_auth_token', t), token);
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const txt = await page.innerText('body');
  await ctx.close();
  return txt;
}

function check(label, txt, { sixFree, minsFree }) {
  const hasSix = /6:00\s*free/i.test(txt);
  const hasMins = /mins free/i.test(txt);
  let ok = true;
  const notes = [];
  if (sixFree !== undefined && hasSix !== sixFree) { ok = false; notes.push(`expected 6:00-free=${sixFree} got ${hasSix}`); }
  if (minsFree !== undefined && hasMins !== minsFree) { ok = false; notes.push(`expected mins-free=${minsFree} got ${hasMins}`); }
  console.log(`${ok ? '✓' : '✗'} ${label}  (6:00 free=${hasSix}, mins free=${hasMins})${notes.length ? ' — ' + notes.join('; ') : ''}`);
  return ok;
}

(async () => {
  const promo = await tokenFor('promo-tester@local.test');
  const nopromo = await tokenFor('nopromo-tester@local.test');
  const browser = await chromium.launch();
  let fail = 0;

  if (!check('/6-6 logged OUT', await bodyText(browser, '/6-6', null), { sixFree: false })) fail++;
  if (!check('/6-6 logged IN (promo)', await bodyText(browser, '/6-6', promo), { sixFree: true, minsFree: false })) fail++;
  if (!check('/personas logged IN (promo) — follows user', await bodyText(browser, '/personas', promo), { sixFree: true, minsFree: false })) fail++;
  if (!check('/personas logged IN (NO promo) — unchanged', await bodyText(browser, '/personas', nopromo), { sixFree: false, minsFree: true })) fail++;

  await browser.close();
  console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'} ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
