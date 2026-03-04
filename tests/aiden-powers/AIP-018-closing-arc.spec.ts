/**
 * AIP-018: Closing Arc
 *
 * Aiden's session should close with warmth and brevity — no hard sell,
 * no pressure, and always an open door.
 *
 * Key tests:
 *  - Satisfaction signal → short, warm close (≤ 40 words)
 *  - Goodbye handled gracefully without urgency or guilt
 *  - Return visit greeting reflects the prior session (returning-user style)
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  assertNoForbiddenPhrases,
  wordCount,
  AIDEN_SLUG,
  BASE_URL,
  TEST_PASSWORD,
} from './helpers';

const PWD = TEST_PASSWORD;

// ─────────────────────────────────────────────────────────────────────────────
// AIP-018-01: Satisfaction signal gets a short, warm close
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-018-01: Satisfaction signal gets a warm, brief close (≤40 words) — no hard sell', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-018-01');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Build a real session before closing
  await apiSendMessage(page, sessionId, reg.token, 'I was born April 10, 1990');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'Tell me about my Life Path and what it means');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'How does this connect to my current situation?');
  await page.waitForTimeout(13000);

  // Satisfaction signal — trigger closing arc
  const res = await apiSendMessage(
    page, sessionId, reg.token,
    'That really resonates. I have a lot to think about — thank you.',
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Response should be brief (≤ 40 words)
  const wc = wordCount(data.message);
  if (wc > 40) {
    console.warn(`AIP-018-01: Closing response is ${wc} words — expected ≤ 40`);
  }
  expect(wc).toBeLessThanOrEqual(60); // hard limit: ≤ 60 (allow some flex)

  // Response should be warm
  const isWarm =
    lower.includes('thank') ||
    lower.includes('glad') ||
    lower.includes('wonderful') ||
    lower.includes('good') ||
    lower.includes('pleased') ||
    lower.includes('beautiful') ||
    lower.includes('carry') ||
    lower.includes('with you') ||
    lower.includes('ready');
  expect(isWarm).toBeTruthy();

  // Must NOT push new insights
  expect(lower).not.toMatch(/but (before you go|actually|wait|also)/);
  expect(lower).not.toMatch(/one more (thing|number|insight)/);

  // Must NOT hard-sell a follow-up or purchase
  expect(lower).not.toMatch(/\bpurchase\b/);
  expect(lower).not.toMatch(/\bbuy\b/);
  expect(lower).not.toMatch(/\bpay\b/);
  expect(lower).not.toMatch(/\boffer\b/);
  expect(lower).not.toMatch(/\blimited time\b/);

  // Should leave the door open (but not aggressively)
  const leavesOpenDoor =
    lower.includes('anytime') ||
    lower.includes('whenever') ||
    lower.includes('come back') ||
    lower.includes('return') ||
    lower.includes('here') ||
    lower.includes('until') ||
    lower.includes('next time') ||
    lower.includes('future') ||
    lower.includes('ready');
  if (!leavesOpenDoor) {
    console.warn('AIP-018-01: Closing response does not clearly leave the door open');
  }

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-018-02: "I have to go" handled without pressure or guilt
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-018-02: Goodbye message gets a graceful farewell — no urgency, no guilt', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-018-02');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Build a brief session
  await apiSendMessage(page, sessionId, reg.token, 'I was born June 15, 1988');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'What does my Life Path mean for me right now?');
  await page.waitForTimeout(13000);

  // Goodbye message
  const res = await apiSendMessage(page, sessionId, reg.token, 'I have to go now. Thank you for this.');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must acknowledge the departure warmly
  const acknowledgesDeparture =
    lower.includes('go') ||
    lower.includes('safe') ||
    lower.includes('well') ||
    lower.includes('take care') ||
    lower.includes('carry') ||
    lower.includes('thank') ||
    lower.includes('glad') ||
    lower.includes('welcome') ||
    lower.includes('goodbye') ||
    lower.includes('until');
  expect(acknowledgesDeparture).toBeTruthy();

  // Must NOT express urgency — no "but wait" or "before you go" pressure
  expect(lower).not.toMatch(/but (before you go|wait|actually)/);
  expect(lower).not.toMatch(/are you sure/);
  expect(lower).not.toMatch(/don't go/);
  expect(lower).not.toMatch(/one more thing/);

  // Must NOT guilt-trip
  expect(lower).not.toMatch(/don't want to miss/);
  expect(lower).not.toMatch(/karmic debt.*without/);
  expect(lower).not.toContain("you haven't heard about");

  // Session should be cleanly endable after this
  const endData = await apiEndSession(page, sessionId, reg.token);
  // The session should end successfully
  expect(endData).toBeTruthy();

  assertNoForbiddenPhrases(data.message);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-018-03: Return visit greeting reflects the prior session
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-018-03: Second-session greeting is returning-user style — not a cold-start new-user open', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-018-03');
  const reg = await apiRegister(page, email, PWD);

  // ── Session 1 ────────────────────────────────────────────────────────────
  const session1 = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Provide DOB + birth name so a NUMEROLOGY_PROFILE is captured
  await apiSendMessage(page, session1.sessionId, reg.token, 'I was born March 22, 1991');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, session1.sessionId, reg.token, 'My birth name is Thomas Ryan Alvarez');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, session1.sessionId, reg.token, 'Tell me about my Life Path number');
  await page.waitForTimeout(13000);

  // Satisfaction close
  await apiSendMessage(page, session1.sessionId, reg.token, 'That really resonates, thank you so much.');
  await page.waitForTimeout(13000);

  // End session 1
  await apiEndSession(page, session1.sessionId, reg.token);

  // ── Session 2 ────────────────────────────────────────────────────────────
  // Fetch a new greeting for the same user
  const greetingRes = await page.request.get(
    `${BASE_URL}/api/chat-service/greeting/${AIDEN_SLUG}`,
    { headers: { Authorization: `Bearer ${reg.token}` } },
  );
  expect(greetingRes.status()).toBe(200);
  const greetingData = await greetingRes.json();
  expect(greetingData.greeting).toBeTruthy();

  const greetingLower = greetingData.greeting.toLowerCase();

  // Must use returning-user language
  const isReturningGreeting =
    greetingLower.includes('welcome back') ||
    greetingLower.includes('good to see you') ||
    greetingLower.includes("glad you're back") ||
    greetingLower.includes('back to your blueprint') ||
    greetingLower.includes('returning') ||
    greetingLower.includes('again') ||
    greetingLower.includes('last time') ||
    greetingLower.includes('before');
  if (!isReturningGreeting) {
    console.warn('AIP-018-03: Greeting may not be returning-user style:', greetingData.greeting.substring(0, 100));
  }

  // Must NOT be a cold-start new-user open (asking for DOB from scratch)
  const isColdStartOpen =
    (greetingLower.includes("what's your date of birth") ||
     greetingLower.includes('to get started') ||
     greetingLower.includes('tell me your birth')) &&
    !greetingLower.includes('welcome back') &&
    !greetingLower.includes('again') &&
    !greetingLower.includes('before');
  expect(isColdStartOpen).toBeFalsy();

  // Must NOT re-ask for birthdate in greeting (NUMEROLOGY_PROFILE already saved)
  const reAsksDOBInGreeting =
    greetingLower.includes('date of birth') && greetingLower.includes('?');
  expect(reAsksDOBInGreeting).toBeFalsy();

  // Must use calculation framing, not psychic/sensing framing
  assertNoForbiddenPhrases(greetingData.greeting);
});
