// Verifies the /6-6 fix: the nav top-right "Sign In" opens the IN-PAGE auth popup and
// keeps the user on /6-6 (so the promo claim can fire), instead of navigating to /login.
// Regression: on /personas, "Sign In" must STILL go to /login (unchanged behavior).
//
// Run with: node scripts/verify-6-6-signin-popup.mjs   (dev server on :5000)

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';

async function clickSignIn(browser, path) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // The guest nav "Sign In" button (top right)
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForTimeout(1000);
  const url = page.url();
  // Modal renders a Dialog with an email field + "Sign in to chat with" copy
  const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
  await ctx.close();
  return { url, dialogVisible };
}

(async () => {
  const browser = await chromium.launch();
  let fail = 0;

  // 1) /6-6 → Sign In opens popup, stays on /6-6
  const a = await clickSignIn(browser, '/6-6');
  const aOk = a.dialogVisible && /\/6-6/.test(a.url) && !/\/login/.test(a.url);
  console.log(`${aOk ? '✓' : '✗'} /6-6 Sign In opens popup & stays on /6-6  (dialog=${a.dialogVisible}, url=${a.url})`);
  if (!aOk) fail++;

  // 2) /personas → Sign In still navigates to /login (regression)
  const b = await clickSignIn(browser, '/personas');
  const bOk = /\/login/.test(b.url);
  console.log(`${bOk ? '✓' : '✗'} /personas Sign In still goes to /login (unchanged)  (url=${b.url})`);
  if (!bOk) fail++;

  await browser.close();
  console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'} ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
