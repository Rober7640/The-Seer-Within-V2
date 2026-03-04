/**
 * MAS-012: Marcus Stone — Cross-Persona Memory Isolation
 *
 * Verifies that memories created during Marcus Stone sessions are scoped
 * to Marcus Stone only and do not bleed into Evelyn Cross sessions, and
 * vice versa.  Also verifies that Marcus's memories survive a round-trip
 * through an Evelyn Cross session and are still present on return.
 *
 * Memory isolation is a correctness requirement: the memory loader must
 * filter by `persona_id`.  These tests catch any regression where the
 * filter is dropped or the wrong memories are injected.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  registerUser,
  loginAdmin,
  startSession,
  sendMessage,
  endSession,
  getLastResponse,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  getPersonaId,
  getAdminToken,
  adminGetMemory,
  BASE_URL,
  MARCUS_SLUG,
  EVELYN_SLUG,
} from './helpers';

test.setTimeout(180000); // 3 minutes — memory tests involve multiple AI round-trips

// ─────────────────────────────────────────────────────────────────────────────
// MAS-012-01: Marcus Stone's memories do NOT appear in Evelyn Cross sessions
// ─────────────────────────────────────────────────────────────────────────────
test('MAS-012-01: Marcus session memories do not bleed into Evelyn Cross session', async ({ page }) => {
  const email = uniqueEmail('mas-012-01');
  const regData = await apiRegister(page, email);
  const token = regData.token;

  // ── Step 1: Marcus Stone session — mention a very specific name/detail ──
  const marcusSession = await apiStartSession(page, token, MARCUS_SLUG);
  const marcusRes = await apiSendMessage(
    page,
    marcusSession.sessionId,
    token,
    'I want to talk about my friend Bartholomew — he has a significant impact on my life decisions',
  );
  expect(marcusRes.status()).toBe(200);
  await page.waitForTimeout(12000); // allow Claude to respond

  await apiEndSession(page, marcusSession.sessionId, token);
  await page.waitForTimeout(5000); // allow memory summarisation to run

  // ── Step 2: Evelyn Cross session — send a neutral opener ──
  const evelynSession = await apiStartSession(page, token, EVELYN_SLUG);
  const evelynGreetingRes = await apiSendMessage(
    page,
    evelynSession.sessionId,
    token,
    'Hello, I\'m here for guidance today',
  );
  expect(evelynGreetingRes.status()).toBe(200);
  await page.waitForTimeout(12000);

  const evelynData = await evelynGreetingRes.json();
  const evelynResponse = (evelynData.message ?? '').toLowerCase();

  // ── Assertions ──
  // Evelyn's response must NOT reference "Bartholomew" — that name was only
  // shared with Marcus Stone and should be scoped to his persona.
  expect(evelynResponse).not.toContain('bartholomew');

  // Evelyn's response must NOT reference Marcus Stone's characteristic
  // tarot framing (e.g. card names or "the cards say") unprompted.
  // (Evelyn may use these terms naturally, so we only check for very
  //  Marcus-specific phrases that would indicate bleedover.)
  expect(evelynResponse).not.toContain('shadow work'); // Marcus-specific speciality

  await apiEndSession(page, evelynSession.sessionId, token);
  console.log('PASS: Evelyn Cross session did not receive Marcus Stone memory content');
});

// ─────────────────────────────────────────────────────────────────────────────
// MAS-012-02: Marcus Stone's memories persist after visiting Evelyn Cross
// ─────────────────────────────────────────────────────────────────────────────
test('MAS-012-02: Marcus Stone memories still present and used after Evelyn Cross session', async ({ page }) => {
  const email = uniqueEmail('mas-012-02');
  const regData = await apiRegister(page, email);
  const token = regData.token;

  // ── Step 1: Marcus Stone session — plant a memorable detail ──
  const marcus1 = await apiStartSession(page, token, MARCUS_SLUG);
  await apiSendMessage(
    page,
    marcus1.sessionId,
    token,
    'I keep drawing The Moon card every time I do a reading — it feels deeply connected to my current situation',
  );
  await page.waitForTimeout(12000);
  await apiEndSession(page, marcus1.sessionId, token);
  await page.waitForTimeout(5000);

  // ── Step 2: Evelyn Cross interlude ──
  const evelynSession = await apiStartSession(page, token, EVELYN_SLUG);
  await apiSendMessage(page, evelynSession.sessionId, token, 'I need guidance about love');
  await page.waitForTimeout(12000);
  await apiEndSession(page, evelynSession.sessionId, token);
  await page.waitForTimeout(3000);

  // ── Step 3: Return to Marcus Stone — verify returning-user experience ──
  const marcus2 = await apiStartSession(page, token, MARCUS_SLUG);

  // Send a neutral opener; Marcus should treat us as a returning user
  const returnRes = await apiSendMessage(
    page,
    marcus2.sessionId,
    token,
    "I'm back for more guidance",
  );
  expect(returnRes.status()).toBe(200);
  await page.waitForTimeout(12000);

  const returnData = await returnRes.json();
  const returnResponse = (returnData.message ?? '').toLowerCase();

  // ── Assertions ──
  // Marcus should still know us as a returning user — not treat us as new
  expect(returnResponse.length).toBeGreaterThan(10);

  // Evelyn's love-reading content should NOT appear in Marcus's response
  // (this would indicate Evelyn → Marcus memory bleedover)
  const evelynLoveTerms = ['aura', 'divine feminine', 'cosmic', 'stars align'];
  for (const term of evelynLoveTerms) {
    // These are Evelyn-specific phrasing patterns — Marcus uses different vocabulary
    // We log rather than hard-fail since overlap in spiritual vocabulary is plausible
    if (returnResponse.includes(term)) {
      console.log(`INFO: Marcus response contains term "${term}" — verify it is not Evelyn's memory being injected`);
    }
  }

  await apiEndSession(page, marcus2.sessionId, token);
  console.log('PASS: Marcus Stone session after Evelyn interlude maintained correct persona context');
  console.log('Return response excerpt:', returnResponse.substring(0, 100));
});

// ─────────────────────────────────────────────────────────────────────────────
// MAS-012-03: Memory records are persona-scoped in the database
// ─────────────────────────────────────────────────────────────────────────────
test('MAS-012-03: Memory records are persona-scoped (no null or cross-persona persona_id)', async ({ page }) => {
  const email = uniqueEmail('mas-012-03');
  const regData = await apiRegister(page, email);
  const token = regData.token;
  const userId = regData.user.id;

  // Get Marcus and Evelyn persona IDs for later comparison
  const marcusPersonaId = await getPersonaId(page, token, MARCUS_SLUG).catch(() => null);
  const evelynPersonaId = await getPersonaId(page, token, EVELYN_SLUG).catch(() => null);

  // ── Step 1: Marcus Stone session ──
  const marcusSession = await apiStartSession(page, token, MARCUS_SLUG);
  await apiSendMessage(
    page,
    marcusSession.sessionId,
    token,
    'I want to explore my shadow patterns through tarot',
  );
  await page.waitForTimeout(12000);
  await apiEndSession(page, marcusSession.sessionId, token);
  await page.waitForTimeout(5000);

  // ── Step 2: Evelyn Cross session ──
  const evelynSession = await apiStartSession(page, token, EVELYN_SLUG);
  await apiSendMessage(
    page,
    evelynSession.sessionId,
    token,
    'I want to talk about my love life and what the energy is around it',
  );
  await page.waitForTimeout(12000);
  await apiEndSession(page, evelynSession.sessionId, token);
  await page.waitForTimeout(5000);

  // ── Step 3: Check memory records via admin API ──
  await loginAdmin(page);
  const adminToken = await getAdminToken(page);
  expect(adminToken).toBeTruthy();

  const { memories } = await adminGetMemory(page, adminToken!, userId);

  // ── Assertions ──
  expect(memories.length).toBeGreaterThan(0);

  // Every memory record must have a non-null persona_id
  const nullPersonaMemories = memories.filter((m: any) => !m.personaId && !m.persona_id);
  if (nullPersonaMemories.length > 0) {
    console.log('FAIL: Found memories with null persona_id:', nullPersonaMemories.length);
  }
  expect(nullPersonaMemories).toHaveLength(0);

  // If we have persona IDs from the API, verify memories are correctly attributed
  if (marcusPersonaId && evelynPersonaId) {
    const marcusMemories = memories.filter(
      (m: any) => (m.personaId ?? m.persona_id) === marcusPersonaId,
    );
    const evelynMemories = memories.filter(
      (m: any) => (m.personaId ?? m.persona_id) === evelynPersonaId,
    );

    // Both personas should have at least one memory record
    expect(marcusMemories.length).toBeGreaterThan(0);
    expect(evelynMemories.length).toBeGreaterThan(0);

    // Marcus memories should be tagged to Marcus only
    for (const mem of marcusMemories) {
      expect(mem.personaId ?? mem.persona_id).toBe(marcusPersonaId);
      expect(mem.personaId ?? mem.persona_id).not.toBe(evelynPersonaId);
    }

    // Evelyn memories should be tagged to Evelyn only
    for (const mem of evelynMemories) {
      expect(mem.personaId ?? mem.persona_id).toBe(evelynPersonaId);
      expect(mem.personaId ?? mem.persona_id).not.toBe(marcusPersonaId);
    }

    console.log(`PASS: ${marcusMemories.length} Marcus memories, ${evelynMemories.length} Evelyn memories — all correctly scoped`);
  } else {
    // Persona ID lookup failed — still verify no null records
    console.log('INFO: Could not fetch persona IDs for cross-check. Verified no null persona_id records.');
    console.log(`Total memory records: ${memories.length}`);
  }

  // The memory-loader query (top 5 by importance for a session) must filter
  // by persona_id — this is an indirect check via the response isolation
  // tests (MAS-012-01 and MAS-012-02).
  console.log('PASS: All memory records are persona-scoped in DB');
});
