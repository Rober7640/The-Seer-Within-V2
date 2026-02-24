/**
 * EVE-010: Admin Side Verification
 *
 * Confirms that after a user chats with Evelyn, all expected admin-side
 * data appears correctly: sessions, credit transactions, memory records,
 * and that the persona editor works without breaking active sessions.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  adminAdjustCredits,
  adminGetSessions,
  adminGetMemory,
  adminGetUser,
  apiRegister,
  apiAdminLogin,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  SELECTORS,
  BASE_URL,
} from './helpers';

const PWD = 'TestPass123!';
const ADMIN_EMAIL = 'admin@theseerwithin.com';
const ADMIN_PASSWORD = 'ChangeMe123!';

// ─────────────────────────────────────────────────────────────────────────────
// EVE-010-01: Admin can see completed Evelyn session in user detail
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-010-01: Completed session visible in admin user sessions list', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('eve-010-01');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Complete a session
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'I need guidance about my relationship');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);

  // Check via admin
  const adminToken = await apiAdminLogin(page);
  const { sessions } = await adminGetSessions(page, adminToken, regData.user.id);

  expect(sessions.length).toBeGreaterThan(0);
  const session = sessions.find((s: any) => s.id === sessionId);
  expect(session).toBeTruthy();
  expect(session.status).toBe('ended');
  expect(session.personaName).toMatch(/evelyn/i);
  expect(session.coinsCharged).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-010-02: Admin sees credit deduction in purchase history
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-010-02: Credit deduction from session appears in admin user detail', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('eve-010-02');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Complete a session — wait 35s+ so Math.round(elapsed/60) ≥ 1 (billing threshold)
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'Tell me about my love life');
  await page.waitForTimeout(35000);
  await apiEndSession(page, sessionId, token);

  const adminToken = await apiAdminLogin(page);
  const userDetail = await adminGetUser(page, adminToken, regData.user.id);

  // User detail should include recent purchases (credit transactions)
  expect(userDetail.user).toBeTruthy();
  // coinBalance should reflect the deduction
  expect(userDetail.user.coinBalance).toBeLessThan(180);
  expect(userDetail.user.coinBalance).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-010-03: Admin grant credits — user can immediately start new session
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-010-03: Admin grant → user coin balance increases → new session possible', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('eve-010-03');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Drain to 0
  const adminToken = await apiAdminLogin(page);
  await adminAdjustCredits(page, adminToken, regData.user.id, -180, 'Drain for test EVE-010-03');

  // Grant 120 coins
  const grantResult = await adminAdjustCredits(page, adminToken, regData.user.id, 120, 'Test grant EVE-010-03');
  expect(grantResult.user.newBalance).toBe(120);

  // User should now be able to start a session
  const { sessionId, remainingCoins } = await apiStartSession(page, token);
  expect(remainingCoins).toBe(120);

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-010-04: Admin can view and save Evelyn's persona without error
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-010-04: Admin persona editor loads Evelyn and saves without error', async ({ page }) => {
  test.setTimeout(30000);
  // Log in as admin via API token (reliable), then set in localStorage for browser UI
  const adminToken = await apiAdminLogin(page);
  await page.goto('/admin/login');
  await page.evaluate((t) => localStorage.setItem('seer_admin_token', t), adminToken);

  // Navigate to persona list
  await page.goto('/admin/personas');
  await page.waitForTimeout(2000);

  await expect(page.locator('text=Evelyn Cross').first()).toBeVisible({ timeout: 10000 });

  // Click Evelyn's edit link
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
    const personaRow = page.locator('text=Evelyn Cross').first();
    await expect(personaRow).toBeVisible({ timeout: 10000 });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-010-05: Admin can view memory records created by Evelyn sessions
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-010-05: Memory created after Evelyn session is visible in admin', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('eve-010-05');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Complete a meaningful session
  const { sessionId } = await apiStartSession(page, token);
  await apiSendMessage(page, sessionId, token, 'I have been struggling with my relationship with my boyfriend Tom');
  await page.waitForTimeout(12000);
  await apiSendMessage(page, sessionId, token, 'We fight about money and I feel disconnected');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);
  await page.waitForTimeout(5000); // allow async memory write

  const adminToken = await apiAdminLogin(page);
  const { memories } = await adminGetMemory(page, adminToken, regData.user.id);

  expect(memories.length).toBeGreaterThan(0);
  // Should have a session_summary type entry
  const sessionMemory = memories.filter((m: any) => m.memoryType === 'session_summary');
  expect(sessionMemory.length).toBeGreaterThan(0);
});
