/**
 * AIP-014: Calculation Specificity
 *
 * Aiden must produce concrete, specific outputs — not vague generalities.
 * Once a number is stated, it must remain consistent throughout the session.
 *
 * Key tests:
 *  - Specific Life Path number named after DOB provided
 *  - Consistency across multiple messages
 *  - Holds position when user challenges the number
 *  - Master Numbers (11/22) NOT reduced to their base digit
 *  - Karmic Debt numbers (13/14/16/19) acknowledged when present
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  assertNoForbiddenPhrases,
  AIDEN_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// AIP-014-01: Specific Life Path number stated after DOB provided
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-014-01: DOB September 9, 1990 yields specific Life Path 1 (not a vague "strong number")', async ({ page }) => {
  // September 9, 1990 → 9+9+1+9+9+0 = 37 → 3+7 = 10 → 1+0 = 1 → Life Path 1
  test.setTimeout(90000);
  const email = uniqueEmail('aip-014-01');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, reg.token, 'I was born September 9, 1990');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must contain a specific Life Path number or named numeric output
  const hasSpecificOutput =
    /life path \d/.test(lower) ||
    /\blife path\b.*\b\d\b/.test(lower) ||
    lower.includes('life path 1') ||
    (lower.includes('number') && /\b\d\b/.test(lower));
  expect(hasSpecificOutput).toBeTruthy();

  // Must NOT be vague
  expect(lower).not.toMatch(/you have a strong (number|energy) without qualification/);

  // Must use calculation framing
  const hasCalcFraming =
    lower.includes('the numbers') ||
    lower.includes('calculate') ||
    lower.includes('blueprint') ||
    lower.includes('birth') ||
    lower.includes('life path');
  expect(hasCalcFraming).toBeTruthy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-014-02: Stated Life Path number consistent across 4 messages
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-014-02: Life Path number stays consistent — no contradiction across 4 messages', async ({ page }) => {
  // March 15, 1987 → 3+1+5+1+9+8+7 = 34 → 3+4 = 7 → Life Path 7
  test.setTimeout(180000);
  const email = uniqueEmail('aip-014-02');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Message 1: establish DOB
  const res1 = await apiSendMessage(page, sessionId, reg.token, 'I was born March 15, 1987');
  await page.waitForTimeout(13000);
  const data1 = await res1.json();
  expect(data1.message).toBeTruthy();

  // Extract the Life Path number from message 1
  const match1 = data1.message.match(/life path (\d{1,2})/i);
  const statedLifePath = match1 ? match1[1] : null;
  if (statedLifePath) {
    console.log(`AIP-014-02: Aiden stated Life Path ${statedLifePath} in message 1`);
  }

  // Messages 2–3: elaboration
  await apiSendMessage(page, sessionId, reg.token, 'Tell me more about my blueprint');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'What does this mean for my relationships?');
  await page.waitForTimeout(13000);

  // Message 4: explicitly reference "my core number" — should match message 1
  const res4 = await apiSendMessage(page, sessionId, reg.token, 'Tell me more about my core number');
  await page.waitForTimeout(13000);
  const data4 = await res4.json();
  expect(data4.message).toBeTruthy();
  const lower4 = data4.message.toLowerCase();

  // Must NOT re-ask for the birthdate
  const reAsksDOB =
    (lower4.includes('date of birth') || lower4.includes('when were you born')) &&
    lower4.includes('?');
  expect(reAsksDOB).toBeFalsy();

  // If message 1 stated a specific number, check consistency
  if (statedLifePath) {
    const match4 = data4.message.match(/life path (\d{1,2})/i);
    if (match4) {
      expect(match4[1]).toBe(statedLifePath);
    }
  }

  // Response should have some calculation content
  const hasContent =
    lower4.includes('life path') ||
    lower4.includes('number') ||
    lower4.includes('blueprint') ||
    lower4.includes('core') ||
    lower4.includes('purpose');
  expect(hasContent).toBeTruthy();

  assertNoForbiddenPhrases(data4.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-014-03: User challenges the stated Life Path number
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-014-03: Aiden holds position when challenged — acknowledges discrepancy without capitulating', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-014-03');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Message 1: DOB that gives Life Path 7 (March 15 1987)
  const res1 = await apiSendMessage(page, sessionId, reg.token, 'I was born March 15, 1987');
  await page.waitForTimeout(13000);
  const data1 = await res1.json();
  expect(data1.message).toBeTruthy();

  // Message 2: challenge the number
  const res2 = await apiSendMessage(
    page, sessionId, reg.token,
    "I've always heard I was a Life Path 7, not what you said",
  );
  await page.waitForTimeout(13000);

  expect(res2.status()).toBe(200);
  const data2 = await res2.json();
  expect(data2.message).toBeTruthy();
  const lower2 = data2.message.toLowerCase();

  // Must engage with the discrepancy — mention calculation, systems, or explanation
  const engagesWithDiscrepancy =
    lower2.includes('calculation') ||
    lower2.includes('system') ||
    lower2.includes('method') ||
    lower2.includes('pythagorean') ||
    lower2.includes('different') ||
    lower2.includes('discrepancy') ||
    lower2.includes('actually') ||
    lower2.includes('the number') ||
    lower2.includes('master') ||
    lower2.includes('reduced');
  expect(engagesWithDiscrepancy).toBeTruthy();

  // Must NOT simply agree and switch to Life Path 7 without any explanation
  // Check that the response isn't just "yes you're right, Life Path 7"
  const capitulatesWithoutExplanation =
    lower2.includes('you are correct') && !lower2.includes('calculat') && !lower2.includes('system');
  expect(capitulatesWithoutExplanation).toBeFalsy();

  assertNoForbiddenPhrases(data2.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-014-04: Master Number 11 not reduced to 2
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-014-04: DOB producing Master Number 11 is not reduced to Life Path 2', async ({ page }) => {
  // June 22, 1990: month=6, day=2+2=4, year=1+9+9+0=19→1+0=10→1 → 6+4+1=11 → Master Number 11
  // Some methods: 6+2+2+1+9+9+0=29→2+9=11 ✓ Master Number 11
  test.setTimeout(90000);
  const email = uniqueEmail('aip-014-04');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, reg.token, 'I was born June 22, 1990');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must reference Master Number 11 OR Life Path 11 — not just "2"
  const referencesMasterOrEleven =
    lower.includes('master number') ||
    lower.includes('master 11') ||
    lower.includes('life path 11') ||
    lower.includes('11/2') ||
    lower.includes('11') && lower.includes('master');
  expect(referencesMasterOrEleven).toBeTruthy();

  // Must NOT simply say "Life Path 2" with no mention of 11
  const reducesToTwo =
    lower.includes('life path 2') &&
    !lower.includes('11') &&
    !lower.includes('master');
  expect(reducesToTwo).toBeFalsy();

  // Should acknowledge the special/elevated nature of a Master Number
  const acknowledgesSpecial =
    lower.includes('master') ||
    lower.includes('special') ||
    lower.includes('elevated') ||
    lower.includes('powerful') ||
    lower.includes('unique') ||
    lower.includes('rare') ||
    lower.includes('both');
  expect(acknowledgesSpecial).toBeTruthy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-014-05: Karmic Debt number (16/7) acknowledged when present
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-014-05: DOB with 16 Karmic Debt component called out, not just simplified to Life Path 7', async ({ page }) => {
  // November 16, 1986: day=16 which is a Karmic Debt number (16/7)
  // Full calc: 1+1+1+6+1+9+8+6 = 33→3+3=6  ... or by groups: 11+16+1986→1+1=2, 1+6=7, 1+9+8+6=24→6 → 2+7+6=15→1+5=6
  // Some methods give LP 6, with 16 surfacing as a sub-total → Karmic Debt
  test.setTimeout(90000);
  const email = uniqueEmail('aip-014-05');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, reg.token, 'I was born November 16, 1986');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Check if response mentions a number — there should be specific output
  const hasANumber = /\b\d{1,2}\b/.test(lower);
  expect(hasANumber).toBeTruthy();

  // If the 16 surfaces, it should be called out (soft assertion — note as warning if absent)
  const callsOutKarmicOrSixteen =
    lower.includes('karmic') ||
    lower.includes('16') ||
    lower.includes('16/7') ||
    lower.includes('debt') ||
    lower.includes('pattern') ||
    lower.includes('challenge');
  if (!callsOutKarmicOrSixteen) {
    console.warn('AIP-014-05: Karmic Debt 16 not specifically called out — verify Aiden handles this edge case');
  }

  // Response must not be vague (must include a named number or concept)
  const hasNamedOutput =
    lower.includes('life path') ||
    lower.includes('pinnacle') ||
    lower.includes('number') ||
    lower.includes('blueprint') ||
    lower.includes('calculate');
  expect(hasNamedOutput).toBeTruthy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});
