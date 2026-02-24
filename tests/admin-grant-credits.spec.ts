import { test, expect } from '@playwright/test';

test.describe('Admin Grant Credits Feature', () => {
  const adminEmail = 'admin@theseerwithin.com';
  const adminPassword = 'ChangeMe123!';
  let testUserEmail: string;
  let testUserId: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test user first
    const page = await browser.newPage();
    testUserEmail = `grant-test-${Date.now()}@example.com`;

    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'GrantTestUser');
    await page.fill('input[name="email"]', testUserEmail);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  });

  test('should grant credits with success toast notification', async ({ page }) => {
    // Navigate to users list
    await page.goto('/admin/users');
    await page.waitForTimeout(2000);

    // Search for test user
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Click on user's email/name to view details
    await page.click(`text=${testUserEmail}`);
    await page.waitForTimeout(2000);

    // Get initial credit balance - it's displayed as a number with "Credits (min)" label
    const balanceElement = page.locator('text=/Credits \\(min\\)/i').locator('..').locator('p.text-2xl');
    const balanceText = await balanceElement.textContent();
    const initialBalance = balanceText ? parseInt(balanceText.trim()) : 0;

    // Find and click "Grant Credits" button
    const grantButton = page.locator('button:has-text("Grant Credits")');
    await grantButton.click();

    // Wait for prompt dialog to appear
    await page.waitForTimeout(500);

    // Accept prompt with 100 minutes
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Minutes to grant');
      await dialog.accept('100');
    });

    // Trigger the prompt
    await grantButton.click();
    await page.waitForTimeout(2000);

    // Verify success toast appears
    await expect(page.locator('text=/Credits Updated|Successfully/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Granted 100 minutes|New balance/i')).toBeVisible();

    // Verify balance updated in UI
    const newBalanceElement = page.locator('text=/Credits \\(min\\)/i').locator('..').locator('p.text-2xl');
    const newBalanceText = await newBalanceElement.textContent();
    const newBalance = newBalanceText ? parseInt(newBalanceText.trim()) : 0;
    expect(newBalance).toBe(initialBalance + 100);

    // Verify transaction appears in purchase history
    await page.click('text=Purchases, text=History, button:has-text("Purchases")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/admin_adjustment|Admin grant/i')).toBeVisible({ timeout: 5000 });
  });

  test('should deduct credits with negative amount', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(2000);

    // Search and navigate to user detail
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    await page.click(`text=${testUserEmail}`);
    await page.waitForTimeout(2000);

    // Get current balance
    const balanceElement = page.locator('text=/Credits \\(min\\)/i').locator('..').locator('p.text-2xl');
    const balanceText = await balanceElement.textContent();
    const currentBalance = balanceText ? parseInt(balanceText.trim()) : 0;

    // Grant credits button
    const grantButton = page.locator('button:has-text("Grant Credits")');

    // Set up dialog handler
    page.once('dialog', async (dialog) => {
      await dialog.accept('-20'); // Deduct 20 minutes
    });

    await grantButton.click();
    await page.waitForTimeout(2000);

    // Verify deduction toast
    await expect(page.locator('text=/Credits Updated|Deducted/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Deducted 20 minutes/i')).toBeVisible();

    // Verify balance decreased
    const newBalanceElement = page.locator('text=/Credits \\(min\\)/i').locator('..').locator('p.text-2xl');
    const newBalanceText = await newBalanceElement.textContent();
    const newBalance = newBalanceText ? parseInt(newBalanceText.trim()) : 0;
    expect(newBalance).toBe(currentBalance - 20);
  });

  test('should show error when trying to deduct more than user has', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(2000);

    // Navigate to user
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    await page.click(`text=${testUserEmail}`);
    await page.waitForTimeout(2000);

    // Try to deduct more than balance (10000 minutes)
    const grantButton = page.locator('button:has-text("Grant Credits")');

    page.once('dialog', async (dialog) => {
      await dialog.accept('-10000');
    });

    await grantButton.click();
    await page.waitForTimeout(2000);

    // Should show error toast
    await expect(page.locator('text=/Failed|Cannot deduct|Error/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate zero input', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    await page.click(`text=${testUserEmail}`);
    await page.waitForTimeout(2000);

    const grantButton = page.locator('button:has-text("Grant Credits")');

    page.once('dialog', async (dialog) => {
      await dialog.accept('0');
    });

    await grantButton.click();
    await page.waitForTimeout(1000);

    // Should show validation error
    await expect(page.locator('text=/Invalid Input|cannot be 0/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate non-numeric input', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    await page.click(`text=${testUserEmail}`);
    await page.waitForTimeout(2000);

    const grantButton = page.locator('button:has-text("Grant Credits")');

    page.once('dialog', async (dialog) => {
      await dialog.accept('abc');
    });

    await grantButton.click();
    await page.waitForTimeout(1000);

    // Should show validation error
    await expect(page.locator('text=/Invalid Input|valid number/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show transaction in purchase history immediately', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    await page.click(`text=${testUserEmail}`);
    await page.waitForTimeout(2000);

    // Grant 50 credits
    const grantButton = page.locator('button:has-text("Grant Credits")');

    page.once('dialog', async (dialog) => {
      await dialog.accept('50');
    });

    await grantButton.click();
    await page.waitForTimeout(2000);

    // Navigate to purchases tab if exists
    const purchasesTab = page.locator('button:has-text("Purchases"), text=Purchase History');
    if (await purchasesTab.isVisible()) {
      await purchasesTab.click();
      await page.waitForTimeout(1000);
    }

    // Verify transaction logged
    await expect(page.locator('text=admin_adjustment')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/50.*minutes|50 min/i')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    await page.click(`text=${testUserEmail}`);
    await page.waitForTimeout(2000);

    // Simulate network offline
    await page.context().setOffline(true);

    const grantButton = page.locator('button:has-text("Grant Credits")');

    page.once('dialog', async (dialog) => {
      await dialog.accept('25');
    });

    await grantButton.click();
    await page.waitForTimeout(2000);

    // Should show network error
    await expect(page.locator('text=/Network Error|Unable to connect/i')).toBeVisible({ timeout: 5000 });

    // Restore network
    await page.context().setOffline(false);
  });
});
