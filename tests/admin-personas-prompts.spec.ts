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

// ============================================
// PERSONA MANAGEMENT TESTS
// ============================================

test.describe('Admin Personas Deep CRUD', () => {
  let adminToken: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    adminToken = await adminLogin(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('should display personas dashboard with stats cards', async ({ page }) => {
    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');

    // Should show the page title
    await expect(page.locator('h1:has-text("Personas")')).toBeVisible({ timeout: 10000 });

    // Should show summary stat cards
    await expect(page.locator('text=Total Personas')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('text=Active Sessions')).toBeVisible();
  });

  test('should show filter buttons for persona status', async ({ page }) => {
    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');

    // Filter buttons should be visible
    await expect(page.locator('button:has-text("All")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Active")')).toBeVisible();
    await expect(page.locator('button:has-text("Paused")')).toBeVisible();
  });

  test('should filter personas by active status', async ({ page }) => {
    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');

    // Click "Active" filter
    await page.click('button:has-text("Active")');
    await page.waitForTimeout(1000);

    // Evelyn Cross should be visible (she's active by default)
    await expect(page.locator('text=Evelyn Cross')).toBeVisible({ timeout: 10000 });
  });

  test('should show Evelyn Cross persona card with stats', async ({ page }) => {
    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');

    // Evelyn Cross should be visible
    await expect(page.locator('text=Evelyn Cross')).toBeVisible({ timeout: 10000 });

    // Should show Edit button
    const editButtons = page.locator('text=Edit');
    await expect(editButtons.first()).toBeVisible();
  });

  test('should toggle persona active/paused status via API', async ({ page }) => {
    // Get personas to find Evelyn's ID
    const personasRes = await page.request.get('/api/admin/personas', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const personasData = await personasRes.json();
    const evelyn = personasData.personas?.find((p: any) => p.displayName === 'Evelyn Cross');

    if (evelyn) {
      // Toggle to paused
      const pauseRes = await page.request.patch(`/api/admin/personas/${evelyn.id}/status`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: { isActive: false },
      });
      expect(pauseRes.status()).toBe(200);

      // Toggle back to active
      const activateRes = await page.request.patch(`/api/admin/personas/${evelyn.id}/status`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: { isActive: true },
      });
      expect(activateRes.status()).toBe(200);
    }
  });

  test('should navigate to persona editor from dashboard', async ({ page }) => {
    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');

    // Click edit on first persona
    const editLink = page.locator('a:has-text("Edit")').first();
    await editLink.click();

    // Should navigate to persona editor
    await page.waitForURL(/\/admin\/personas\//, { timeout: 10000 });

    // Should show persona editing form
    await expect(page.locator('text=/Display Name|Slug|Description/i')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to analytics from persona card', async ({ page }) => {
    await page.goto('/admin/personas');
    await page.waitForLoadState('networkidle');

    // Find the analytics button on a persona card (BarChart3 icon button)
    // It's the third action button on each card, links to /admin/analytics?persona=...
    const analyticsLinks = page.locator('a[href*="/admin/analytics"]');
    const count = await analyticsLinks.count();
    if (count > 0) {
      await analyticsLinks.first().click();
      await page.waitForURL(/\/admin\/analytics/, { timeout: 10000 });
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should verify personas API returns stats when requested', async ({ page }) => {
    const response = await page.request.get('/api/admin/personas?stats=true', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('personas');
    expect(Array.isArray(data.personas)).toBe(true);
    expect(data.personas.length).toBeGreaterThan(0);

    // Verify Evelyn exists
    const evelyn = data.personas.find((p: any) => p.displayName === 'Evelyn Cross');
    expect(evelyn).toBeTruthy();
    expect(evelyn).toHaveProperty('id');
    expect(evelyn).toHaveProperty('slug');
    expect(evelyn).toHaveProperty('displayName');
  });
});

// ============================================
// PROMPTS EDITOR TESTS
// ============================================

test.describe('Admin Prompts Editor', () => {
  let adminToken: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    adminToken = await adminLogin(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('should display prompts editor page', async ({ page }) => {
    await page.goto('/admin/prompts');
    await page.waitForLoadState('networkidle');

    // Should show the page title
    await expect(page.locator('h1:has-text("Prompts")')).toBeVisible({ timeout: 10000 });
  });

  test('should show persona selector and load prompts', async ({ page }) => {
    await page.goto('/admin/prompts');
    await page.waitForLoadState('networkidle');

    // Should have a persona selector (either select or custom dropdown)
    const personaSelect = page.locator('select, button:has-text("Select Persona")');
    await expect(personaSelect).toBeVisible({ timeout: 10000 });
  });

  test('should show New Prompt button', async ({ page }) => {
    await page.goto('/admin/prompts');
    await page.waitForLoadState('networkidle');

    const newPromptButton = page.locator('button:has-text("New Prompt")');
    await expect(newPromptButton).toBeVisible({ timeout: 10000 });
  });

  test('should open new prompt creation modal', async ({ page }) => {
    await page.goto('/admin/prompts');
    await page.waitForLoadState('networkidle');

    // Click "New Prompt"
    await page.click('button:has-text("New Prompt")');
    await page.waitForTimeout(500);

    // Should show the creation form/modal
    await expect(page.locator('text=/Create New Prompt|Prompt Type/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show prompt type options in creation form', async ({ page }) => {
    await page.goto('/admin/prompts');
    await page.waitForLoadState('networkidle');

    // Click "New Prompt"
    await page.click('button:has-text("New Prompt")');
    await page.waitForTimeout(500);

    // The creation form should have prompt type selection
    // Prompt types: system, greeting, summary, context_injection
    const typeOptions = page.locator('text=/System Prompt|Greeting|Session Summary|Context Injection/i');
    await expect(typeOptions.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display prompt editor textarea when prompt selected', async ({ page }) => {
    await page.goto('/admin/prompts');
    await page.waitForLoadState('networkidle');

    // Wait for persona to auto-select and prompts to load
    await page.waitForTimeout(2000);

    // Check if any prompts are listed - click on one if available
    const promptItem = page.locator('button:has-text("v")').first();
    if (await promptItem.isVisible()) {
      await promptItem.click();
      await page.waitForTimeout(500);

      // Should show the editor textarea
      const textarea = page.locator('textarea[placeholder*="prompt"], textarea');
      await expect(textarea.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should verify prompts API for persona', async ({ page }) => {
    // Get personas first
    const personasRes = await page.request.get('/api/admin/personas', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const personasData = await personasRes.json();
    const personaId = personasData.personas?.[0]?.id;

    if (personaId) {
      const response = await page.request.get(`/api/admin/personas/${personaId}/prompts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('prompts');
      expect(Array.isArray(data.prompts)).toBe(true);
    }
  });
});

// ============================================
// USER MANAGEMENT EXTENDED TESTS
// ============================================

test.describe('Admin User Management Extended', () => {
  let adminToken: string;
  let testUserEmail: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test user for search/detail tests
    const page = await browser.newPage();
    testUserEmail = `user-mgmt-${Date.now()}@example.com`;

    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'UserMgmtTest');
    await page.fill('input[name="email"]', testUserEmail);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Now login as admin
    adminToken = await adminLogin(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('should search users by email', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Type in search box
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show the test user
    await expect(page.locator(`text=${testUserEmail}`)).toBeVisible({ timeout: 10000 });
  });

  test('should show "Showing X of Y" count in users list', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Should show the count text
    await expect(page.locator('text=/Showing \\d+ of \\d+ users/i')).toBeVisible({ timeout: 10000 });
  });

  test('should clear search filter', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Search for test user
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Should show matching text with Clear link
    const clearLink = page.locator('text=Clear');
    if (await clearLink.isVisible()) {
      await clearLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Search should be cleared, showing all users
      const searchValue = await searchInput.inputValue();
      expect(searchValue).toBe('');
    }
  });

  test('should navigate to user detail from users list', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Search for test user
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Click on user email/name to go to details
    await page.click(`text=${testUserEmail}`);
    await page.waitForURL(/\/admin\/users\//, { timeout: 10000 });

    // Should show user detail page with overview cards
    await expect(page.locator('text=Credits (min)')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Sessions')).toBeVisible();
  });

  test('should display user detail overview cards', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Navigate to test user
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
    await page.click(`text=${testUserEmail}`);
    await page.waitForURL(/\/admin\/users\//, { timeout: 10000 });

    // Verify overview cards
    await expect(page.locator('text=Credits (min)')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Sessions')).toBeVisible();
    await expect(page.locator('text=Total Spent')).toBeVisible();
    await expect(page.locator('text=Memories')).toBeVisible();
  });

  test('should show user detail tabs', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
    await page.click(`text=${testUserEmail}`);
    await page.waitForURL(/\/admin\/users\//, { timeout: 10000 });

    // Should show tabs: Sessions, Purchases, Memories
    await expect(page.locator('button:has-text("Sessions")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Purchases")')).toBeVisible();
    await expect(page.locator('button:has-text("Memories")')).toBeVisible();
  });

  test('should switch between user detail tabs', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
    await page.click(`text=${testUserEmail}`);
    await page.waitForURL(/\/admin\/users\//, { timeout: 10000 });

    // Click Purchases tab
    await page.click('button:has-text("Purchases")');
    await page.waitForTimeout(500);
    // Should show purchase content or empty state
    await expect(page.locator('text=/No purchases yet|minutes/i')).toBeVisible({ timeout: 5000 });

    // Click Memories tab
    await page.click('button:has-text("Memories")');
    await page.waitForTimeout(500);
    // Should show memories content or empty state
    await expect(page.locator('text=/No memories stored yet|Importance/i')).toBeVisible({ timeout: 5000 });

    // Click Sessions tab
    await page.click('button:has-text("Sessions")');
    await page.waitForTimeout(500);
    // Should show sessions content or empty state
    await expect(page.locator('text=/No sessions yet|sessions|messages/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show Grant Credits button in user detail', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
    await page.click(`text=${testUserEmail}`);
    await page.waitForURL(/\/admin\/users\//, { timeout: 10000 });

    // Grant Credits button should be visible
    await expect(page.locator('button:has-text("Grant Credits")')).toBeVisible({ timeout: 10000 });
  });

  test('should show Suspend/Reactivate button in user detail', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
    await page.click(`text=${testUserEmail}`);
    await page.waitForURL(/\/admin\/users\//, { timeout: 10000 });

    // Suspend/Reactivate button should be visible
    await expect(page.locator('button:has-text("Suspend"), button:has-text("Reactivate")')).toBeVisible({ timeout: 10000 });
  });

  test('should show user status badge and join date', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
    await page.click(`text=${testUserEmail}`);
    await page.waitForURL(/\/admin\/users\//, { timeout: 10000 });

    // Should show account status badge
    await expect(page.locator('text=/active|suspended/i').first()).toBeVisible({ timeout: 10000 });

    // Should show join date
    await expect(page.locator('text=/Joined:/i')).toBeVisible();
  });

  test('should show Back to Users navigation', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(testUserEmail);
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
    await page.click(`text=${testUserEmail}`);
    await page.waitForURL(/\/admin\/users\//, { timeout: 10000 });

    // Should show "Back to Users" button
    const backButton = page.locator('text=Back to Users');
    await expect(backButton).toBeVisible({ timeout: 10000 });

    // Click it and verify navigation
    await backButton.click();
    await page.waitForURL(/\/admin\/users$/, { timeout: 10000 });
  });

  test('should verify users list API returns correct structure', async ({ page }) => {
    const response = await page.request.get('/api/admin/users?page=1&pageSize=5', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('users');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('pageSize');
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.users.length).toBeGreaterThan(0);

    // Verify user object structure
    const user = data.users[0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('firstName');
    expect(user).toHaveProperty('creditMinutes');
    expect(user).toHaveProperty('accountStatus');
  });

  test('should verify users search API works correctly', async ({ page }) => {
    const response = await page.request.get(`/api/admin/users?search=${testUserEmail}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();

    expect(data.users.length).toBeGreaterThanOrEqual(1);
    const found = data.users.find((u: any) => u.email === testUserEmail);
    expect(found).toBeTruthy();
    expect(found.firstName).toBe('UserMgmtTest');
  });

  test('should display users table with correct columns', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Should show table headers
    await expect(page.locator('th:has-text("User")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Credits")')).toBeVisible();
    await expect(page.locator('th:has-text("Sessions")')).toBeVisible();
    await expect(page.locator('th:has-text("Spent")')).toBeVisible();
    await expect(page.locator('th:has-text("Joined")')).toBeVisible();
  });
});
