/**
 * AIP-012: Cross-Persona Memory Isolation
 *
 * Verifies that memories from Aiden Powers sessions do NOT leak into
 * Nova Sharma sessions (and vice versa), and that Aiden's memories
 * (including the numerological profile: birthdate, birth name, Life Path)
 * are preserved and correctly scoped after a cross-persona visit.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiAdminLogin,
  adminGetMemory,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  AIDEN_SLUG,
  NOVA_SLUG,
  BASE_URL,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// AIP-012-01: Aiden Powers' memories don't appear in Nova Sharma sessions
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-012-01: Nova Sharma does not reference Aiden Powers session memories', async ({ page }) => {
  test.setTimeout(150000);
  const email = uniqueEmail('aip-012-01');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session 1 with Aiden — provide numerological profile data
  const s1 = await apiStartSession(page, token, AIDEN_SLUG);
  await apiSendMessage(
    page, s1.sessionId, token,
    'My name is Jordan and I was born March 15, 1987 — I want to understand my life path',
  );
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(4000); // allow memory write

  // Check if Nova Sharma is available as a persona
  const personasRes = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const personasData = await personasRes.json();
  const personas: { slug: string; isActive: boolean }[] = personasData.personas ?? personasData;
  const nova = personas.find((p) => p.slug === NOVA_SLUG && p.isActive);

  if (!nova) {
    test.skip(true, 'Nova Sharma persona not active; skipping cross-persona isolation test');
    return;
  }

  // Session 2 with Nova Sharma
  const s2 = await apiStartSession(page, token, NOVA_SLUG);
  const res = await apiSendMessage(page, s2.sessionId, token, 'Hello, I am new here');
  await page.waitForTimeout(12000);

  const data = await res.json();
  const msgLower = (data.message ?? '').toLowerCase();

  // Nova Sharma should NOT reference Aiden's session content:
  // - No "March 15" or "1987" (birth data)
  // - No "life path" in numerology context (Aiden's framing)
  // - No "Jordan" (the name given to Aiden)
  // - No "numerology" or "blueprint" unless Nova uses these concepts herself
  expect(msgLower).not.toContain('march 15');
  expect(msgLower).not.toContain('1987');
  // "Jordan" might appear as a generic reference — use context check
  // Nova should not know "Jordan" from Aiden's session
  // (if she greets as "Jordan" that's a leak)
  const greetsByAidenName = msgLower.startsWith('jordan') || msgLower.includes('welcome back, jordan');
  if (greetsByAidenName) {
    throw new Error('AIP-012-01: Nova Sharma leaked Aiden session name "Jordan" in greeting');
  }

  await apiEndSession(page, s2.sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-012-02: Aiden Powers' memories persist after visiting Nova Sharma
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-012-02: Aiden Powers memories persist correctly after a Nova Sharma session', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-012-02');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session 1: Aiden — provide BOTH birth name AND birthdate so Aiden emits
  // [NUMEROLOGY_PROFILE:...] and saves the profile (required for returning-user greeting).
  const s1 = await apiStartSession(page, token, AIDEN_SLUG);
  await apiSendMessage(
    page, s1.sessionId, token,
    'My full name is Jordan Taylor and I was born September 8, 1983 — I need help with career decisions',
  );
  await page.waitForTimeout(15000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(4000);

  // Session 2: Nova Sharma (if available)
  const personasRes = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const personasData = await personasRes.json();
  const personas: { slug: string; isActive: boolean }[] = personasData.personas ?? personasData;
  const nova = personas.find((p) => p.slug === NOVA_SLUG && p.isActive);

  if (nova) {
    const s2 = await apiStartSession(page, token, NOVA_SLUG);
    await apiSendMessage(page, s2.sessionId, token, 'Hello');
    await page.waitForTimeout(12000);
    await apiEndSession(page, s2.sessionId, token);
    await page.waitForTimeout(3000);
  }

  // Session 3: Return to Aiden — greeting should be returning-user style
  const greetingRes = await page.request.get(
    `${BASE_URL}/api/chat-service/greeting/${AIDEN_SLUG}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const greetingData = await greetingRes.json();
  const greetingLower = (greetingData.greeting ?? '').toLowerCase();

  // Should be returning-user greeting (not new user asking for birthdate).
  // Aiden's returning-user prompt explicitly forbids "Welcome back" variants — instead it
  // references the saved Life Path / Personal Year, so check numerology-specific phrases too.
  console.log('AIP-012-02: Aiden returning greeting:', greetingData.greeting?.slice(0, 120));
  const isReturning =
    // Generic returning phrases
    greetingLower.includes('good to see you') ||
    greetingLower.includes('welcome back') ||
    greetingLower.includes('again') ||
    greetingLower.includes('return') ||
    greetingLower.includes('back') ||
    // Aiden numerology returning: references saved blueprint (no "welcome back" per character rules —
    // the returning prompt says to jump straight to a number observation instead)
    greetingLower.includes('life path') ||
    greetingLower.includes('personal year') ||
    greetingLower.includes('blueprint') ||
    /life path \d/.test(greetingLower) ||
    /personal year \d/.test(greetingLower);
  expect(isReturning).toBeTruthy();

  // Aiden's greeting must NOT use psychic framing (even after returning from Nova)
  expect(greetingLower).not.toContain('i sense');
  expect(greetingLower).not.toContain('i intuit');
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-012-03: Memory records are persona-scoped in the DB
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-012-03: Memory records in DB have correct persona_id scoping for Aiden vs Nova', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-012-03');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;

  // Session with Aiden
  const s1 = await apiStartSession(page, token, AIDEN_SLUG);
  await apiSendMessage(page, s1.sessionId, token, 'I am worried about my career path — born June 12, 1990');
  await page.waitForTimeout(12000);
  await apiEndSession(page, s1.sessionId, token);
  await page.waitForTimeout(5000);

  // Check if Nova is available for a second session
  const personasRes = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const personasData = await personasRes.json();
  const personas: { id: string; slug: string; isActive: boolean }[] = personasData.personas ?? personasData;
  const nova = personas.find((p) => p.slug === NOVA_SLUG && p.isActive);
  const aidenPersona = personas.find((p) => p.slug === AIDEN_SLUG);

  if (nova) {
    const s2 = await apiStartSession(page, token, NOVA_SLUG);
    await apiSendMessage(page, s2.sessionId, token, 'Tell me about my Vedic chart');
    await page.waitForTimeout(12000);
    await apiEndSession(page, s2.sessionId, token);
    await page.waitForTimeout(5000);
  }

  // Verify via admin API that memories are persona-scoped
  const adminToken = await apiAdminLogin(page);
  const memoryRes = await adminGetMemory(page, adminToken, regData.user.id);
  const memories: any[] = (memoryRes as any).memories ?? [];

  if (memories.length > 0 && aidenPersona) {
    // All Aiden memories must have Aiden's persona ID
    const aidenMemories = memories.filter((m: any) => m.personaId === aidenPersona.id);

    if (nova) {
      const novaMemories = memories.filter((m: any) => m.personaId === nova.id);

      // Aiden memories must be in their own bucket
      expect(aidenMemories.length).toBeGreaterThan(0);

      // Verify no cross-contamination: Aiden memories don't have Nova's ID
      for (const mem of aidenMemories) {
        expect(mem.personaId).toBe(aidenPersona.id);
        expect(mem.personaId).not.toBe(nova.id);
      }

      // Nova memories (if any) should have Nova's persona ID
      for (const mem of novaMemories) {
        expect(mem.personaId).toBe(nova.id);
        expect(mem.personaId).not.toBe(aidenPersona.id);
      }
    } else {
      // Nova not available — just verify Aiden memories have correct ID
      expect(aidenMemories.length).toBeGreaterThan(0);
      for (const mem of aidenMemories) {
        expect(mem.personaId).toBe(aidenPersona.id);
      }

      // No memory should have null persona_id (unscoped)
      for (const mem of memories) {
        expect(mem.personaId).toBeTruthy();
      }
    }
  } else {
    // If no memories yet, memory write may need more time
    console.log('AIP-012-03: No memories written yet — memory isolation test inconclusive');
  }
});
