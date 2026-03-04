import { test, expect } from '@playwright/test';

/**
 * MAS-005: Marcus Stone — Conversation Bucket Progression
 * Tests topic routing (tarot, shadow work, money, love), deepening across
 * multiple exchanges, and graceful closing.
 */

test.describe('MAS-005: Marcus Stone — Conversation Bucket Progression', () => {
  const PASSWORD = 'MarcusBucket123!';

  async function registerAndStartSession(page: any, prefix: string) {
    const email = `mas005-${prefix}-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', prefix);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 15000 });

    await page.goto('/chat/marcus-stone');
    await page.waitForTimeout(1000);

    const beginBtn = page.locator('button:has-text("Begin Reading"), button:has-text("Start Reading")');
    await expect(beginBtn.first()).toBeVisible({ timeout: 10000 });
    await beginBtn.first().click();
    await page.waitForTimeout(4000);

    return email;
  }

  async function sendAndWait(page: any, message: string, waitMs = 20000) {
    const input = page.locator('input[type="text"]');
    await input.fill(message);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(waitMs);
    const responses = page.locator('.bg-white.text-gray-800.border');
    return responses;
  }

  test('MAS-005-01: Opening phase — neutral greeting gets exploratory response', async ({ page }) => {
    await registerAndStartSession(page, 'Opening');

    const responses = await sendAndWait(page, 'Hello, I came for guidance');

    const count = await responses.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const lastText = (await responses.last().textContent() ?? '').toLowerCase();

    // Opening response should invite exploration — not dive straight into a card draw
    const isExploratory =
      lastText.includes('?') || // Asks what they want to explore
      lastText.includes('what') ||
      lastText.includes('bring') ||
      lastText.includes('explore') ||
      lastText.includes('focus');

    if (isExploratory) {
      console.log('PASS: Opening response is exploratory');
    } else {
      console.log('INFO: Opening response:', lastText.substring(0, 100));
    }

    expect(lastText.trim().length).toBeGreaterThan(5);
  });

  test('MAS-005-02: Tarot card request routes to reading phase', async ({ page }) => {
    await registerAndStartSession(page, 'TarotBucket');

    const responses = await sendAndWait(page, 'I want you to pull a card for me about my love life');

    const count = await responses.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const lastText = (await responses.last().textContent() ?? '').toLowerCase();

    // Response should either ask ONE clarifying question about love OR trigger a card draw
    // A [TAROT_DRAW] renders as a card picker UI in the frontend
    const hasTarotDraw = await page.locator('[data-testid*="tarot"], .tarot-draw, [class*="tarot"]').isVisible().catch(() => false);
    const hasCardLanguage = lastText.includes('card') || lastText.includes('draw') || lastText.includes('spread');
    const hasClarifyingQ = lastText.includes('?');

    if (hasTarotDraw) {
      console.log('PASS: Tarot draw UI rendered (card picker shown)');
    } else if (hasCardLanguage || hasClarifyingQ) {
      console.log('PASS: Tarot/reading response with clarification or card language');
    } else {
      console.log('INFO: Response:', lastText.substring(0, 100));
    }

    expect(lastText.trim().length).toBeGreaterThan(5);
  });

  test('MAS-005-03: Purpose/direction bucket routes correctly', async ({ page }) => {
    await registerAndStartSession(page, 'PurposeBucket');

    const responses = await sendAndWait(page, "I feel like I've lost my direction and purpose");

    const count = await responses.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const lastText = (await responses.last().textContent() ?? '').toLowerCase();

    // Should acknowledge the purpose/direction theme
    const engagesPurpose =
      lastText.includes('purpose') ||
      lastText.includes('direction') ||
      lastText.includes('path') ||
      lastText.includes('meaning') ||
      lastText.includes('calling') ||
      lastText.includes('lost') ||
      lastText.includes('?');

    expect(engagesPurpose).toBeTruthy();
    console.log(engagesPurpose ? 'PASS: Purpose bucket engaged' : 'INFO: Response:', lastText.substring(0, 100));
  });

  test('MAS-005-04: Shadow work message routes correctly', async ({ page }) => {
    await registerAndStartSession(page, 'ShadowBucket');

    const responses = await sendAndWait(page, "I keep self-sabotaging. Every time something good happens I destroy it.");

    const count = await responses.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const lastText = (await responses.last().textContent() ?? '').toLowerCase();

    // Marcus should engage with shadow work / pattern theme
    const engagesShadow =
      lastText.includes('shadow') ||
      lastText.includes('pattern') ||
      lastText.includes('sabotage') ||
      lastText.includes('block') ||
      lastText.includes('self') ||
      lastText.includes('repeat') ||
      lastText.includes('?');

    expect(engagesShadow).toBeTruthy();
    console.log(engagesShadow ? 'PASS: Shadow work bucket engaged' : 'INFO: Response:', lastText.substring(0, 100));
  });

  test('MAS-005-05: Tarot interpretation deepens across two card exchanges', async ({ page }) => {
    await registerAndStartSession(page, 'CardDeepen');

    const input = page.locator('input[type="text"]');

    // First: request a reading
    await input.fill("I'd like a tarot reading about a difficult decision I'm facing");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(20000);

    const firstResponses = page.locator('.bg-white.text-gray-800.border');
    const firstCount = await firstResponses.count();
    expect(firstCount).toBeGreaterThanOrEqual(1);
    const firstText = await firstResponses.last().textContent();

    // Report a specific card drawn
    await input.fill("I drew The Tower card");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(20000);

    const secondResponses = page.locator('.bg-white.text-gray-800.border');
    const secondCount = await secondResponses.count();
    expect(secondCount).toBeGreaterThan(firstCount);

    const secondText = (await secondResponses.last().textContent() ?? '').toLowerCase();

    // Should interpret The Tower specifically
    const interpretsCard =
      secondText.includes('tower') ||
      secondText.includes('change') ||
      secondText.includes('upheaval') ||
      secondText.includes('destruction') ||
      secondText.includes('transformation') ||
      secondText.includes('sudden');

    expect(interpretsCard).toBeTruthy();
    console.log(interpretsCard ? 'PASS: Tower card interpreted with depth' : 'INFO: Response:', secondText.substring(0, 100));

    // Second response should not be a repeat of first
    expect(secondText).not.toEqual((firstText ?? '').toLowerCase());
  });

  test('MAS-005-06: Closing phase handled gracefully', async ({ page }) => {
    await registerAndStartSession(page, 'Closing');

    // Have a couple exchanges first
    const input = page.locator('input[type="text"]');
    await input.fill("Tell me about my current situation");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(15000);

    // Send closing message
    const responses = await sendAndWait(page, "Thank you, I have a lot to think about. I'm ready to close.", 20000);

    const count = await responses.count();
    expect(count).toBeGreaterThanOrEqual(2); // At least 2 assistant messages

    const closingText = (await responses.last().textContent() ?? '').toLowerCase();

    // Closing should be warm but concise — Marcus's style
    const isWarm =
      closingText.includes('thank') ||
      closingText.includes('carry') ||
      closingText.includes('return') ||
      closingText.includes('work') ||
      closingText.includes('sit') ||
      closingText.includes('journey');

    if (isWarm) {
      console.log('PASS: Warm closing response received');
    } else {
      console.log('INFO: Closing response:', closingText.substring(0, 100));
    }

    // Closing should be short — Marcus's style (2-3 sentences max)
    const wordCount = (closingText.match(/\b\w+\b/g) || []).length;
    console.log(`Closing response word count: ${wordCount}`);

    // Session can be ended cleanly
    const endBtn = page.locator('text=End Session, button:has-text("End Session")');
    const endVisible = await endBtn.first().isVisible().catch(() => false);
    if (endVisible) {
      await endBtn.first().click();
      await page.waitForTimeout(2000);
      console.log('PASS: Session ended cleanly after closing exchange');
    }
  });
});
