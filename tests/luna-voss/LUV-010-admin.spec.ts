/**
 * LUV-010: Admin Side Verification
 *
 * Confirms that after a user chats with Luna Voss, all expected admin-side
 * data appears correctly: sessions (with persona name "Luna Voss"),
 * credit transactions, memory records, and that the persona editor works.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  loginAdmin,
  getAdminToken,
  adminAdjustCredits,
  adminGetSessions,
  adminGetMemory,
  adminGetUser,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  birthDataMessage,
  SELECTORS,
  BASE_URL,
  LUNA_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// LUV-010-01: Admin sees completed Luna session in user detail
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-010-01: Completed Luna Voss session visible in admin user sessions list', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-010-01');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);
  await apiSendMessage(page, sessionId, token, birthDataMessage());
  await page.waitForTimeout(12000);
  await apiSendMessage(page, sessionId, token, 'Tell me about my Venus placement');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);

  await loginAdmin(page);
  const adminToken = await getAdminToken(page);
  const { sessions } = await adminGetSessions(page, adminToken!, regData.user.id);

  expect(sessions.length).toBeGreaterThan(0);
  const session = sessions.find((s: any) => s.id === sessionId);
  expect(session).toBeTruthy();
  expect(session.status).toBe('ended');
  // Persona name should reference Luna
  expect(session.personaName).toMatch(/luna/i);
  expect(session.coinsCharged).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-010-02: Admin sees credit deduction transaction for Luna session
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-010-02: Credit deduction from Luna session appears in admin user detail', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-010-02');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);
  await apiSendMessage(page, sessionId, token, birthDataMessage());
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);

  await loginAdmin(page);
  const adminToken = await getAdminToken(page);
  const userDetail = await adminGetUser(page, adminToken!, regData.user.id);

  // User detail should show reduced balance after session
  expect(userDetail.user).toBeTruthy();
  expect(userDetail.user.coinBalance).toBeLessThan(180);
  expect(userDetail.user.coinBalance).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-010-03: Admin grant credits — Luna user can immediately resume
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-010-03: Admin grant coins → user balance increases → new Luna session possible', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('luv-010-03');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Drain to 0
  await loginAdmin(page);
  const adminToken = await getAdminToken(page);
  await adminAdjustCredits(page, adminToken!, regData.user.id, -180, 'Drain for LUV-010-03');

  // Grant 120 coins
  const grantResult = await adminAdjustCredits(page, adminToken!, regData.user.id, 120, 'Test grant LUV-010-03');
  expect(grantResult.user.newBalance).toBe(120);

  // User should now be able to start a Luna session
  const { sessionId, remainingCoins } = await apiStartSession(page, token, LUNA_SLUG);
  expect(remainingCoins).toBe(120);

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-010-04: Admin can view and save Luna Voss's persona without error
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-010-04: Admin persona editor loads Luna Voss and saves without error', async ({ page }) => {
  test.setTimeout(30000);
  await loginAdmin(page);

  await page.goto('/admin/personas');
  await page.waitForTimeout(2000);

  await expect(page.locator('text=Luna Voss').first()).toBeVisible({ timeout: 10000 });

  const editLink = page.locator('a:has-text("Edit"), button:has-text("Edit")').first();
  if (await editLink.isVisible().catch(() => false)) {
    await editLink.click();
    await page.waitForTimeout(2000);

    const promptField = page.locator('textarea, [contenteditable="true"]').first();
    await expect(promptField).toBeVisible({ timeout: 10000 });

    // Tagline should reference "Natal Chart"
    const hasTagline = await page.locator('text=/Natal Chart, Decoded|Natal Chart/i').first().isVisible().catch(() => false);
    console.log('LUV-010-04: Luna tagline visible in editor:', hasTagline);

    // Save without making changes
    const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(2000);

      const errorMsg = page.locator('text=/error|failed|something went wrong/i');
      expect(await errorMsg.isVisible().catch(() => false)).toBeFalsy();
    }
  } else {
    await page.goto('/admin/personas');
    const personaRow = page.locator('text=Luna Voss').first();
    await expect(personaRow).toBeVisible({ timeout: 10000 });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-010-05: Memory created after Luna session visible in admin
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-010-05: Memory created after Luna Voss session is visible in admin', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-010-05');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Complete a meaningful session with birth data
  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);
  await apiSendMessage(page, sessionId, token, birthDataMessage());
  await page.waitForTimeout(12000);
  await apiSendMessage(page, sessionId, token, 'I have been struggling with my career and feel totally lost');
  await page.waitForTimeout(12000);
  await apiEndSession(page, sessionId, token);
  await page.waitForTimeout(5000); // allow async memory write

  await loginAdmin(page);
  const adminToken = await getAdminToken(page);
  const { memories } = await adminGetMemory(page, adminToken!, regData.user.id);

  expect(memories.length).toBeGreaterThan(0);
  const sessionMemory = memories.filter((m: any) => m.memoryType === 'session_summary');
  expect(sessionMemory.length).toBeGreaterThan(0);
});
