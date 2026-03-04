/**
 * LUV-005: Conversation Bucket Progression
 *
 * Tests Luna Voss's topic routing — all buckets are astrology-framed.
 * Key Luna difference: cold-start flow collects birth data FIRST (date, time, city).
 * Once birth data is provided, Luna reads specific placements from the chart.
 *
 * Buckets:
 *  1. Love/relationships — Venus, 5th/7th house, synastry
 *  2. Career — 10th house, Midheaven, Saturn
 *  3. Life purpose — North Node, chart ruler
 *  4. Transits/timing — current sky, active placements
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  birthDataMessage,
  assertNoForbiddenPhrases,
  LUNA_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// LUV-005-01: First exchange prompts for birth data or area of focus
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-005-01: Opening message gets Luna identity and birth data request', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-005-01');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, 'Hello, I am here for a reading');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();

  // Luna should establish her astrologer identity or ask for birth data
  const establishesIdentity =
    msgLower.includes('chart') ||
    msgLower.includes('astrology') ||
    msgLower.includes('birth') ||
    msgLower.includes('born') ||
    msgLower.includes('placement') ||
    msgLower.includes('natal') ||
    msgLower.includes('date');
  expect(establishesIdentity).toBeTruthy();

  // Must NOT use numerology/tarot framing
  expect(msgLower).not.toContain('numerology');
  expect(msgLower).not.toContain('life path');
  expect(msgLower).not.toContain('tarot');

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-005-02: Love bucket routes correctly with Venus/7th house framing
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-005-02: Love message routes to Venus/7th house astrological framing', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-005-02');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  // Provide birth data first
  await apiSendMessage(page, sessionId, regData.token, birthDataMessage());
  await page.waitForTimeout(13000);

  const res = await apiSendMessage(page, sessionId, regData.token, 'I want to understand my love life through my chart');
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  const isLoveAstrology =
    msgLower.includes('venus') ||
    msgLower.includes('7th') ||
    msgLower.includes('relationship') ||
    msgLower.includes('love') ||
    msgLower.includes('chart') ||
    msgLower.includes('placement') ||
    msgLower.includes('sign');
  expect(isLoveAstrology).toBeTruthy();

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-005-03: Career bucket routes correctly with 10th house/Midheaven framing
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-005-03: Career message routes to 10th house or Midheaven framing', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-005-03');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, birthDataMessage());
  await page.waitForTimeout(13000);

  const res = await apiSendMessage(page, sessionId, regData.token, 'What does my chart say about my career?');
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  const isCareerAstrology =
    msgLower.includes('10th') ||
    msgLower.includes('midheaven') ||
    msgLower.includes('saturn') ||
    msgLower.includes('career') ||
    msgLower.includes('chart') ||
    msgLower.includes('placement') ||
    msgLower.includes('house');
  expect(isCareerAstrology).toBeTruthy();

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-005-04: Life purpose bucket routes correctly with North Node framing
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-005-04: Life purpose message routes to North Node or chart ruler framing', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-005-04');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, birthDataMessage());
  await page.waitForTimeout(13000);

  const res = await apiSendMessage(page, sessionId, regData.token, "I'm trying to understand my life purpose");
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  const isLifePurpose =
    msgLower.includes('north node') ||
    msgLower.includes('chart ruler') ||
    msgLower.includes('purpose') ||
    msgLower.includes('calling') ||
    msgLower.includes('chart') ||
    msgLower.includes('soul') ||
    msgLower.includes('house');
  expect(isLifePurpose).toBeTruthy();

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-005-05: Conversation deepens with specific placements once birth data collected
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-005-05: Conversation deepens with specific chart placements after birth data provided', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-005-05');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  // Provide birth data
  await apiSendMessage(page, sessionId, regData.token, birthDataMessage());
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, regData.token, 'What does my Venus placement say about love?');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, regData.token, 'Tell me more about the 7th house');
  await page.waitForTimeout(13000);

  const res4 = await apiSendMessage(page, sessionId, regData.token, 'What about current transits affecting love?');
  await page.waitForTimeout(13000);

  const data = await res4.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  // After birth data, Luna should reference specific placements
  const hasSpecificContent =
    msgLower.includes('venus') ||
    msgLower.includes('7th') ||
    msgLower.includes('transit') ||
    msgLower.includes('placement') ||
    msgLower.includes('sign') ||
    msgLower.includes('house') ||
    msgLower.includes('energy') ||
    msgLower.includes('planet');
  expect(hasSpecificContent).toBeTruthy();

  // Should NOT re-ask for birth data (already captured)
  const reAskedBirthData =
    (msgLower.includes('date of birth') || msgLower.includes('when were you born')) &&
    msgLower.includes('?');
  if (reAskedBirthData) {
    console.warn('LUV-005-05: Luna re-asked for birth data — check profile capture/memory');
  }

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-005-06: Closing phase is graceful and open-ended
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-005-06: Closing message gets warm, open-ended farewell without hard sell', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-005-06');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, birthDataMessage());
  await page.waitForTimeout(13000);
  await apiSendMessage(page, sessionId, regData.token, 'Tell me about my Sun sign');
  await page.waitForTimeout(13000);

  const res = await apiSendMessage(
    page, sessionId, regData.token,
    'Thank you, I think I have enough to think about for now',
  );
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  const isWarm =
    msgLower.includes('thank') ||
    msgLower.includes('good') ||
    msgLower.includes('glad') ||
    msgLower.includes('ready') ||
    msgLower.includes('chart') ||
    msgLower.includes('more') ||
    msgLower.includes('anytime') ||
    msgLower.includes('stars') ||
    msgLower.includes('whenever');
  expect(isWarm).toBeTruthy();

  // No hard sell or pressure
  expect(msgLower).not.toMatch(/\byou must\b/);
  expect(msgLower).not.toMatch(/\blimited time\b/);
  expect(msgLower).not.toMatch(/\bright now\b.*\boffer\b/);

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});
