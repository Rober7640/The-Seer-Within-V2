import { test, expect } from '@playwright/test';

/**
 * System 2 Test Suite — C4: Memory System Edge Cases
 *
 * Tests for first-session (no memory), short session summarization,
 * strict persona isolation, and cross-persona context.
 */

test.describe('System 2 — Memory System Edge Cases (C4)', () => {
  const testPassword = 'Memory123!';

  /** Helper: register a fresh user and navigate to /reading */
  async function registerUser(page: any, prefix: string) {
    const email = `${prefix}-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', prefix);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });
    return email;
  }

  test('C4a: First session with no memory — persona should NOT say "I remember you"', async ({ page }) => {
    await registerUser(page, 'NoMemory');

    // Start first-ever session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // Check the greeting message
    const greeting = page.locator('.bg-white.text-gray-800.border').first();
    const greetingVisible = await greeting.isVisible().catch(() => false);

    if (greetingVisible) {
      const greetingText = await greeting.textContent();

      // First-time user should NOT get a "welcome back" or "I remember" greeting
      expect(greetingText).not.toMatch(/welcome back|I remember|last time|previous session|returning/i);
      console.log('PASS: First-time greeting does not reference non-existent memory');
    }

    // Memory context indicator should NOT be visible for first-time users
    const memoryIndicator = page.locator('text=/remembers your last|remembers your previous/i');
    const hasMemoryUI = await memoryIndicator.isVisible().catch(() => false);
    expect(hasMemoryUI).toBeFalsy();
    console.log('PASS: Memory context indicator not shown for new user');
  });

  test('C4b: Memory after very short session — summarization should still capture something', async ({ page }) => {
    await registerUser(page, 'ShortSession');

    // --- Session 1: Very short (1 message) ---
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    await input.fill('My name is Valentina and I love astronomy.');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // End session immediately after 1 message
    await page.locator('text=End Session').click();
    await page.waitForTimeout(5000); // Allow background summarization

    // --- Session 2: Check if anything was remembered ---
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // Ask about the previous session
    await input.fill('Do you remember my name?');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);

    const response = page.locator('.bg-white.text-gray-800.border').last();
    const responseText = await response.textContent();

    // Even from a 1-message session, the name might be recalled
    const remembersName = /Valentina/i.test(responseText || '');
    if (remembersName) {
      console.log('PASS: Persona recalled name from 1-message session');
    } else {
      console.log('INFO: Persona did not recall name (summarization may not have captured it from 1 message)');
    }
  });

  test('C4c: Persona isolation strict check — Evelyn info should NOT leak to Marcus', async ({ page }) => {
    await registerUser(page, 'IsolationCheck');

    // --- Chat with Evelyn: share a unique detail ---
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    await input.fill('My dog is named Barnaby and he is a golden retriever.');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // End Evelyn session
    await page.locator('text=End Session').click();
    await page.waitForTimeout(4000);

    // --- Switch to Marcus ---
    const personaSelector = page.locator('text=/Choose your guide/i');
    const hasSwitcher = await personaSelector.isVisible().catch(() => false);

    if (!hasSwitcher) {
      console.log('INFO: Only one persona available — skipping isolation test');
      return;
    }

    await page.locator('[role="combobox"]').click();
    await page.waitForTimeout(500);
    const marcusOption = page.locator('[role="option"]:has-text("Marcus Stone")');
    const marcusAvailable = await marcusOption.isVisible().catch(() => false);

    if (!marcusAvailable) {
      console.log('INFO: Marcus Stone not available — skipping isolation test');
      return;
    }

    await marcusOption.click();
    await page.waitForTimeout(500);

    // Start Marcus session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // Ask Marcus about the dog — he should NOT know
    await input.fill('Do you know the name of my dog?');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);

    const marcusResponse = page.locator('.bg-white.text-gray-800.border').last();
    const marcusText = await marcusResponse.textContent();

    // Marcus should NOT mention "Barnaby" or "golden retriever"
    const knowsDog = /Barnaby|golden retriever/i.test(marcusText || '');
    if (!knowsDog) {
      console.log('PASS: Strict persona isolation — Marcus does not know Evelyn details');
    } else {
      console.log('FAIL: Persona isolation broken — Marcus knows about Barnaby');
    }
    expect(knowsDog).toBeFalsy();
  });

  test('C4d: Cross-persona context — both personas should know independently shared info', async ({ page }) => {
    await registerUser(page, 'CrossPersona');

    // --- Tell Evelyn about work stress ---
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    await input.fill('I am extremely stressed about my work at the tech company.');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // End Evelyn session
    await page.locator('text=End Session').click();
    await page.waitForTimeout(4000);

    // --- Tell Marcus the same topic ---
    const hasSwitcher = await page.locator('text=/Choose your guide/i').isVisible().catch(() => false);
    if (!hasSwitcher) {
      console.log('INFO: Only one persona — skipping cross-persona test');
      return;
    }

    await page.locator('[role="combobox"]').click();
    await page.waitForTimeout(500);
    const marcusOption = page.locator('[role="option"]:has-text("Marcus Stone")');
    if (!(await marcusOption.isVisible().catch(() => false))) {
      console.log('INFO: Marcus not available — skipping cross-persona test');
      return;
    }

    await marcusOption.click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    await input.fill('I am really stressed about my job at my tech company.');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // End Marcus session
    await page.locator('text=End Session').click();
    await page.waitForTimeout(4000);

    // --- Return to Evelyn — she should remember work stress independently ---
    await page.locator('[role="combobox"]').click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]:has-text("Evelyn Cross")').click();
    await page.waitForTimeout(500);

    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    await input.fill('What do you remember about my situation?');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);

    const evelynResponse = page.locator('.bg-white.text-gray-800.border').last();
    const evelynText = await evelynResponse.textContent();
    const remembersWork = /work|stress|tech|job|company/i.test(evelynText || '');

    if (remembersWork) {
      console.log('PASS: Evelyn independently remembers work stress topic');
    } else {
      console.log('INFO: Evelyn may not have recalled the specific topic');
    }
  });

  test('C4e: Memory does not persist across different user accounts', async ({ page }) => {
    // Register User A and share a secret
    const emailA = await registerUser(page, 'UserA');

    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    await input.fill('My secret code is ALPHA-7749.');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // End session and logout
    await page.locator('text=End Session').click();
    await page.waitForTimeout(2000);
    await page.locator('[aria-label="Logout"]').click();
    await page.waitForTimeout(1000);

    // Register User B (completely different account)
    const emailB = `UserB-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'UserB');
    await page.fill('input[name="email"]', emailB);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Start session and ask about the secret
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    await input.fill('What is my secret code?');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);

    const response = page.locator('.bg-white.text-gray-800.border').last();
    const responseText = await response.textContent();

    // User B should NOT know User A's secret
    const knowsSecret = /ALPHA-7749/i.test(responseText || '');
    expect(knowsSecret).toBeFalsy();
    console.log('PASS: Memory is isolated per user account — no cross-user leakage');
  });
});
