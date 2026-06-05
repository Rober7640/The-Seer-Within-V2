// Verifies: for a 6/6 promo participant, a guide whose promo is USED UP (coins_remaining=0)
// shows NOTHING in the sidebar — not the "3 minutes FREE" trial label — while guides still
// in credit show "🎁 6:00 FREE". Prereq: marcus-stone grant zeroed for promo-tester.
// Run: node scripts/verify-6-6-usedup-hidden.mjs   (dev server on :5000)

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
await page.addInitScript((t) => localStorage.setItem('seer_auth_token', t), token);
// Chat with Evelyn (online) so Marcus + others appear in the "Other Guides" sidebar.
await page.goto(`${BASE}/reading?persona=evelyn-cross`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);

// Grab each sidebar guide row's text. The desktop <aside> holds the guide list.
const rows = await page.locator('aside button').allInnerTexts().catch(() => []);
const marcusRow = rows.find(t => /marcus stone/i.test(t)) ?? '';
const otherFreeRow = rows.find(t => /free/i.test(t) && !/marcus/i.test(t)) ?? '';

const marcusHidesFree = marcusRow !== '' && !/free/i.test(marcusRow);
const othersStillShowFree = /free/i.test(otherFreeRow);

console.log(`Marcus row text: ${JSON.stringify(marcusRow.replace(/\s+/g,' ').trim())}`);
console.log(`${marcusHidesFree ? '✓' : '✗'} used-up guide (Marcus) shows NO "FREE" label`);
console.log(`${othersStillShowFree ? '✓' : '✗'} a guide still in credit shows "FREE" (badge intact)`);

await browser.close();
process.exit(marcusHidesFree && othersStillShowFree ? 0 : 1);
