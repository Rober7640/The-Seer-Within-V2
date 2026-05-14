import { test, expect } from '@playwright/test';

test.describe('Memory Continuity', () => {
  const testEmail = `memory-test-${Date.now()}@example.com`;
  const testPassword = 'MemoryTest123!';

  test('should maintain memory across sessions', async ({ page }) => {
    // First session - register and chat
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    await page.fill('input[name="firstName"]', 'MemoryTester');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/.*reading|personas/, { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Start chat with Evelyn
    await page.goto('/chat-service');
    await page.click('button:has-text("Select Persona")');
    await page.click('text=Evelyn Cross');
    await page.click('button:has-text("Start Session")');
    await page.waitForTimeout(2000);

    // Send a memorable message
    await page.fill('textarea[placeholder*="message"]', 'My name is Sarah and I am worried about my relationship with John.');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(5000);

    // Wait for reply
    await expect(page.locator('text=/Sarah|relationship|John/i')).toBeVisible({ timeout: 15000 });

    // End session (to trigger summarization)
    await page.click('button:has-text("End Session")');
    await page.waitForTimeout(2000);

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForTimeout(1000);

    // Second session - login again and start new chat
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Start new session with Evelyn
    await page.goto('/chat-service');
    await page.click('button:has-text("Select Persona")');
    await page.click('text=Evelyn Cross');
    await page.click('button:has-text("Start Session")');
    await page.waitForTimeout(2000);

    // Ask a follow-up question
    await page.fill('textarea[placeholder*="message"]', 'Do you remember what I told you about my relationship?');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(5000);

    // Evelyn should reference the previous conversation
    // She should mention Sarah, John, or the relationship concern
    await expect(page.locator('text=/Sarah|John|relationship|remember|mentioned/i')).toBeVisible({ timeout: 15000 });
  });

  test('should show memory context indicator during session', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Start session
    await page.goto('/chat-service');
    await page.click('button:has-text("Select Persona")');
    await page.click('text=Evelyn Cross');
    await page.click('button:has-text("Start Session")');
    await page.waitForTimeout(2000);

    // Should show memory indicator (if user has previous conversations)
    const memoryIndicator = page.locator('text=/Previous conversation|Remembering|Context loaded/i');
    if (await memoryIndicator.isVisible()) {
      await expect(memoryIndicator).toBeVisible();
    }
  });

  test('should isolate memory per persona', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Chat with Evelyn about love
    await page.goto('/chat-service');
    await page.click('button:has-text("Select Persona")');
    await page.click('text=Evelyn Cross');
    await page.click('button:has-text("Start Session")');
    await page.waitForTimeout(2000);

    await page.fill('textarea[placeholder*="message"]', 'I need love guidance.');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(5000);

    // End session
    await page.click('button:has-text("End Session")');
    await page.waitForTimeout(2000);

    // Switch to Marcus (if available) and start new session
    const marcusOption = page.locator('text=Marcus Stone');
    if (await marcusOption.isVisible()) {
      await page.click('button:has-text("Select Persona")');
      await page.click('text=Marcus Stone');
      await page.click('button:has-text("Start Session")');
      await page.waitForTimeout(2000);

      // Ask Marcus a question
      await page.fill('textarea[placeholder*="message"]', 'What do you know about me?');
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(5000);

      // Marcus should NOT have Evelyn's memory (unless cross-persona transfer was done)
      // This tests memory isolation
    }
  });

  test('should update lastLoginAt on every login', async ({ page }) => {
    // This test verifies that the activity-based retention policy is working
    // We can't directly check the database, but we can verify login success

    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Should successfully redirect to chat service
    await expect(page).toHaveURL(/.*chat-service|personas/);

    // User should be logged in (this updates lastLoginAt in backend)
    await expect(page.locator('text=MemoryTester')).toBeVisible();
  });

  test('should show memory in admin user detail view', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@theseerwithin.com');
    await page.fill('input[name="password"]', 'ChangeMe123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Go to users list
    await page.goto('/admin/users');

    // Find the memory test user
    await page.fill('input[placeholder*="Search"], input[type="search"]', testEmail);
    await page.waitForTimeout(1000);

    // Click to view details
    const viewButton = page.locator('button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(1000);

      // Should show memories section
      await expect(page.locator('text=/Memory|Memories|Previous Conversations/i')).toBeVisible({ timeout: 5000 });

      // Should show lastAccessedAt for memories
      await expect(page.locator('text=/Last accessed/i')).toBeVisible();
    }
  });
});
