import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  const testFirstName = 'TestUser';

  test('should register a new user account', async ({ page }) => {
    await page.goto('/');

    // Navigate to registration
    await page.click('text=Get Started');
    await expect(page).toHaveURL(/.*register|signup/);

    // Fill registration form
    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.fill('input[name="firstName"]', testFirstName);

    // Submit registration
    await page.click('button[type="submit"]');

    // Should redirect to chat service or personas page
    await page.waitForURL(/.*chat-service|personas/, { timeout: 10000 });

    // User should be logged in
    await expect(page.locator('text=/Welcome|Hello|Hi/i')).toBeVisible({ timeout: 10000 });
  });

  test('should login with existing credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', testPassword);

    // Submit login
    await page.click('button[type="submit"]');

    // Should redirect to chat service
    await page.waitForURL(/.*chat-service|personas/, { timeout: 10000 });

    // User should see their name
    await expect(page.locator(`text=${testFirstName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should reject invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"], input[type="email"]', 'wrong@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpass');

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/Invalid|Error|Wrong/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display user credit balance after login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*chat-service|personas/, { timeout: 10000 });

    // Should show credit balance (3 free minutes)
    await expect(page.locator('text=/3.*minute|credit/i')).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*chat-service|personas/, { timeout: 10000 });

    // Find and click logout button
    await page.click('button:has-text("Logout"), button:has-text("Sign Out")');

    // Should redirect to login or home page
    await page.waitForURL(/.*login|^\/$/, { timeout: 5000 });
  });
});
