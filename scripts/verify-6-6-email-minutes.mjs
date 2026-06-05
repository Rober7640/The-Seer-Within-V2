// Verifies the verification-email "free minutes" number per funnel, incl. the new 6/6 branch.
// Server logic: scripts pulls the real getFreeMinutesForSignup from verificationEmail.ts.
// Client wiring (that /6-6 signup actually sends source=promo-6-6) is checked separately below.
// Run: node scripts/verify-6-6-email-minutes.mjs   (dev server on :5000)

import { getFreeMinutesForSignup } from '../server/lib/verificationEmail.ts';
import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';

let fail = 0;
const expect = (label, got, want) => {
  const ok = got === want;
  console.log(`${ok ? '✓' : '✗'} ${label}: got ${got}, want ${want}`);
  if (!ok) fail++;
};

// --- server logic ---
expect('6/6 signup (any guide) → 6', getFreeMinutesForSignup('marcus-stone', 'promo-6-6'), 6);
expect('6/6 signup on Aiden → 6 (promo wins over 10)', getFreeMinutesForSignup('aiden-powers', 'promo-6-6'), 6);
expect('evelyn lander → 5', getFreeMinutesForSignup('evelyn-cross', 'evelyn-lander'), 5);
expect('aiden (no promo) → 10', getFreeMinutesForSignup('aiden-powers', undefined), 10);
expect('default signup → 3', getFreeMinutesForSignup('luna-voss', undefined), 3);

// --- client wiring: /6-6 signup posts source=promo-6-6; /personas does not ---
async function captureRegisterSource(path) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let body = null;
  page.on('request', (req) => {
    if (req.url().endsWith('/api/auth/register') && req.method() === 'POST') {
      try { body = JSON.parse(req.postData() || '{}'); } catch {}
    }
  });
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /start chat/i }).first().click();
  await page.waitForTimeout(700);
  await page.locator('input[name="firstName"]').fill('Tag');
  await page.locator('input[name="email"]').fill(`tag_${path.replace(/\W/g,'')}_${Date.now()}@local.test`);
  await page.locator('input[name="password"]').fill('TestPromo123!');
  await page.getByRole('button', { name: /create account/i }).click();
  await page.waitForTimeout(2000);
  await browser.close();
  return body?.source ?? null;
}

const sixSource = await captureRegisterSource('/6-6');
expect('/6-6 signup sends source=promo-6-6', sixSource, 'promo-6-6');
const personasSource = await captureRegisterSource('/personas');
expect('/personas signup sends NO promo source', personasSource, null);

console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'} ===\n`);
process.exit(fail > 0 ? 1 : 0);
