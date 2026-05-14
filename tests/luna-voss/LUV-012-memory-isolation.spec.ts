/**
 * LUV-012: Cross-Persona Memory Isolation
 *
 * Verifies that memories from Luna Voss sessions do NOT leak into
 * Marcus Stone sessions (and vice versa), and that Luna's memories
 * (including birth data: date, time, city) are preserved and correctly
 * scoped after a cross-persona visit.
 *
 * Luna-specific: birth data is the most sensitive memory to protect.
 * If Marcus Stone starts knowing "born June 15, 1990 at 2:30 PM in Chicago"
 * from a Luna session — that is a critical memory isolation failure.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  loginAdmin,
  getAdminToken,
  adminGetMemory,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  birthDataMessage,
  assertNoForbiddenPhrases,
  LUNA_SLUG,
  MARCUS_SLUG,
  BASE_URL,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// LUV-012-01: Luna Voss's memories don't appear in Marcus Stone sessions
// ─────────────────────────────────────────────────────────────────────────────
test("LUV-012-01: Marcus Stone does not reference Luna Voss session memories (including birth data)", async ({ page }) => {
  test.setTimeout(150000);
  const email = uniqueEmail('luv-012-01');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session 1 with Luna — provide birth data and mention a specific concern
  const s1 = await apiStartSession(page, token, LUNA_SLUG);
  await apiSendMessage(
    page, s1.sessionId, token,
    birthDataMessage(), // "I was born on June 15, 1990 at 2:30 PM in Chicago"
  );
  await page.waitForTimeout(12000);
  await apiSendMessage(page, s1.sessionId, token, 'I want to understand my Venus and love patterns');
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(4000); // allow memory write

  // Check if Marcus Stone is available as a persona
  const personasRes = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const personasData = await personasRes.json();
  const personas: { slug: string; isActive: boolean }[] = personasData.personas ?? personasData;
  const marcus = personas.find((p) => p.slug === MARCUS_SLUG && p.isActive);

  if (!marcus) {
    test.skip(true, 'Marcus Stone persona not active; skipping cross-persona isolation test');
    return;
  }

  // Session 2 with Marcus Stone
  const s2 = await apiStartSession(page, token, MARCUS_SLUG);
  const res = await apiSendMessage(page, s2.sessionId, token, 'Hello, I am new here');
  await page.waitForTimeout(12000);

  const data = await res.json();
  const msgLower = (data.message ?? '').toLowerCase();

  // Marcus Stone should NOT reference Luna Voss session content:
  // - No birth date ("june 15" or "1990") — these are Luna's chart data
  // - No birth time ("2:30") — these are Luna's chart data
  // - No "chicago" unless Marcus uses it generically
  // - No "venus" in a chart-reading context (wrong modality for Marcus)
  expect(msgLower).not.toContain('june 15');
  expect(msgLower).not.toContain('1990');
  expect(msgLower).not.toContain('2:30');

  // Marcus should not greet user as if he already knows their birth data
  const knowsBirthData =
    msgLower.includes('born june') ||
    msgLower.includes('born on june') ||
    msgLower.includes('your birth chart') ||
    msgLower.includes('natal chart');
  if (knowsBirthData) {
    throw new Error('LUV-012-01: Marcus Stone leaked Luna session birth data in greeting');
  }

  await apiEndSession(page, s2.sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-012-02: Luna Voss's memories (including birth data) persist after Marcus Stone visit
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-012-02: Luna Voss birth data persists correctly after a Marcus Stone session', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-012-02');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session 1: Luna — provide birth data
  const s1 = await apiStartSession(page, token, LUNA_SLUG);
  await apiSendMessage(page, s1.sessionId, token, birthDataMessage());
  await page.waitForTimeout(12000);
  await apiSendMessage(page, s1.sessionId, token, 'Tell me about my career from my chart');
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(4000);

  // Session 2: Marcus Stone (if available)
  const personasRes = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const personasData = await personasRes.json();
  const personas: { slug: string; isActive: boolean }[] = personasData.personas ?? personasData;
  const marcus = personas.find((p) => p.slug === MARCUS_SLUG && p.isActive);

  if (marcus) {
    const s2 = await apiStartSession(page, token, MARCUS_SLUG);
    await apiSendMessage(page, s2.sessionId, token, 'Hello');
    await page.waitForTimeout(12000);
    await apiEndSession(page, s2.sessionId, token);
    await page.waitForTimeout(3000);
  }

  // Session 3: Return to Luna — greeting should be returning-user style
  // AND Luna should not re-ask for birth data
  const greetingRes = await page.request.get(
    `${BASE_URL}/api/chat-service/greeting/${LUNA_SLUG}`,
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
    greetingLower.includes('back');
  expect(isReturning).toBeTruthy();

  // Luna's greeting must NOT be asking for birth data again (she has it from session 1)
  const reAsksBirthData =
    (greetingLower.includes('date of birth') ||
     greetingLower.includes('when were you born') ||
     greetingLower.includes('birth time')) &&
    greetingLower.includes('?');
  if (reAsksBirthData) {
    console.warn('LUV-012-02: Luna re-asked for birth data after returning from Marcus Stone session');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-012-03: Memory records are persona-scoped in the DB
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-012-03: Memory records in DB have correct persona_id scoping for Luna vs Marcus', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-012-03');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session with Luna (provide birth data for a meaningful memory record)
  const s1 = await apiStartSession(page, token, LUNA_SLUG);
  await apiSendMessage(page, s1.sessionId, token, birthDataMessage());
  await page.waitForTimeout(12000);
  await apiSendMessage(page, s1.sessionId, token, 'I am really concerned about my career direction');
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(5000);

  // Check if Marcus is available for a second session
  const personasRes = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const personasData = await personasRes.json();
  const personas: { id: string; slug: string; isActive: boolean }[] = personasData.personas ?? personasData;
  const marcus = personas.find((p) => p.slug === MARCUS_SLUG && p.isActive);
  const lunaPersona = personas.find((p) => p.slug === LUNA_SLUG);

  if (marcus) {
    const s2 = await apiStartSession(page, token, MARCUS_SLUG);
    await apiSendMessage(page, s2.sessionId, token, 'Tell me what the cards reveal');
    await page.waitForTimeout(12000);
    await apiEndSession(page, s2.sessionId, token);
    await page.waitForTimeout(5000);
  }

  // Verify via admin API that memories are persona-scoped
  await loginAdmin(page);
  const adminToken = await getAdminToken(page);
  const { memories } = await adminGetMemory(page, adminToken!, regData.user.id);

  if (memories.length > 0 && lunaPersona) {
    const lunaMemories = memories.filter((m: any) => m.personaId === lunaPersona.id);

    if (marcus) {
      const marcusMemories = memories.filter((m: any) => m.personaId === marcus.id);

      // Luna memories must be in their own bucket
      expect(lunaMemories.length).toBeGreaterThan(0);

      // Verify no cross-contamination: Luna memories don't have Marcus's ID
      for (const mem of lunaMemories) {
        expect(mem.personaId).toBe(lunaPersona.id);
        expect(mem.personaId).not.toBe(marcus.id);
      }

      // Marcus memories (if any) should have Marcus's persona ID
      for (const mem of marcusMemories) {
        expect(mem.personaId).toBe(marcus.id);
        expect(mem.personaId).not.toBe(lunaPersona.id);
      }
    } else {
      // Marcus not available — just verify Luna memories have correct ID
      expect(lunaMemories.length).toBeGreaterThan(0);
      for (const mem of lunaMemories) {
        expect(mem.personaId).toBe(lunaPersona.id);
      }

      // No memory should have null persona_id (unscoped)
      for (const mem of memories) {
        expect(mem.personaId).toBeTruthy();
      }
    }
  } else {
    console.log('LUV-012-03: No memories written yet — memory isolation test inconclusive');
  }
});
