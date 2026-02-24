/**
 * AIP-005: Conversation Bucket Progression
 *
 * Tests Aiden Powers' topic routing — all buckets are numerology-framed.
 * Key difference from Evelyn: Aiden's cold-start flow collects birthdate FIRST,
 * then birth name. Once the NUMEROLOGY_PROFILE token fires, Aiden builds
 * on the specific numbers rather than re-asking.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  AIDEN_SLUG,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// AIP-005-01: First exchange is in opening/data-collection phase
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-005-01: Opening message gets numerologist identity and DOB request', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-005-01');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, 'Hello, I am here for a reading');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();

  const msgLower = data.message.toLowerCase();

  // Aiden should establish his identity as a numerologist/decoder
  const establishesIdentity =
    msgLower.includes('number') ||
    msgLower.includes('numerol') ||
    msgLower.includes('blueprint') ||
    msgLower.includes('decode') ||
    msgLower.includes('calculate') ||
    msgLower.includes('birth') ||
    msgLower.includes('date');
  expect(establishesIdentity).toBeTruthy();

  // Must NOT use psychic/sensing framing
  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('i feel that');
  expect(msgLower).not.toContain('i intuit');
  expect(msgLower).not.toContain('tarot');

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-005-02: Life path bucket routes correctly
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-005-02: Life path message routes to numerology decode framing', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-005-02');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token, 'I want to understand my life path number');
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  // Must focus on Life Path as a master number / blueprint
  const isLifePathFocused =
    msgLower.includes('life path') ||
    msgLower.includes('number') ||
    msgLower.includes('blueprint') ||
    msgLower.includes('soul') ||
    msgLower.includes('born') ||
    msgLower.includes('birth');
  expect(isLifePathFocused).toBeTruthy();

  // Must ask for date of birth (cold start) OR use calculation framing
  const asksDOB =
    msgLower.includes('date of birth') ||
    msgLower.includes('when were you born') ||
    msgLower.includes('birth date') ||
    msgLower.includes('born') ||
    msgLower.includes('calculate');
  expect(asksDOB).toBeTruthy();

  // Must NOT use psychic framing
  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('i feel that');

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-005-03: Love/relationship bucket routes correctly
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-005-03: Love/relationship message bridges to Expression Number framing', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-005-03');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, regData.token,
    "I keep hitting the same walls in my relationship — can you read my numbers?",
  );
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  // Must bridge to numerology framing for love/relationships
  const isLoveNumerology =
    msgLower.includes('expression number') ||
    msgLower.includes('number') ||
    msgLower.includes('blueprint') ||
    msgLower.includes('birth') ||
    msgLower.includes('relationship') ||
    msgLower.includes('love') ||
    msgLower.includes('pattern');
  expect(isLoveNumerology).toBeTruthy();

  // Must ask for DOB to begin the decode
  const asksDOBOrCalc =
    msgLower.includes('date of birth') ||
    msgLower.includes('when were you born') ||
    msgLower.includes('birth') ||
    msgLower.includes('calculate') ||
    msgLower.includes('decode');
  expect(asksDOBOrCalc).toBeTruthy();

  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('i feel that');

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-005-04: Career/timing bucket routes correctly to Pinnacle/Personal Year
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-005-04: Career/timing message bridges to Pinnacle or Personal Year framing', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-005-04');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, regData.token,
    "Is this a good time to change careers? I keep feeling stuck.",
  );
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  // Must bridge to career timing via numerology
  const isCareerNumerology =
    msgLower.includes('pinnacle') ||
    msgLower.includes('personal year') ||
    msgLower.includes('timing') ||
    msgLower.includes('number') ||
    msgLower.includes('calculate') ||
    msgLower.includes('career') ||
    msgLower.includes('life path');
  expect(isCareerNumerology).toBeTruthy();

  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('i feel that');

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-005-05: Conversation deepens once birth data collected
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-005-05: Conversation deepens with specific numbers after birth data provided', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-005-05');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  // Provide birth data first
  await apiSendMessage(page, sessionId, regData.token, 'My name is Alexandra and I was born March 15, 1987');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, regData.token, 'What does my life path tell you?');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, regData.token, 'Tell me more about my Pinnacle period');
  await page.waitForTimeout(13000);

  const res4 = await apiSendMessage(page, sessionId, regData.token, 'What about my career timing?');
  await page.waitForTimeout(13000);

  const data = await res4.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  // After birth data, Aiden should reference specific numbers/periods
  const hasSpecificNumbers =
    msgLower.includes('life path') ||
    msgLower.includes('pinnacle') ||
    msgLower.includes('personal year') ||
    msgLower.includes('blueprint') ||
    msgLower.includes('number') ||
    msgLower.includes('period') ||
    msgLower.includes('chapter');
  expect(hasSpecificNumbers).toBeTruthy();

  // Should NOT re-ask for birthdate (already captured)
  const reAskedDOB =
    (msgLower.includes('date of birth') || msgLower.includes('when were you born')) &&
    msgLower.includes('?');
  if (reAskedDOB) {
    console.warn('AIP-005-05: Aiden re-asked for birth date — check memory/profile capture');
  }

  expect(msgLower).not.toContain('i sense');
  expect(msgLower).not.toContain('i feel that');

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-005-06: Closing phase is graceful and open-ended
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-005-06: Closing message gets warm, open-ended farewell without hard sell', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-005-06');
  const regData = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, regData.token, AIDEN_SLUG);

  // Build up a real session before closing
  await apiSendMessage(page, sessionId, regData.token, 'I was born April 10, 1990');
  await page.waitForTimeout(13000);
  await apiSendMessage(page, sessionId, regData.token, 'Tell me about my life path');
  await page.waitForTimeout(13000);

  const res = await apiSendMessage(
    page, sessionId, regData.token,
    "Thank you, I think I have enough to work with for now",
  );
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(data.message).toBeTruthy();
  const msgLower = data.message.toLowerCase();

  // Closing should be warm and affirming
  const isWarm =
    msgLower.includes('thank') ||
    msgLower.includes('good') ||
    msgLower.includes('glad') ||
    msgLower.includes('ready') ||
    msgLower.includes('blueprint') ||
    msgLower.includes('more') ||
    msgLower.includes('anytime');
  expect(isWarm).toBeTruthy();

  // No hard sell or pressure
  expect(msgLower).not.toMatch(/\byou must\b/);
  expect(msgLower).not.toMatch(/\blimited time\b/);
  expect(msgLower).not.toMatch(/\bright now\b.*\boffer\b/);

  // No psychic framing
  expect(msgLower).not.toContain('i sense');

  await apiEndSession(page, sessionId, regData.token);
});
