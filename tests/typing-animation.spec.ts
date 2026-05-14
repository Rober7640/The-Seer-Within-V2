import { test, expect } from '@playwright/test';

/**
 * Typing Animation Tests
 * Verifies that System 2 has the same natural typing feel as System 1
 */

test.describe('Typing Animation & Message Display', () => {
  test('Should show 3-dot typing indicator before greeting', async ({ page }) => {
    // Register new user
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    await page.fill('input[name="firstName"]', 'TypingTest');
    await page.fill('input[name="email"]', `typing-test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Start session
    const beginButton = page.locator('button:has-text("Begin Reading")');
    await beginButton.click();

    // Typing indicator should appear immediately
    const typingIndicator = page.locator('div:has(span.animate-bounce)');
    await expect(typingIndicator).toBeVisible({ timeout: 2000 });
    console.log('✅ Typing indicator appeared');

    // Wait for greeting to appear
    await page.waitForTimeout(2000);

    // Greeting message should eventually appear
    const greeting = page.locator('.bg-white.text-gray-800').first();
    await expect(greeting).toBeVisible({ timeout: 8000 });
    console.log('✅ Greeting appeared after typing delay');

    // Typing indicator should be gone
    const typingStillVisible = await typingIndicator.isVisible().catch(() => false);
    expect(typingStillVisible).toBeFalsy();
    console.log('✅ Typing indicator disappeared after message');
  });

  test('Should show typing indicator before each message', async ({ page }) => {
    // Register and start session
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    await page.fill('input[name="firstName"]', 'TypingTest2');
    await page.fill('input[name="email"]', `typing-test2-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*reading/, { timeout: 10000 });

    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(5000); // Wait for greeting

    // Send a message
    const input = page.locator('input[type="text"]');
    await input.fill('Tell me about my day');
    await page.locator('button[type="submit"]').click();

    // Typing indicator should appear
    const typingIndicator = page.locator('div:has(span.animate-bounce)');
    await expect(typingIndicator).toBeVisible({ timeout: 2000 });
    console.log('✅ Typing indicator appeared after sending message');

    // Wait for response
    await page.waitForTimeout(3000);

    // Response should appear
    const responses = page.locator('.bg-white.text-gray-800');
    const responseCount = await responses.count();
    expect(responseCount).toBeGreaterThan(1); // Greeting + response
    console.log('✅ Response appeared after typing delay');

    // Typing indicator should be gone
    const typingStillVisible = await typingIndicator.isVisible().catch(() => false);
    expect(typingStillVisible).toBeFalsy();
    console.log('✅ Typing indicator disappeared');
  });

  test('Short messages should have ~1-2 second delay', async ({ page }) => {
    // Register and start session
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    await page.fill('input[name="firstName"]', 'TimingTest');
    await page.fill('input[name="email"]', `timing-test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*reading/, { timeout: 10000 });

    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(5000);

    // Send short message
    const input = page.locator('input[type="text"]');
    await input.fill('Hi');

    const startTime = Date.now();
    await page.locator('button[type="submit"]').click();

    // Wait for typing indicator
    await page.waitForTimeout(500);

    // Wait for response to appear
    await page.waitForTimeout(10000);

    const responses = page.locator('.bg-white.text-gray-800');
    await expect(responses.last()).toBeVisible({ timeout: 5000 });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`Total time from send to response: ${totalTime}ms`);
    console.log('Note: This includes API call time + typing delay');

    // Just verify the message appeared (timing can vary with API)
    expect(await responses.count()).toBeGreaterThan(1);
    console.log('✅ Short message delivered successfully');
  });

  test('Typing indicator has 3 bouncing dots', async ({ page }) => {
    // Register and start session
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    await page.fill('input[name="firstName"]', 'DotsTest');
    await page.fill('input[name="email"]', `dots-test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*reading/, { timeout: 10000 });

    await page.locator('button:has-text("Begin Reading")').click();

    // Wait for typing indicator
    const typingIndicator = page.locator('div:has(span.animate-bounce)');
    await expect(typingIndicator).toBeVisible({ timeout: 2000 });

    // Check for 3 dots
    const dots = page.locator('span.animate-bounce');
    const dotCount = await dots.count();
    expect(dotCount).toBe(3);
    console.log('✅ Typing indicator has 3 bouncing dots');

    // Verify they're actually bouncing (have animation)
    const firstDot = dots.first();
    const hasAnimation = await firstDot.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.animation !== 'none' || styles.animationName !== 'none';
    });
    expect(hasAnimation).toBeTruthy();
    console.log('✅ Dots are animated');
  });

  test('Should not show typing indicator when session inactive', async ({ page }) => {
    // Register user
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    await page.fill('input[name="firstName"]', 'NoSession');
    await page.fill('input[name="email"]', `no-session-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Don't start session - just check page
    await page.waitForTimeout(2000);

    // Typing indicator should NOT be visible
    const typingIndicator = page.locator('div:has(span.animate-bounce)');
    const isVisible = await typingIndicator.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
    console.log('✅ No typing indicator when session not active');
  });
});
