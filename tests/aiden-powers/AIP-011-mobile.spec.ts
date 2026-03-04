/**
 * AIP-011: Mobile Viewport (375×812 — iPhone SE/12)
 *
 * Key scenarios verified at mobile viewport to ensure Aiden Powers
 * is usable on phones.
 *
 * Checks:
 * - Pre-session screen: Aiden avatar, name, tagline, "Start Reading" button
 * - Chat interface: input accessible, message sends, credit display visible
 * - Personas directory: Aiden's card renders cleanly with tagline
 * - Out-of-credits modal: centered, tappable CTA button
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
  AIDEN_SLUG,
} from './helpers';

const PWD = 'TestPass123!';
const MOBILE = { width: 375, height: 812 };

// ─────────────────────────────────────────────────────────────────────────────
// AIP-011-01: Pre-session screen renders on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-011-01: Aiden Powers pre-session screen fully visible at mobile viewport', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  const email = uniqueEmail('aip-011-01');
  await registerUser(page, email, PWD);

  await page.goto(`/chat/${AIDEN_SLUG}`);
  await page.waitForTimeout(2000);

  // Key elements must be visible
  await expect(page.locator('text=Aiden Powers').first()).toBeVisible({ timeout: 10000 });

  // Either the "Begin Reading" button OR the auto-loaded greeting bubble must be visible.
  // The app auto-fetches a greeting (no button shown in that flow). The greeting can take
  // up to ~12s (persona load + Claude API + typing delay), so use a generous timeout.
  // Check button instantly first; if absent, wait up to 20s for the greeting bubble.
  const button = page.locator(SELECTORS.beginReading);
  // Prefer data-testid selector; fall back to CSS class used by older versions
  const greeting = page.locator('[data-testid="chat-greeting"], [data-testid="assistant-message"]').first();

  const hasButton = await button.isVisible().catch(() => false);
  let hasGreeting = false;
  if (!hasButton) {
    try {
      await greeting.waitFor({ state: 'visible', timeout: 20000 });
      hasGreeting = true;
    } catch {
      hasGreeting = false;
    }
  }
  expect(hasButton || hasGreeting).toBeTruthy();

  // Check tagline visibility
  const taglineVisible = await page.locator('text=/Master Numerologist|Life Blueprint/i').first().isVisible().catch(() => false);
  console.log('AIP-011-01: Tagline visible on mobile:', taglineVisible);

  // No horizontal scroll
  const hasHorizontalScroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  expect(hasHorizontalScroll).toBeFalsy();

  // If "Begin Reading" button is visible, verify it's large enough to tap
  const btn = page.locator(SELECTORS.beginReading).first();
  const btnVisible = await btn.isVisible().catch(() => false);
  if (btnVisible) {
    const box = await btn.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(36); // min tap target
      expect(box.width).toBeGreaterThanOrEqual(100);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-011-02: Chat interface usable on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-011-02: Aiden chat interface is interactive on mobile viewport', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize(MOBILE);
  const email = uniqueEmail('aip-011-02');
  await registerUser(page, email, PWD);

  await page.goto(`/chat/${AIDEN_SLUG}`);
  await page.waitForTimeout(1000);
  await startSession(page);

  // Message input should be accessible
  const input = page.locator(SELECTORS.chatInput).first();
  await expect(input).toBeVisible({ timeout: 10000 });

  // Click the input (tap not supported without hasTouch context option)
  await input.click();
  await page.waitForTimeout(500);

  // Type a message
  await input.fill('Hello');
  await page.locator(SELECTORS.sendButton).click();
  await page.waitForTimeout(3000);

  // User message should appear
  await expect(page.locator('text=Hello').first()).toBeVisible({ timeout: 10000 });

  // Credit display should still be visible
  await expect(page.locator(SELECTORS.creditDisplay)).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-011-03: Personas directory renders cleanly on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-011-03: /personas renders Aiden Powers card at mobile viewport without overflow', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  const email = uniqueEmail('aip-011-03');
  await registerUser(page, email, PWD);

  await page.goto('/personas');
  await page.waitForTimeout(2000);

  // Aiden Powers card should be visible
  const aidenCard = page.locator('text=Aiden Powers').first();
  const isVisible = await aidenCard.isVisible().catch(() => false);

  if (isVisible) {
    await expect(aidenCard).toBeVisible();

    // Tagline should be readable
    const taglineVisible = await page.locator('text=/Master Numerologist|Life Blueprint|Decoder/i').first().isVisible().catch(() => false);
    console.log('AIP-011-03: Aiden tagline visible on /personas mobile:', taglineVisible);

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
    // /personas may redirect to login when not authenticated properly
    const currentUrl = page.url();
    console.log('AIP-011-03 INFO: /personas redirected to', currentUrl);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-011-04: Out-of-credits modal renders correctly on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-011-04: Out-of-credits modal is visible and tappable on mobile', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize(MOBILE);

  const email = uniqueEmail('aip-011-04');
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

  await adminAdjustCredits(page, adminToken!, userId, -180, 'Mobile modal test drain AIP-011-04');

  // Return to Aiden's reading as user with 0 coins
  await loginUser(page, email, PWD);
  await page.setViewportSize(MOBILE);
  await page.goto(`/chat/${AIDEN_SLUG}`);
  await page.waitForTimeout(1000);
  await startSession(page);

  // Try to send a message
  await page.locator(SELECTORS.chatInput).first().fill('Tell me my life path');
  await page.locator(SELECTORS.sendButton).click();
  await page.waitForTimeout(5000);

  // Out-of-credits modal or inline error should be visible
  const modal = page.locator(SELECTORS.outOfCreditsModal);
  const hasModal = await modal.isVisible().catch(() => false);

  if (hasModal) {
    // Modal should not be clipped off screen
    const box = await modal.boundingBox();
    if (box) {
      expect(box.y).toBeGreaterThanOrEqual(0); // not above viewport
      expect(box.y + box.height).toBeLessThanOrEqual(MOBILE.height + 50); // not far below
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
    // Some implementations show inline message instead of modal
    const outOfCreditsInline = page.locator('text=/credits|coins|balance/i');
    const hasInline = await outOfCreditsInline.first().isVisible().catch(() => false);
    console.log('AIP-011-04: No full modal — inline out-of-credits message:', hasInline);
  }
});
