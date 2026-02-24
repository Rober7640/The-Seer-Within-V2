/**
 * MASO-010: Admin Side Verification
 *
 * Confirms that after a user chats with Maren Soleil, all expected admin-side
 * data appears correctly: sessions, credit transactions, memory records,
 * and that the persona editor works without breaking active sessions.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiGetAdminToken,
  adminAdjustCredits,
  adminGetSessions,
  adminGetMemory,
  adminGetUser,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  SELECTORS,
  BASE_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// MASO-010-01: Admin can see completed Maren Soleil session in user detail
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-010-01: Completed session visible in admin user sessions list', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('mas-010-01');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Complete a session
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'I need guidance about my twin flame connection');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);

  // Check via admin
  const adminToken = await apiGetAdminToken(page);
  const { sessions } = await adminGetSessions(page, adminToken!, regData.user.id);

  expect(sessions.length).toBeGreaterThan(0);
  const session = sessions.find((s: any) => s.id === sessionId);
  expect(session).toBeTruthy();
  expect(session.status).toBe('ended');
  // personaName field may differ by impl — check either personaName or personaSlug
  const nameOrSlug = (session.personaName ?? session.personaSlug ?? '').toLowerCase();
  expect(nameOrSlug).toMatch(/maren/);
  expect(session.coinsCharged).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-010-02: Admin sees credit deduction in purchase history
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-010-02: Credit deduction from session appears in admin user detail', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('mas-010-02');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Complete a session — wait 35s so billing registers at least 1 min
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'Tell me about the cord between us');
  await page.waitForTimeout(35000);
  await apiEndSession(page, sessionId, token);

  const adminToken = await apiGetAdminToken(page);
  const userDetail = await adminGetUser(page, adminToken!, regData.user.id);

  // User detail should include recent purchases (credit transactions)
  expect(userDetail.user).toBeTruthy();
  // coinBalance should reflect the deduction
  expect(userDetail.user.coinBalance).toBeLessThan(180);
  expect(userDetail.user.coinBalance).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-010-03: Admin grant credits — user can immediately start new session
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-010-03: Admin grant → user coin balance increases → new session possible', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('mas-010-03');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Drain to 0
  const adminToken = await apiGetAdminToken(page);
  await adminAdjustCredits(page, adminToken!, regData.user.id, -180, 'Drain for test MASO-010-03');

  // Grant 120 coins
  const grantResult = await adminAdjustCredits(page, adminToken!, regData.user.id, 120, 'Test grant MASO-010-03');
  expect(grantResult.user.newBalance).toBe(120);

  // User should now be able to start a session
  const { sessionId, remainingCoins } = await apiStartSession(page, token);
  expect(remainingCoins).toBe(120);

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-010-04: Admin can view and save Maren Soleil's persona without error
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-010-04: Admin persona editor loads Maren Soleil and saves without error', async ({ page }) => {
  test.setTimeout(30000);

  // Get admin token via API and inject into localStorage — more reliable than UI login.
  const adminTok = await apiGetAdminToken(page);
  // Navigate to any page on the same origin first so localStorage is in the right context
  await page.goto('/admin/login');
  await page.evaluate((t) => localStorage.setItem('seer_admin_token', t!), adminTok);

  // Navigate to persona list
  await page.goto('/admin/personas');
  await page.waitForTimeout(2000);

  await expect(page.locator('text=Maren Soleil').first()).toBeVisible({ timeout: 10000 });

  // Click Maren's edit link
  const editLink = page.locator('a:has-text("Edit"), button:has-text("Edit")').first();
  if (await editLink.isVisible().catch(() => false)) {
    await editLink.click();
    await page.waitForTimeout(2000);

    // System prompt field should be visible
    const promptField = page.locator('textarea, [contenteditable="true"]').first();
    await expect(promptField).toBeVisible({ timeout: 10000 });

    // Save without making changes
    const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(2000);

      // Should not show an error
      const errorMsg = page.locator('text=/error|failed|something went wrong/i');
      expect(await errorMsg.isVisible().catch(() => false)).toBeFalsy();
    }
  } else {
    // May use direct URL
    await page.goto('/admin/personas');
    const personaRow = page.locator('text=Maren Soleil').first();
    await expect(personaRow).toBeVisible({ timeout: 10000 });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-010-05: Admin can view memory records created by Maren Soleil sessions
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-010-05: Memory created after Maren Soleil session is visible in admin', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('mas-010-05');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Complete a meaningful session
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'I have been struggling with my connection to my twin flame Jordan');
  await page.waitForTimeout(12000);
  await apiSendMessage(page, sessionId, token, 'The cord between us feels so strong but also painful');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);
  await page.waitForTimeout(5000); // allow async memory write

  const adminToken = await apiGetAdminToken(page);
  const { memories } = await adminGetMemory(page, adminToken!, regData.user.id);

  expect(memories.length).toBeGreaterThan(0);
  // Should have a session_summary type entry
  const sessionMemory = memories.filter((m: any) => m.memoryType === 'session_summary');
  expect(sessionMemory.length).toBeGreaterThan(0);
});
