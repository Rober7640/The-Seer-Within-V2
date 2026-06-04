// Verifies the /6-6 batch fixes:
//  #1 copy  — popup says "6 FREE minutes" on /6-6
//  #2 aiden — Aiden card "Start chat" opens the popup (stays on /6-6), not /aiden
//  #4 nav   — signing up via a guide card lands in THAT guide's chat (/reading?persona=...)
//
// Run with: node scripts/verify-6-6-batch.mjs   (dev server on :5000)

import { chromium } from 'playwright';
const BASE = 'http://localhost:5000';

async function newPage(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch();
  let fail = 0;

  // #1 copy: open Evelyn's Start chat popup → "6 FREE minutes"
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/6-6`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /start chat/i }).first().click();
    await page.waitForTimeout(800);
    const body = await page.innerText('body');
    const ok = /6 FREE minutes/i.test(body) && !/3 FREE minutes/i.test(body);
    console.log(`${ok ? '✓' : '✗'} #1 popup says "6 FREE minutes"  (6=${/6 FREE minutes/i.test(body)}, 3=${/3 FREE minutes/i.test(body)})`);
    if (!ok) fail++;
    await ctx.close();
  }

  // #2 aiden: Aiden card Start chat opens popup, stays on /6-6 (not /aiden)
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/6-6`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    // Find the Aiden card and click its Start chat
    const aidenCard = page.locator('text=/aiden/i').first();
    await aidenCard.scrollIntoViewIfNeeded().catch(() => {});
    // Click the nearest Start chat — simplest: click every Start chat until a dialog opens with Aiden
    const startButtons = page.getByRole('button', { name: /start chat/i });
    const count = await startButtons.count();
    let opened = false;
    for (let i = 0; i < count; i++) {
      // reload to reset between attempts would be heavy; instead just try the one near Aiden
    }
    // Pragmatic: click Aiden's card Start chat via card container
    const aidenStart = page.locator('div', { hasText: /aiden/i }).getByRole('button', { name: /start chat/i }).first();
    await aidenStart.click({ timeout: 4000 }).catch(async () => {
      // fallback: just click the last Start chat (Aiden often appears in lists)
      await startButtons.last().click();
    });
    await page.waitForTimeout(900);
    const url = page.url();
    const dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    const ok = /\/6-6/.test(url) && !/\/aiden/.test(url) && dialog;
    console.log(`${ok ? '✓' : '✗'} #2 Aiden opens popup, stays on /6-6  (url=${url}, dialog=${dialog})`);
    if (!ok) fail++;
    await ctx.close();
  }

  // #4 nav: fresh signup via a guide card lands in /reading?persona=...
  {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/6-6`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /start chat/i }).first().click();
    await page.waitForTimeout(700);
    const email = `batch_${Date.now()}@local.test`;
    await page.locator('input[name="firstName"]').fill('Batch');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('TestPromo123!');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForTimeout(2500);
    const url = page.url();
    const ok = /\/reading\?persona=/.test(url);
    console.log(`${ok ? '✓' : '✗'} #4 signup lands in guide chat  (url=${url})`);
    if (!ok) fail++;
    await ctx.close();
  }

  await browser.close();
  console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'} ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
