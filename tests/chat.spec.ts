import { test, expect } from '@playwright/test';

test.describe('Chat Service Flow', () => {
  const testEmail = `chat-test-${Date.now()}@example.com`;
  const testPassword = 'ChatTest123!';

  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/');
    await page.click('text=Get Started');
    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.fill('input[name="firstName"]', 'ChatTester');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  });

  test('should start a chat session with Evelyn Cross', async ({ page }) => {
    // Navigate to chat service
    await page.goto('/chat-service');

    // Select Evelyn Cross from persona dropdown
    await page.click('button:has-text("Select Persona"), select[name="persona"]');
    await page.click('text=Evelyn Cross');

    // Click "Start Session" button
    await page.click('button:has-text("Start Session"), button:has-text("Begin Reading")');

    // Wait for session to start
    await page.waitForTimeout(2000);

    // Should show active session indicator
    await expect(page.locator('text=/Active Session|Connected|Session Active/i')).toBeVisible({ timeout: 10000 });
  });

  test('should send a message and receive a reply', async ({ page }) => {
    await page.goto('/chat-service');

    // Start session
    await page.click('button:has-text("Select Persona"), select[name="persona"]');
    await page.click('text=Evelyn Cross');
    await page.click('button:has-text("Start Session"), button:has-text("Begin Reading")');
    await page.waitForTimeout(2000);

    // Type a message
    const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]');
    await messageInput.fill('I need guidance about my career path.');

    // Send message
    await page.click('button:has-text("Send"), button[type="submit"]');

    // Wait for reply (Claude API call)
    await page.waitForTimeout(5000);

    // Should show user message
    await expect(page.locator('text=I need guidance about my career path.')).toBeVisible();

    // Should show Evelyn's reply
    await expect(page.locator('text=/dear|guidance|career|energy/i')).toBeVisible({ timeout: 15000 });
  });

  test('should display credit countdown during session', async ({ page }) => {
    await page.goto('/chat-service');

    // Start session
    await page.click('button:has-text("Select Persona")');
    await page.click('text=Evelyn Cross');
    await page.click('button:has-text("Start Session")');
    await page.waitForTimeout(2000);

    // Should show remaining credits
    await expect(page.locator('text=/[0-9].*minute.*remaining|credit.*minute/i')).toBeVisible();

    // Credits should start at 3 minutes
    await expect(page.locator('text=/3.*minute/i')).toBeVisible();
  });

  test('should show message history', async ({ page }) => {
    await page.goto('/chat-service');

    // Start session and send multiple messages
    await page.click('button:has-text("Select Persona")');
    await page.click('text=Evelyn Cross');
    await page.click('button:has-text("Start Session")');
    await page.waitForTimeout(2000);

    // Send first message
    await page.fill('textarea[placeholder*="message"]', 'First question');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(3000);

    // Send second message
    await page.fill('textarea[placeholder*="message"]', 'Second question');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(3000);

    // Both messages should be visible
    await expect(page.locator('text=First question')).toBeVisible();
    await expect(page.locator('text=Second question')).toBeVisible();
  });

  test('should end session successfully', async ({ page }) => {
    await page.goto('/chat-service');

    // Start session
    await page.click('button:has-text("Select Persona")');
    await page.click('text=Evelyn Cross');
    await page.click('button:has-text("Start Session")');
    await page.waitForTimeout(2000);

    // Find and click "End Session" button
    const endButton = page.locator('button:has-text("End Session"), button:has-text("Stop")');
    await endButton.click();

    // Should show session ended confirmation
    await expect(page.locator('text=/Session Ended|Session Complete/i')).toBeVisible({ timeout: 5000 });
  });

  test('should switch between personas', async ({ page }) => {
    await page.goto('/chat-service');

    // Start with Evelyn
    await page.click('button:has-text("Select Persona")');
    await page.click('text=Evelyn Cross');
    await page.waitForTimeout(1000);

    // Should show Evelyn selected
    await expect(page.locator('text=Evelyn Cross')).toBeVisible();

    // Switch to Marcus if available
    await page.click('button:has-text("Select Persona"), select[name="persona"]');
    const marcusOption = page.locator('text=Marcus Stone');
    if (await marcusOption.isVisible()) {
      await marcusOption.click();
      await expect(page.locator('text=Marcus Stone')).toBeVisible();
    }
  });
});
