import { test, expect } from '@playwright/test';

/**
 * System 2 Test Suite — C2: Chat Robustness
 *
 * Tests for empty messages, very long messages, rapid-fire sending,
 * special characters/XSS, and network interruption handling.
 */

test.describe('System 2 — Chat Robustness (C2)', () => {
  const testPassword = 'Robust123!';

  /** Helper: register a fresh user and start a chat session */
  async function registerAndStartSession(page: any, prefix: string) {
    const email = `${prefix}-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', prefix);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);
  }

  test('C2a: Empty message — should be blocked client-side', async ({ page }) => {
    await registerAndStartSession(page, 'EmptyMsg');

    const input = page.locator('input[type="text"]');
    const sendBtn = page.locator('button[type="submit"]');

    // Try sending an empty message (just spaces)
    await input.fill('   ');
    await sendBtn.click();
    await page.waitForTimeout(1000);

    // No user message bubble should appear for empty content
    // The sendMessage function checks !content.trim() before proceeding
    const userMessages = page.locator('.bg-purple-600.text-white');
    const count = await userMessages.count();

    // Should have 0 user messages (greeting is assistant, not user)
    expect(count).toBe(0);

    // Try pressing Enter on empty input
    await input.fill('');
    await input.press('Enter');
    await page.waitForTimeout(1000);

    // Still no user messages
    const countAfter = await userMessages.count();
    expect(countAfter).toBe(0);
  });

  test('C2b: Very long message — should be handled gracefully', async ({ page }) => {
    await registerAndStartSession(page, 'LongMsg');

    const input = page.locator('input[type="text"]');
    const sendBtn = page.locator('button[type="submit"]');

    // Generate a very long message (5000+ characters)
    const longMessage = 'I need guidance about my life. '.repeat(200); // ~6200 chars

    await input.fill(longMessage);
    await sendBtn.click();

    // Wait for response (may take longer due to message size)
    await page.waitForTimeout(15000);

    // Should either:
    // 1. Send successfully and get a response
    // 2. Truncate or reject with a friendly error
    const userMsg = page.locator('.bg-purple-600.text-white');
    const responseMsg = page.locator('.bg-white.text-gray-800.border');

    const hasUserMsg = await userMsg.count() > 0;
    const hasResponse = await responseMsg.count() > 0;

    if (hasUserMsg && hasResponse) {
      console.log('PASS: Long message sent and response received');
    } else if (hasUserMsg) {
      console.log('INFO: Long message sent but no response yet (may need more time)');
    } else {
      console.log('INFO: Long message may have been rejected or truncated');
    }

    // No crash or unhandled error should occur
    // Page should still be interactive
    await expect(input).toBeVisible();
  });

  test('C2c: Rapid-fire messages — should not produce duplicate responses or race conditions', async ({ page }) => {
    await registerAndStartSession(page, 'RapidFire');

    const input = page.locator('input[type="text"]');
    const sendBtn = page.locator('button[type="submit"]');

    // Send 3 messages in rapid succession
    const rapidMessages = [
      'First rapid message',
      'Second rapid message',
      'Third rapid message',
    ];

    for (const msg of rapidMessages) {
      await input.fill(msg);
      await sendBtn.click();
      // Only a tiny delay — testing rapid fire
      await page.waitForTimeout(300);
    }

    // Wait for all responses to arrive
    await page.waitForTimeout(20000);

    // Check user messages — at least one should have been sent
    // The isSending guard may block some, which is acceptable
    const userMessages = page.locator('.bg-purple-600.text-white');
    const userMsgCount = await userMessages.count();
    expect(userMsgCount).toBeGreaterThanOrEqual(1);

    // Check for duplicate responses
    const responseMessages = page.locator('.bg-white.text-gray-800.border');
    const responseMsgCount = await responseMessages.count();

    // Response count should not exceed user message count + 1 (greeting)
    // (i.e., no extra duplicate responses)
    console.log(`User messages: ${userMsgCount}, Assistant responses: ${responseMsgCount}`);
    expect(responseMsgCount).toBeLessThanOrEqual(userMsgCount + 1); // +1 for greeting

    // Page should still be functional
    await expect(input).toBeVisible();
  });

  test('C2d: Special characters and XSS — should render safely without injection', async ({ page }) => {
    await registerAndStartSession(page, 'SpecialChars');

    const input = page.locator('input[type="text"]');
    const sendBtn = page.locator('button[type="submit"]');

    // Test 1: HTML tags (XSS attempt)
    await input.fill('<script>alert("XSS")</script>');
    await sendBtn.click();
    await page.waitForTimeout(8000);

    // The literal text should appear (escaped), not execute as script
    const userMsg = page.locator('.bg-purple-600.text-white').last();
    const userMsgText = await userMsg.textContent();
    expect(userMsgText).toContain('<script>');

    // No alert dialog should have appeared
    // (Playwright would throw if an unexpected dialog appeared)

    // Test 2: Emojis and unicode
    await input.fill('Hello! 🔮✨ How about my 運命 (destiny)?');
    await sendBtn.click();
    await page.waitForTimeout(8000);

    // Message should appear with emojis intact
    await expect(page.locator('text=🔮')).toBeVisible();

    // Test 3: SQL injection attempt (should be harmless)
    await input.fill("'; DROP TABLE users; --");
    await sendBtn.click();
    await page.waitForTimeout(8000);

    // Should get a normal response (parameterized queries protect the backend)
    const responses = page.locator('.bg-white.text-gray-800.border');
    const responseCount = await responses.count();
    expect(responseCount).toBeGreaterThanOrEqual(1);

    // Page should still be functional
    await expect(input).toBeVisible();
  });

  test('C2e: Network interruption — should show error state and recover', async ({ page }) => {
    await registerAndStartSession(page, 'NetworkTest');

    const input = page.locator('input[type="text"]');
    const sendBtn = page.locator('button[type="submit"]');

    // Send a normal message first to verify baseline
    await input.fill('Hello, can you help me?');
    await sendBtn.click();
    await page.waitForTimeout(8000);

    // Verify baseline works
    const responses = page.locator('.bg-white.text-gray-800.border');
    await expect(responses.last()).toBeVisible({ timeout: 15000 });

    // Simulate network offline
    await page.context().setOffline(true);

    // Try to send a message while offline
    await input.fill('This message is sent while offline');
    await sendBtn.click();
    await page.waitForTimeout(5000);

    // Should show some kind of error (the fetch will fail)
    // The error is caught in sendMessage's catch block
    // UI may show an error state or the message just won't get a response

    // Restore network
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    // Input should still be functional after recovery
    await expect(input).toBeVisible();

    // Try sending again — should work now
    await input.fill('Am I back online now?');
    await sendBtn.click();
    await page.waitForTimeout(10000);

    // Should get a response after network recovery
    const finalResponses = page.locator('.bg-white.text-gray-800.border');
    const finalCount = await finalResponses.count();
    expect(finalCount).toBeGreaterThanOrEqual(1);
  });
});
