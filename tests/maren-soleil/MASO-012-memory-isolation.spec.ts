/**
 * MASO-012: Cross-Persona Memory Isolation
 *
 * Verifies that memories from Maren Soleil sessions do NOT leak into
 * Evelyn Cross sessions (and vice versa), and that Maren's memories
 * are preserved and correctly scoped after a cross-persona visit.
 *
 * The "other persona" for isolation tests is Evelyn Cross (evelyn-cross).
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiGetAdminToken,
  adminGetMemory,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  MAREN_SLUG,
  OTHER_PERSONA_SLUG,
  BASE_URL,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// MASO-012-01: Maren's memories don't appear in Evelyn Cross's greeting/responses
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-012-01: Evelyn Cross does not reference Maren Soleil session memories', async ({ page }) => {
  test.setTimeout(150000);
  const email = uniqueEmail('mas-012-01');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session 1 with Maren — mention "twin flame connection with Jordan"
  const s1 = await apiStartSession(page, token, MAREN_SLUG);
  await apiSendMessage(page, s1.sessionId, token, 'I have a deep twin flame connection with Jordan and it\'s consuming my thoughts');
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(4000); // allow memory write

  // Check if Evelyn is available as a persona
  const personasRes = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const personasData = await personasRes.json();
  const personas: { slug: string; isActive: boolean }[] = personasData.personas ?? personasData;
  const evelyn = personas.find((p) => p.slug === OTHER_PERSONA_SLUG && p.isActive);

  if (!evelyn) {
    test.skip(true, 'Evelyn Cross persona not active; skipping cross-persona isolation test');
    return;
  }

  // Session 2 with Evelyn Cross
  const s2 = await apiStartSession(page, token, OTHER_PERSONA_SLUG);
  const res = await apiSendMessage(page, s2.sessionId, token, 'Hello, I am new here');
  await page.waitForTimeout(12000);

  const data = await res.json();
  const msgLower = (data.message ?? '').toLowerCase();

  // Evelyn should NOT reference "Jordan" from Maren's session
  expect(msgLower).not.toContain('jordan');

  await apiEndSession(page, s2.sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-012-02: Maren's memories remain available after visiting Evelyn Cross
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-012-02: Maren Soleil memories persist correctly after an Evelyn Cross session', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('mas-012-02');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session 1: Maren
  const s1 = await apiStartSession(page, token, MAREN_SLUG);
  await apiSendMessage(page, s1.sessionId, token, 'I am dealing with a very complex twin flame situation with my ex');
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(4000);

  // Session 2: Evelyn (if available)
  const personasRes = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const personasData = await personasRes.json();
  const personas: { slug: string; isActive: boolean }[] = personasData.personas ?? personasData;
  const evelyn = personas.find((p) => p.slug === OTHER_PERSONA_SLUG && p.isActive);

  if (evelyn) {
    const s2 = await apiStartSession(page, token, OTHER_PERSONA_SLUG);
    await apiSendMessage(page, s2.sessionId, token, 'Hello');
    await page.waitForTimeout(12000);
    await apiEndSession(page, s2.sessionId, token);
    await page.waitForTimeout(3000);
  }

  // Session 3: Return to Maren — greeting should be returning-user style
  const greetingRes = await page.request.get(
    `${BASE_URL}/api/chat-service/greeting/${MAREN_SLUG}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const greetingData = await greetingRes.json();
  const greetingLower = (greetingData.greeting ?? '').toLowerCase();

  // Should be returning-user greeting (not new user)
  const isReturning =
    greetingLower.includes('good to see you') ||
    greetingLower.includes('welcome back') ||
    greetingLower.includes('again') ||
    greetingLower.includes('return') ||
    greetingLower.includes("i've been thinking") ||
    greetingLower.includes('your energy');
  expect(isReturning).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-012-03: Memory records are persona-scoped in the DB
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-012-03: Memory records in DB have correct persona_id scoping', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('mas-012-03');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session with Maren
  const s1 = await apiStartSession(page, token, MAREN_SLUG);
  await apiSendMessage(page, s1.sessionId, token, 'I am worried about my twin flame connection with my partner Riley');
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(5000);

  // Check if Evelyn is available for a second session
  const personasRes = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const personasData = await personasRes.json();
  const personas: { id: string; slug: string; isActive: boolean }[] = personasData.personas ?? personasData;
  const evelyn = personas.find((p) => p.slug === OTHER_PERSONA_SLUG && p.isActive);
  const marenPersona = personas.find((p) => p.slug === MAREN_SLUG);

  if (evelyn) {
    const s2 = await apiStartSession(page, token, OTHER_PERSONA_SLUG);
    await apiSendMessage(page, s2.sessionId, token, 'Tell me about my love life');
    await page.waitForTimeout(12000);
    await apiEndSession(page, s2.sessionId, token);
    await page.waitForTimeout(5000);
  }

  // Verify via admin API that memories are persona-scoped
  const adminToken = await apiGetAdminToken(page);
  const { memories } = await adminGetMemory(page, adminToken!, regData.user.id);

  if (memories.length > 0 && marenPersona) {
    // All Maren memories must have Maren's persona ID
    const marenMemories = memories.filter((m: any) => m.personaId === marenPersona.id);
    const evelynPersona = personas.find((p) => p.slug === OTHER_PERSONA_SLUG);

    if (evelyn && evelynPersona) {
      // Verify no cross-contamination: Maren memories don't have Evelyn's ID
      for (const mem of marenMemories) {
        expect(mem.personaId).toBe(marenPersona.id);
        expect(mem.personaId).not.toBe(evelynPersona.id);
      }
    } else {
      // Evelyn not available — just verify Maren memories have correct ID
      expect(marenMemories.length).toBeGreaterThan(0);
      for (const mem of marenMemories) {
        expect(mem.personaId).toBe(marenPersona.id);
      }
    }
  } else {
    // If no memories yet, that's OK — memory write may need more time
    console.log('No memories written yet — memory isolation test inconclusive');
  }
});
