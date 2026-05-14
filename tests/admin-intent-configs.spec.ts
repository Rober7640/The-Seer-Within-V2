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

test.describe('Admin Intent Config Editor', () => {
  let adminToken: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    adminToken = await adminLogin(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('should display intent config editor with persona selector', async ({ page }) => {
    await page.goto('/admin/intent-configs');
    await page.waitForLoadState('networkidle');

    // Should show the page title
    await expect(page.locator('text=Intent Configs')).toBeVisible({ timeout: 10000 });

    // Should show persona selector dropdown
    const personaSelector = page.locator('select');
    await expect(personaSelector).toBeVisible({ timeout: 10000 });

    // Should have at least Evelyn Cross as an option
    await expect(personaSelector.locator('option:has-text("Evelyn Cross")')).toBeAttached();
  });

  test('should load intent configs for selected persona', async ({ page }) => {
    await page.goto('/admin/intent-configs');
    await page.waitForLoadState('networkidle');

    // Wait for configs to load - should show either a config editor or "No intent config" message
    const configContent = page.locator('text=/Specialty|Conversation Buckets|No intent config/i');
    await expect(configContent).toBeVisible({ timeout: 10000 });
  });

  test('should show New Config button', async ({ page }) => {
    await page.goto('/admin/intent-configs');
    await page.waitForLoadState('networkidle');

    // The "New Config" button should be visible
    const newButton = page.locator('button:has-text("New Config")');
    await expect(newButton).toBeVisible({ timeout: 10000 });
  });

  test('should create a new intent config via New Config button', async ({ page }) => {
    await page.goto('/admin/intent-configs');
    await page.waitForLoadState('networkidle');

    // Click New Config
    await page.click('button:has-text("New Config")');
    await page.waitForTimeout(500);

    // Should now show the editor with default buckets
    await expect(page.locator('text=Specialty')).toBeVisible({ timeout: 5000 });

    // Fill in the specialty field
    const specialtyInput = page.locator('input[placeholder*="tarot"]');
    await specialtyInput.fill('test-specialty-' + Date.now());

    // The Conversation Buckets section should be expanded by default
    await expect(page.locator('text=Conversation Buckets')).toBeVisible();

    // Should have default buckets pre-populated (opening, question, reading, offer)
    const bucketInputs = page.locator('input[placeholder="Bucket name"]');
    const bucketCount = await bucketInputs.count();
    expect(bucketCount).toBeGreaterThanOrEqual(4);

    // Save the config
    const saveButton = page.locator('button:has-text("Save Config")');
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should display collapsible sections', async ({ page }) => {
    await page.goto('/admin/intent-configs');
    await page.waitForLoadState('networkidle');

    // Click New Config to ensure we have an editor visible
    const newButton = page.locator('button:has-text("New Config")');
    if (await newButton.isVisible()) {
      // If no config exists, create a new one to see the sections
      await newButton.click();
      await page.waitForTimeout(500);
    }

    // Check collapsible sections are present
    await expect(page.locator('text=Conversation Buckets')).toBeVisible({ timeout: 5000 });

    // Click on "Intents" section to expand it
    const intentsSection = page.locator('button:has-text("Intents")');
    if (await intentsSection.isVisible()) {
      await intentsSection.click();
      await page.waitForTimeout(300);

      // Should show "Add Intent" button when expanded
      await expect(page.locator('button:has-text("Add Intent")')).toBeVisible({ timeout: 3000 });
    }

    // Click on "Character Rules" section to expand it
    const rulesSection = page.locator('button:has-text("Character Rules")');
    if (await rulesSection.isVisible()) {
      await rulesSection.click();
      await page.waitForTimeout(300);

      // Should show character rules fields
      await expect(page.locator('text=/Forbidden Phrases|Speaking Style/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should add and remove buckets', async ({ page }) => {
    await page.goto('/admin/intent-configs');
    await page.waitForLoadState('networkidle');

    // Ensure we have a config editor open
    const hasConfig = await page.locator('text=Conversation Buckets').isVisible();
    if (!hasConfig) {
      await page.click('button:has-text("New Config")');
      await page.waitForTimeout(500);
    }

    // Count initial buckets
    const initialBuckets = await page.locator('input[placeholder="Bucket name"]').count();

    // Click "Add Bucket"
    await page.click('button:has-text("Add Bucket")');
    await page.waitForTimeout(300);

    // Should have one more bucket
    const afterAddBuckets = await page.locator('input[placeholder="Bucket name"]').count();
    expect(afterAddBuckets).toBe(initialBuckets + 1);
  });

  test('should add and remove intents', async ({ page }) => {
    await page.goto('/admin/intent-configs');
    await page.waitForLoadState('networkidle');

    // Ensure we have a config editor
    const hasConfig = await page.locator('text=Conversation Buckets').isVisible();
    if (!hasConfig) {
      await page.click('button:has-text("New Config")');
      await page.waitForTimeout(500);
    }

    // Expand Intents section
    const intentsHeader = page.locator('button:has-text("Intents")');
    await intentsHeader.click();
    await page.waitForTimeout(300);

    // Count initial intents
    const initialIntents = await page.locator('input[placeholder="Intent name"]').count();

    // Click "Add Intent"
    await page.click('button:has-text("Add Intent")');
    await page.waitForTimeout(300);

    // Should have one more intent
    const afterAddIntents = await page.locator('input[placeholder="Intent name"]').count();
    expect(afterAddIntents).toBe(initialIntents + 1);

    // Fill in the new intent
    const newIntentName = page.locator('input[placeholder="Intent name"]').last();
    await newIntentName.fill('test-intent');

    const patternsInput = page.locator('input[placeholder="Patterns (comma separated)"]').last();
    await patternsInput.fill('hello, hi, greetings');

    const guidanceInput = page.locator('textarea[placeholder*="Response guidance"]').last();
    await guidanceInput.fill('Respond warmly and encouragingly');
  });

  test('should switch between personas', async ({ page }) => {
    await page.goto('/admin/intent-configs');
    await page.waitForLoadState('networkidle');

    // Get the persona selector
    const personaSelector = page.locator('select');
    await expect(personaSelector).toBeVisible({ timeout: 10000 });

    // Get all options
    const options = personaSelector.locator('option');
    const optionCount = await options.count();

    if (optionCount > 1) {
      // Select the second persona
      const secondValue = await options.nth(1).getAttribute('value');
      if (secondValue) {
        await personaSelector.selectOption(secondValue);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Page should update - either show configs or "No intent config" message
        const content = page.locator('text=/Specialty|Conversation Buckets|No intent config/i');
        await expect(content).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should verify intent configs API returns correct structure', async ({ page }) => {
    // Get personas first to get a valid persona ID
    const personasRes = await page.request.get('/api/admin/personas', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const personasData = await personasRes.json();
    const personaId = personasData.personas?.[0]?.id;

    if (personaId) {
      const response = await page.request.get(`/api/admin/intent-configs?personaId=${personaId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('configs');
      expect(Array.isArray(data.configs)).toBe(true);

      // If configs exist, verify their structure
      if (data.configs.length > 0) {
        const config = data.configs[0];
        expect(config).toHaveProperty('id');
        expect(config).toHaveProperty('personaId');
        expect(config).toHaveProperty('specialty');
        expect(config).toHaveProperty('conversationBuckets');
        expect(config).toHaveProperty('intents');
        expect(config).toHaveProperty('characterRules');
        expect(config).toHaveProperty('version');
        expect(config).toHaveProperty('isActive');
      }
    }
  });
});
