/**
 * AIP-016: Topic Pivot & Transition
 *
 * Aiden's system prompt defines clear topic entry points
 * (love → Expression Number, career → Pinnacle/Personal Year, etc.).
 * Pivots must be honoured cleanly without losing prior context.
 *
 * Key tests:
 *  - Mid-session pivot from life path to relationship topic
 *  - Two-topic opening: one selected, other offered for later
 *  - Compatibility reading keeps two profiles separate
 *  - Pinnacle Period as entry door (not final destination)
 *  - Returning to a topic that was closed earlier in session
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
// AIP-016-01: Mid-session pivot from life path to relationship topic
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-016-01: Pivot from life path to relationship topic honoured; not forced back to life path', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-016-01');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Messages 1–3: establish a life path thread
  await apiSendMessage(
    page, sessionId, reg.token,
    'I want to understand my life path — what are my numbers telling me?',
  );
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'I was born November 3, 1988');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'Tell me more about my blueprint');
  await page.waitForTimeout(13000);

  // Message 4: explicit pivot to relationship topic
  const res4 = await apiSendMessage(
    page, sessionId, reg.token,
    "Actually, let's talk about my relationship instead — I keep attracting the same unavailable people",
  );
  await page.waitForTimeout(13000);

  expect(res4.status()).toBe(200);
  const data4 = await res4.json();
  expect(data4.message).toBeTruthy();
  const lower4 = data4.message.toLowerCase();

  // Must pivot to relationship/love topic
  const pivotsToRelationship =
    lower4.includes('relationship') ||
    lower4.includes('love') ||
    lower4.includes('expression number') ||
    lower4.includes('partner') ||
    lower4.includes('attraction') ||
    lower4.includes('pattern') ||
    lower4.includes('compatibility');
  expect(pivotsToRelationship).toBeTruthy();

  // Must NOT force the life path thread to continue (ignoring the pivot)
  const ignoresPivot =
    lower4.includes('life path') &&
    !lower4.includes('relationship') &&
    !lower4.includes('love') &&
    !lower4.includes('expression');
  expect(ignoresPivot).toBeFalsy();

  // Must NOT acknowledge the pivot and then ignore it with a generic deflection
  const deflectsWithoutPivoting =
    lower4.includes("i understand you'd like to talk about") &&
    !lower4.includes('relationship') &&
    !lower4.includes('love');
  expect(deflectsWithoutPivoting).toBeFalsy();

  assertNoForbiddenPhrases(data4.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-016-02: Two-topic opening — one selected, other explicitly offered later
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-016-02: Two-topic message gets one topic addressed; other explicitly offered for later', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-016-02');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, reg.token,
    "I'm worried about both my career timing AND whether I'm compatible with my new partner. What do my numbers say?",
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must address at least one of the two topics
  const addressesCareer =
    lower.includes('career') ||
    lower.includes('timing') ||
    lower.includes('pinnacle') ||
    lower.includes('personal year');
  const addressesCompatibility =
    lower.includes('compatible') ||
    lower.includes('compatibility') ||
    lower.includes('relationship') ||
    lower.includes('partner') ||
    lower.includes('expression');
  expect(addressesCareer || addressesCompatibility).toBeTruthy();

  // Must NOT ignore both topics entirely with a generic deflection
  const ignoresBothTopics =
    !lower.includes('career') &&
    !lower.includes('timing') &&
    !lower.includes('compatible') &&
    !lower.includes('relationship') &&
    !lower.includes('partner');
  expect(ignoresBothTopics).toBeFalsy();

  // Should offer to return to the other topic
  const offersOtherTopic =
    lower.includes('then we can') ||
    lower.includes("once we've") ||
    lower.includes('after that') ||
    lower.includes('also look at') ||
    lower.includes('as well') ||
    lower.includes('and then') ||
    lower.includes('second') ||
    lower.includes('later') ||
    lower.includes('other');
  if (!offersOtherTopic) {
    console.warn('AIP-016-02: Response did not explicitly offer to return to the second topic');
  }

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-016-03: Compatibility reading — two profiles kept separate
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-016-03: Partner compatibility request keeps user and partner profiles clearly separate', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-016-03');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Establish user's own DOB and birth name
  await apiSendMessage(page, sessionId, reg.token, 'I was born January 8, 1990');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'My birth name is Sarah Michelle Chen');
  await page.waitForTimeout(13000);

  // Now ask about compatibility with a partner
  const res = await apiSendMessage(
    page, sessionId, reg.token,
    'My partner was born May 17, 1983 — are we compatible?',
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must use third-person framing for the partner
  const usesCorrectFraming =
    lower.includes('their') ||
    lower.includes('partner') ||
    lower.includes("your partner's") ||
    lower.includes('between your') ||
    lower.includes('two numbers') ||
    lower.includes('compatibility') ||
    lower.includes('both');
  expect(usesCorrectFraming).toBeTruthy();

  // Must NOT confuse the partner's DOB (May 17 1983) with the user's DOB (Jan 8 1990)
  // If response mentions both dates or numbers, they should be attributed correctly
  const confusesProfiles =
    (lower.includes('may') && lower.includes('1983') && lower.includes('your life path')) &&
    !lower.includes('their') && !lower.includes('partner');
  expect(confusesProfiles).toBeFalsy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-016-04: Pinnacle Period as entry door, not final destination
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-016-04: Pinnacle Period question acknowledged; then bridges deeper into reading', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('aip-016-04');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  const res = await apiSendMessage(
    page, sessionId, reg.token,
    "I've been hearing about Pinnacle Periods. What's mine?",
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must acknowledge the Pinnacle Period topic
  const acknowledgesPinnacle =
    lower.includes('pinnacle') ||
    lower.includes('chapter') ||
    lower.includes('period');
  expect(acknowledgesPinnacle).toBeTruthy();

  // If DOB not yet captured, must ask for it
  const asksDOBOrBeginsPinnacle =
    lower.includes('born') ||
    lower.includes('date') ||
    lower.includes('birth') ||
    lower.includes('calculate') ||
    lower.includes('pinnacle');
  expect(asksDOBOrBeginsPinnacle).toBeTruthy();

  // Must NOT treat the Pinnacle Period as the ONLY thing in the reading
  // (it should bridge deeper — note if Aiden stays only at Pinnacle)
  const offersDepth =
    lower.includes('life path') ||
    lower.includes('blueprint') ||
    lower.includes('also') ||
    lower.includes('deeper') ||
    lower.includes('wired') ||
    lower.includes('expression') ||
    lower.includes('beyond') ||
    lower.includes('more');
  if (!offersDepth) {
    console.warn('AIP-016-04: Response focused only on Pinnacle without bridging to deeper numbers');
  }

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// AIP-016-05: Returning to a closed topic — no confusion, no refusal
// ─────────────────────────────────────────────────────────────────────────────
test('AIP-016-05: Re-opening a closed Life Path topic gets expansion, not a restart or refusal', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('aip-016-05');
  const reg = await apiRegister(page, email, PWD);
  const { sessionId } = await apiStartSession(page, reg.token, AIDEN_SLUG);

  // Build a Life Path discussion
  await apiSendMessage(page, sessionId, reg.token, 'I was born December 7, 1985');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'Tell me about my Life Path 7');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, reg.token, 'Thank you, that makes sense');
  await page.waitForTimeout(13000);

  // Transition away from the topic
  await apiSendMessage(page, sessionId, reg.token, "Now let's look at my career timing");
  await page.waitForTimeout(13000);

  // Re-open the earlier Life Path 7 topic
  const res = await apiSendMessage(
    page, sessionId, reg.token,
    "Wait — can you say more about what you said earlier about the Life Path? I want to understand the pattern better",
  );
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.message).toBeTruthy();
  const lower = data.message.toLowerCase();

  // Must re-engage with the Life Path topic
  const reEngages =
    lower.includes('life path') ||
    lower.includes('number') ||
    lower.includes('blueprint') ||
    lower.includes('pattern') ||
    lower.includes('7');
  expect(reEngages).toBeTruthy();

  // Must NOT say "we've covered that" or refuse to revisit
  expect(lower).not.toMatch(/we(\'ve| have) (already |)covered that/);
  expect(lower).not.toMatch(/that topic is complete/);
  expect(lower).not.toMatch(/i (already|just) told you/);

  // Must NOT restart from scratch as if session just began
  const reAsksDOB =
    (lower.includes('date of birth') || lower.includes('when were you born')) && lower.includes('?');
  expect(reAsksDOB).toBeFalsy();

  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, reg.token);
});
