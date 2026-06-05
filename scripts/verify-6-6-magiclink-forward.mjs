// Verifies #5b (same-device): when a passwordless user returns via their sign-in link to
// /6-6 with a remembered guide, /6-6 claims the promo and forwards them into THAT guide's
// chat. We simulate the magic-auth return by landing on /6-6 already authed with the
// "seer-6-6-pending-persona" key set (exactly what the modal stores on NO_PASSWORD).
// Run: node scripts/verify-6-6-magiclink-forward.mjs   (dev server on :5000)

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';

const res = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'promo-tester@local.test', password: 'TestPromo123!' }),
});
const token = (await res.json()).token;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.addInitScript((t) => {
  localStorage.setItem('seer_auth_token', t);
  // Only seed the pending guide when first landing on /6-6 (mimics the modal); don't
  // re-seed on the forward navigation, which would mask the app's removeItem.
  if (location.pathname === '/6-6') localStorage.setItem('seer-6-6-pending-persona', 'marcus-stone');
}, token);
await page.goto(`${BASE}/6-6`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const url = page.url();
const keyCleared = await page.evaluate(() => localStorage.getItem('seer-6-6-pending-persona') === null);
const ok = /\/reading\?persona=marcus-stone/.test(url) && keyCleared;
console.log(`${ok ? '✓' : '✗'} #5b forwards to remembered guide chat & clears key  (url=${url}, cleared=${keyCleared})`);

await browser.close();
process.exit(ok ? 0 : 1);
