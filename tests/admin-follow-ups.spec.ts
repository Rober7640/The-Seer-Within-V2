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

test.describe('Admin Follow-Ups Dashboard', () => {
  let adminToken: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    adminToken = await adminLogin(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('should display follow-ups dashboard page', async ({ page }) => {
    await page.goto('/admin/follow-ups');
    await page.waitForLoadState('networkidle');

    // Should show the page title
    await expect(page.locator('text=Follow-Up Emails')).toBeVisible({ timeout: 10000 });
  });

  test('should display stats cards', async ({ page }) => {
    await page.goto('/admin/follow-ups');
    await page.waitForLoadState('networkidle');

    // Stats cards should be visible with labels
    await expect(page.locator('text=/Total/i').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Sent/i').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Open Rate/i').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Click Rate/i').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Failed/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show status filter dropdown', async ({ page }) => {
    await page.goto('/admin/follow-ups');
    await page.waitForLoadState('networkidle');

    // Status filter dropdown should be visible with "All statuses" default
    const statusFilter = page.locator('button:has-text("All statuses")');
    await expect(statusFilter).toBeVisible({ timeout: 10000 });

    // Click to open dropdown
    await statusFilter.click();
    await page.waitForTimeout(500);

    // Should show status options
    await expect(page.locator('[role="option"]:has-text("Pending")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[role="option"]:has-text("Sent")')).toBeVisible();
    await expect(page.locator('[role="option"]:has-text("Failed")')).toBeVisible();
    await expect(page.locator('[role="option"]:has-text("Bounced")')).toBeVisible();
  });

  test('should filter by sent status', async ({ page }) => {
    await page.goto('/admin/follow-ups');
    await page.waitForLoadState('networkidle');

    // Click status filter dropdown
    const statusFilter = page.locator('button:has-text("All statuses")');
    await statusFilter.click();
    await page.waitForTimeout(500);

    // Select "Sent"
    await page.click('[role="option"]:has-text("Sent")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should show filtered results or empty state
    const content = page.locator('text=/Showing .* of .* follow-up emails|No follow-up emails found/i');
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('should filter by pending status', async ({ page }) => {
    await page.goto('/admin/follow-ups');
    await page.waitForLoadState('networkidle');

    // Click status filter dropdown
    const statusFilter = page.locator('button:has-text("All statuses")');
    await statusFilter.click();
    await page.waitForTimeout(500);

    // Select "Pending"
    await page.click('[role="option"]:has-text("Pending")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should show filtered results or empty state
    const content = page.locator('text=/Showing .* of .* follow-up emails|No follow-up emails found/i');
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('should show export CSV button', async ({ page }) => {
    await page.goto('/admin/follow-ups');
    await page.waitForLoadState('networkidle');

    // Export CSV button should be visible
    const exportButton = page.locator('button:has-text("Export CSV")');
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });

  test('should export follow-ups as CSV via API', async ({ page }) => {
    const response = await page.request.get('/api/admin/follow-ups/export', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');
    expect(response.headers()['content-disposition']).toContain('follow_up_emails.csv');

    const csvText = await response.text();
    // CSV should at least have the header row
    expect(csvText).toContain('id,recipientEmail,subject,status');
  });

  test('should display email table or empty state', async ({ page }) => {
    await page.goto('/admin/follow-ups');
    await page.waitForLoadState('networkidle');

    // Should show either the table with headers or the empty state
    const tableHeaders = page.locator('th:has-text("Recipient")');
    const emptyState = page.locator('text=No follow-up emails found');

    await expect(tableHeaders.or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  test('should show table column headers when emails exist', async ({ page }) => {
    await page.goto('/admin/follow-ups');
    await page.waitForLoadState('networkidle');

    // Check for table column headers
    const hasTable = await page.locator('th:has-text("Recipient")').isVisible();
    if (hasTable) {
      await expect(page.locator('th:has-text("Recipient")')).toBeVisible();
      await expect(page.locator('th:has-text("Subject")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Opened")')).toBeVisible();
      await expect(page.locator('th:has-text("Clicked")')).toBeVisible();
      await expect(page.locator('th:has-text("Days Inactive")')).toBeVisible();
      await expect(page.locator('th:has-text("Sent")')).toBeVisible();
    }
  });

  test('should verify follow-ups stats API returns correct structure', async ({ page }) => {
    const response = await page.request.get('/api/admin/follow-ups/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('byStatus');
    expect(data).toHaveProperty('engagement');
    expect(data.engagement).toHaveProperty('sent');
    expect(data.engagement).toHaveProperty('opened');
    expect(data.engagement).toHaveProperty('clicked');
    expect(data.engagement).toHaveProperty('openRate');
    expect(data.engagement).toHaveProperty('clickRate');
    expect(typeof data.total).toBe('number');
  });

  test('should verify follow-ups list API returns correct structure', async ({ page }) => {
    const response = await page.request.get('/api/admin/follow-ups?page=1&pageSize=5', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('emails');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('pageSize');
    expect(Array.isArray(data.emails)).toBe(true);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(5);
  });

  test('should verify follow-ups API with status filter', async ({ page }) => {
    const response = await page.request.get('/api/admin/follow-ups?page=1&pageSize=5&status=sent', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('emails');
    expect(Array.isArray(data.emails)).toBe(true);

    // All returned emails should have status "sent"
    for (const email of data.emails) {
      expect(email.status).toBe('sent');
    }
  });
});
