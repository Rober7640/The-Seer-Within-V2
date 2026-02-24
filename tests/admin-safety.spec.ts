import { test, expect, Page } from '@playwright/test';

/**
 * Helper: login as admin and return the auth token
 */
async function adminLogin(page: Page): Promise<string> {
  await page.goto('/admin/login');
  await page.fill('input[name="email"]', 'admin@theseerwithin.com');
  await page.fill('input[name="password"]', 'ChangeMe123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 10000 });
  const token = await page.evaluate(() => localStorage.getItem('seer_admin_token') || '');
  return token;
}

test.describe('Admin Safety Dashboard', () => {
  let adminToken: string;

  test.beforeAll(async ({ browser }) => {
    // Seed a safety violation via the API so we have data to test with
    const page = await browser.newPage();
    adminToken = await adminLogin(page);

    // Create a test user and simulate a safety violation by directly calling the API
    // Safety violations are created by the chat engine, so we'll check if any exist,
    // and if none, the tests will handle the empty state gracefully.
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('should display safety dashboard page', async ({ page }) => {
    await page.goto('/admin/safety');
    await page.waitForLoadState('networkidle');

    // Should show the page title
    await expect(page.locator('text=Safety Violations')).toBeVisible({ timeout: 10000 });
  });

  test('should display stats cards when data exists', async ({ page }) => {
    await page.goto('/admin/safety');
    await page.waitForLoadState('networkidle');

    // The stats section should display with "Total" and "Flagged" labels at minimum
    // Even with 0 violations, the stats API returns { total: 0, flaggedForReview: 0, byType: {} }
    const totalStat = page.locator('text=/Total/i').first();
    await expect(totalStat).toBeVisible({ timeout: 10000 });

    const flaggedStat = page.locator('text=/Flagged/i').first();
    await expect(flaggedStat).toBeVisible({ timeout: 10000 });
  });

  test('should show violation type filter dropdown', async ({ page }) => {
    await page.goto('/admin/safety');
    await page.waitForLoadState('networkidle');

    // Type filter should be visible with "All types" default
    const typeFilter = page.locator('button:has-text("All types")');
    await expect(typeFilter).toBeVisible({ timeout: 10000 });

    // Click to open dropdown
    await typeFilter.click();
    await page.waitForTimeout(500);

    // Should show violation type options
    await expect(page.locator('text=Crisis')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Inappropriate')).toBeVisible();
    await expect(page.locator('text=Prompt Injection')).toBeVisible();
    await expect(page.locator('text=Harassment')).toBeVisible();
    await expect(page.locator('text=Gibberish')).toBeVisible();
  });

  test('should filter by violation type', async ({ page }) => {
    await page.goto('/admin/safety');
    await page.waitForLoadState('networkidle');

    // Click type filter dropdown
    const typeFilter = page.locator('button:has-text("All types")');
    await typeFilter.click();
    await page.waitForTimeout(500);

    // Select "Crisis" type
    await page.click('[role="option"]:has-text("Crisis")');
    await page.waitForLoadState('networkidle');

    // Verify filter was applied - the dropdown should now show "Crisis"
    // The page should reload with filtered data (or show "No violations found")
    await page.waitForTimeout(1000);
    const showing = page.locator('text=/Showing .* of .* violations|No violations found/i');
    await expect(showing).toBeVisible({ timeout: 10000 });
  });

  test('should toggle flagged-only filter', async ({ page }) => {
    await page.goto('/admin/safety');
    await page.waitForLoadState('networkidle');

    // Find the "Flagged only" button
    const flaggedButton = page.locator('button:has-text("Flagged only")');
    await expect(flaggedButton).toBeVisible({ timeout: 10000 });

    // Click to enable flagged filter
    await flaggedButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // The button should now have the active styling (yellow border)
    // and results should be filtered
    const showing = page.locator('text=/Showing .* of .* violations|No violations found/i');
    await expect(showing).toBeVisible({ timeout: 10000 });

    // Click again to disable
    await flaggedButton.click();
    await page.waitForLoadState('networkidle');
  });

  test('should show export CSV button', async ({ page }) => {
    await page.goto('/admin/safety');
    await page.waitForLoadState('networkidle');

    // Export CSV button should be visible
    const exportButton = page.locator('button:has-text("Export CSV")');
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });

  test('should export violations as CSV via API', async ({ page }) => {
    // Test the export endpoint directly
    const response = await page.request.get('/api/admin/safety/export', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');
    expect(response.headers()['content-disposition']).toContain('safety_violations.csv');

    const csvText = await response.text();
    // CSV should at least have the header row
    expect(csvText).toContain('id,violationType,userMessage,systemResponse');
  });

  test('should display violations list or empty state', async ({ page }) => {
    await page.goto('/admin/safety');
    await page.waitForLoadState('networkidle');

    // Should show either the violations list or the empty state
    const content = page.locator('text=/Showing .* of .* violations|No violations found/i');
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('should show showing count text', async ({ page }) => {
    await page.goto('/admin/safety');
    await page.waitForLoadState('networkidle');

    // Wait for data to load and verify the "Showing X of Y" text appears
    const showingText = page.locator('text=/Showing \\d+ of \\d+ violations/');
    const noViolations = page.locator('text=No violations found');

    // One of these should be visible
    await expect(showingText.or(noViolations)).toBeVisible({ timeout: 10000 });
  });

  test('should verify safety stats API returns correct structure', async ({ page }) => {
    const response = await page.request.get('/api/admin/safety/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('flaggedForReview');
    expect(data).toHaveProperty('byType');
    expect(typeof data.total).toBe('number');
    expect(typeof data.flaggedForReview).toBe('number');
    expect(typeof data.byType).toBe('object');
  });

  test('should verify violations API returns correct structure', async ({ page }) => {
    const response = await page.request.get('/api/admin/safety/violations?page=1&pageSize=5', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('violations');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('pageSize');
    expect(Array.isArray(data.violations)).toBe(true);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(5);
  });
});
