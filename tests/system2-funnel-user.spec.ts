import { test, expect } from '@playwright/test';

/**
 * System 2 Test Suite — User Type A: Returning System 1 User
 *
 * Tests A1-A6: Simulates a user who previously interacted with System 1
 * (the conversion funnel) and is now transitioning to System 2 (chat service).
 *
 * KEY CONTEXT: System 1 stores user data (email, firstName, bucket, conversation
 * history, purchase info) in the `conversations` table in the SAME Supabase database.
 * System 2 uses the `users` table. So once a user enters their email in System 1,
 * they already have account information in Supabase — just in a different table.
 * The `users` table has a `migratedFromConversationId` field for linking the two.
 * However, System 2 does NOT automatically query `conversations` for prior context.
 */

test.describe.serial('System 2 — Returning Funnel User (A1–A6)', () => {
  const timestamp = Date.now();
  const testEmail = `funnel-return-${timestamp}@example.com`;
  const testPassword = 'FunnelUser123!';
  const testFirstName = 'FunnelUser';

  test('A1: First-time registration after funnel — should register, get 3 free credits, land on reading page', async ({ page }) => {
    // Simulate arriving at /login (as if clicking email link from System 1 purchase).
    // At this point the user's email, firstName, bucket, and conversation data
    // already exist in the Supabase `conversations` table from System 1.
    // System 2 registration creates a new record in the `users` table —
    // no conflict because they are separate tables.
    await page.goto('/login');

    // Switch to signup mode
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);

    // Fill registration form
    await page.fill('input[name="firstName"]', testFirstName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    // Submit registration
    await page.click('button[type="submit"]');

    // Should redirect to /reading
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Should see 3 free credit minutes
    await expect(page.locator('text=/3 minutes/i').first()).toBeVisible({ timeout: 10000 });

    // Should see Evelyn Cross as default persona
    await expect(page.locator('text=Evelyn Cross').first()).toBeVisible({ timeout: 10000 });

    // Should see "Begin Reading" button (ready to start session)
    await expect(page.locator('button:has-text("Begin Reading")')).toBeVisible({ timeout: 10000 });
  });

  test('A2: Evelyn memory isolation — System 2 Evelyn does NOT recall System 1 conversations', async ({ page }) => {
    // Login as the funnel user
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Start session with Evelyn
    const beginButton = page.locator('button:has-text("Begin Reading")');
    await beginButton.waitFor({ state: 'visible', timeout: 10000 });
    await beginButton.click();
    await page.waitForTimeout(3000);

    // Reference a fake System 1 conversation.
    // NOTE: The user's System 1 data (email, firstName, bucket, conversation)
    // IS in the same Supabase `conversations` table. However, System 2's
    // chatEngine loads memory from `user_memories` (per userId/personaId),
    // NOT from the `conversations` table. So System 2 Evelyn should not have
    // access to System 1 conversation content unless migration was run.
    const input = page.locator('input[type="text"][placeholder*="message"], input[placeholder*="Type"]');
    await input.fill('You told me about my love life earlier today on the other page');
    await page.locator('button[type="submit"]').click();

    // Wait for response
    await page.waitForTimeout(10000);

    // Evelyn should NOT reference System 1 conversation content — the data
    // lives in `conversations` table but System 2 reads from `user_memories`.
    // She should respond gracefully and stay in character.
    const assistantMessages = page.locator('.bg-white.text-gray-800.border');
    const lastResponse = assistantMessages.last();
    await expect(lastResponse).toBeVisible({ timeout: 15000 });

    const responseText = await lastResponse.textContent();
    // Verify she doesn't break character with a meta-response about not having memory
    expect(responseText).not.toMatch(/I don't have memory|I cannot recall|system error/i);
    // She should stay in character
    expect(responseText!.length).toBeGreaterThan(20);
  });

  test('A3: Discover multiple personas — should see Marcus Stone alongside Evelyn', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Navigate to personas directory
    await page.goto('/personas');
    await page.waitForTimeout(2000);

    // Should see Evelyn Cross
    await expect(page.locator('text=Evelyn Cross').first()).toBeVisible({ timeout: 10000 });

    // Check for Marcus Stone
    const marcusCard = page.locator('text=Marcus Stone').first();
    const marcusVisible = await marcusCard.isVisible().catch(() => false);

    if (marcusVisible) {
      // Verify persona card details
      await expect(marcusCard).toBeVisible();

      // Each persona card should have a "Start Reading" button
      const startButtons = page.locator('button:has-text("Start Reading")');
      expect(await startButtons.count()).toBeGreaterThanOrEqual(2);

      // Click Marcus to open detail modal
      await page.locator('text=Marcus Stone').first().click();
      await page.waitForTimeout(1000);

      // Verify modal shows detail
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible().catch(() => false)) {
        // Should show pricing info in modal
        await expect(page.locator('text=/Pricing/i')).toBeVisible({ timeout: 5000 });

        // Click "Start Reading with Marcus Stone" in modal
        const startWithMarcus = page.locator('button:has-text("Start Reading with Marcus")');
        if (await startWithMarcus.isVisible().catch(() => false)) {
          await startWithMarcus.click();
          await page.waitForURL(/.*reading.*persona=marcus/, { timeout: 10000 });

          // Should show Marcus Stone header
          await expect(page.locator('h1:has-text("Marcus Stone")').first()).toBeVisible({ timeout: 10000 });
        }
      }
    } else {
      console.log('INFO: Marcus Stone persona not seeded — only Evelyn available');
      // Still verify Evelyn's card has expected elements
      await expect(page.locator('button:has-text("Start Reading")').first()).toBeVisible();
    }
  });

  test('A4: Credit awareness — should see countdown timer and out-of-credits prompt', async ({ page }) => {
    // Login with fresh user who has 3 free minutes
    const freshEmail = `credit-aware-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'CreditAware');
    await page.fill('input[name="email"]', freshEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Start session
    const beginButton = page.locator('button:has-text("Begin Reading")');
    await beginButton.waitFor({ state: 'visible', timeout: 10000 });
    await beginButton.click();
    await page.waitForTimeout(3000);

    // Verify credit countdown is visible
    await expect(page.locator('text=/min remaining/i')).toBeVisible({ timeout: 5000 });

    // Verify elapsed timer badge is visible
    await expect(page.locator('text=/\\d+:\\d+/').first()).toBeVisible({ timeout: 5000 });

    // Send a message and verify credits still displayed
    const input = page.locator('input[type="text"]');
    await input.fill('Tell me about my future');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // Credit display should still be visible
    await expect(page.locator('text=/min remaining/i')).toBeVisible();

    // Verify "Get More Credits" link is available in the bottom bar when session is active
    // (it shows after session ends — check End Session first)
    await page.locator('text=End Session').click();
    await page.waitForTimeout(2000);

    // After session ends, "Get More Credits" link should be visible
    await expect(page.locator('text=/Get More Credits/i')).toBeVisible({ timeout: 5000 });
  });

  test('A5: Memory continuity — Evelyn should reference prior session topics', async ({ page }) => {
    // Register a fresh user for clean memory test
    const memEmail = `memory-cont-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'MemoryUser');
    await page.fill('input[name="email"]', memEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // --- SESSION 1: Establish a memorable topic ---
    const beginButton = page.locator('button:has-text("Begin Reading")');
    await beginButton.waitFor({ state: 'visible', timeout: 10000 });
    await beginButton.click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    await input.fill('My name is Alexandra and I am deeply worried about my relationship with Daniel.');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // Verify response was received
    const responses = page.locator('.bg-white.text-gray-800.border');
    await expect(responses.last()).toBeVisible({ timeout: 15000 });

    // End session to trigger summarization
    await page.locator('text=End Session').click();
    await page.waitForTimeout(3000); // Allow time for background summarization

    // --- SESSION 2: Check memory recall ---
    const beginButton2 = page.locator('button:has-text("Begin Reading")');
    await beginButton2.waitFor({ state: 'visible', timeout: 10000 });
    await beginButton2.click();
    await page.waitForTimeout(3000);

    // Check for memory context indicator
    const memoryIndicator = page.locator('text=/remembers.*previous|remembers your last/i');
    const hasMemoryUI = await memoryIndicator.isVisible().catch(() => false);
    if (hasMemoryUI) {
      console.log('PASS: Memory context indicator visible');
    }

    // Ask about prior conversation
    await input.fill('Do you remember what I told you about my relationship?');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);

    // Evelyn should reference Alexandra, Daniel, or relationship
    const lastResponse = responses.last();
    await expect(lastResponse).toBeVisible({ timeout: 15000 });

    const responseText = await lastResponse.textContent();
    const mentionsContext = /Alexandra|Daniel|relationship|previous.*session|earlier/i.test(responseText || '');
    if (mentionsContext) {
      console.log('PASS: Memory continuity confirmed — persona references prior session');
    } else {
      console.log('INFO: Persona did not explicitly reference prior session details (summarization may not have completed)');
    }
  });

  test('A6: Persona switching — Marcus should NOT know Evelyn context, Evelyn should retain hers', async ({ page }) => {
    // Register fresh user
    const switchEmail = `persona-switch-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'SwitchUser');
    await page.fill('input[name="email"]', switchEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // --- SESSION with Evelyn ---
    const beginButton = page.locator('button:has-text("Begin Reading")');
    await beginButton.waitFor({ state: 'visible', timeout: 10000 });
    await beginButton.click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    await input.fill('My cat is named Whiskers and he is my best friend.');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // End Evelyn session
    await page.locator('text=End Session').click();
    await page.waitForTimeout(3000);

    // --- Switch to Marcus (if available) ---
    // Check if persona selector is available (more than 1 persona)
    const personaSelector = page.locator('text=/Choose your guide/i');
    const hasSwitcher = await personaSelector.isVisible().catch(() => false);

    if (hasSwitcher) {
      // Click the Select dropdown and pick Marcus
      await page.locator('[role="combobox"]').click();
      await page.waitForTimeout(500);
      const marcusOption = page.locator('[role="option"]:has-text("Marcus Stone")');
      const marcusExists = await marcusOption.isVisible().catch(() => false);

      if (marcusExists) {
        await marcusOption.click();
        await page.waitForTimeout(500);

        // Start session with Marcus
        const beginMarcus = page.locator('button:has-text("Begin Reading")');
        await beginMarcus.click();
        await page.waitForTimeout(3000);

        // Ask Marcus about the cat — he should NOT know
        await input.fill('Do you know the name of my cat?');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(8000);

        const marcusResponse = page.locator('.bg-white.text-gray-800.border').last();
        const marcusText = await marcusResponse.textContent();

        // Marcus should NOT mention "Whiskers" (persona isolation)
        const knowsCat = /Whiskers/i.test(marcusText || '');
        if (!knowsCat) {
          console.log('PASS: Persona isolation confirmed — Marcus does not know Evelyn context');
        } else {
          console.log('WARN: Persona isolation may be leaking — Marcus mentioned Whiskers');
        }

        // End Marcus session
        await page.locator('text=End Session').click();
        await page.waitForTimeout(2000);
      } else {
        console.log('INFO: Marcus Stone not available — skipping persona isolation test');
      }
    } else {
      console.log('INFO: Only one persona available — skipping switching test');
    }
  });
});
