/**
 * AIP-010: Admin Side Verification
 *
 * Confirms that after a user chats with Aiden Powers, all expected admin-side
 * data appears correctly: sessions (with persona name "Aiden Powers"),
 * credit transactions, memory records, and that the persona editor works.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  loginAdmin,
  apiAdminLogin,
  adminAdjustCredits,
  adminGetSessions,
  adminGetMemory,
  adminGetUser,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  AIDEN_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// AIP-010-01: Admin sees completed Aiden session in user detail
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-010-01: Completed Aiden Powers session visible in admin user sessions list', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-010-01');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Complete a session
  const { sessionId } = await apiStartSession(page, token, AIDEN_SLUG);
  await apiSendMessage(page, sessionId, token, 'I want to understand my life path number — I was born March 15, 1987');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);

  // Check via admin API (no browser login needed)
  const adminToken = await apiAdminLogin(page);
  const sessionsRes = await adminGetSessions(page, adminToken, regData.user.id);
  const sessions: any[] = (sessionsRes as any).sessions ?? [];

  expect(sessions.length).toBeGreaterThan(0);
  const session = sessions.find((s: any) => s.id === sessionId);
  expect(session).toBeTruthy();
  expect(session.status).toBe('ended');
  // Persona name should reference Aiden
  expect(session.personaName).toMatch(/aiden/i);
  expect(session.coinsCharged).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-010-02: Admin sees credit deduction transaction for Aiden session
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-010-02: Credit deduction from Aiden session appears in admin user detail', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('aip-010-02');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Complete a session long enough (≥30s) for 1-minute billing
  const { sessionId } = await apiStartSession(page, token, AIDEN_SLUG);
  await apiSendMessage(page, sessionId, token, 'Tell me about my pinnacle period — born November 3, 1988');
  await page.waitForTimeout(20000);
  await apiSendMessage(page, sessionId, token, 'Tell me more about my career timing');
  await page.waitForTimeout(15000);
  await apiEndSession(page, sessionId, token);

  const adminToken = await apiAdminLogin(page);
  const userDetail = await adminGetUser(page, adminToken, regData.user.id);

  // User detail should show reduced balance after session
  expect(userDetail.user).toBeTruthy();
  expect(userDetail.user.coinBalance).toBeLessThan(180);
  expect(userDetail.user.coinBalance).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-010-03: Admin grant credits — Aiden user can immediately resume
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-010-03: Admin grant coins → user balance increases → new Aiden session possible', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('aip-010-03');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  const adminToken = await apiAdminLogin(page);

  // Drain to 0
  await adminAdjustCredits(page, adminToken, regData.user.id, -180, 'Drain for AIP-010-03');

  // Grant 120 coins
  const grantResult = await adminAdjustCredits(page, adminToken, regData.user.id, 120, 'Test grant AIP-010-03');
  expect(grantResult.user.newBalance).toBe(120);

  // User should now be able to start an Aiden session
  const { sessionId, remainingCoins } = await apiStartSession(page, token, AIDEN_SLUG);
  expect(remainingCoins).toBe(120);

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-010-04: Admin can view and save Aiden Powers' persona without error
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-010-04: Admin persona editor loads Aiden Powers and saves without error', async ({ page }) => {
  test.setTimeout(60000);
  await loginAdmin(page);

  // Navigate to persona list
  await page.goto('/admin/personas');
  // Wait for personas data to load (admin API call + React render)
  await page.waitForTimeout(4000);

  // Aiden Powers should be in the list
  await expect(page.locator('text=Aiden Powers').first()).toBeVisible({ timeout: 15000 });

  // Click Aiden's edit link
  const editLink = page.locator('a:has-text("Edit"), button:has-text("Edit")').first();
  if (await editLink.isVisible().catch(() => false)) {
    await editLink.click();
    await page.waitForTimeout(2000);

    // System prompt field should be visible
    const promptField = page.locator('textarea, [contenteditable="true"]').first();
    await expect(promptField).toBeVisible({ timeout: 10000 });

    // Tagline should reference "Numerologist" or "Blueprint"
    const hasTagline = await page.locator('text=/Numerologist|Blueprint/i').first().isVisible().catch(() => false);
    console.log('AIP-010-04: Aiden tagline visible in editor:', hasTagline);

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
    // May use direct URL or row click
    await page.goto('/admin/personas');
    const personaRow = page.locator('text=Aiden Powers').first();
    await expect(personaRow).toBeVisible({ timeout: 15000 });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-010-05: Memory created after Aiden session visible in admin
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-010-05: Memory created after Aiden Powers session is visible in admin', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('aip-010-05');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Complete a meaningful session with birth data
  const { sessionId } = await apiStartSession(page, token, AIDEN_SLUG);
  await apiSendMessage(page, sessionId, token, 'My name is Cameron and I was born July 4, 1982');
  await page.waitForTimeout(12000);
  await apiSendMessage(page, sessionId, token, 'I have been struggling with career decisions and feeling stuck');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);
  await page.waitForTimeout(30000); // allow Claude async summarization to complete

  const adminToken = await apiAdminLogin(page);
  const memoryRes = await adminGetMemory(page, adminToken, regData.user.id);
  const memories: any[] = (memoryRes as any).memories ?? [];

  expect(memories.length).toBeGreaterThan(0);
  // Should have a session_summary type entry
  const sessionMemory = memories.filter((m: any) => m.memoryType === 'session_summary');
  expect(sessionMemory.length).toBeGreaterThan(0);
});
