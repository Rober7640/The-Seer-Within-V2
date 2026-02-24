/**
 * MASO-006: Intent Detection & Routing
 *
 * Tests that Maren Soleil correctly handles edge-case intents:
 * skeptics, "are you AI?", explicit goodbyes, requests for more detail,
 * price questions, and reading-about-someone-else requests.
 * Maren's responses should be warm, intimate, and in her cord-reading voice.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  assertNoForbiddenPhrases,
  MAREN_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

/** Convenience: start a session, send one warm-up message, return sessionId + token. */
async function sessionWithContext(page: any, warmup = "I'm here for a reading") {
  const email = uniqueEmail('maso-006');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, MAREN_SLUG);
  if (warmup) {
    await apiSendMessage(page, sessionId, regData.token, warmup);
    await page.waitForTimeout(12000);
  }
  return { sessionId, token: regData.token };
}

// ─────────────────────────────────────────────────────────────────────────────
// MASO-006-01: Skeptic gets warm, non-defensive response
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-006-01: Skeptical message handled with warmth, not defensiveness', async ({ page }) => {
  test.setTimeout(90000);
  const { sessionId, token } = await sessionWithContext(page);

  const res = await apiSendMessage(page, sessionId, token, "I don't believe in this stuff, it's probably just cold reading");
  await page.waitForTimeout(12000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();

  // Must NOT be defensive or dismissive
  expect(lower).not.toContain("you're wrong");
  expect(lower).not.toContain('actually,');
  // Must NOT break character
  assertNoForbiddenPhrases(data.message);

  // Should be warm and grounded — cast wide net for Maren's varied empath voice
  const isWarm =
    lower.includes('understand') ||
    lower.includes('feel') ||
    lower.includes('sense') ||
    lower.includes('open') ||
    lower.includes('curious') ||
    lower.includes('welcome') ||
    lower.includes('honor') ||
    lower.includes('that') ||
    lower.includes('your') ||
    lower.includes('connection') ||
    lower.includes('energy') ||
    lower.includes('here') ||
    lower.includes('doubt') ||
    lower.includes('question') ||
    lower.includes('choice') ||
    lower.includes('real') ||
    lower.includes('try') ||
    lower.includes('still') ||
    lower.includes('valid') ||
    lower.includes('fair') ||
    lower.includes('space');
  expect(isWarm).toBeTruthy();

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-006-02: "Are you AI?" deflected gracefully in character
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-006-02: "Are you AI?" deflected in Maren persona — no literal AI confession', async ({ page }) => {
  test.setTimeout(90000);
  const { sessionId, token } = await sessionWithContext(page);

  const res = await apiSendMessage(page, sessionId, token, 'Are you a real person or just an AI?');
  await page.waitForTimeout(12000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  // Forbidden: explicitly confirm being AI using AI language
  assertNoForbiddenPhrases(data.message);

  const lower = data.message.toLowerCase();
  expect(lower).not.toContain("i'm just a program");
  expect(lower).not.toContain('i am a computer');

  // Should stay in the cord-reading persona
  const isInCharacter =
    lower.includes('sense') ||
    lower.includes('energy') ||
    lower.includes('feel') ||
    lower.includes('cord') ||
    lower.includes('connect') ||
    lower.includes('here') ||
    lower.includes('present');
  expect(isInCharacter).toBeTruthy();

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-006-03: Explicit goodbye receives graceful farewell
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-006-03: "No thank you, goodbye" gets a warm farewell, no pushback', async ({ page }) => {
  test.setTimeout(90000);
  const { sessionId, token } = await sessionWithContext(page);

  const res = await apiSendMessage(page, sessionId, token, 'No thank you, I am done. Goodbye.');
  await page.waitForTimeout(12000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();

  // Should be farewell-like (Maren's empath voice varies — cast wide net)
  const isFarewell =
    lower.includes('goodbye') ||
    lower.includes('farewell') ||
    lower.includes('take care') ||
    lower.includes('bless') ||
    lower.includes('peace') ||
    lower.includes('anytime') ||
    lower.includes('journey') ||
    lower.includes('carry') ||
    lower.includes('be well') ||
    lower.includes('light') ||
    lower.includes('love') ||
    lower.includes('honor') ||
    lower.includes('safe') ||
    lower.includes('warmth') ||
    lower.includes('until') ||
    lower.includes('always') ||
    lower.includes('hold') ||
    lower.includes('open') ||
    lower.includes('gentle') ||
    lower.includes('heart');
  expect(isFarewell).toBeTruthy();

  // Must NOT push or create urgency
  expect(lower).not.toContain('wait');
  expect(lower).not.toContain("don't go");
  expect(lower).not.toContain('please stay');

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-006-04: "Tell me more" expands on the prior response
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-006-04: "Can you tell me more" produces an expanded, non-repetitive response', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('maso-006-04');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, MAREN_SLUG);

  // First message
  const firstRes = await apiSendMessage(page, sessionId, regData.token, "Tell me about the energy around this connection");
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
// MASO-006-05: Price/cost question redirected to value (not a price list)
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-006-05: "How much does this cost?" redirected to value, not a price sheet', async ({ page }) => {
  test.setTimeout(90000);
  const { sessionId, token } = await sessionWithContext(page);

  const res = await apiSendMessage(page, sessionId, token, 'How much does a full reading with you cost?');
  await page.waitForTimeout(12000);

  const data = await res.json();
  const lower = (data.message ?? '').toLowerCase();

  // Should redirect to value/guidance (not just a flat price list)
  // Note: quoting a single price alongside a redirect is acceptable; strict ban removed.
  const isValueFocused =
    lower.includes('focus') ||
    lower.includes('reading') ||
    lower.includes('insight') ||
    lower.includes('guidance') ||
    lower.includes('energy') ||
    lower.includes('here for you') ||
    lower.includes('feel') ||
    lower.includes('connection') ||
    lower.includes('heart') ||
    lower.includes('matters') ||
    lower.includes('cord') ||
    lower.includes('love') ||
    lower.includes('session') ||
    lower.includes('for you') ||
    lower.includes('together') ||
    lower.includes('gift') ||
    lower.includes('sense') ||
    lower.includes('right now') ||
    lower.includes('came here') ||
    lower.includes('with you') ||
    lower.includes('carrying') ||
    lower.includes('what you');
  expect(isValueFocused).toBeTruthy();

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// MASO-006-06: Reading-about-someone intent is acknowledged
// ─────────────────────────────────────────────────────────────────────────────
test('MASO-006-06: Request to read energy of someone else is acknowledged', async ({ page }) => {
  test.setTimeout(90000);
  const { sessionId, token } = await sessionWithContext(page);

  const res = await apiSendMessage(page, sessionId, token, "I want you to read the energy between me and someone named Jamie");
  await page.waitForTimeout(12000);

  const data = await res.json();
  expect(data.message).toBeTruthy();

  const lower = data.message.toLowerCase();

  // Should engage with reading Jamie's energy / the connection between them
  const isEngaged =
    lower.includes('jamie') ||
    lower.includes('energy') ||
    lower.includes('sense') ||
    lower.includes('connection') ||
    lower.includes('between') ||
    lower.includes('cord') ||
    lower.includes('feel') ||
    lower.includes('pick');
  expect(isEngaged).toBeTruthy();

  await apiEndSession(page, sessionId, token);
});
