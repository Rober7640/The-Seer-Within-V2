import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  const adminEmail = 'admin@theseerwithin.com';
  const adminPassword = 'ChangeMe123!';

  test.beforeEach(async ({ page }) => {
    // Navigate to admin login
    await page.goto('/admin/login');
  });

  test('should login to admin dashboard', async ({ page }) => {
    // Fill admin login form
    await page.fill('input[name="email"], input[type="email"]', adminEmail);
    await page.fill('input[name="password"], input[type="password"]', adminPassword);

    // Submit login
    await page.click('button[type="submit"]');

    // Should redirect to admin dashboard
    await page.waitForURL(/.*admin/, { timeout: 10000 });

    // Should see admin navigation
    await expect(page.locator('text=/Dashboard|Admin/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display personas management page', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to personas management
    await page.goto('/admin/personas');

    // Should show personas table
    await expect(page.locator('text=Evelyn Cross')).toBeVisible({ timeout: 10000 });

    // Should show action buttons
    await expect(page.locator('button:has-text("Edit"), button:has-text("Create")')).toBeVisible();
  });

  test('should open persona editor', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/admin/personas');

    // Click edit button for Evelyn
    await page.click('button:has-text("Edit")');
    await page.waitForTimeout(1000);

    // Should show persona editor form
    await expect(page.locator('input[value="Evelyn Cross"], text=Evelyn Cross')).toBeVisible({ timeout: 5000 });
  });

  test('should edit persona pricing', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/admin/personas');

    // Open editor
    await page.click('button:has-text("Edit")');
    await page.waitForTimeout(1000);

    // Find free minutes input
    const freeMinutesInput = page.locator('input[name="freeMinutes"], input[label*="Free Minutes"]');
    if (await freeMinutesInput.isVisible()) {
      // Change free minutes
      await freeMinutesInput.fill('5');

      // Save changes
      await page.click('button:has-text("Save"), button[type="submit"]');
      await page.waitForTimeout(2000);

      // Should show success message
      await expect(page.locator('text=/Success|Saved|Updated/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display users list', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to users page
    await page.goto('/admin/users');

    // Should show users table
    await expect(page.locator('text=/Email|User List/i')).toBeVisible({ timeout: 10000 });

    // Should show at least one user
    await expect(page.locator('table tr, [role="row"]')).toHaveCount({ min: 1 });
  });

  test('should view user detail with multi-persona stats', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/admin/users');

    // Click on first user
    const viewButton = page.locator('button:has-text("View"), a:has-text("Details")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(1000);

      // Should show user details
      await expect(page.locator('text=/Credit Minutes|Total Minutes Used/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display analytics dashboard', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to analytics
    await page.goto('/admin/analytics');

    // Should show analytics metrics
    await expect(page.locator('text=/Total Users|Revenue|Sessions/i')).toBeVisible({ timeout: 10000 });

    // Should show charts
    await expect(page.locator('canvas, svg[class*="recharts"]')).toBeVisible({ timeout: 5000 });
  });

  test('should display prompts editor', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to prompts editor
    await page.goto('/admin/prompts');

    // Should show persona selector
    await expect(page.locator('select, button:has-text("Select Persona")')).toBeVisible({ timeout: 10000 });

    // Select Evelyn
    await page.click('select, button:has-text("Select Persona")');
    await page.click('text=Evelyn Cross');
    await page.waitForTimeout(1000);

    // Should show prompt editor
    await expect(page.locator('textarea[name="promptContent"], textarea[placeholder*="prompt"]')).toBeVisible({ timeout: 5000 });
  });

  test('should manually adjust user credits', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/admin/users');

    // View user detail
    const viewButton = page.locator('button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(1000);

      // Find adjust credits button
      const adjustButton = page.locator('button:has-text("Adjust Credits"), button:has-text("Edit Credits")');
      if (await adjustButton.isVisible()) {
        await adjustButton.click();
        await page.waitForTimeout(500);

        // Enter new credit amount
        await page.fill('input[name="creditMinutes"], input[type="number"]', '100');

        // Save
        await page.click('button:has-text("Save"), button:has-text("Update")');
        await page.waitForTimeout(2000);

        // Should show success
        await expect(page.locator('text=/Success|Updated/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should create new persona', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto('/admin/personas');

    // Click "Create New" button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Persona")');
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // Fill persona form
      await page.fill('input[name="displayName"]', 'Test Persona');
      await page.fill('input[name="slug"]', 'test-persona');
      await page.fill('textarea[name="description"]', 'A test persona for automated testing');

      // Save
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Should see success message
      await expect(page.locator('text=/Success|Created/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
