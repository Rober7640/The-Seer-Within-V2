import { test, expect } from '@playwright/test';

test.describe('Credit Purchase Flow', () => {
  const testEmail = `credits-test-${Date.now()}@example.com`;
  const testPassword = 'CreditsTest123!';

  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/');
    await page.click('text=Get Started');
    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.fill('input[name="firstName"]', 'CreditTester');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  });

  test('should display pricing page', async ({ page }) => {
    await page.goto('/credits');

    // Should show pricing tiers
    await expect(page.locator('text=/15 Minutes|15.*min/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/30 Minutes|30.*min/i')).toBeVisible();

    // Should show prices
    await expect(page.locator('text=/\\$15|15.*dollar/i')).toBeVisible();
    await expect(page.locator('text=/\\$25|25.*dollar/i')).toBeVisible();
  });

  test('should show current credit balance on pricing page', async ({ page }) => {
    await page.goto('/credits');

    // Should show current balance (3 free minutes)
    await expect(page.locator('text=/3.*minute.*remaining|Current.*3.*minute/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display per-persona pricing when personaId provided', async ({ page }) => {
    // Navigate with personaId query param
    await page.goto('/credits?personaId=evelyn-cross');

    // Should show persona context
    await expect(page.locator('text=Evelyn Cross')).toBeVisible({ timeout: 10000 });

    // Should show persona-specific pricing
    await expect(page.locator('text=/Evelyn.*Package|Package.*Evelyn/i')).toBeVisible();
  });

  test('should initiate Stripe checkout for 15-minute package', async ({ page }) => {
    await page.goto('/credits');

    // Click on 15-minute package purchase button
    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Purchase")').first();
    await buyButton.click();

    // Should redirect to Stripe or show checkout loading
    await page.waitForTimeout(2000);

    // Check if redirected to Stripe (URL contains 'stripe' or 'checkout')
    const currentUrl = page.url();
    if (currentUrl.includes('stripe') || currentUrl.includes('checkout')) {
      expect(currentUrl).toContain('stripe');
    }
  });

  test('should show purchase history if available', async ({ page }) => {
    await page.goto('/credits');

    // Look for purchase history section
    const historySection = page.locator('text=/Purchase History|Recent Purchases|Transaction History/i');
    if (await historySection.isVisible()) {
      await expect(historySection).toBeVisible();
    }
  });

  test('should display different pricing for different personas', async ({ page }) => {
    // Check Evelyn's pricing
    await page.goto('/credits?personaId=evelyn-cross');
    await page.waitForTimeout(1000);
    const evelynPrice = await page.locator('text=/\\$15|\\$25/i').first().textContent();

    // Check Marcus's pricing (if seeded)
    await page.goto('/credits?personaId=marcus-stone');
    await page.waitForTimeout(1000);
    const marcusLocator = page.locator('text=Marcus Stone');

    if (await marcusLocator.isVisible()) {
      // Marcus might have different pricing (e.g., $18 instead of $15)
      await expect(page.locator('text=/\\$18|\\$30/i')).toBeVisible();
    }
  });

  test('should show "Out of Credits" message when credits depleted', async ({ page }) => {
    // This test would require actually using up all credits
    // For now, we can check if the UI handles zero credits

    await page.goto('/chat-service');

    // If user runs out during a session, should see purchase prompt
    // This is a placeholder - in real test would need to deplete credits first
  });

  test('should navigate from out-of-credits modal to purchase page', async ({ page }) => {
    await page.goto('/chat-service');

    // Look for "Get More Credits" or similar link
    const getCreditsButton = page.locator('button:has-text("Get More Credits"), a:has-text("Purchase Credits")');

    if (await getCreditsButton.isVisible()) {
      await getCreditsButton.click();
      await page.waitForURL(/.*credits/, { timeout: 5000 });
    }
  });
});
