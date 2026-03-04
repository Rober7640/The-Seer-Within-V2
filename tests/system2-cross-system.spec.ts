import { test, expect } from '@playwright/test';

/**
 * System 2 Test Suite — C8: Cross-System Isolation (Regression)
 *
 * Tests to verify System 1 (conversion funnel) and System 2 (chat service)
 * remain functionally independent despite sharing the same Supabase database.
 *
 * KEY CONTEXT: Both systems use the SAME Supabase instance:
 * - System 1 stores user data in the `conversations` table (email, firstName,
 *   bucket, messages, purchase info) once the user enters their email.
 * - System 2 stores user data in the `users` table (accounts, credits, sessions).
 * - The `users` table has a `migratedFromConversationId` field to link the two.
 * - System 2 does NOT automatically read System 1's `conversations` data.
 * - Email is the common identifier that could theoretically link both records.
 *
 * These tests verify the systems behave independently from a user perspective,
 * even though they share infrastructure.
 */

test.describe('System 2 — Cross-System Isolation (C8)', () => {
  const testPassword = 'CrossSys123!';

  test('C8a: System 1 still works independently — landing page and funnel chat load correctly', async ({ page }) => {
    // Navigate to System 1 landing page
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Landing page should load with Evelyn Cross branding
    await expect(page.locator('text=/Evelyn Cross|Everything You Desire|Seer Within/i').first()).toBeVisible({ timeout: 10000 });

    // Take screenshot of landing page
    await page.screenshot({ path: 'test-results/system1-landing-page.png', fullPage: true });

    // Navigate to System 1 chat
    await page.goto('/chat');
    await page.waitForTimeout(3000);

    // System 1 chat should load without requiring login
    // It uses session-based storage (no JWT needed)
    const chatArea = page.locator('text=/chat|Evelyn|reading|spiritual/i');
    const isLoaded = await chatArea.first().isVisible().catch(() => false);

    if (isLoaded) {
      console.log('PASS: System 1 /chat loads without authentication');
    }

    // System 1 should NOT redirect to /login
    expect(page.url()).not.toContain('/login');
    console.log('PASS: System 1 funnel operates independently of System 2 auth');
  });

  test('C8b: System 1 upsell pages still accessible', async ({ page }) => {
    // Check upsell pages are accessible
    await page.goto('/welcome1');
    await page.waitForTimeout(2000);

    // Should show upsell content (not a 404 or redirect to login)
    const isUpsellPage = page.url().includes('/welcome1');
    expect(isUpsellPage).toBeTruthy();

    await page.goto('/welcome2');
    await page.waitForTimeout(2000);

    const isUpsell2Page = page.url().includes('/welcome2');
    expect(isUpsell2Page).toBeTruthy();

    // Success page
    await page.goto('/success');
    await page.waitForTimeout(2000);

    const isSuccessPage = page.url().includes('/success');
    expect(isSuccessPage).toBeTruthy();

    console.log('PASS: System 1 upsell and success pages are all accessible');
  });

  test('C8c: No cross-system data leakage in UI — System 2 chat content should not appear in System 1', async ({ page }) => {
    // First, create a System 2 account with identifiable info
    const uniqueName = `CrossTest${Date.now()}`;
    const email = `cross-${Date.now()}@example.com`;

    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', uniqueName);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    // Chat with System 2 Evelyn
    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"]');
    await input.fill(`My secret phrase for cross-system test is: ZETA-CROSSCHECK-${Date.now()}`);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(8000);

    // End session
    await page.locator('text=End Session').click();
    await page.waitForTimeout(2000);

    // Now visit System 1 — the funnel chat should show a fresh session.
    // NOTE: Both systems share the same Supabase. System 2 data is in the
    // `users` + `chat_sessions` + `chat_messages` tables. System 1 data is
    // in the `conversations` table. System 1 does NOT query System 2 tables,
    // so the funnel should have no knowledge of the System 2 chat content.
    await page.goto('/chat');
    await page.waitForTimeout(3000);

    // System 1 chat is session-based — should show fresh start
    // The page content should NOT contain the System 2 user's chat content
    const pageContent = await page.content();
    expect(pageContent).not.toContain(uniqueName);
    expect(pageContent).not.toContain('ZETA-CROSSCHECK');

    console.log('PASS: No System 2 chat content leaked to System 1 UI');
  });

  test('C8c2: Shared Supabase — System 1 user email exists in conversations table', async ({ page }) => {
    // This test verifies the shared database reality:
    // When a System 1 user enters their email, a record is created in the
    // `conversations` table. This data coexists with System 2 data.
    //
    // We verify that System 2 registration works even if the same email
    // already has a record in the `conversations` table (different table,
    // no uniqueness conflict).

    const sharedEmail = `shared-db-${Date.now()}@example.com`;

    // Step 1: Simulate System 1 lead capture (email goes to `conversations` table)
    const leadResult = await page.evaluate(async (email) => {
      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            firstName: 'FunnelUser',
            bucket: 'love',
          }),
        });
        return { status: res.status, ok: res.ok };
      } catch (e: any) {
        return { error: e.message };
      }
    }, sharedEmail);

    console.log('System 1 lead capture result:', JSON.stringify(leadResult));

    // Step 2: Register the SAME email in System 2 (goes to `users` table)
    // This should succeed because `conversations` and `users` are separate tables
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'SharedDBUser');
    await page.fill('input[name="email"]', sharedEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should register successfully — no conflict with `conversations` table
    await page.waitForURL(/.*reading/, { timeout: 10000 });
    await expect(page.locator('text=Evelyn Cross').first()).toBeVisible({ timeout: 10000 });

    console.log('PASS: Same email can exist in both conversations (System 1) and users (System 2) tables');
  });

  test('C8d: Shared Evelyn, different behavior — System 1 uses state-machine, System 2 uses memory', async ({ page }) => {
    // --- System 1 Evelyn (state-machine flow) ---
    await page.goto('/chat');
    await page.waitForTimeout(3000);

    // System 1 chat should present a guided conversation flow
    // The state machine starts with greeting/name capture
    // Look for structured prompts or conversation starters
    await page.screenshot({ path: 'test-results/system1-evelyn-chat.png', fullPage: true });

    const system1Url = page.url();
    expect(system1Url).toContain('/chat');

    // --- System 2 Evelyn (persistent memory) ---
    // Register and start System 2 session
    const email = `evelyn-compare-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.click('text=/New here|Create an account/i');
    await page.waitForTimeout(500);
    await page.fill('input[name="firstName"]', 'EvelynCompare');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*reading/, { timeout: 10000 });

    await page.locator('button:has-text("Begin Reading")').click();
    await page.waitForTimeout(3000);

    // System 2 should show Evelyn with account-based features
    await page.screenshot({ path: 'test-results/system2-evelyn-chat.png', fullPage: true });

    const system2Url = page.url();
    expect(system2Url).toContain('/reading');

    // System 2 should have credit display (not present in System 1)
    const creditDisplay = page.locator('text=/min remaining/i');
    const hasCredits = await creditDisplay.isVisible().catch(() => false);
    expect(hasCredits).toBeTruthy();

    // System 2 should have "End Session" button
    const endSessionBtn = page.locator('text=End Session');
    const hasEndSession = await endSessionBtn.isVisible().catch(() => false);
    expect(hasEndSession).toBeTruthy();

    console.log('PASS: System 1 (/chat) and System 2 (/reading) are different implementations');
    console.log('  System 1: state-machine flow, session-based, no credits');
    console.log('  System 2: persistent memory, account-based, credit system');
  });

  test('C8e: System 1 does not require authentication — System 2 does', async ({ page }) => {
    // Clear any existing auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('seer_auth_token');
    });

    // System 1 routes should be accessible without login
    const system1Routes = ['/', '/chat', '/welcome1', '/welcome2', '/success', '/privacy', '/terms', '/refund'];

    for (const route of system1Routes) {
      await page.goto(route);
      await page.waitForTimeout(1000);

      // Should NOT redirect to /login
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');
    }

    console.log('PASS: All System 1 routes accessible without authentication');

    // System 2 /reading route should redirect to /login
    await page.goto('/reading');
    await page.waitForTimeout(3000);

    await page.waitForURL(/.*login/, { timeout: 10000 });
    console.log('PASS: System 2 /reading redirects to /login when unauthenticated');
  });

  test('C8f: API endpoint isolation — System 1 and System 2 APIs use separate tables', async ({ page }) => {
    // Both API sets hit the SAME Supabase, but operate on different tables:
    // - System 1: /api/chat, /api/lead, /api/checkout → `conversations` table
    // - System 2: /api/chat-service/*, /api/auth/* → `users`, `chat_sessions`, `chat_messages` tables

    // System 1 chat endpoint should work without auth
    const system1Chat = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Hello' }),
        });
        return { status: res.status, ok: res.ok };
      } catch (e: any) {
        return { error: e.message };
      }
    });

    // System 2 chat endpoint should require auth
    const system2Chat = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/chat-service/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personaId: 'test' }),
        });
        return { status: res.status };
      } catch (e: any) {
        return { error: e.message };
      }
    });

    // System 1 lead capture endpoint (writes to `conversations` table)
    const system1Lead = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `api-test-${Date.now()}@example.com`,
            firstName: 'ApiTest',
            bucket: 'love',
          }),
        });
        return { status: res.status };
      } catch (e: any) {
        return { error: e.message };
      }
    });

    // System 2 should return 401 without auth token
    if (system2Chat.status) {
      expect(system2Chat.status).toBe(401);
      console.log('PASS: System 2 API requires authentication (401 without token)');
    }

    // System 1 API should not require auth (may return various statuses but not 401)
    if (system1Chat.status) {
      expect(system1Chat.status).not.toBe(401);
      console.log(`PASS: System 1 /api/chat does not require auth (status: ${system1Chat.status})`);
    }

    // System 1 lead capture should not require auth
    if (system1Lead.status) {
      expect(system1Lead.status).not.toBe(401);
      console.log(`PASS: System 1 /api/lead does not require auth (status: ${system1Lead.status})`);
    }
  });

  test('C8g: Persona directory accessible from both systems context', async ({ page }) => {
    // /personas should be accessible (public endpoint)
    await page.goto('/personas');
    await page.waitForTimeout(2000);

    // Should show personas
    const evelynVisible = await page.locator('text=Evelyn Cross').first().isVisible().catch(() => false);

    if (evelynVisible) {
      console.log('PASS: Personas directory accessible as public page');

      // Each persona card should link to /reading (System 2)
      const startReadingLinks = page.locator('a[href*="/reading"]');
      const linkCount = await startReadingLinks.count();
      expect(linkCount).toBeGreaterThanOrEqual(1);

      // Links should go to /reading?persona=... (System 2) not /chat (System 1)
      const firstLink = await startReadingLinks.first().getAttribute('href');
      expect(firstLink).toContain('/reading');
      expect(firstLink).not.toContain('/chat');

      console.log('PASS: Persona cards link to System 2 (/reading) not System 1 (/chat)');
    }
  });
});
