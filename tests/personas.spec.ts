import { test, expect } from '@playwright/test';

test.describe('Persona Directory', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to personas directory
    await page.goto('/personas');
  });

  test('should display persona directory with Evelyn Cross', async ({ page }) => {
    // Wait for personas to load
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Should show Evelyn's card (use .first() to handle multiple matches)
    await expect(page.locator('text=Evelyn Cross').first()).toBeVisible();

    // Should show tagline
    await expect(page.locator('text=/Spiritual Guide|Your Guide/i').first()).toBeVisible();

    // Should show free minutes
    await expect(page.locator('text=/3.*free.*min|free.*min.*3/i').first()).toBeVisible();
  });

  test('should filter personas by category', async ({ page }) => {
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Click category filter (if available) - fixed CSS selector
    const loveFilter = page.locator('button:has-text("Love")').first();
    if (await loveFilter.isVisible()) {
      await loveFilter.click();
      await page.waitForTimeout(500);

      // Should still show Evelyn (she covers love)
      await expect(page.locator('text=Evelyn Cross').first()).toBeVisible();
    }
  });

  test('should open persona detail modal', async ({ page }) => {
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Click on Evelyn's card to open the detail modal
    await page.locator('text=Evelyn Cross').first().click();

    // The detail modal opens with the "Start Reading with …" CTA
    await expect(page.getByRole('button', { name: /Start Reading with/i })).toBeVisible({ timeout: 5000 });

    // And shows her per-minute rate (the customer-facing price in the directory/modal)
    await expect(page.getByText(/\$\d+\.\d{2}\/min/).first()).toBeVisible();
  });

  test('should navigate to chat service from persona card', async ({ page }) => {
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Find "Start Reading" / "Start Chat" button
    const startButton = page.locator('button:has-text("Start Reading"), button:has-text("Start Chat")').first();
    await startButton.click();

    // As a guest, starting a reading opens an inline auth modal (sign-up/sign-in)
    // rather than navigating — the customer registers right there and continues.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
  });

  test('should show Marcus Stone persona if seeded', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Marcus might exist if seed script was run (use .first() for multiple matches)
    const marcusCard = page.locator('text=Marcus Stone').first();
    const isVisible = await marcusCard.isVisible().catch(() => false);
    if (isVisible) {
      await expect(marcusCard).toBeVisible();
      await expect(page.locator('text=/Tarot Master|Tarot/i').first()).toBeVisible();
    }
  });

  test('should display pricing information for personas', async ({ page }) => {
    await page.waitForSelector('text=Evelyn Cross', { timeout: 10000 });

    // Cards show the guide's per-minute rate, e.g. "$2.99/min".
    await expect(page.getByText(/\$\d+\.\d{2}\/min/).first()).toBeVisible();
  });
});
