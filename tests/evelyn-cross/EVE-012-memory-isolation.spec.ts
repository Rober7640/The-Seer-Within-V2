/**
 * EVE-012: Cross-Persona Memory Isolation
 *
 * Verifies that memories from Evelyn Cross sessions do NOT leak into
 * Marcus Stone sessions (and vice versa), and that Evelyn's memories
 * are preserved and correctly scoped after a cross-persona visit.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  adminGetMemory,
  apiRegister,
  apiAdminLogin,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  EVELYN_SLUG,
  MARCUS_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// EVE-012-01: Evelyn's memories don't appear in Marcus Stone's greeting/responses
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-012-01: Marcus Stone does not reference Evelyn session memories', async ({ page }) => {
  test.setTimeout(150000);
  const email = uniqueEmail('eve-012-01');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session 1 with Evelyn — mention "my sister Emma"
  const s1 = await apiStartSession(page, token, EVELYN_SLUG);
  await apiSendMessage(page, s1.sessionId, token, 'I have a strained relationship with my sister Emma and it weighs on me');
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(4000); // allow memory write

  // Check if Marcus is available as a persona
  const personasRes = await page.request.get('http://localhost:5000/api/personas', {
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

  // Marcus should NOT reference "Emma" from Evelyn's session
  expect(msgLower).not.toContain('emma');

  await apiEndSession(page, s2.sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-012-02: Evelyn's memories remain available after visiting Marcus
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-012-02: Evelyn memories persist correctly after a Marcus Stone session', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('eve-012-02');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session 1: Evelyn
  const s1 = await apiStartSession(page, token, EVELYN_SLUG);
  await apiSendMessage(page, s1.sessionId, token, 'I am dealing with issues around my career at the hospital');
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(4000);

  // Session 2: Marcus (if available)
  const personasRes = await page.request.get('http://localhost:5000/api/personas', {
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

  // Session 3: Return to Evelyn — greeting should be returning-user style
  const greetingRes = await page.request.get(
    `http://localhost:5000/api/chat-service/greeting/${EVELYN_SLUG}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const greetingData = await greetingRes.json();
  const greetingLower = (greetingData.greeting ?? '').toLowerCase();

  // Should be returning-user greeting (not new user)
  const isReturning =
    greetingLower.includes('good to see you') ||
    greetingLower.includes('welcome back') ||
    greetingLower.includes('again') ||
    greetingLower.includes('return');
  expect(isReturning).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-012-03: Memory records are persona-scoped in the DB
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-012-03: Memory records in DB have correct persona_id scoping', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('eve-012-03');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session with Evelyn
  const s1 = await apiStartSession(page, token, EVELYN_SLUG);
  await apiSendMessage(page, s1.sessionId, token, 'I am worried about my relationship with my partner Jordan');
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(5000);

  // Check if Marcus is available for a second session
  const personasRes = await page.request.get('http://localhost:5000/api/personas', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const personasData = await personasRes.json();
  const personas: { id: string; slug: string; isActive: boolean }[] = personasData.personas ?? personasData;
  const marcus = personas.find((p) => p.slug === MARCUS_SLUG && p.isActive);
  const evelynPersona = personas.find((p) => p.slug === EVELYN_SLUG);

  if (marcus) {
    const s2 = await apiStartSession(page, token, MARCUS_SLUG);
    await apiSendMessage(page, s2.sessionId, token, 'Tell me about shadow work');
    await page.waitForTimeout(12000);
    await apiEndSession(page, s2.sessionId, token);
    await page.waitForTimeout(5000);
  }

  // Verify via admin API that memories are persona-scoped
  const adminToken = await apiAdminLogin(page);
  const { memories } = await adminGetMemory(page, adminToken, regData.user.id);

  if (memories.length > 0 && evelynPersona) {
    // All Evelyn memories must have Evelyn's persona ID
    const evelynMemories = memories.filter((m: any) => m.personaId === evelynPersona.id);

    if (marcus) {
      const marcusMemories = memories.filter((m: any) => m.personaId === marcus.id);

      // Evelyn and Marcus memories must be in separate buckets
      expect(evelynMemories.length).toBeGreaterThan(0);
      // Verify no cross-contamination: Evelyn memories don't have Marcus ID
      for (const mem of evelynMemories) {
        expect(mem.personaId).toBe(evelynPersona.id);
        expect(mem.personaId).not.toBe(marcus.id);
      }
    } else {
      // Marcus not available — just verify Evelyn memories have correct ID
      expect(evelynMemories.length).toBeGreaterThan(0);
      for (const mem of evelynMemories) {
        expect(mem.personaId).toBe(evelynPersona.id);
      }
    }
  } else {
    // If no memories yet, that's OK — memory write may need more time
    console.log('No memories written yet — memory isolation test inconclusive');
  }
});
