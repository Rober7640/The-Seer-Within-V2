// Verifies #5a: signing in with a PASSWORDLESS account on the /6-6 modal shows a green
// "Check Your Email / sign-in link sent" SUCCESS panel — not the red raw NO_PASSWORD error.
// Prereq: npx tsx scripts/seed-passwordless-test.ts
// Run:    node scripts/verify-6-6-passwordless-msg.mjs   (dev server on :5000)

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';
const EMAIL = 'passwordless-tester@local.test';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${BASE}/6-6`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /start chat/i }).first().click();
await page.waitForTimeout(600);
// Toggle the modal into Sign-in mode
await page.getByRole('button', { name: /already have an account/i }).click();
await page.waitForTimeout(300);
await page.locator('input[name="email"]').fill(EMAIL);
await page.locator('input[name="password"]').fill('whatever123');
await page.getByRole('button', { name: /^sign in$/i }).click();
await page.waitForTimeout(1500);

const body = await page.innerText('body');
const showsSuccess = /sent a sign-in link/i.test(body) && /check your email/i.test(body);
const leaksError = /NO_PASSWORD/.test(body) || /\b400\b/.test(body);
// Confirm it's rendered in the green (emerald) success block, not the red error block
const greenIcon = await page.locator('.bg-emerald-500\\/15, .text-emerald-300').first().isVisible().catch(() => false);

const ok = showsSuccess && !leaksError && greenIcon;
console.log(`${ok ? '✓' : '✗'} #5a passwordless shows GREEN success, no raw error`);
console.log(`   success-copy=${showsSuccess}, leaks-raw-error=${leaksError}, green-styled=${greenIcon}`);
if (!ok) console.log('   body snippet:', body.replace(/\s+/g, ' ').slice(0, 200));

await browser.close();
process.exit(ok ? 0 : 1);
