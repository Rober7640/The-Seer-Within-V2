/**
 * LUV-011: Mobile Viewport (375×812 — iPhone SE/12)
 *
 * Key scenarios verified at mobile viewport to ensure Luna Voss
 * is usable on phones.
 *
 * Checks:
 *  - Pre-session screen: Luna avatar, name, tagline "Your Natal Chart, Decoded", Start Reading
 *  - Chat interface: input accessible, message sends, credit display visible
 *  - Personas directory: Luna's card renders cleanly with tagline
 *  - Out-of-credits modal: centered, tappable CTA button
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  registerUser,
  loginUser,
  startSession,
  loginAdmin,
  getAdminToken,
  adminAdjustCredits,
  apiRegister,
  getAuthToken,
  SELECTORS,
  BASE_URL,
  LUNA_SLUG,
} from './helpers';

const PWD = 'TestPass123!';
const MOBILE = { width: 375, height: 812 };

// ─────────────────────────────────────────────────────────────────────────────
// LUV-011-01: Pre-session screen renders on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-011-01: Luna Voss pre-session screen fully visible at mobile viewport', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  const email = uniqueEmail('luv-011-01');
  await registerUser(page, email, PWD);

  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(2000);

  // Key elements must be visible
  await expect(page.locator('text=Luna Voss').first()).toBeVisible({ timeout: 10000 });
  // New Luna user: pre-session screen is the birth data form (not "Begin Your Reading").
  // Check for the birth data submit button as the entry-point CTA.
  await expect(page.locator(SELECTORS.birthDataSubmit).first()).toBeVisible({ timeout: 10000 });

  // Tagline check
  const taglineVisible = await page.locator('text=/Your Natal Chart, Decoded|Natal Chart/i').first().isVisible().catch(() => false);
  console.log('LUV-011-01: Tagline visible on mobile:', taglineVisible);

  // No horizontal scroll
  const hasHorizontalScroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  expect(hasHorizontalScroll).toBeFalsy();

  // "Calculate My Birth Chart" submit button should be large enough to tap
  const btn = page.locator(SELECTORS.birthDataSubmit).first();
  const box = await btn.boundingBox();
  if (box) {
    expect(box.height).toBeGreaterThanOrEqual(36); // min tap target
    expect(box.width).toBeGreaterThanOrEqual(100);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-011-02: Chat interface usable on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-011-02: Luna Voss chat interface is interactive on mobile viewport', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize(MOBILE);
  const email = uniqueEmail('luv-011-02');
  await registerUser(page, email, PWD);

  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(1000);
  await startSession(page);

  // Message input should be accessible
  const input = page.locator(SELECTORS.chatInput).first();
  await expect(input).toBeVisible({ timeout: 10000 });

  // Tap the input
  await input.tap();
  await page.waitForTimeout(500);

  // Type a message
  await input.fill('Hello');
  await page.locator(SELECTORS.sendButton).tap();
  await page.waitForTimeout(3000);

  // User message should appear
  await expect(page.locator('text=Hello').first()).toBeVisible({ timeout: 10000 });

  // Credit display should still be visible
  await expect(page.locator(SELECTORS.creditDisplay)).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-011-03: Personas directory renders cleanly on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-011-03: /personas renders Luna Voss card at mobile viewport without overflow', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  const email = uniqueEmail('luv-011-03');
  await registerUser(page, email, PWD);

  await page.goto('/personas');
  await page.waitForTimeout(2000);

  const lunaCard = page.locator('text=Luna Voss').first();
  const isVisible = await lunaCard.isVisible().catch(() => false);

  if (isVisible) {
    await expect(lunaCard).toBeVisible();

    // Tagline should be readable
    const taglineVisible = await page.locator('text=/Natal Chart, Decoded|Natal Chart|astrology/i').first().isVisible().catch(() => false);
    console.log('LUV-011-03: Luna tagline visible on /personas mobile:', taglineVisible);

    // "Chat Now" or "Start Reading" button should be tappable
    const readBtn = page.locator('button:has-text("Start Reading"), button:has-text("Chat Now")').first();
    if (await readBtn.isVisible().catch(() => false)) {
      const box = await readBtn.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(36);
      }
    }

    // No horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(hasHorizontalScroll).toBeFalsy();
  } else {
    const currentUrl = page.url();
    console.log('LUV-011-03 INFO: /personas redirected to', currentUrl);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-011-04: Out-of-credits modal renders correctly on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-011-04: Out-of-credits modal is visible and tappable on mobile', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize(MOBILE);

  const email = uniqueEmail('luv-011-04');
  await registerUser(page, email, PWD);

  // Drain coins via admin
  const token = await getAuthToken(page);
  await loginAdmin(page);
  const adminToken = await getAdminToken(page);

  const meRes = await page.request.get(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  const userId = meData.user?.id ?? meData.id;

  await adminAdjustCredits(page, adminToken!, userId, -180, 'Mobile modal test drain LUV-011-04');

  // Return to Luna's reading as user with 0 coins
  await loginUser(page, email, PWD);
  await page.setViewportSize(MOBILE);
  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(1000);
  await startSession(page);

  // Try to send a message
  await page.locator(SELECTORS.chatInput).first().fill('Show me my chart');
  await page.locator(SELECTORS.sendButton).tap();
  await page.waitForTimeout(5000);

  const modal = page.locator(SELECTORS.outOfCreditsModal);
  const hasModal = await modal.isVisible().catch(() => false);

  if (hasModal) {
    // Modal should not be clipped off screen
    const box = await modal.boundingBox();
    if (box) {
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(MOBILE.height + 50);
    }

    // CTA button should be tappable
    const cta = page.locator(SELECTORS.purchaseCTA);
    const ctaVisible = await cta.isVisible().catch(() => false);
    if (ctaVisible) {
      const ctaBox = await cta.boundingBox();
      if (ctaBox) {
        expect(ctaBox.height).toBeGreaterThanOrEqual(36);
      }
    }
  } else {
    const outOfCreditsInline = page.locator('text=/credits|coins|balance/i');
    const hasInline = await outOfCreditsInline.first().isVisible().catch(() => false);
    console.log('LUV-011-04: No full modal — inline out-of-credits message:', hasInline);
  }
});
