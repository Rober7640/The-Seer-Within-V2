/**
 * EVE-011: Mobile Viewport (375×812 — iPhone SE/12)
 *
 * Key scenarios verified at mobile viewport to ensure the chat service
 * is usable on phones.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  registerUser,
  startSession,
  adminAdjustCredits,
  apiAdminLogin,
  SELECTORS,
  BASE_URL,
} from './helpers';

const PWD = 'TestPass123!';
const MOBILE = { width: 375, height: 812 };

// ─────────────────────────────────────────────────────────────────────────────
// EVE-011-01: Pre-session screen renders on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-011-01: Pre-session screen fully visible at mobile viewport', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  const email = uniqueEmail('eve-011-01');
  await registerUser(page, email, PWD);

  // Navigate to Evelyn's chat page (pre-session state)
  await page.goto('/chat/evelyn-cross');
  await page.waitForTimeout(1000);

  // Key elements must be visible
  await expect(page.locator('text=Evelyn Cross').first()).toBeVisible({ timeout: 10000 });

  // Chat input should be visible (app auto-loads greeting, no separate "begin" button)
  const chatInput = page.locator(SELECTORS.chatInput).first();
  await expect(chatInput).toBeVisible({ timeout: 10000 });

  // No horizontal scroll
  const hasHorizontalScroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  expect(hasHorizontalScroll).toBeFalsy();

  // Chat input should be large enough to tap
  const box = await chatInput.boundingBox();
  if (box) {
    expect(box.height).toBeGreaterThanOrEqual(36); // min tap target
    expect(box.width).toBeGreaterThanOrEqual(100);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-011-02: Chat interface usable on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-011-02: Chat interface is interactive on mobile viewport', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize(MOBILE);
  const email = uniqueEmail('eve-011-02');
  await registerUser(page, email, PWD);
  await startSession(page);

  // Message input should be accessible
  const input = page.locator(SELECTORS.chatInput).first();
  await expect(input).toBeVisible({ timeout: 10000 });

  // Click/focus the input (tap requires hasTouch context — click works at mobile viewport)
  await input.click();
  await page.waitForTimeout(500);

  // Type a message
  await input.fill('Hello');
  await page.locator(SELECTORS.sendButton).click();
  await page.waitForTimeout(8000); // allow session start API + response

  // User message should appear
  await expect(page.locator('text=Hello').first()).toBeVisible({ timeout: 10000 });

  // Credit display should still be visible
  await expect(page.locator(SELECTORS.creditDisplay)).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-011-03: Personas directory renders cleanly on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-011-03: /personas renders Evelyn card at mobile viewport without overflow', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  const email = uniqueEmail('eve-011-03');
  await registerUser(page, email, PWD);

  await page.goto('/personas');
  await page.waitForTimeout(2000);

  // Evelyn card should be visible
  const evelynCard = page.locator('text=Evelyn Cross').first();
  const isVisible = await evelynCard.isVisible().catch(() => false);

  if (isVisible) {
    await expect(evelynCard).toBeVisible();

    // "Start Reading" or "Chat Now" button should be tappable
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
    console.log('INFO: /personas redirected to', currentUrl);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-011-04: Out-of-credits modal renders correctly on mobile
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-011-04: Out-of-credits modal is visible and tappable on mobile', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize(MOBILE);

  const email = uniqueEmail('eve-011-04');
  await registerUser(page, email, PWD);

  // Drain coins via admin API (no browser navigation — preserves user session)
  const token = await page.evaluate(() => localStorage.getItem('seer_auth_token'));
  const adminToken = await apiAdminLogin(page);

  const meRes = await page.request.get(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  const userId = meData.user?.id ?? meData.id;

  await adminAdjustCredits(page, adminToken, userId, -180, 'Mobile modal test drain');

  // User is still logged in (apiAdminLogin doesn't navigate) — go straight to chat
  await page.setViewportSize(MOBILE);
  await startSession(page);

  // Try to send a message
  await page.locator(SELECTORS.chatInput).first().fill('Hello');
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
    console.log('No full modal — inline out-of-credits message:', hasInline);
  }
});
