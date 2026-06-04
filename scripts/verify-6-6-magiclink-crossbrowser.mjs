// Verifies #5b cross-browser: a passwordless sign-in link that lands on /6-6?persona=<slug>
// forwards into that guide's chat using ONLY the URL param — no localStorage hint (i.e. the
// email was opened in a different browser/device than where the user signed up).
// Run: node scripts/verify-6-6-magiclink-crossbrowser.mjs   (dev server on :5000)

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
// Only the token in storage — NO 'seer-6-6-pending-persona' key (fresh browser).
await page.addInitScript((t) => localStorage.setItem('seer_auth_token', t), token);
await page.goto(`${BASE}/6-6?persona=marcus-stone`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

const url = page.url();
const ok = /\/reading\?persona=marcus-stone/.test(url);
console.log(`${ok ? '✓' : '✗'} /6-6?persona=… forwards to guide chat with NO localStorage  (url=${url})`);

await browser.close();
process.exit(ok ? 0 : 1);
