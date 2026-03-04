import { test, expect } from '@playwright/test';

test.describe('Admin Grant Credits - Simple Test', () => {
  const adminEmail = 'admin@theseerwithin.com';
  const adminPassword = 'ChangeMe123!';

  test('should navigate to user detail and find grant button', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*admin/, { timeout: 10000 });

    // Navigate to users list
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Click on the first user (should exist from previous tests)
    const firstUserEmail = await page.locator('table tbody tr:first-child td:first-child p.text-xs').textContent();
    console.log('First user email:', firstUserEmail);

    // Click on first user
    await page.click('table tbody tr:first-child td:first-child a');
    await page.waitForLoadState('networkidle');

    // Wait for page to load - look for the credit balance card
    await expect(page.locator('text=Credits (min)')).toBeVisible({ timeout: 10000 });

    // Check if Grant Credits button exists
    const grantButton = page.locator('button:has-text("Grant Credits")');
    await expect(grantButton).toBeVisible({ timeout: 5000 });

    console.log('✅ Found Grant Credits button!');

    // Get the current credit balance
    const balanceCard = page.locator('text=Credits (min)').locator('..');
    const balanceNumber = await balanceCard.locator('p.text-2xl').textContent();
    console.log('Current balance:', balanceNumber);

    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/admin-user-detail.png', fullPage: true });
  });
});
