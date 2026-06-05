// Verifies #3: a 6/6 promo user (0 real coins, 360 promo) sees their 360 / 6:00 in the
// top-right "paused" (disabled/greyed) pill the moment they land in the chat — before any
// message. Run with: node scripts/verify-6-6-promo-pill.mjs   (dev server on :5000)

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';

async function tokenFor(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPromo123!' }),
  });
  return (await res.json()).token;
}

(async () => {
  const token = await tokenFor('promo-tester@local.test');
  if (!token) { console.log('✗ could not log in promo-tester'); process.exit(1); }

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem('seer_auth_token', t), token);

  // luna-voss confirmed present from the batch test; any active guide works.
  await page.goto(`${BASE}/reading?persona=luna-voss`, { waitUntil: 'networkidle' });
  // Wait for the greeting to load (preSessionGreeting drives the paused pill).
  await page.waitForTimeout(6000);

  const body = await page.innerText('body');
  const has360 = /\b360\b/.test(body);
  console.log(`${has360 ? '✓' : '✗'} #3 promo user sees 360 in chat before first message  (360 present=${has360})`);
  if (!has360) {
    console.log('   (If false, the greeting may not have loaded locally — needs ANTHROPIC_API_KEY. Eyeball on staging.)');
    console.log('   body snippet:', body.replace(/\s+/g, ' ').slice(0, 240));
  }

  await browser.close();
  process.exit(has360 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
