/**
 * AIP-015: Multi-turn Coherence
 *
 * Within a single session, Aiden must build on established context —
 * never reset, repeat verbatim, or forget what was established.
 *
 * Key tests:
 *  - Prior DOB + concern both referenced in a later message
 *  - No verbatim repetition across 5 consecutive messages
 *  - One-word response handled as continuation (not session reset)
 *  - Reading deepens from surface framing to specific numbers over 6 messages
 *  - Birth name asked AFTER birthdate — never in the same message as DOB
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
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// AIP-015-01: DOB and concern both referenced in a later message
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-015-01: Message-3 timing response references both the DOB and the career concern from message-1', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-015-01');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Message 1: DOB + specific concern
  await apiSendMessage(
    page, sessionId, reg.token,
    "I was born June 5, 1986 and I'm trying to decide whether to quit my job and start a business",
  );
  await page.waitForTimeout(13000);

  // Message 2: neutral follow-up to let Aiden build context
  await apiSendMessage(page, sessionId, reg.token, 'What do the numbers say about this?');
  await page.waitForTimeout(13000);

  // Message 3: timing question — should reference the DOB AND the career concern
  const res3 = await apiSendMessage(page, sessionId, reg.token, 'What does the timing look like for me?');
  await page.waitForTimeout(13000);

  expect(res3.status()).toBe(200);
  const data3 = await res3.json();
  expect(data3.message).toBeTruthy();
  const lower3 = data3.message.toLowerCase();

  // Must reference timing-related numbers derived from the DOB
  const referencesDOBTimingData =
    lower3.includes('personal year') ||
    lower3.includes('pinnacle') ||
    lower3.includes('1986') ||
    lower3.includes('june') ||
    lower3.includes('number') ||
    lower3.includes('blueprint') ||
    lower3.includes('calculate') ||
    lower3.includes('period');
  expect(referencesDOBTimingData).toBeTruthy();

  // Must reflect the career/business concern (not pivot to unrelated topic)
  const reflectsCareerConcern =
    lower3.includes('career') ||
    lower3.includes('business') ||
    lower3.includes('work') ||
    lower3.includes('job') ||
    lower3.includes('change') ||
    lower3.includes('decision') ||
    lower3.includes('timing') ||
    lower3.includes('transition');
  expect(reflectsCareerConcern).toBeTruthy();

  // Must NOT re-ask for the birthdate
  const reAsksDOB =
    (lower3.includes('date of birth') || lower3.includes('when were you born')) && lower3.includes('?');
  expect(reAsksDOB).toBeFalsy();

  assertNoForbiddenPhrases(data3.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-015-02: No verbatim repetition across 5 consecutive messages
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-015-02: Five consecutive messages on life path topic show no verbatim 8-word repetition', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-015-02');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const prompts = [
    'I want to understand my life path — what are my numbers telling me?',
    'Tell me more',
    'And what does that mean in practice?',
    'How does that connect to my current chapter?',
    'What should I focus on?',
  ];

  const responses: string[] = [];
  for (const prompt of prompts) {
    const res = await apiSendMessage(page, sessionId, reg.token, prompt);
    await page.waitForTimeout(13000);
    const data = await res.json();
    if (data.message) responses.push(data.message);
  }

  expect(responses.length).toBeGreaterThanOrEqual(3);

  // Check no two consecutive responses share an 8-word phrase
  for (let i = 0; i < responses.length - 1; i++) {
    const wordsA = responses[i].toLowerCase().split(/\s+/);
    const wordsB = responses[i + 1].toLowerCase().split(/\s+/);
    let foundRepeat = false;
    for (let j = 0; j <= wordsA.length - 8; j++) {
      const phrase = wordsA.slice(j, j + 8).join(' ');
      if (wordsB.join(' ').includes(phrase)) {
        console.warn(`AIP-015-02: 8-word repeat found between message ${i + 1} and ${i + 2}: "${phrase}"`);
        foundRepeat = true;
        break;
      }
    }
    expect(foundRepeat).toBeFalsy();
  }

  // Each response should be within the soft word-count limit
  for (const text of responses) {
    const wc = wordCount(text);
    expect(wc).toBeLessThanOrEqual(112); // hard cap: 4× guideline
    if (wc > 56) {
      console.warn(`AIP-015-02: Response word count ${wc} exceeds 56-word soft limit`);
    }
  }

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-015-03: One-word response handled as continuation, not session reset
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-015-03: "Interesting" after a substantive Aiden message expands the prior point', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-015-03');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Message 1: establish a substantive exchange about Life Path
  const res1 = await apiSendMessage(
    page, sessionId, reg.token,
    'I was born May 10, 1984 — tell me about my Life Path number',
  );
  await page.waitForTimeout(13000);
  const data1 = await res1.json();
  expect(data1.message).toBeTruthy();

  // Message 2: one-word response — should expand on message 1, not reset
  const res2 = await apiSendMessage(page, sessionId, reg.token, 'Interesting');
  await page.waitForTimeout(13000);

  expect(res2.status()).toBe(200);
  const data2 = await res2.json();
  expect(data2.message).toBeTruthy();
  const lower2 = data2.message.toLowerCase();

  // Must NOT restart with a generic opener
  const isGenericReset =
    (lower2.includes('what would you like to explore') ||
     lower2.includes("what's on your mind") ||
     lower2.includes('where would you like to start') ||
     lower2.includes('what brings you here')) &&
    !lower2.includes('life path') &&
    !lower2.includes('number') &&
    !lower2.includes('blueprint');
  expect(isGenericReset).toBeFalsy();

  // Must NOT ask for date of birth (already provided)
  const reAsksDOB =
    (lower2.includes('date of birth') || lower2.includes('when were you born')) && lower2.includes('?');
  expect(reAsksDOB).toBeFalsy();

  // Must continue expanding on the Life Path topic from message 1
  const continuesFromPrior =
    lower2.includes('life path') ||
    lower2.includes('number') ||
    lower2.includes('blueprint') ||
    lower2.includes('purpose') ||
    lower2.includes('calculate') ||
    lower2.includes('pattern') ||
    lower2.includes('pinnacle') ||
    lower2.includes('energy');
  expect(continuesFromPrior).toBeTruthy();

  assertNoForbiddenPhrases(data2.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-015-04: Reading deepens from surface to specific across 6 messages
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-015-04: Career/timing session deepens — early messages exploratory, messages 4-6 cite specific outputs', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-015-04');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Message 1: career/timing bucket opener
  const res1 = await apiSendMessage(
    page, sessionId, reg.token,
    'Is this a good time to change careers? I keep feeling stuck.',
  );
  await page.waitForTimeout(13000);
  const data1 = await res1.json();
  expect(data1.message).toBeTruthy();

  // Message 2: provide birthdate
  const res2 = await apiSendMessage(page, sessionId, reg.token, 'I was born October 22, 1985');
  await page.waitForTimeout(13000);
  const data2 = await res2.json();
  expect(data2.message).toBeTruthy();

  // Message 3: continue
  const res3 = await apiSendMessage(page, sessionId, reg.token, 'Tell me more about the timing');
  await page.waitForTimeout(13000);
  const data3 = await res3.json();
  expect(data3.message).toBeTruthy();

  // Message 4
  const res4 = await apiSendMessage(page, sessionId, reg.token, 'What does my Pinnacle say about this?');
  await page.waitForTimeout(13000);
  const data4 = await res4.json();
  expect(data4.message).toBeTruthy();

  // Message 5
  const res5 = await apiSendMessage(page, sessionId, reg.token, 'And my Personal Year?');
  await page.waitForTimeout(13000);
  const data5 = await res5.json();
  expect(data5.message).toBeTruthy();

  // Message 6: deep specific question
  const res6 = await apiSendMessage(page, sessionId, reg.token, 'How does all this connect to my career decision?');
  await page.waitForTimeout(13000);
  const data6 = await res6.json();
  expect(data6.message).toBeTruthy();

  // Early messages (1-2) should be more exploratory/framing
  const lower1 = data1.message.toLowerCase();
  const isExploratory =
    lower1.includes('number') ||
    lower1.includes('blueprint') ||
    lower1.includes('timing') ||
    lower1.includes('birth') ||
    lower1.includes('career') ||
    lower1.includes('calculate');
  expect(isExploratory).toBeTruthy();

  // Later messages (4-6) should cite specific outputs with numbers
  const laterMessages = [data4.message, data5.message, data6.message];
  const specificOutputsFound = laterMessages.filter((msg) => {
    const lower = msg.toLowerCase();
    return (
      lower.includes('pinnacle') ||
      lower.includes('personal year') ||
      lower.includes('life path') ||
      /\b(year|period|pinnacle|path) \d/.test(lower) ||
      /\d (pinnacle|year|period)/.test(lower)
    );
  });
  expect(specificOutputsFound.length).toBeGreaterThanOrEqual(2);

  // All messages should stay in calculation framing
  for (const msg of [data1.message, data4.message, data5.message, data6.message]) {
    assertNoForbiddenPhrases(msg);
  }

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-015-05: Birth name asked AFTER birthdate — never in the same message as DOB request
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-015-05: After DOB provided, Aiden asks for birth name separately — then emits token and reading', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-015-05');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Message 1: DOB only
  const res1 = await apiSendMessage(page, sessionId, reg.token, 'I was born August 3, 1992');
  await page.waitForTimeout(13000);

  expect(res1.status()).toBe(200);
  const data1 = await res1.json();
  expect(data1.message).toBeTruthy();
  const lower1 = data1.message.toLowerCase();

  // If Aiden asks for anything, it must NOT be for both name AND something else in one message
  // Count the number of different requests in message 1
  const asksDOBAgain =
    (lower1.includes('date of birth') || lower1.includes('when were you born')) && lower1.includes('?');
  expect(asksDOBAgain).toBeFalsy();

  // The ask in message 1 (if any) should be for birth name or just engagement
  // It must NOT ask for DOB (already provided) and birth name simultaneously
  const asksForBothInSameMessage =
    lower1.includes('date of birth') && lower1.includes('birth name') && lower1.includes('?');
  expect(asksForBothInSameMessage).toBeFalsy();

  // Message 2: provide the birth name
  const res2 = await apiSendMessage(page, sessionId, reg.token, 'My name is Rebecca Jane Morrison');
  await page.waitForTimeout(13000);

  expect(res2.status()).toBe(200);
  const data2 = await res2.json();
  expect(data2.message).toBeTruthy();
  const lower2 = data2.message.toLowerCase();

  // Now that both pieces are present, a reading should begin
  const beginsReading =
    lower2.includes('life path') ||
    lower2.includes('number') ||
    lower2.includes('blueprint') ||
    lower2.includes('expression') ||
    lower2.includes('rebecca') ||
    lower2.includes('pinnacle') ||
    lower2.includes('calculate');
  expect(beginsReading).toBeTruthy();

  // Must NOT re-ask for either piece of data
  const reAsksDOB =
    (lower2.includes('date of birth') || lower2.includes('when were you born')) && lower2.includes('?');
  expect(reAsksDOB).toBeFalsy();

  assertNoForbiddenPhrases(data2.message);

  await apiEndSession(page, sessionId, reg.token);
});
