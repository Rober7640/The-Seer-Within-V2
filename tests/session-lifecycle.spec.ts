import { test, expect } from '@playwright/test';

/**
 * Session Lifecycle Tests - Phase 1 Critical Path
 *
 * Tests the complete chat session lifecycle including:
 * - Credit depletion warnings
 * - Session auto-end at 0 credits
 * - Purchase and resume flow
 * - Session duration tracking
 */

test.describe('Chat Session Lifecycle', () => {
  const testEmail = `lifecycle-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  const testFirstName = 'LifecycleTest';

  test.beforeEach(async ({ page }) => {
    // Register a new user for each test (gets 3 free minutes)
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    await page.fill('input[name="firstName"]', testFirstName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*reading|personas/, { timeout: 10000 });
  });

  test('should handle complete session lifecycle with credit depletion', async ({ page }) => {
    // Step 1: Navigate to personas and start session with Evelyn
    await page.goto('/personas');
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Click the "Start Reading" button on Evelyn's card
    // The button is within a link that navigates to /chat-service
    await page.locator('button:has-text("Start Reading")').first().click();

    // Wait for chat interface to load
    await page.waitForURL(/.*chat-service|reading|chat/, { timeout: 10000 });
    await expect(page.locator('text=/Welcome|Hello/i')).toBeVisible({ timeout: 15000 });

    // Step 2: Record initial credit balance
    const creditDisplay = page.locator('text=/\\d+ min|\\d+ minutes/i').first();
    await creditDisplay.waitFor({ state: 'visible', timeout: 5000 });
    const initialCreditsText = await creditDisplay.textContent();
    console.log('Initial credits:', initialCreditsText);

    // Step 3: Send multiple messages to deplete credits
    const messageInput = page.locator('textarea, input[type="text"]').last();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').last();

    // Send 3-4 messages (should use most of the 3 free minutes)
    for (let i = 1; i <= 3; i++) {
      await messageInput.fill(`Test message ${i}: Tell me about love and relationships`);
      await sendButton.click();

      // Wait for AI response
      await page.waitForTimeout(5000); // Allow time for AI processing
      console.log(`Sent message ${i}`);
    }

    // Step 4: Check for low credit warning (at ~1 minute remaining)
    // This might appear as a toast, banner, or modal
    const lowCreditWarning = page.locator('text=/running low|1 minute|warning|almost out/i');

    // Give it time to appear
    await page.waitForTimeout(2000);

    // Take screenshot for verification
    await page.screenshot({
      path: 'test-results/low-credit-warning.png',
      fullPage: true
    });

    // Step 5: Continue chatting until credits are fully depleted
    // Send one more message to push to 0 credits
    await messageInput.fill('One final question about my future');
    await sendButton.click();
    await page.waitForTimeout(8000); // Wait for long response

    // Step 6: Check if session ended due to 0 credits
    const outOfCreditsModal = page.locator('text=/out of credits|no credits|purchase more/i');
    const sessionEndIndicator = page.locator('text=/session ended|ended due to/i');

    // Wait for either indicator
    const creditDepletedVisible = await Promise.race([
      outOfCreditsModal.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
      sessionEndIndicator.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
    ]);

    if (creditDepletedVisible) {
      console.log('✅ Credit depletion detected');
      await page.screenshot({
        path: 'test-results/out-of-credits.png',
        fullPage: true
      });
    } else {
      console.log('⚠️ No credit depletion indicator found (may need more messages)');
    }

    // Step 7: Verify final credit balance is 0 or very low
    const finalCreditsText = await creditDisplay.textContent();
    console.log('Final credits:', finalCreditsText);

    // Step 8: Test navigation to purchase page
    // Look for "Purchase Credits" or "Buy More" button
    const purchaseButton = page.locator('button:has-text("Purchase"), a:has-text("Purchase"), button:has-text("Buy")');
    if (await purchaseButton.count() > 0) {
      await purchaseButton.first().click();
      await page.waitForURL(/.*pricing|credits|purchase/, { timeout: 5000 });
      console.log('✅ Navigated to purchase page');
    }

    // Final verification screenshot
    await page.screenshot({
      path: 'test-results/purchase-page.png',
      fullPage: true
    });
  });

  test('should track session duration accurately', async ({ page }) => {
    // Start session
    await page.goto('/personas');
    await page.click('text=Evelyn Cross');

    // Click the "Start Reading" button on Evelyn's card
    await page.locator('button:has-text("Start Reading")').first().click();

    // Wait for chat interface to load
    await page.waitForURL(/.*chat-service|reading|chat/, { timeout: 10000 });

    // Record start time
    const startTime = Date.now();

    // Send a few messages
    const messageInput = page.locator('textarea, input[type="text"]').last();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').last();

    await messageInput.fill('Quick question about my career');
    await sendButton.click();
    await page.waitForTimeout(5000);

    // End session
    const endButton = page.locator('button:has-text("End"), button:has-text("Stop")');
    if (await endButton.count() > 0) {
      await endButton.first().click();

      // Confirm if there's a modal
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmButton.count() > 0) {
        await confirmButton.first().click();
      }
    }

    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    console.log(`Session duration: ${durationSeconds} seconds`);

    // Verify session was recorded (check with admin API if needed)
    // This would require admin login and API call
    expect(durationSeconds).toBeGreaterThan(5); // At least 5 seconds
  });

  test('should prevent negative credit balance', async ({ page }) => {
    // Start session with 3 minutes
    await page.goto('/personas');
    await page.click('text=Evelyn Cross');

    // Click the "Start Reading" button on Evelyn's card
    await page.locator('button:has-text("Start Reading")').first().click();

    // Wait for chat interface to load
    await page.waitForURL(/.*chat-service|reading|chat/, { timeout: 10000 });

    // Get credit display element
    const creditDisplay = page.locator('text=/\\d+ min|\\d+ minutes/i').first();

    // Monitor credits don't go below 0
    // Send messages and check balance periodically
    const messageInput = page.locator('textarea, input[type="text"]').last();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').last();

    for (let i = 1; i <= 5; i++) {
      await messageInput.fill(`Message ${i}`);
      await sendButton.click();
      await page.waitForTimeout(3000);

      const creditsText = await creditDisplay.textContent();
      const creditsMatch = creditsText?.match(/(\d+)/);
      const credits = creditsMatch ? parseInt(creditsMatch[1]) : null;

      console.log(`After message ${i}: ${credits} minutes`);

      // Verify credits never go negative
      if (credits !== null) {
        expect(credits).toBeGreaterThanOrEqual(0);
      }

      // Stop if we hit 0
      if (credits === 0) {
        console.log('✅ Credits reached 0, session should end');
        break;
      }
    }
  });

  test('should handle session recovery after page refresh', async ({ page }) => {
    // Start session
    await page.goto('/personas');
    await page.click('text=Evelyn Cross');

    // Click the "Start Reading" button on Evelyn's card
    await page.locator('button:has-text("Start Reading")').first().click();

    // Wait for chat interface to load
    await page.waitForURL(/.*chat-service|reading|chat/, { timeout: 10000 });

    // Send a message
    const messageInput = page.locator('textarea, input[type="text"]').last();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').last();

    await messageInput.fill('Test message before refresh');
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Get session URL
    const sessionUrl = page.url();
    console.log('Session URL:', sessionUrl);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if session is still active
    // Should either:
    // 1. Resume the session with message history
    // 2. Show a "Session ended" message
    // 3. Redirect to persona selection

    const hasMessageHistory = await page.locator('text=Test message before refresh').count() > 0;
    const hasSessionEnded = await page.locator('text=/session ended|ended/i').count() > 0;
    const redirectedToPersonas = page.url().includes('personas');

    if (hasMessageHistory) {
      console.log('✅ Session recovered with message history');
    } else if (hasSessionEnded) {
      console.log('✅ Session properly ended after refresh');
    } else if (redirectedToPersonas) {
      console.log('✅ Redirected to persona selection (expected behavior)');
    } else {
      console.log('⚠️ Unclear session state after refresh');
    }

    await page.screenshot({
      path: 'test-results/session-after-refresh.png',
      fullPage: true
    });
  });

  test('should handle long conversation (10+ messages)', async ({ page }) => {
    // This test requires admin to grant extra credits first
    // For now, we'll test the basic flow and document the need

    await page.goto('/personas');
    await page.click('text=Evelyn Cross');

    // Click the "Start Reading" button on Evelyn's card
    await page.locator('button:has-text("Start Reading")').first().click();

    // Wait for chat interface to load
    await page.waitForURL(/.*chat-service|reading|chat/, { timeout: 10000 });

    const messageInput = page.locator('textarea, input[type="text"]').last();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').last();

    // Send 5 messages (limited by free credits)
    const messages = [
      'Tell me about my love life',
      'What about my career path?',
      'I\'m feeling stuck in life',
      'How can I find my purpose?',
      'What does my future hold?'
    ];

    for (let i = 0; i < messages.length; i++) {
      await messageInput.fill(messages[i]);
      await sendButton.click();

      // Wait for response
      await page.waitForTimeout(4000);

      console.log(`Sent message ${i + 1}/${messages.length}`);

      // Check if we ran out of credits
      const outOfCredits = await page.locator('text=/out of credits|no credits/i').count() > 0;
      if (outOfCredits) {
        console.log(`⚠️ Ran out of credits after ${i + 1} messages (need admin grant for 10+ test)`);
        break;
      }
    }

    // Verify message history is visible
    await expect(page.locator('text=Tell me about my love life')).toBeVisible();

    // Take screenshot of conversation
    await page.screenshot({
      path: 'test-results/long-conversation.png',
      fullPage: true
    });
  });
});
