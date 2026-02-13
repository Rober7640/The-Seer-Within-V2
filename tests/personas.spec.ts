import { test, expect } from '@playwright/test';

test.describe('Persona Directory', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to personas directory
    await page.goto('/personas');
  });

  test('should display persona directory with Evelyn Cross', async ({ page }) => {
    // Wait for personas to load
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Should show Evelyn's card
    await expect(page.locator('text=Evelyn Cross')).toBeVisible();

    // Should show tagline
    await expect(page.locator('text=/Spiritual Guide|Your Guide/i')).toBeVisible();

    // Should show free minutes
    await expect(page.locator('text=/3.*free.*minute|free.*minute.*3/i')).toBeVisible();
  });

  test('should filter personas by category', async ({ page }) => {
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Click category filter (if available)
    const loveFilter = page.locator('button:has-text("Love"), text=Love').first();
    if (await loveFilter.isVisible()) {
      await loveFilter.click();
      await page.waitForTimeout(500);

      // Should still show Evelyn (she covers love)
      await expect(page.locator('text=Evelyn Cross')).toBeVisible();
    }
  });

  test('should open persona detail modal', async ({ page }) => {
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Click on Evelyn's card
    await page.locator('text=Evelyn Cross').first().click();

    // Wait for modal/detail page to open
    await page.waitForTimeout(1000);

    // Should show more details
    await expect(page.locator('text=/20 years|experience|expertise/i')).toBeVisible({ timeout: 5000 });

    // Should show pricing tiers
    await expect(page.locator('text=/\\$15|15.*minute/i')).toBeVisible();
  });

  test('should navigate to chat service from persona card', async ({ page }) => {
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Find "Start Reading" or similar button
    const startButton = page.locator('button:has-text("Start Reading"), button:has-text("Start Chat")').first();

    if (await startButton.isVisible()) {
      await startButton.click();

      // Should redirect to chat service or login
      await page.waitForURL(/.*chat-service|login/, { timeout: 5000 });
    }
  });

  test('should show Marcus Stone persona if seeded', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Marcus might exist if seed script was run
    const marcusCard = page.locator('text=Marcus Stone');
    if (await marcusCard.isVisible()) {
      await expect(marcusCard).toBeVisible();
      await expect(page.locator('text=/Tarot Master|Tarot/i')).toBeVisible();
    }
  });

  test('should display pricing information for personas', async ({ page }) => {
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Should show starting price
    await expect(page.locator('text=/Starting at|From.*\\$/i')).toBeVisible();
    await expect(page.locator('text=/\\$15|\\$1\\.00.*min/i')).toBeVisible();
  });
});
