import { test, expect, Page } from '@playwright/test';

test.describe('Admin Authentication', () => {
  const adminEmail = 'admin@theseerwithin.com';
  const adminPassword = 'ChangeMe123!';

  test('should reject invalid admin credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    // Should show error message and stay on login page
    await expect(page.locator('text=/Invalid email or password/i')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should reject non-admin email', async ({ page }) => {
    // First register a regular user
    const regularEmail = `regular-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'RegularUser');
    await page.fill('input[name="email"]', regularEmail);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Try to login to admin with regular user credentials
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', regularEmail);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Should show error and stay on login page
    await expect(page.locator('text=/Invalid email or password/i')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should reject empty email and password', async ({ page }) => {
    await page.goto('/admin/login');

    // The inputs have 'required' attribute so the form should not submit
    // Attempt to submit the empty form
    await page.click('button[type="submit"]');

    // Should remain on login page (HTML5 validation prevents submit)
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should persist admin session across page reloads', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/personas/, { timeout: 10000 });

    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('seer_admin_token'));
    expect(token).toBeTruthy();

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on admin page (not redirected to login)
    await expect(page).toHaveURL(/\/admin\/personas/);

    // Should see admin layout elements
    await expect(page.locator('text=Seer Admin')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect unauthenticated users from admin pages', async ({ page }) => {
    // Clear any existing tokens
    await page.goto('/admin/login');
    await page.evaluate(() => localStorage.removeItem('seer_admin_token'));

    // Try to access a protected admin page directly
    await page.goto('/admin/personas');

    // Should redirect to admin login
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should logout and prevent re-access', async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/personas/, { timeout: 10000 });

    // Verify we're logged in
    await expect(page.locator('text=Seer Admin')).toBeVisible({ timeout: 10000 });

    // Click the logout button (LogOut icon in the sidebar bottom)
    const logoutButton = page.locator('aside button').last();
    await logoutButton.click();

    // Should redirect to login page
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });

    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('seer_admin_token'));
    expect(token).toBeNull();

    // Try to access admin page again
    await page.goto('/admin/personas');
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should display admin info after login', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/personas/, { timeout: 10000 });

    // Should see the admin display name in the sidebar
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('text=Seer Admin')).toBeVisible();

    // Sidebar should have navigation items
    await expect(page.locator('text=Personas')).toBeVisible();
    await expect(page.locator('text=Prompts')).toBeVisible();
    await expect(page.locator('text=Analytics')).toBeVisible();
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('text=Safety')).toBeVisible();
    await expect(page.locator('text=Intent Configs')).toBeVisible();
    await expect(page.locator('text=Follow-Ups')).toBeVisible();
  });

  test('should reject API calls with invalid token', async ({ page }) => {
    // Make direct API call with bogus token
    const response = await page.request.get('/api/admin/me', {
      headers: { Authorization: 'Bearer invalid-token-abc123' },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
