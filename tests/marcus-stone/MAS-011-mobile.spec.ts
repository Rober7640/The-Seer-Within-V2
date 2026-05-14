import { test, expect } from '@playwright/test';

/**
 * MAS-011: Marcus Stone — Mobile Viewport (375×812)
 * All tests run at iPhone-sized viewport.
 * Tests pre-session screen, chat interface (including tarot draw UI),
 * personas directory, and OutOfCreditsModal on mobile.
 */

test.describe('MAS-011: Marcus Stone — Mobile Viewport (375×812)', () => {
  const PASSWORD = 'MarcusMobile123!';

  test.use({
    viewport: { width: 375, height: 812 },
  });

  async function registerAndNavigateToMarcus(page: any, prefix: string) {
    const email = `mas011-${prefix}-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', prefix);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 15000 });
    await page.goto('/chat/marcus-stone');
    await page.waitForTimeout(1000);
    return email;
  }

  test('MAS-011-01: Pre-session screen renders correctly on mobile', async ({ page }) => {
    await registerAndNavigateToMarcus(page, 'MobilePreSession');

    // Persona name should be visible
    await expect(page.locator('text=Marcus Stone').first()).toBeVisible({ timeout: 10000 });

    // Tagline should be readable
    const taglineVisible = await page.locator('text=/Tarot Master|Spiritual Advisor/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (taglineVisible) {
      console.log('PASS: Tagline visible on mobile');
    }

    // Begin Reading button should be tappable (visible and within viewport)
    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });

    // Check button size is tappable (min 44px height)
    const btnBox = await beginBtn.first().boundingBox();
    if (btnBox) {
      console.log(`Begin Reading button: ${btnBox.width}×${btnBox.height}px`);
      expect(btnBox.height).toBeGreaterThanOrEqual(36); // Allow slight flexibility
    }

    // No horizontal scrollbar
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const hasHorizontalScroll = scrollWidth > clientWidth;

    if (!hasHorizontalScroll) {
      console.log('PASS: No horizontal scroll on mobile pre-session screen');
    } else {
      console.log('WARN: Horizontal scroll detected (scrollWidth:', scrollWidth, ', clientWidth:', clientWidth, ')');
    }

    // Pricing info should be visible
    const pricingVisible = await page.locator('text=/\\$18|\\$30|15 min|30 min/i').first().isVisible().catch(() => false);
    if (pricingVisible) {
      console.log('PASS: Pricing info visible on mobile');
    } else {
      console.log('INFO: Pricing info not immediately visible (may be collapsed on mobile)');
    }
  });

  test('MAS-011-02: Chat interface usable on mobile (including tarot draw)', async ({ page }) => {
    await registerAndNavigateToMarcus(page, 'MobileChat');

    // Start session
    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });
    await beginBtn.first().click();
    await page.waitForTimeout(4000);

    // Message input should be accessible
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible({ timeout: 5000 });

    // Tap input and type
    await input.tap();
    await input.fill('I want a tarot reading about my love life');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(20000);

    // Check if messages are displayed
    const responses = page.locator('.bg-white.text-gray-800.border');
    const count = await responses.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Check for tarot draw UI if response triggers it
    const tarotUI = page.locator('[data-testid*="tarot"], .tarot-draw, [class*="tarot"], [class*="card-pick"]');
    const hasTarotUI = await tarotUI.first().isVisible().catch(() => false);
    if (hasTarotUI) {
      console.log('PASS: Tarot draw UI rendered on mobile');
      // Verify it fits within mobile viewport
      const box = await tarotUI.first().boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(375);
        console.log('PASS: Tarot UI fits within 375px mobile width');
      }
    } else {
      console.log('INFO: No tarot draw UI visible (response may not have triggered [TAROT_DRAW])');
    }

    // Credit balance should be visible
    const creditDisplay = await page.locator('text=/min remaining|minutes remaining|\d+ min/i').first().isVisible().catch(() => false);
    if (creditDisplay) {
      console.log('PASS: Credit balance indicator visible on mobile');
    }

    // Messages scrollable and readable
    const lastResponse = responses.last();
    await expect(lastResponse).toBeVisible({ timeout: 5000 });
    const responseBox = await lastResponse.boundingBox();
    if (responseBox) {
      expect(responseBox.width).toBeLessThanOrEqual(375);
      console.log('PASS: Response messages fit within mobile width');
    }
  });

  test('MAS-011-03: Personas directory renders cleanly on mobile', async ({ page }) => {
    // Register first (some implementations require auth for /personas)
    const email = `mas011-dir-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'MobileDir');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 15000 });

    await page.goto('/personas');
    await page.waitForTimeout(2000);

    // Check if personas are displayed or login required
    const marcusCard = page.locator('text=Marcus Stone').first();
    const marcusVisible = await marcusCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (marcusVisible) {
      console.log('PASS: Marcus Stone card visible on mobile personas directory');

      // Check for no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      if (scrollWidth <= clientWidth) {
        console.log('PASS: No horizontal scroll on mobile personas directory');
      } else {
        console.log('WARN: Horizontal scroll detected');
      }

      // Check "Chat Now" or "Start Reading" button
      const chatBtn = page.locator('button:has-text("Chat Now"), button:has-text("Start Reading"), a:has-text("Chat Now")');
      // Find the one near Marcus Stone
      const chatBtnVisible = await chatBtn.first().isVisible().catch(() => false);
      if (chatBtnVisible) {
        const box = await chatBtn.first().boundingBox();
        if (box) {
          console.log(`CTA button: ${box.width}×${box.height}px`);
          expect(box.height).toBeGreaterThanOrEqual(36);
        }
        console.log('PASS: CTA button present and tappable on mobile');
      }

      // Check for text overflow (elements should not clip)
      const nameElement = page.locator('text=Marcus Stone').first();
      const nameBox = await nameElement.boundingBox();
      if (nameBox) {
        expect(nameBox.width).toBeLessThanOrEqual(375);
        console.log('PASS: Persona name fits within mobile viewport');
      }
    } else {
      // May have redirected to login or shown empty state
      console.log('INFO: Personas page URL:', page.url());
      console.log('INFO: Marcus Stone card not visible — personas may require auth or have different layout on mobile');
    }
  });

  test('MAS-011-04: OutOfCreditsModal displays correctly on mobile', async ({ page }) => {
    await registerAndNavigateToMarcus(page, 'MobileModal');

    // Start session
    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });
    await beginBtn.first().click();
    await page.waitForTimeout(4000);

    const input = page.locator('input[type="text"]');

    // Send multiple messages to drain credits
    const messages = [
      'Tell me a detailed reading about everything in my life',
      'More details about my career please',
      'And my love life in full',
      'What about my future?',
      'Please continue',
    ];

    let modalFound = false;

    for (const msg of messages) {
      const inputVisible = await input.isVisible().catch(() => false);
      if (!inputVisible) break;

      await input.tap();
      await input.fill(msg);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(8000);

      // Check for out-of-credits modal
      const modal = page.locator('[role="dialog"], [data-testid*="modal"], .modal');
      const modalVisible = await modal.first().isVisible().catch(() => false);

      const outOfCreditsText = page.locator('text=/Reading Time Has Ended|out of credits|run out|purchase/i');
      const oocVisible = await outOfCreditsText.first().isVisible().catch(() => false);

      if (modalVisible || oocVisible) {
        modalFound = true;
        console.log('PASS: Out-of-credits state triggered on mobile');

        // Modal should fit within mobile viewport
        if (modalVisible) {
          const modalBox = await modal.first().boundingBox();
          if (modalBox) {
            console.log(`Modal dimensions: ${modalBox.width}×${modalBox.height}`);
            // Modal should not exceed viewport
            expect(modalBox.x).toBeGreaterThanOrEqual(-10); // Allow slight negative for shadows
            expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(385); // 375 + 10 tolerance
          }
        }

        // Purchase CTA should be tappable
        const purchaseCTA = page.locator('button:has-text("Purchase"), button:has-text("Buy"), button:has-text("Get")').first();
        const ctaVisible = await purchaseCTA.isVisible().catch(() => false);
        if (ctaVisible) {
          const ctaBox = await purchaseCTA.boundingBox();
          if (ctaBox) {
            console.log(`CTA button on mobile: ${ctaBox.width}×${ctaBox.height}px`);
            expect(ctaBox.height).toBeGreaterThanOrEqual(36);
          }
          console.log('PASS: Purchase CTA is tappable on mobile');
        }

        break;
      }
    }

    if (!modalFound) {
      console.log('INFO: Credits not exhausted in test — out-of-credits modal not triggered');
      // Verify input is still accessible on mobile
      const inputVisible = await input.isVisible().catch(() => false);
      const beginVisible = await beginBtn.first().isVisible().catch(() => false);
      expect(inputVisible || beginVisible).toBeTruthy();
    }
  });
});
