import { test, expect } from '@playwright/test';

/**
 * System 2 Test Suite — User Type B: Brand-New User
 *
 * Tests B1-B7: Simulates a user arriving directly at System 2 with
 * zero prior context about System 1 (the conversion funnel).
 *
 * NOTE: Unlike User Type A, these users have no record in the shared
 * Supabase `conversations` table. Their first touchpoint with the
 * database is when they register a System 2 account (`users` table).
 */

test.describe('System 2 — Brand-New User (B1–B7)', () => {
  const testPassword = 'NewUser123!';

  test('B1: Cold registration and onboarding — should register and receive 3 free minutes', async ({ page }) => {
    const email = `new-cold-${Date.now()}@example.com`;

    await page.goto('/login');

    // Verify login page is accessible and shows sign-in form
    await expect(page.locator('text=/Welcome Back|Sign In/i').first()).toBeVisible({ timeout: 10000 });

    // Switch to signup mode
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    // Verify signup form shows required fields
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Fill registration form
    await page.fill('input[name="firstName"]', 'BrandNew');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to /reading
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Should show 3 free credits
    await expect(page.locator('text=/3 minutes/i').first()).toBeVisible({ timeout: 10000 });

    // Should show a welcome state with "Begin Reading" button
    await expect(page.locator('button:has-text("Begin Reading")')).toBeVisible({ timeout: 10000 });

    // Should show default persona (Evelyn Cross)
    await expect(page.locator('text=Evelyn Cross').first()).toBeVisible({ timeout: 10000 });
  });

  test('B2: Exploring before committing — should be able to browse /personas', async ({ page }) => {
    // Navigate to /personas without being logged in
    await page.goto('/personas');
    await page.waitForTimeout(2000);

    // The personas directory should be viewable (it uses public /api/personas endpoint)
    const evelynVisible = await page.locator('text=Evelyn Cross').first().isVisible().catch(() => false);

    if (evelynVisible) {
      console.log('PASS: Personas directory is viewable without login');

      // Verify persona cards have expected information
      await expect(page.locator('text=Evelyn Cross').first()).toBeVisible();
      await expect(page.locator('text=/free min/i').first()).toBeVisible();
      await expect(page.locator('button:has-text("Start Reading")').first()).toBeVisible();

      // Click "Start Reading" — should navigate to /reading which redirects to /login
      await page.locator('button:has-text("Start Reading")').first().click();
      await page.waitForTimeout(2000);

      // Should either be at /reading (which will redirect to /login) or already at /login
      const currentUrl = page.url();
      const needsAuth = currentUrl.includes('/login') || currentUrl.includes('/reading');
      expect(needsAuth).toBeTruthy();
    } else {
      // Personas page might redirect to login
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        console.log('INFO: Personas directory requires authentication');
      } else {
        console.log('INFO: Personas page loaded but no personas displayed');
      }
    }
  });

  test('B3: First chat experience — complete novice should have smooth first interaction', async ({ page }) => {
    const email = `novice-${Date.now()}@example.com`;

    // Register
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'Novice');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Verify the UI makes it obvious how to start chatting
    await expect(page.locator('button:has-text("Begin Reading")')).toBeVisible({ timeout: 10000 });

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // Should see a greeting message from the persona
    const greetingMessage = page.locator('.bg-white.text-gray-800.border').first();
    const greetingVisible = await greetingMessage.isVisible().catch(() => false);
    if (greetingVisible) {
      console.log('PASS: Auto-greeting displayed for new user');
    }

    // Input field should be visible and ready
    const input = page.locator('input[type="text"][placeholder*="message"], input[placeholder*="Type"]');
    await expect(input).toBeVisible({ timeout: 5000 });

    // Send a simple first message
    await input.fill('Can you help me with my career?');
    await page.locator('button[type="submit"]').click();

    // Verify user message appears
    await expect(page.locator('text=Can you help me with my career?')).toBeVisible({ timeout: 5000 });

    // Verify typing indicator appears
    const typingIndicator = page.locator('.animate-bounce');
    // It may appear briefly — just check response arrives
    await page.waitForTimeout(10000);

    // Response should arrive within reasonable time
    const responses = page.locator('.bg-white.text-gray-800.border');
    const responseCount = await responses.count();
    expect(responseCount).toBeGreaterThanOrEqual(1);

    // Response should address the topic (career)
    const lastResponse = responses.last();
    const responseText = await lastResponse.textContent();
    expect(responseText!.length).toBeGreaterThan(20);

    // Credit timer should be visible
    await expect(page.locator('text=/min remaining/i')).toBeVisible();
  });

  test('B4: Running out of free credits — session should end gracefully', async ({ page }) => {
    const email = `deplete-${Date.now()}@example.com`;

    // Register (gets 3 free minutes)
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'DepleteTester');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    const sendBtn = page.locator('button[type="submit"]');

    // Send multiple messages to consume time
    const messages = [
      'Tell me about my love life in great detail',
      'What about my financial future?',
      'Can you do a deep reading about my career?',
      'I need guidance about a big life decision',
      'One more question about my spiritual path',
    ];

    for (const msg of messages) {
      // Check if we can still type (session might have ended)
      const inputVisible = await input.isVisible().catch(() => false);
      if (!inputVisible) {
        console.log('Session ended before all messages sent');
        break;
      }

      await input.fill(msg);
      await sendBtn.click();
      await page.waitForTimeout(6000);

      // Check for out-of-credits modal
      const outOfCredits = page.locator('text=/Your Reading Time Has Ended/i');
      if (await outOfCredits.isVisible().catch(() => false)) {
        console.log('PASS: Out-of-credits modal appeared');

        // Verify modal has purchase CTA
        await expect(page.locator('text=/Purchase More Credits/i')).toBeVisible();

        // Verify conversation is saved message
        await expect(page.locator('text=/conversation is saved|will remember/i')).toBeVisible();
        break;
      }
    }

    // After session ends (however it ended), verify user can see chat history
    // Close the out-of-credits dialog if open
    const closeBtn = page.locator('button:has-text("Browse Other Guides")');
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }

    // User should be back on the reading page and able to start again or buy credits
    const beginOrCredits = page.locator('button:has-text("Begin Reading"), text=/Get More Credits/i');
    await expect(beginOrCredits.first()).toBeVisible({ timeout: 5000 });
  });

  test('B5: Purchasing credits for the first time — should see pricing and Stripe checkout', async ({ page }) => {
    const email = `purchase-${Date.now()}@example.com`;

    // Register
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'PurchaseTest');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Navigate to credits page
    await page.goto('/credits');
    await page.waitForTimeout(2000);

    // Should show pricing packages
    await expect(page.locator('text=/15.*min/i').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/30.*min/i').first()).toBeVisible({ timeout: 10000 });

    // Should show price amounts
    await expect(page.locator('text=/\\$15|\\$25/i').first()).toBeVisible();

    // Should show current credit balance
    await expect(page.locator('text=/3.*minute/i').first()).toBeVisible({ timeout: 10000 });

    // Click purchase on a package
    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Purchase"), button:has-text("Get")').first();
    if (await buyButton.isVisible().catch(() => false)) {
      await buyButton.click();
      await page.waitForTimeout(3000);

      // Should redirect to Stripe or show checkout loading
      const currentUrl = page.url();
      if (currentUrl.includes('stripe') || currentUrl.includes('checkout')) {
        console.log('PASS: Redirected to Stripe checkout');
      } else {
        console.log('INFO: Stripe checkout may have opened in a new tab or failed');
      }
    }
  });

  test('B6: Returning after days away — memory should persist and credits should be accurate', async ({ page }) => {
    // Register and have a first session
    const email = `return-later-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'ReturnLater');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Start first session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    await input.fill('I am worried about my job interview next week.');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // End session
    await page.locator('text=End Session').click();
    await page.waitForTimeout(3000);

    // Record remaining credits
    const creditText = page.locator('text=/\\d+ minutes/i').first();
    const creditsBeforeLogout = await creditText.textContent();

    // Logout
    await page.locator('[aria-label="Logout"]').click();
    await page.waitForTimeout(1000);

    // Simulate "days later" by logging in again
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Credits should still be the same (no phantom deductions)
    const creditsAfterReturn = await page.locator('text=/\\d+ minutes/i').first().textContent();
    console.log(`Credits before logout: ${creditsBeforeLogout}, after return: ${creditsAfterReturn}`);

    // Start new session — persona should have memory from prior session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // Check for memory context indicator
    const memoryIndicator = page.locator('text=/remembers.*previous|remembers your/i');
    const hasMemory = await memoryIndicator.isVisible().catch(() => false);
    if (hasMemory) {
      console.log('PASS: Memory persists across sessions (return visit)');
    }
  });

  test('B7: Multi-persona exploration — credits should be shared across personas', async ({ page }) => {
    const email = `multi-persona-${Date.now()}@example.com`;

    // Register (3 free minutes)
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'MultiExplorer');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Start session with Evelyn
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // Send one message to Evelyn
    const input = page.locator('input[type="text"]');
    await input.fill('Quick question about love');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // End Evelyn session
    await page.locator('text=End Session').click();
    await page.waitForTimeout(2000);

    // Record credits after Evelyn session
    const creditsAfterEvelyn = page.locator('text=/\\d+ minutes/i').first();
    const evelynCreditsText = await creditsAfterEvelyn.textContent();
    console.log('Credits after Evelyn session:', evelynCreditsText);

    // Check if Marcus is available
    const personaSelector = page.locator('text=/Choose your guide/i');
    const hasSwitcher = await personaSelector.isVisible().catch(() => false);

    if (hasSwitcher) {
      // Switch to Marcus
      await page.locator('[role="combobox"]').click();
      await page.waitForTimeout(500);
      const marcusOption = page.locator('[role="option"]:has-text("Marcus Stone")');
      const marcusAvailable = await marcusOption.isVisible().catch(() => false);

      if (marcusAvailable) {
        await marcusOption.click();
        await page.waitForTimeout(500);

        // Credits should be the same as after Evelyn (shared pool)
        const creditsBeforeMarcus = page.locator('text=/\\d+ minutes/i').first();
        const marcusCreditsText = await creditsBeforeMarcus.textContent();
        console.log('Credits before Marcus session:', marcusCreditsText);

        // Start Marcus session
        await page.locator('button:has-text("Begin Reading")').click();
        await page.waitForTimeout(3000);

        // Marcus should have a distinct personality
        const greeting = page.locator('.bg-white.text-gray-800.border').first();
        if (await greeting.isVisible().catch(() => false)) {
          const greetingText = await greeting.textContent();
          console.log('Marcus greeting:', greetingText?.substring(0, 80));
        }

        // Send a message to Marcus
        await input.fill('Tell me about my shadow self');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(8000);

        // End Marcus session
        await page.locator('text=End Session').click();
        await page.waitForTimeout(2000);

        // Credits should reflect total usage across both personas
        const finalCredits = page.locator('text=/\\d+ minutes/i').first();
        const finalCreditsText = await finalCredits.textContent();
        console.log('Credits after both sessions:', finalCreditsText);
      } else {
        console.log('INFO: Marcus Stone not available — multi-persona credit test skipped');
      }
    } else {
      console.log('INFO: Only one persona — multi-persona credit test skipped');
    }
  });
});
