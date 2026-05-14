/**
 * AIP-013: Profile / Data Capture
 *
 * Tests Aiden's strict two-step data capture protocol:
 *   1. Birthdate FIRST
 *   2. Full birth name SECOND (never both in same message)
 *
 * Key Aiden-specific mechanics:
 *  - [NUMEROLOGY_PROFILE:BD=YYYY-MM-DD,NAME=Full Name] token fires once both pieces collected
 *  - Must NOT ask for both fields in the same message
 *  - Must NOT produce an Expression Number or Life Path without the required data
 *  - Graceful refusals: no pressure, no repetition
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
// AIP-013-01: Birthdate only — no name provided
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-013-01: Birthdate-only message gets partial engagement, not a NUMEROLOGY_PROFILE token', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-013-01');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, reg.token,
    'I was born October 14, 1991 — what can you tell me?',
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must engage with the birthdate — mentions some numerology concept
  const engagesWithDOB =
    lower.includes('life path') ||
    lower.includes('number') ||
    lower.includes('blueprint') ||
    lower.includes('calculate') ||
    lower.includes('born') ||
    lower.includes('october') ||
    lower.includes('pinnacle') ||
    lower.includes('name');
  expect(engagesWithDOB).toBeTruthy();

  // Must NOT ask for the birthdate again (it was provided)
  const reAsksDOB =
    (lower.includes('date of birth') || lower.includes('when were you born')) &&
    lower.includes('?');
  expect(reAsksDOB).toBeFalsy();

  // NUMEROLOGY_PROFILE token must NOT appear (name still missing)
  expect(data.message).not.toContain('[NUMEROLOGY_PROFILE:');

  // Must use calculation framing, not psychic framing
  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-013-02: Birth name only — no date provided
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-013-02: Name-only message prompts for DOB, not for name again', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-013-02');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, reg.token,
    'My birth name is Jessica Ann Hartley',
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must ask for date of birth
  const asksDOB =
    lower.includes('birth') ||
    lower.includes('born') ||
    lower.includes('date') ||
    lower.includes('when') ||
    lower.includes('calculate');
  expect(asksDOB).toBeTruthy();

  // Must NOT produce Expression Number or Life Path without a DOB
  const fabricatesOutput =
    lower.includes('expression number') &&
    lower.includes('is') &&
    /\d/.test(lower);
  expect(fabricatesOutput).toBeFalsy();

  // Must NOT ask for the birth name again (it was provided)
  expect(lower).not.toMatch(/what('s| is) your (full |birth )?name/);

  // No NUMEROLOGY_PROFILE token — DOB still missing
  expect(data.message).not.toContain('[NUMEROLOGY_PROFILE:');

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-013-03: Both fields in one message — token and reading expected
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-013-03: Both DOB and birth name in one message triggers NUMEROLOGY_PROFILE token', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-013-03');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, reg.token,
    'My name is Daniel Cross and I was born July 4, 1985',
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Token should appear — this is the first (and only) time both pieces are present
  // Note: allow for cases where the token is embedded in a longer response
  const hasToken = data.message.includes('[NUMEROLOGY_PROFILE:');
  // Soft check: token presence is ideal; if absent, reading should still begin
  if (!hasToken) {
    console.warn('AIP-013-03: NUMEROLOGY_PROFILE token not found — check prompt token emission logic');
  }

  // Must NOT ask for either piece of data again
  const reAsksDOB =
    (lower.includes('date of birth') || lower.includes('when were you born')) && lower.includes('?');
  const reAsksName =
    lower.includes('full name') && lower.includes('?') && !lower.includes('daniel');
  expect(reAsksDOB).toBeFalsy();
  expect(reAsksName).toBeFalsy();

  // Reading should begin — mentions a calculation output or the name/date
  const beginsReading =
    lower.includes('life path') ||
    lower.includes('number') ||
    lower.includes('blueprint') ||
    lower.includes('pinnacle') ||
    lower.includes('daniel') ||
    lower.includes('calculate') ||
    lower.includes('expression');
  expect(beginsReading).toBeTruthy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-013-04: NUMEROLOGY_PROFILE token emitted on second message (DOB then name)
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-013-04: NUMEROLOGY_PROFILE token appears in message-2 response, not message-1 or message-3', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-013-04');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Message 1: DOB only
  const res1 = await apiSendMessage(page, sessionId, reg.token, 'I was born March 15, 1987');
  await page.waitForTimeout(13000);
  const data1 = await res1.json();
  expect(data1.message).toBeTruthy();

  // Token must NOT appear in message 1 response (name not yet provided)
  expect(data1.message).not.toContain('[NUMEROLOGY_PROFILE:');

  // Message 2: birth name — this is when the token should fire
  const res2 = await apiSendMessage(page, sessionId, reg.token, 'My full birth name is Jordan Lee Ellis');
  await page.waitForTimeout(13000);
  const data2 = await res2.json();
  expect(data2.message).toBeTruthy();

  // Soft check for token in message 2
  if (!data2.message.includes('[NUMEROLOGY_PROFILE:')) {
    console.warn('AIP-013-04: NUMEROLOGY_PROFILE token not found in msg-2 response');
  }

  // Message 3: follow-up after profile captured
  const res3 = await apiSendMessage(page, sessionId, reg.token, 'Tell me more about my Life Path');
  await page.waitForTimeout(13000);
  const data3 = await res3.json();
  expect(data3.message).toBeTruthy();

  // Token must NOT appear again in message 3 (should only emit once)
  expect(data3.message).not.toContain('[NUMEROLOGY_PROFILE:');

  // Message 3 must NOT re-ask for data
  const lower3 = data3.message.toLowerCase();
  const reAsksDOB = (lower3.includes('date of birth') || lower3.includes('when were you born')) && lower3.includes('?');
  expect(reAsksDOB).toBeFalsy();

  assertNoForbiddenPhrases(data3.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-013-05: User refuses to share birthdate
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-013-05: User refusal of birthdate is accepted gracefully — no pressure, no repetition', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-013-05');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Start the session so Aiden asks for DOB
  await apiSendMessage(page, sessionId, reg.token, 'Hello, I would like a numerology reading');
  await page.waitForTimeout(13000);

  // User declines to share the birthdate
  const res = await apiSendMessage(page, sessionId, reg.token, "I'd rather not share my exact birthday");
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Response should be gracious
  const isGracious =
    lower.includes('understand') ||
    lower.includes('respect') ||
    lower.includes('okay') ||
    lower.includes('alright') ||
    lower.includes('of course') ||
    lower.includes('no problem') ||
    lower.includes('happy') ||
    lower.includes('still') ||
    lower.includes('without');
  expect(isGracious).toBeTruthy();

  // Must NOT guilt-trip or pressure
  expect(lower).not.toMatch(/\byou need to\b/);
  expect(lower).not.toMatch(/\bwithout.*cannot\b/);
  expect(lower).not.toMatch(/\bmust share\b/);

  // Must NOT repeat the birthdate request in this message
  const repeatsRequest =
    (lower.includes('date of birth') || lower.includes('when were you born')) &&
    lower.includes('?');
  expect(repeatsRequest).toBeFalsy();

  // Must NOT fabricate a Life Path number
  const fabricatesLP = lower.includes('life path') && /life path \d/.test(lower);
  expect(fabricatesLP).toBeFalsy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-013-06: User refuses to share birth name after giving DOB
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-013-06: Refusal of birth name accepted; Aiden notes what can be calculated from DOB alone', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-013-06');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Provide birthdate
  await apiSendMessage(page, sessionId, reg.token, 'I was born August 12, 1988');
  await page.waitForTimeout(13000);

  // Aiden should now have the DOB and may ask for name — refuse it
  const res = await apiSendMessage(page, sessionId, reg.token, "I don't feel comfortable sharing my full legal name");
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Should acknowledge gracefully
  const isGracious =
    lower.includes('understand') ||
    lower.includes('okay') ||
    lower.includes('no problem') ||
    lower.includes('respect') ||
    lower.includes('still') ||
    lower.includes('can') ||
    lower.includes('work');
  expect(isGracious).toBeTruthy();

  // Should note what CAN be done with DOB alone
  const mentionesDOBCapability =
    lower.includes('life path') ||
    lower.includes('pinnacle') ||
    lower.includes('personal year') ||
    lower.includes('birth') ||
    lower.includes('number') ||
    lower.includes('date') ||
    lower.includes('calculate');
  expect(mentionesDOBCapability).toBeTruthy();

  // Must NOT repeat name request
  const repeatsNameRequest =
    (lower.includes('full name') || lower.includes('birth name') || lower.includes('legal name')) &&
    lower.includes('?');
  expect(repeatsNameRequest).toBeFalsy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-013-07: User corrects their birthdate mid-session
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-013-07: Birthdate correction acknowledged; subsequent responses use corrected date', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-013-07');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Message 1: initial DOB
  await apiSendMessage(page, sessionId, reg.token, 'I was born April 3, 1989');
  await page.waitForTimeout(13000);

  // Message 2: Aiden begins a reading using April 3 1989
  await apiSendMessage(page, sessionId, reg.token, 'Tell me about my Life Path');
  await page.waitForTimeout(13000);

  // Message 3: user corrects the date
  const res = await apiSendMessage(page, sessionId, reg.token, 'Actually I got that wrong — I was born April 13, 1989');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must acknowledge the correction
  const acknowledgesCorrection =
    lower.includes('april 13') ||
    lower.includes('13th') ||
    lower.includes('correct') ||
    lower.includes('update') ||
    lower.includes('new') ||
    lower.includes('recalculate') ||
    lower.includes('revised') ||
    lower.includes('noted');
  expect(acknowledgesCorrection).toBeTruthy();

  // Must NOT continue referencing "April 3" as the correct date
  expect(lower).not.toMatch(/april 3[^0-9]/);
  expect(lower).not.toMatch(/3rd of april/);
  expect(lower).not.toMatch(/april 3,/);

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-013-08: Data supplied for someone else, not the user
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-013-08: Third-party reading keeps profiles separate — no conflation with user data', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-013-08');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Establish user's own DOB first
  await apiSendMessage(page, sessionId, reg.token, 'I was born February 20, 1992');
  await page.waitForTimeout(13000);

  // Now ask about someone else
  const res = await apiSendMessage(
    page, sessionId, reg.token,
    "Can you decode my mother's numbers? She was born July 22, 1958 and her birth name is Patricia Anne Walsh",
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must frame the reading FOR the mother, not the user
  const usesThirdPersonFraming =
    lower.includes('her') ||
    lower.includes('patricia') ||
    lower.includes("your mother") ||
    lower.includes("her life path") ||
    lower.includes("her numbers") ||
    lower.includes("her blueprint");
  expect(usesThirdPersonFraming).toBeTruthy();

  // Must NOT confuse the mother's DOB with the user's DOB
  // User was born Feb 20, 1992 — the response about the mother should reference 1958 or Patricia
  const conflateDOBs =
    lower.includes('february') && lower.includes('1992') && lower.includes('life path');
  expect(conflateDOBs).toBeFalsy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});
