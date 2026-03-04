import { test, expect } from '@playwright/test';

/**
 * Quick verification tests for the 2 high-priority fixes
 */

test.describe('Verify High-Priority Fixes', () => {

  test('Fix 1: Zero credits UX - should show prominent warning and purchase link', async ({ page, request }) => {
    const testEmail = `test-zero-${Date.now()}@example.com`;

    // Step 1: Register new user (gets 3 free credits)
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    await page.fill('input[name="firstName"]', 'ZeroCreditsTest');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    console.log('✅ User registered successfully');

    // Step 2: Get user ID from local storage or API
    const userJson = await page.evaluate(() => localStorage.getItem('user'));
    const userId = userJson ? JSON.parse(userJson).id : null;
    console.log(`User ID: ${userId}`);

    // Step 3: Login as admin in a separate context to set credits to 0
    const adminContext = await page.context().browser()?.newContext();
    if (adminContext) {
      const adminPage = await adminContext.newPage();

      try {
        // Login as admin
        await adminPage.goto('/admin/login');
        await adminPage.fill('input[name="email"]', 'admin@theseerwithin.com');
        await adminPage.fill('input[name="password"]', 'ChangeMe123!');
        await adminPage.click('button[type="submit"]');
        await adminPage.waitForTimeout(2000);
        console.log('✅ Admin logged in');

        // Navigate to users and find our test user
        await adminPage.goto('/admin/users');
        await adminPage.waitForTimeout(1000);

        const searchInput = adminPage.locator('input[placeholder*="Search"]');
        await searchInput.fill(testEmail);
        await searchInput.press('Enter');
        await adminPage.waitForTimeout(2000);

        // Click on user name (which appears above email in the table)
        await adminPage.click('text=ZeroCreditsTest');
        await adminPage.waitForTimeout(2000);
        console.log('✅ Navigated to user detail page');

        // Handle the prompt dialog to set credits to 0
        adminPage.on('dialog', async (dialog) => {
          console.log(`Dialog message: ${dialog.message()}`);
          await dialog.accept('-3'); // Enter -3 to remove the 3 free credits
        });

        const grantButton = adminPage.locator('button:has-text("Grant Credits")');
        await grantButton.click();
        await adminPage.waitForTimeout(3000);
        console.log('✅ Set credits to 0');

      } catch (error) {
        console.error('⚠️ Admin operation failed:', error);
      } finally {
        await adminContext.close();
      }
    }

    // Step 4: Reload the user page to see the zero credits UX
    await page.reload();
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/zero-credits-ux.png',
      fullPage: true
    });

    // Verify "Begin Reading" button is disabled
    const beginButton = page.locator('button:has-text("Begin Reading")');
    const isDisabled = await beginButton.isDisabled();
    console.log(`Button disabled: ${isDisabled}`);
    expect(isDisabled).toBeTruthy();
    console.log('✅ Begin Reading button is disabled with 0 credits');

    // Verify warning message is visible
    const warningMsg = page.locator('text=/need credits/i');
    await expect(warningMsg).toBeVisible();
    console.log('✅ Warning message is visible');

    // Verify purchase link is visible
    const purchaseLink = page.locator('a:has-text("Purchase credits"), text=/Purchase credits/i');
    await expect(purchaseLink.first()).toBeVisible();
    console.log('✅ Purchase credits link is visible');

    console.log('🎉 Fix 1 VERIFIED: Zero credits UX is clear and prominent!');
  });

  test('Fix 2: Persona selector - should be hidden during active session', async ({ page }) => {
    // Register new user
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    await page.fill('input[name="firstName"]', 'TestUser');
    await page.fill('input[name="email"]', `test-selector-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Check if persona selector is visible BEFORE session
    const selectorBefore = page.locator('text=/Choose your guide/i');
    const visibleBefore = await selectorBefore.isVisible().catch(() => false);
    console.log(`Persona selector before session: ${visibleBefore ? 'visible' : 'hidden'}`);

    // Verify "Begin Reading" button is visible before session
    const beginButtonBefore = page.locator('button:has-text("Begin Reading")');
    const beginVisibleBefore = await beginButtonBefore.isVisible().catch(() => false);
    console.log(`Begin Reading button before session: ${beginVisibleBefore ? 'visible' : 'hidden'}`);

    // Start session and wait for it to actually start
    await page.locator('button:has-text("Begin Reading")').click();
    console.log('🔄 Clicked "Begin Reading" button');

    // Wait for session to start - look for chat input or AI greeting message
    await page.waitForTimeout(2000);

    // Wait for either the chat input or first AI message to appear (indicates session started)
    const chatStarted = await Promise.race([
      page.locator('input[type="text"], textarea').first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
      page.locator('text=/Hello|Welcome|Greetings/i').first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
    ]).catch(() => false);

    console.log(`Chat session started: ${chatStarted}`);

    // Take screenshot AFTER session starts
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'test-results/persona-selector-during-session.png',
      fullPage: true
    });

    // Verify persona selector is HIDDEN during session
    const selectorDuring = page.locator('text=/Choose your guide/i');
    const visibleDuring = await selectorDuring.isVisible().catch(() => false);
    console.log(`Persona selector during session: ${visibleDuring ? 'visible ⚠️' : 'hidden ✅'}`);
    expect(visibleDuring).toBeFalsy();
    console.log('✅ Persona selector is hidden during active session');

    // Verify "Begin Reading" button is also hidden during session
    const beginButton = page.locator('button:has-text("Begin Reading")');
    const beginVisible = await beginButton.isVisible().catch(() => false);
    console.log(`Begin Reading button during session: ${beginVisible ? 'visible ⚠️' : 'hidden ✅'}`);
    expect(beginVisible).toBeFalsy();
    console.log('✅ Begin Reading button is hidden during active session');

    // Send a message to confirm session is working
    const input = page.locator('input[type="text"], textarea').last();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('Tell me about my day');
      await page.locator('button:has-text("Send"), button[type="submit"]').last().click();
      await page.waitForTimeout(3000);
      console.log('✅ Successfully sent message during session');
    }

    // End session
    const endButton = page.locator('button:has-text("End Session"), button:has-text("End")');
    if (await endButton.isVisible().catch(() => false)) {
      await endButton.click();
      await page.waitForTimeout(2000);

      // Verify selector reappears AFTER session ends
      if (visibleBefore) {
        const selectorAfter = page.locator('text=/Choose your guide/i');
        const visibleAfter = await selectorAfter.isVisible().catch(() => false);
        console.log(`Persona selector after session ends: ${visibleAfter ? 'visible ✅' : 'hidden ⚠️'}`);
        if (visibleAfter) {
          console.log('✅ Persona selector reappears after session ends');
        }
      }
    }

    console.log('🎉 Fix 2 VERIFIED: Persona selector properly hidden during sessions!');
  });
});
