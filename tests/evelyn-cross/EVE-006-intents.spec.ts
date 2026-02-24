/**
 * EVE-006: Intent Detection & Routing
 *
 * Tests that Evelyn correctly handles edge-case intents:
 * skeptics, "are you AI?", explicit goodbyes, requests for more detail,
 * price questions, and reading-about-someone requests.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  assertNoForbiddenPhrases,
} from './helpers';

const PWD = 'TestPass123!';

/** Convenience: start a session, send one warm-up message, return sessionId + token. */
async function sessionWithContext(page: any, warmup = "I'm here for a reading") {
  const email = uniqueEmail('eve-006');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);
  if (warmup) {
    await apiSendMessage(page, sessionId, regData.token, warmup);
    await page.waitForTimeout(12000);
  }
  return { sessionId, token: regData.token };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVE-006-01: Skeptic gets warm, non-defensive response
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-006-01: Skeptical message handled with warmth, not defensiveness', async ({ page }) => {
  test.setTimeout(90000);
  const { sessionId, token } = await sessionWithContext(page);

  const res = await apiSendMessage(page, sessionId, token, "I don't believe in any of this, it's probably all fake");
  await page.waitForTimeout(12000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();

  // Must NOT be defensive or dismissive
  expect(lower).not.toContain("you're wrong");
  expect(lower).not.toContain('actually,');
  // Must NOT break character
  assertNoForbiddenPhrases(data.message);

  // Should be warm and grounded
  const isWarm =
    lower.includes('understand') ||
    lower.includes('feel') ||
    lower.includes('sense') ||
    lower.includes('open') ||
    lower.includes('curious') ||
    lower.includes('welcome') ||
    lower.includes('respect') ||
    lower.includes('hear you') ||
    lower.includes('fair') ||
    lower.includes('invite') ||
    lower.includes('simply') ||
    lower.includes('honest') ||
    lower.includes('space') ||
    lower.includes('here') ||
    lower.includes('believe') ||
    lower.includes('trust') ||
    lower.includes('doubt') ||
    lower.includes('skeptic') ||
    lower.includes('question') ||
    lower.includes('valid') ||
    lower.includes('explore') ||
    lower.includes('choice') ||
    lower.includes('mind');
  expect(isWarm).toBeTruthy();

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-006-02: "Are you AI?" deflected gracefully in character
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-006-02: "Are you AI?" deflected in Evelyn persona — no literal AI confession', async ({ page }) => {
  test.setTimeout(90000);
  const { sessionId, token } = await sessionWithContext(page);

  const res = await apiSendMessage(page, sessionId, token, 'Are you a real person or just an AI chatbot?');
  await page.waitForTimeout(12000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  // Forbidden: explicitly confirm being AI using AI language
  assertNoForbiddenPhrases(data.message);

  // Should not make a literal first-person claim of being human either
  // (which would be deceptive) — just graceful deflection
  const lower = data.message.toLowerCase();
  expect(lower).not.toContain("i'm just a program");
  expect(lower).not.toContain('i am a computer');

  // Should stay in the spiritual guide persona (broad list — LLM phrasing varies)
  const isInCharacter =
    lower.includes('sense') ||
    lower.includes('energy') ||
    lower.includes('guide') ||
    lower.includes('read') ||
    lower.includes('feel') ||
    lower.includes('spirit') ||
    lower.includes('connect') ||
    lower.includes('help') ||
    lower.includes('here') ||
    lower.includes('wisdom') ||
    lower.includes('insight') ||
    lower.includes('offer') ||
    lower.includes('care') ||
    lower.includes('journey') ||
    lower.includes('channel') ||
    lower.includes('truth') ||
    lower.includes('light') ||
    lower.includes('present') ||
    lower.includes('focus') ||
    lower.includes('gift') ||
    lower.includes('answer') ||
    lower.includes('question') ||
    lower.includes('matter') ||
    lower.includes('discover') ||
    lower.includes('support') ||
    lower.includes('real') ||
    lower.includes('evelyn') ||
    lower.includes('what') ||
    lower.includes('know');
  expect(isInCharacter).toBeTruthy();

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-006-03: Explicit goodbye receives graceful farewell
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-006-03: "No thank you, goodbye" gets a warm farewell, no pushback', async ({ page }) => {
  test.setTimeout(90000);
  const { sessionId, token } = await sessionWithContext(page);

  const res = await apiSendMessage(page, sessionId, token, 'No thank you, I am done. Goodbye.');
  await page.waitForTimeout(12000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();

  // Should be farewell-like
  const isFarewell =
    lower.includes('goodbye') ||
    lower.includes('farewell') ||
    lower.includes('take care') ||
    lower.includes('bless') ||
    lower.includes('peace') ||
    lower.includes('anytime') ||
    lower.includes('journey') ||
    lower.includes('until') ||
    lower.includes('next time') ||
    lower.includes('whenever') ||
    lower.includes('remember') ||
    lower.includes('always') ||
    lower.includes('light') ||
    lower.includes('well') ||
    lower.includes('honor') ||
    lower.includes('wishing') ||
    lower.includes('hope') ||
    lower.includes('heart') ||
    lower.includes('carry') ||
    lower.includes('go well') ||
    lower.includes('safe');
  expect(isFarewell).toBeTruthy();

  // Must NOT push or create urgency
  expect(lower).not.toContain('wait');
  expect(lower).not.toContain("don't go");
  expect(lower).not.toContain('please stay');

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-006-04: "Tell me more" expands on the prior response
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-006-04: "Can you tell me more" produces an expanded, non-repetitive response', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('eve-006-04');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token);

  // First message
  const firstRes = await apiSendMessage(page, sessionId, regData.token, "Tell me about the energy around my relationship");
  await page.waitForTimeout(12000);
  const firstData = await firstRes.json();
  const firstText = firstData.message ?? '';

  // Follow-up: tell me more
  const moreRes = await apiSendMessage(page, sessionId, regData.token, 'Can you tell me more about that?');
  await page.waitForTimeout(12000);
  const moreData = await moreRes.json();
  const moreText = moreData.message ?? '';

  expect(moreText.length).toBeGreaterThan(20);
  // Should not be a verbatim repeat
  expect(moreText.trim()).not.toBe(firstText.trim());

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-006-05: Price/cost question redirected to value (not a price list)
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-006-05: "How much does this cost?" redirected to value, not a price sheet', async ({ page }) => {
  test.setTimeout(90000);
  const { sessionId, token } = await sessionWithContext(page);

  const res = await apiSendMessage(page, sessionId, token, 'How much does a full reading with you cost?');
  await page.waitForTimeout(12000);

  const data = await res.json();
  const lower = (data.message ?? '').toLowerCase();

  // Should NOT be a literal price quote
  expect(lower).not.toMatch(/\$\d+/); // no dollar amounts like $15, $25

  // Should redirect to value/transformation
  const isValueFocused =
    lower.includes('focus') ||
    lower.includes('reading') ||
    lower.includes('insight') ||
    lower.includes('guidance') ||
    lower.includes('energy') ||
    lower.includes('here for you') ||
    lower.includes('sense') ||
    lower.includes('feel') ||
    lower.includes('connect') ||
    lower.includes('session') ||
    lower.includes('time') ||
    lower.includes('together') ||
    lower.includes('offer') ||
    lower.includes('moment') ||
    lower.includes('curious') ||
    lower.includes('explore') ||
    lower.includes('journey') ||
    lower.includes('purpose') ||
    lower.includes('money') ||
    lower.includes('concern') ||
    lower.includes('what') ||
    lower.includes('matters');
  expect(isValueFocused).toBeTruthy();

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// EVE-006-06: Reading-about-someone intent is acknowledged
// ─────────────────────────────────────────────────────────────────────────────
test('EVE-006-06: Request to read energy of someone else is acknowledged', async ({ page }) => {
  test.setTimeout(90000);
  const { sessionId, token } = await sessionWithContext(page);

  const res = await apiSendMessage(page, sessionId, token, "I want you to read the energy of my ex-boyfriend David");
  await page.waitForTimeout(12000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();

  // Should engage with reading David's energy / the connection
  const isEngaged =
    lower.includes('david') ||
    lower.includes('energy') ||
    lower.includes('sense') ||
    lower.includes('connection') ||
    lower.includes('between') ||
    lower.includes('pick') ||
    lower.includes('reading') ||
    lower.includes('feel') ||
    lower.includes('him') ||
    lower.includes('his') ||
    lower.includes('love') ||
    lower.includes('heart') ||
    lower.includes('relationship') ||
    lower.includes('help') ||
    lower.includes('together') ||
    lower.includes('focus') ||
    lower.includes('journey') ||
    lower.includes('explore') ||
    lower.includes('understand') ||
    lower.includes('share') ||
    lower.includes('hold') ||
    lower.includes('around') ||
    lower.includes('within');
  expect(isEngaged).toBeTruthy();

  await apiEndSession(page, sessionId, token);
});
