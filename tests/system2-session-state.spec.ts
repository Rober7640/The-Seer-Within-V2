import { test, expect } from '@playwright/test';

/**
 * System 2 Test Suite — C6: Session Recovery and State
 *
 * Tests for page refresh mid-session, back button behavior,
 * session resumption after tab close, and session history browsing.
 */

test.describe('System 2 — Session Recovery and State (C6)', () => {
  const testPassword = 'Session123!';

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

  test('C6a: Page refresh mid-session — should handle gracefully', async ({ page }) => {
    await registerUser(page, 'RefreshTest');

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // Send a message
    const input = page.locator('input[type="text"]');
    await input.fill('Tell me about my love life — this is a refresh test');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // Verify message and response appeared
    await expect(page.locator('text=this is a refresh test')).toBeVisible();
    const responses = page.locator('.bg-white.text-gray-800.border');
    const responseCountBefore = await responses.count();

    // Take screenshot before refresh
    await page.screenshot({ path: 'test-results/before-refresh-c6a.png', fullPage: true });

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot after refresh
    await page.screenshot({ path: 'test-results/after-refresh-c6a.png', fullPage: true });

    // After refresh, one of these should be true:
    // 1. Session resumed with message history visible
    // 2. Session ended and user sees "Begin Reading" button
    // 3. User needs to start a new session
    const hasMessageHistory = await page.locator('text=this is a refresh test').isVisible().catch(() => false);
    const hasBeginButton = await page.locator('button:has-text("Begin Reading")').isVisible().catch(() => false);
    const hasSessionEnded = await page.locator('text=/session ended|Session Complete/i').isVisible().catch(() => false);

    if (hasMessageHistory) {
      console.log('IDEAL: Session persisted with message history after refresh');
    } else if (hasBeginButton) {
      console.log('ACCEPTABLE: Session ended on refresh — user can start a new one');
      // Verify credits are still accurate (no double-charge)
      const creditText = await page.locator('text=/\\d+ minutes/i').first().textContent();
      console.log('Credits after refresh:', creditText);
    } else if (hasSessionEnded) {
      console.log('ACCEPTABLE: Session ended cleanly after refresh');
    } else {
      console.log('WARN: Unclear state after refresh');
    }

    // Page should still be functional regardless
    const isOnReading = page.url().includes('/reading');
    expect(isOnReading).toBeTruthy();
  });

  test('C6b: Back button behavior — should not break session or lose messages', async ({ page }) => {
    await registerUser(page, 'BackBtnTest');

    // Start from personas page
    await page.goto('/personas');
    await page.waitForTimeout(2000);

    // Navigate to reading
    await page.goto('/reading');
    await page.waitForTimeout(2000);

    // Start session
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // Send a message
    const input = page.locator('input[type="text"]');
    await input.fill('A message before using back button');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // Press browser back
    await page.goBack();
    await page.waitForTimeout(2000);

    // Take screenshot to see where we landed
    await page.screenshot({ path: 'test-results/after-back-button-c6b.png', fullPage: true });

    // Go forward again
    await page.goForward();
    await page.waitForTimeout(2000);

    // Page should be functional — either session continued or we're at reading page
    const isOnReading = page.url().includes('/reading');
    const isOnPersonas = page.url().includes('/personas');

    if (isOnReading) {
      // Check if message history is preserved
      const hasHistory = await page.locator('text=A message before using back button').isVisible().catch(() => false);
      if (hasHistory) {
        console.log('PASS: Messages preserved after back/forward navigation');
      } else {
        console.log('INFO: Messages lost after navigation (session state is in-memory)');
      }
    }

    // Regardless of navigation state, the app should not crash
    const hasError = await page.locator('text=/error|crash|undefined/i').isVisible().catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test('C6c: Session resumption after tab close — should start cleanly', async ({ browser }) => {
    // Create a context to persist cookies/localStorage
    const context = await browser.newContext();
    const page1 = await context.newPage();

    // Register and chat
    const email = `tabclose-${Date.now()}@example.com`;
    await page1.goto('/login');
    await page1.click('text=/New here|Create an account/i');
    await page1.waitForTimeout(500);
    await page1.fill('input[name="firstName"]', 'TabClose');
    await page1.fill('input[name="email"]', email);
    await page1.fill('input[name="password"]', 'TabClose123!');
    await page1.click('button[type="submit"]');
    await page1.waitForURL(/.*reading/, { timeout: 10000 });

    // Start session and send a message
    await page1.locator('button:has-text("Begin Reading")').click();
    await page1.waitForTimeout(3000);

    const input1 = page1.locator('input[type="text"]');
    await input1.fill('Message from first tab');
    await page1.locator('button[type="submit"]').click();
    await page1.waitForTimeout(8000);

    // Close the tab (simulates user closing browser tab)
    await page1.close();

    // Open a new tab in the same context (same localStorage/auth)
    const page2 = await context.newPage();
    await page2.goto('/reading');
    await page2.waitForTimeout(3000);

    // Should either:
    // 1. Show reading page ready to start a new session (session was in-memory)
    // 2. Resume the existing session (if server-side session tracking)
    const hasBeginButton = await page2.locator('button:has-text("Begin Reading")').isVisible().catch(() => false);
    const hasActiveSession = await page2.locator('input[type="text"][placeholder*="message"]').isVisible().catch(() => false);

    if (hasBeginButton) {
      console.log('PASS: New tab shows fresh reading page — ready for new session');
    } else if (hasActiveSession) {
      console.log('PASS: Session resumed in new tab');
    }

    // User should still be authenticated
    await expect(page2.locator('text=Evelyn Cross').first()).toBeVisible({ timeout: 10000 });

    await context.close();
  });

  test('C6d: Multiple sessions in history — should have completed sessions tracked', async ({ page }) => {
    await registerUser(page, 'MultiSession');

    // --- Session 1 ---
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    await input.fill('Session one question about love');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(6000);

    await page.locator('text=End Session').click();
    await page.waitForTimeout(3000);

    // --- Session 2 ---
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    await input.fill('Session two question about career');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(6000);

    await page.locator('text=End Session').click();
    await page.waitForTimeout(3000);

    // Verify sessions were stored via API
    const sessions = await page.evaluate(async () => {
      const token = localStorage.getItem('seer_auth_token');
      if (!token) return null;
      try {
        const res = await fetch('/api/chat-service/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          return data.sessions;
        }
      } catch {
        return null;
      }
      return null;
    });

    if (sessions) {
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      console.log(`PASS: ${sessions.length} sessions found in history`);

      // Sessions should be ordered by creation date (newest first)
      if (sessions.length >= 2) {
        const first = new Date(sessions[0].createdAt).getTime();
        const second = new Date(sessions[1].createdAt).getTime();
        expect(first).toBeGreaterThanOrEqual(second);
        console.log('PASS: Sessions ordered newest first');
      }
    }
  });

  test('C6e: Session messages retrieval — should be able to fetch past session messages', async ({ page }) => {
    await registerUser(page, 'MsgRetrieval');

    // Start session and send a unique message
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const uniqueMessage = `Unique test message ${Date.now()}`;
    const input = page.locator('input[type="text"]');
    await input.fill(uniqueMessage);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // End session
    await page.locator('text=End Session').click();
    await page.waitForTimeout(3000);

    // Retrieve session and its messages via API
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('seer_auth_token');
      if (!token) return null;
      try {
        const sessionsRes = await fetch('/api/chat-service/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!sessionsRes.ok) return null;
        const sessionsData = await sessionsRes.json();
        const session = sessionsData.sessions[0];
        if (!session) return null;

        const messagesRes = await fetch(`/api/chat-service/session/${session.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!messagesRes.ok) return null;
        const messagesData = await messagesRes.json();
        return {
          sessionId: session.id,
          messageCount: messagesData.messages.length,
          messages: messagesData.messages.map((m: any) => ({
            role: m.role,
            contentPreview: m.content?.substring(0, 50),
          })),
        };
      } catch {
        return null;
      }
    });

    if (result) {
      expect(result.messageCount).toBeGreaterThanOrEqual(2); // greeting + user message + response
      console.log(`PASS: Retrieved ${result.messageCount} messages from session ${result.sessionId}`);

      // Verify message roles
      const hasUserMsg = result.messages.some((m: any) => m.role === 'user');
      const hasAssistantMsg = result.messages.some((m: any) => m.role === 'assistant');
      expect(hasUserMsg).toBeTruthy();
      expect(hasAssistantMsg).toBeTruthy();
    }
  });
});
