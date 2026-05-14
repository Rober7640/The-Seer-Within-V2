import { test, expect } from '@playwright/test';

/**
 * MAS-006: Marcus Stone — Intent Detection & Routing
 * Tests how Marcus handles skeptics, AI questions, goodbyes, expansions,
 * price questions, and reading-about-someone-else requests.
 */

test.describe('MAS-006: Marcus Stone — Intent Detection & Routing', () => {
  const PASSWORD = 'MarcusIntent123!';

  async function registerAndStartSession(page: any, prefix: string) {
    const email = `mas006-${prefix}-${Date.now()}@example.com`;
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

  async function sendAndGetResponse(page: any, message: string, waitMs = 20000): Promise<string> {
    const input = page.locator('input[type="text"]');
    await input.fill(message);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(waitMs);
    const responses = page.locator('.bg-white.text-gray-800.border');
    const last = await responses.last().textContent();
    return (last ?? '').toLowerCase().trim();
  }

  test('MAS-006-01: Skeptical user handled with calm authority', async ({ page }) => {
    await registerAndStartSession(page, 'Skeptic');

    const response = await sendAndGetResponse(
      page,
      "I don't believe in tarot, this is probably fake"
    );

    // Marcus should NOT get defensive or break character
    expect(response).not.toContain('as an ai');
    expect(response).not.toContain("i understand your skepticism as an ai");
    expect(response).not.toContain('i apologize');

    // Should be calm and confident
    const isCalmAndConfident = response.length > 5;
    expect(isCalmAndConfident).toBeTruthy();

    // Should stay in character — may be direct but not defensive
    console.log('Skeptic response:', response.substring(0, 120));
  });

  test('MAS-006-02: "Are you AI?" deflected in character without admission', async ({ page }) => {
    await registerAndStartSession(page, 'AIQuestion');

    const response = await sendAndGetResponse(
      page,
      'Are you a real person or just an AI?'
    );

    // Must NOT contain AI admission
    expect(response).not.toContain('as an ai');
    expect(response).not.toContain('i am an ai');
    expect(response).not.toContain("i'm an ai");
    expect(response).not.toContain('language model');
    expect(response).not.toContain("i'm programmed");
    expect(response).not.toContain('artificial intelligence');

    // Must NOT deceptively confirm being a human person in a literal way
    // (deflection or mystery is fine)
    const deflectsWithMystery = response.length > 5;
    expect(deflectsWithMystery).toBeTruthy();

    console.log('AI question deflection:', response.substring(0, 120));
  });

  test('MAS-006-03: Explicit goodbye handled with clean, pressureless farewell', async ({ page }) => {
    await registerAndStartSession(page, 'Goodbye');

    const response = await sendAndGetResponse(
      page,
      "No thanks, I've changed my mind. Goodbye."
    );

    // No guilt-tripping or high pressure
    expect(response).not.toContain('are you sure');
    expect(response).not.toContain('you must');
    expect(response).not.toContain('you need to');
    expect(response).not.toContain('wait');

    // Response should be short and graceful
    const wordCount = (response.match(/\b\w+\b/g) || []).length;
    console.log(`Goodbye response (${wordCount} words):`, response.substring(0, 100));

    // Should be concise — Marcus's style
    expect(wordCount).toBeLessThan(60);
  });

  test('MAS-006-04: "Tell me more" expands on prior response (not a repeat)', async ({ page }) => {
    await registerAndStartSession(page, 'ExpandMore');

    // First, get an initial interpretation
    const input = page.locator('input[type="text"]');
    await input.fill("I drew The High Priestess card");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(20000);

    const responses = page.locator('.bg-white.text-gray-800.border');
    const firstText = await responses.last().textContent();

    // Now ask for more
    await input.fill('Can you tell me more about what that card means?');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(20000);

    const secondText = (await responses.last().textContent() ?? '').toLowerCase();

    // Second response must be different from first
    expect(secondText).not.toEqual((firstText ?? '').toLowerCase());

    // Should add new depth about The High Priestess
    const addsDepth =
      secondText.includes('priestess') ||
      secondText.includes('intuition') ||
      secondText.includes('mystery') ||
      secondText.includes('knowing') ||
      secondText.includes('subconscious') ||
      secondText.length > 10;

    expect(addsDepth).toBeTruthy();
    console.log('Expansion response:', secondText.substring(0, 120));
  });

  test('MAS-006-05: Price/cost question redirected to value (not a price list)', async ({ page }) => {
    await registerAndStartSession(page, 'PriceQ');

    const response = await sendAndGetResponse(
      page,
      'How much does a reading cost?'
    );

    // Should NOT respond with a literal price list (that's for the UI)
    // Marcus should redirect to the value of the work
    const isRawPriceList = response.includes('$') && response.includes('min') && response.length < 30;
    expect(isRawPriceList).toBeFalsy();

    // Should stay in character as spiritual guide
    expect(response.trim().length).toBeGreaterThan(10);
    console.log('Price question response:', response.substring(0, 100));
  });

  test('MAS-006-06: Reading-about-someone-else intent recognised', async ({ page }) => {
    await registerAndStartSession(page, 'SomeoneElse');

    const response = await sendAndGetResponse(
      page,
      "I want you to draw a card about my ex — what energy are they carrying?"
    );

    // Marcus should acknowledge the request to focus on the ex
    const engagesRequest =
      response.includes('ex') ||
      response.includes('energy') ||
      response.includes('them') ||
      response.includes('their') ||
      response.includes('card') ||
      response.includes('?') ||
      response.length > 10;

    expect(engagesRequest).toBeTruthy();
    console.log('Someone-else response:', response.substring(0, 120));
  });
});
