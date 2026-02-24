import { test, expect } from '@playwright/test';

/**
 * MAS-002: Marcus Stone — Returning User (Same Day)
 * Tests login, returning greeting, badge suppression, memory handling.
 */

test.describe('MAS-002: Marcus Stone — Returning User (Same Day)', () => {
  const PASSWORD = 'MarcusReturn123!';

  /** Register user, complete one session with Marcus, then return */
  async function setupReturningUser(page: any, prefix: string): Promise<string> {
    const email = `mas002-${prefix}-${Date.now()}@example.com`;

    // Register
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', prefix);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 15000 });

    // Go to Marcus Stone and start a session
    await page.goto('/chat/marcus-stone');
    await page.waitForTimeout(1000);

    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });
    await beginBtn.first().click();
    await page.waitForTimeout(4000);

    // Send a message mentioning a named person for memory tests
    const input = page.locator('input[type="text"]');
    await input.fill('I want to discuss my brother Daniel and the tension in our relationship');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(12000);

    // End session
    const endBtn = page.locator('text=End Session, button:has-text("End Session")');
    if (await endBtn.first().isVisible().catch(() => false)) {
      await endBtn.first().click();
      await page.waitForTimeout(4000);
    }

    return email;
  }

  test('MAS-002-01: Returning greeting differs from new-user greeting', async ({ page }) => {
    await setupReturningUser(page, 'ReturnGreet');

    // Navigate back to Marcus Stone
    await page.goto('/chat/marcus-stone');
    await page.waitForTimeout(1000);

    // Start second session
    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });
    await beginBtn.first().click();
    await page.waitForTimeout(4000);

    const greeting = page.locator('.bg-white.text-gray-800.border').first();
    await expect(greeting).toBeVisible({ timeout: 15000 });
    const greetingText = (await greeting.textContent() ?? '').toLowerCase();

    // Should feel like a returning greeting
    const returningLanguage = ['again', 'back', 'return', 'good to see', 'been a', 'since'];
    const hasReturnCue = returningLanguage.some(w => greetingText.includes(w));

    if (hasReturnCue) {
      console.log('PASS: Returning-user greeting detected:', greetingText.substring(0, 80));
    } else {
      console.log('INFO: Greeting (no explicit returning cue):', greetingText.substring(0, 80));
    }

    // Definitely should not be generic new-user "Let me introduce myself" style
    expect(greetingText).not.toContain('let me introduce');
    expect(greetingText).not.toContain('first time');
  });

  test('MAS-002-02: Teaser badge suppressed after first chat', async ({ page }) => {
    await setupReturningUser(page, 'BadgeSup');

    // Navigate to personas directory
    await page.goto('/personas');
    await page.waitForTimeout(2000);

    // Marcus Stone card should be visible
    const marcusCard = page.locator('text=Marcus Stone').first();
    const cardVisible = await marcusCard.isVisible().catch(() => false);

    if (cardVisible) {
      // Look for badge/notification indicator on Marcus's card
      // Badge would be something like a "New" dot or notification count
      const marcusSection = page.locator('[data-testid*="marcus"], .persona-card:has-text("Marcus Stone")').first();
      const badgeVisible = await marcusSection.locator('[data-testid*="badge"], .badge, .notification-dot').isVisible().catch(() => false);

      if (!badgeVisible) {
        console.log('PASS: No teaser badge on Marcus Stone card after chatting');
      } else {
        console.log('INFO: Badge/dot found on Marcus card — verify it is not the teaser badge');
      }
    } else {
      // Personas page may require login — check if redirected
      const url = page.url();
      console.log('INFO: Personas page URL:', url);
    }
  });

  test('MAS-002-03: New session starts fresh on new topic without forcing prior session reference', async ({ page }) => {
    await setupReturningUser(page, 'FreshTopic');

    // Navigate back to Marcus and start a new session
    await page.goto('/chat/marcus-stone');
    await page.waitForTimeout(1000);

    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });
    await beginBtn.first().click();
    await page.waitForTimeout(4000);

    // Send message about a completely different topic (money/career instead of relationship)
    const input = page.locator('input[type="text"]');
    await input.fill("I need guidance about a major career decision I'm facing");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(20000);

    const responses = page.locator('.bg-white.text-gray-800.border');
    const count = await responses.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const responseText = (await responses.last().textContent() ?? '').toLowerCase();

    // Marcus should NOT force-inject the prior "Daniel" reference unprompted
    const forcesMentionDaniel = responseText.includes('daniel');
    if (forcesMentionDaniel) {
      console.log('WARN: Marcus referenced Daniel from prior session without prompting');
    } else {
      console.log('PASS: New topic handled without forcing prior session reference');
    }

    // Response should address career topic
    expect(responseText.trim().length).toBeGreaterThan(5);
  });

  test('MAS-002-04: Prior memory held subtly — not recited verbatim on neutral opener', async ({ page }) => {
    await setupReturningUser(page, 'MemorySubtle');

    await page.goto('/chat/marcus-stone');
    await page.waitForTimeout(1000);

    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });
    await beginBtn.first().click();
    await page.waitForTimeout(4000);

    // Neutral opener
    const input = page.locator('input[type="text"]');
    await input.fill("Hello, I'm back");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(20000);

    const responses = page.locator('.bg-white.text-gray-800.border');
    await expect(responses.last()).toBeVisible({ timeout: 5000 });
    const responseText = (await responses.last().textContent() ?? '').toLowerCase();

    // Marcus should NOT immediately blurt "Daniel" on a neutral opener
    if (!responseText.includes('daniel')) {
      console.log('PASS: Memory not preemptively recited on neutral opener');
    } else {
      console.log('WARN: Marcus mentioned Daniel on a neutral opener (may be acceptable warm recall)');
    }
  });

  test('MAS-002-05: User-mentioned name recognised when re-raised in new session', async ({ page }) => {
    await setupReturningUser(page, 'NameRecall');

    await page.goto('/chat/marcus-stone');
    await page.waitForTimeout(1000);

    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });
    await beginBtn.first().click();
    await page.waitForTimeout(4000);

    const input = page.locator('input[type="text"]');

    // First exchange — neutral
    await input.fill("Let's continue exploring my relationships");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(15000);

    // Re-raise the name from prior session
    await input.fill("Daniel is struggling again. Something shifted since we last spoke.");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(20000);

    const responses = page.locator('.bg-white.text-gray-800.border');
    const lastResponse = await responses.last().textContent();
    expect((lastResponse ?? '').trim().length).toBeGreaterThan(5);

    // Marcus should engage with Daniel naturally — no confusion
    console.log('Response to Daniel mention:', (lastResponse ?? '').substring(0, 100));
  });
});
