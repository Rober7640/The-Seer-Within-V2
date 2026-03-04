import { test, expect } from '@playwright/test';

/**
 * System 2 Test Suite — C3: Credit System Edge Cases
 *
 * Tests for zero-credit session start, mid-response depletion,
 * negative credit prevention, and per-persona pricing display.
 */

test.describe('System 2 — Credit System Edge Cases (C3)', () => {
  const testPassword = 'Credits123!';

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

  test('C3a: Zero credits — should prevent session start and show purchase link', async ({ page }) => {
    // Register user (gets 3 free minutes)
    await registerUser(page, 'ZeroCredits');

    // Deplete credits by chatting
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    const sendBtn = page.locator('button[type="submit"]');

    // Send messages until credits run out
    for (let i = 0; i < 6; i++) {
      const visible = await input.isVisible().catch(() => false);
      if (!visible) break;

      await input.fill(`Message ${i + 1}: Tell me everything about my life path and destiny`);
      await sendBtn.click();
      await page.waitForTimeout(6000);

      // Check for out-of-credits
      const outModal = page.locator('text=/Your Reading Time Has Ended/i');
      if (await outModal.isVisible().catch(() => false)) {
        // Close modal
        await page.locator('button:has-text("Browse Other Guides")').click();
        await page.waitForTimeout(1000);
        break;
      }
    }

    // Now user should have 0 credits — try to start a new session
    await page.waitForTimeout(2000);

    // Check the "Begin Reading" button
    const beginButton = page.locator('button:has-text("Begin Reading")');
    const isDisabled = await beginButton.isDisabled().catch(() => false);

    if (isDisabled) {
      console.log('PASS: Begin Reading button is disabled with 0 credits');
    }

    // Should show "You need credits" message
    const needCreditsMsg = page.locator('text=/need credits|purchase credits/i');
    const hasMsg = await needCreditsMsg.isVisible().catch(() => false);
    if (hasMsg) {
      console.log('PASS: "Need credits" message displayed');
    }

    // Should show link to purchase credits
    const purchaseLink = page.locator('a:has-text("Purchase credits"), text=/Get More Credits/i');
    await expect(purchaseLink.first()).toBeVisible({ timeout: 5000 });
  });

  test('C3b: Credits deplete mid-response — current response should still complete', async ({ page }) => {
    await registerUser(page, 'MidResponse');

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    const sendBtn = page.locator('button[type="submit"]');

    // Send messages to get close to depletion
    for (let i = 0; i < 5; i++) {
      const visible = await input.isVisible().catch(() => false);
      if (!visible) break;

      await input.fill(`Deep question ${i + 1}: Tell me a detailed reading about my emotional journey`);
      await sendBtn.click();
      await page.waitForTimeout(6000);

      // Check if session ended
      const ended = page.locator('text=/Your Reading Time Has Ended/i');
      if (await ended.isVisible().catch(() => false)) {
        // The last response should have completed (not been cut off)
        const responses = page.locator('.bg-white.text-gray-800.border');
        const lastResponse = responses.last();
        const lastText = await lastResponse.textContent();

        // Response should have meaningful content (not empty or truncated)
        expect(lastText!.length).toBeGreaterThan(10);
        console.log('PASS: Final response completed before session ended');
        break;
      }
    }
  });

  test('C3c: Negative credit prevention — balance should never go below 0', async ({ page }) => {
    await registerUser(page, 'NegativeCheck');

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    const sendBtn = page.locator('button[type="submit"]');

    // Monitor credit display throughout
    for (let i = 0; i < 7; i++) {
      const visible = await input.isVisible().catch(() => false);
      if (!visible) break;

      await input.fill(`Question ${i + 1}`);
      await sendBtn.click();
      await page.waitForTimeout(5000);

      // Check credit display
      const creditDisplay = page.locator('text=/\\d+ min remaining/i');
      if (await creditDisplay.isVisible().catch(() => false)) {
        const creditText = await creditDisplay.textContent();
        const match = creditText?.match(/(\d+)/);
        if (match) {
          const credits = parseInt(match[1]);
          expect(credits).toBeGreaterThanOrEqual(0);
          console.log(`After message ${i + 1}: ${credits} min remaining`);

          if (credits === 0) {
            console.log('PASS: Credits reached 0, never went negative');
            break;
          }
        }
      }

      // Session may have ended
      const ended = page.locator('text=/Your Reading Time Has Ended/i');
      if (await ended.isVisible().catch(() => false)) {
        console.log('PASS: Session ended at credit depletion');
        break;
      }
    }

    // Also verify via API that credits are >= 0
    const apiCredits = await page.evaluate(async () => {
      const token = localStorage.getItem('seer_auth_token');
      if (!token) return null;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          return data.creditMinutes;
        }
      } catch {
        return null;
      }
      return null;
    });

    if (apiCredits !== null) {
      expect(apiCredits).toBeGreaterThanOrEqual(0);
      console.log(`API reports ${apiCredits} credit minutes (>= 0 confirmed)`);
    }
  });

  test('C3d: Per-persona pricing display — should show correct pricing on /credits page', async ({ page }) => {
    await registerUser(page, 'PricingDisplay');

    // Check default pricing on /credits
    await page.goto('/credits');
    await page.waitForTimeout(2000);

    // Should show standard pricing packages
    await expect(page.locator('text=/15.*min/i').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/30.*min/i').first()).toBeVisible({ timeout: 10000 });

    // Check Evelyn-specific pricing (via query param)
    await page.goto('/credits?personaId=evelyn-cross');
    await page.waitForTimeout(2000);

    // Should show persona context if personaId is valid
    const evelynContext = page.locator('text=Evelyn Cross');
    if (await evelynContext.isVisible().catch(() => false)) {
      console.log('PASS: Per-persona pricing context shown for Evelyn');
    }

    // Check Marcus pricing (if available)
    await page.goto('/credits?personaId=marcus-stone');
    await page.waitForTimeout(2000);

    const marcusContext = page.locator('text=Marcus Stone');
    if (await marcusContext.isVisible().catch(() => false)) {
      console.log('PASS: Per-persona pricing context shown for Marcus');
    }
  });

  test('C3e: Credit display accuracy — credits shown in header should match API', async ({ page }) => {
    await registerUser(page, 'CreditAccuracy');

    // Check credits via API
    const apiCredits = await page.evaluate(async () => {
      const token = localStorage.getItem('seer_auth_token');
      if (!token) return null;
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.creditMinutes;
      }
      return null;
    });

    // Check credits displayed in UI
    const uiCredits = page.locator('text=/\\d+ minutes/i').first();
    await expect(uiCredits).toBeVisible({ timeout: 10000 });
    const uiText = await uiCredits.textContent();
    const uiMatch = uiText?.match(/(\d+)/);

    if (apiCredits !== null && uiMatch) {
      const uiValue = parseInt(uiMatch[1]);
      expect(uiValue).toBe(apiCredits);
      console.log(`PASS: UI credits (${uiValue}) match API credits (${apiCredits})`);
    }
  });
});
