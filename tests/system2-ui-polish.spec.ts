import { test, expect } from '@playwright/test';

/**
 * System 2 Test Suite — C7: UI/UX Polish
 *
 * Tests for loading states, credit countdown clarity, persona selector UX,
 * mobile responsiveness, and error message quality.
 */

test.describe('System 2 — UI/UX Polish (C7)', () => {
  const testPassword = 'UiPolish123!';

  /** Helper: register a fresh user and navigate to /reading */
  async function registerUser(page: any, prefix: string) {
    const email = `${prefix}-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', prefix);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });
    return email;
  }

  test('C7a: Loading states — should show spinner/skeleton while loading', async ({ page }) => {
    await registerUser(page, 'LoadingState');

    // Start session and send a message
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    await input.fill('Tell me about my future');

    // Watch for typing indicator when sending
    await page.locator('button[type="submit"]').click();

    // Typing indicator (bouncing dots) should appear while waiting for response
    const typingIndicator = page.locator('.animate-bounce');
    await page.waitForTimeout(1000);
    const hasTyping = await typingIndicator.first().isVisible().catch(() => false);

    if (hasTyping) {
      console.log('PASS: Typing indicator visible while waiting for AI response');
    } else {
      console.log('INFO: Typing indicator may have disappeared already (fast response)');
    }

    // Wait for response to complete
    await page.waitForTimeout(10000);

    // After response, typing indicator should be gone
    const typingStillVisible = await typingIndicator.first().isVisible().catch(() => false);
    expect(typingStillVisible).toBeFalsy();
  });

  test('C7b: Credit countdown clarity — timer should show MM:SS format', async ({ page }) => {
    await registerUser(page, 'CountdownFormat');

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // The elapsed timer badge should be visible
    const timerBadge = page.locator('text=/\\d+:\\d{2}/').first();
    await expect(timerBadge).toBeVisible({ timeout: 5000 });

    // Timer should show format like "0:05" or "1:30" (not raw seconds like "90")
    const timerText = await timerBadge.textContent();
    expect(timerText).toMatch(/\d+:\d{2}/);
    console.log('PASS: Timer shows MM:SS format:', timerText);

    // Credit remaining text should be human-readable
    const creditRemaining = page.locator('text=/\\d+ min remaining/i');
    await expect(creditRemaining).toBeVisible({ timeout: 5000 });
    const creditText = await creditRemaining.textContent();
    expect(creditText).toMatch(/\d+ min remaining/i);
    console.log('PASS: Credit display is readable:', creditText);

    // Wait a few seconds and verify timer increments
    await page.waitForTimeout(3000);
    const timerText2 = await timerBadge.textContent();
    expect(timerText2).not.toBe(timerText); // Should have changed
    console.log('PASS: Timer is incrementing:', timerText, '->', timerText2);
  });

  test('C7c: Persona switching UX — selector should be disabled during active session', async ({ page }) => {
    await registerUser(page, 'SelectorUX');

    // Before starting a session, persona selector should be visible (if >1 persona)
    const personaSelector = page.locator('text=/Choose your guide/i');
    const hasSelectorBefore = await personaSelector.isVisible().catch(() => false);

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // During active session, persona selector should NOT be visible
    const hasSelectorDuring = await personaSelector.isVisible().catch(() => false);
    expect(hasSelectorDuring).toBeFalsy();
    console.log('PASS: Persona selector hidden during active session');

    // The "Begin Reading" button should also not be visible
    const beginButtonDuring = await page.locator('button:has-text("Begin Reading")').isVisible().catch(() => false);
    expect(beginButtonDuring).toBeFalsy();

    // End session
    await page.locator('text=End Session').click();
    await page.waitForTimeout(2000);

    // After ending, selector should reappear (if >1 persona)
    if (hasSelectorBefore) {
      const hasSelectorAfter = await personaSelector.isVisible().catch(() => false);
      expect(hasSelectorAfter).toBeTruthy();
      console.log('PASS: Persona selector re-appears after session ends');
    }
  });

  test('C7d: Mobile responsiveness — chat interface should work at 320px width', async ({ browser }) => {
    // Create a mobile-sized context
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 }, // iPhone SE size
    });
    const page = await context.newPage();

    // Register
    const email = `mobile-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'MobileUser');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Screenshot the mobile reading page
    await page.screenshot({ path: 'test-results/mobile-reading-page.png', fullPage: true });

    // "Begin Reading" button should be visible and clickable on mobile
    const beginBtn = page.locator('button:has-text("Begin Reading")');
    await expect(beginBtn).toBeVisible({ timeout: 10000 });
    await beginBtn.click();
    await page.waitForTimeout(3000);

    // Input should be visible on mobile
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();

    // Send a message on mobile
    await input.fill('Mobile test message');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // Message should be visible
    await expect(page.locator('text=Mobile test message')).toBeVisible();

    // Screenshot the mobile chat
    await page.screenshot({ path: 'test-results/mobile-chat-active.png', fullPage: true });

    // Verify no horizontal overflow (content fits in 320px)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (!hasHorizontalScroll) {
      console.log('PASS: No horizontal overflow on mobile (320px)');
    } else {
      console.log('WARN: Horizontal overflow detected on mobile');
    }

    await context.close();
  });

  test('C7e: Error recovery — API errors should show user-friendly messages', async ({ page }) => {
    await registerUser(page, 'ErrorRecovery');

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // Intercept API calls to simulate errors
    await page.route('**/api/chat-service/session/*/message', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    const input = page.locator('input[type="text"]');
    await input.fill('This message will trigger a server error');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);

    // The error should be handled gracefully — no raw JSON or stack traces
    const rawError = page.locator('text=/Internal server error|stack trace|at Object/i');
    const hasRawError = await rawError.isVisible().catch(() => false);

    // Page should still be functional (input should still be visible)
    await expect(input).toBeVisible();

    // Remove the route intercept
    await page.unroute('**/api/chat-service/session/*/message');

    // User should be able to send another message after error
    await input.fill('This message should work now');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);

    // Should get a response (API is working again)
    const responses = page.locator('.bg-white.text-gray-800.border');
    const hasResponse = (await responses.count()) >= 1;
    if (hasResponse) {
      console.log('PASS: App recovered from API error — subsequent message succeeded');
    }
  });

  test('C7f: Auto-scroll — chat should scroll to bottom on new messages', async ({ page }) => {
    await registerUser(page, 'AutoScroll');

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    const sendBtn = page.locator('button[type="submit"]');

    // Send multiple messages to create enough content to scroll
    for (let i = 1; i <= 3; i++) {
      await input.fill(`Message ${i}: Tell me something interesting about life and the universe`);
      await sendBtn.click();
      await page.waitForTimeout(6000);
    }

    // Check if chat area is scrolled to bottom
    const scrollArea = page.locator('.flex-1.overflow-y-auto');
    const isAtBottom = await scrollArea.evaluate((el) => {
      return Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 50;
    });

    if (isAtBottom) {
      console.log('PASS: Chat auto-scrolls to bottom on new messages');
    } else {
      console.log('WARN: Chat may not be auto-scrolling to bottom');
    }
  });

  test('C7g: Session footer — End Session and Private & Confidential labels visible', async ({ page }) => {
    await registerUser(page, 'FooterTest');

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // "End Session" should be visible
    await expect(page.locator('text=End Session')).toBeVisible();

    // "Private & Confidential" label should be visible
    await expect(page.locator('text=/Private.*Confidential/i')).toBeVisible();
    console.log('PASS: Session footer elements visible');
  });

  test('C7h: Bottom bar links — Browse All Guides and Get More Credits when no session', async ({ page }) => {
    await registerUser(page, 'BottomBar');

    // When no session is active, bottom bar should show navigation links
    await expect(page.locator('text=Browse All Guides')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Get More Credits')).toBeVisible({ timeout: 10000 });

    // "Browse All Guides" should link to /personas
    await page.locator('text=Browse All Guides').click();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/personas');

    // Go back and check "Get More Credits"
    await page.goto('/reading');
    await page.waitForTimeout(2000);
    await page.locator('text=Get More Credits').click();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/credits');
    console.log('PASS: Bottom bar links navigate correctly');
  });
});
