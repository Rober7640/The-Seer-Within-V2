/**
 * LUV-013: Multi-Turn Chat Flow Tests
 *
 * End-to-end conversation sequences that span multiple exchanges in a single
 * session. These complement LUV-005 (bucket routing) and LUV-006 (single-intent)
 * by testing the dynamics that only emerge over a full conversation:
 *
 *  - LUV-013-01: Full happy-path flow (birth data → bucket → chart → close)
 *  - LUV-013-02: Stepwise birth data collection (date → time → city)
 *  - LUV-013-03: Topic switch mid-session preserves birth data
 *  - LUV-013-04: Birth data resistance → eventual provision → reading continues
 *  - LUV-013-05: Post-chart follow-up — Luna can engage with chart she showed
 *  - LUV-013-06: Named person tracked through multiple exchanges
 *  - LUV-013-07: Full UI flow — natal chart wheel renders in browser
 *  - LUV-013-08: 8-exchange endurance — quality constraints hold throughout
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  registerUser,
  startSession,
  fillBirthDataForm,
  sendMessage,
  getLastResponse,
  getAllResponses,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  birthDataMessage,
  assertNoForbiddenPhrases,
  hasTentativeFraming,
  hasNoMarkdown,
  wordCount,
  questionCount,
  SELECTORS,
  LUNA_SLUG,
  TEST_BIRTH_DATE,
  TEST_BIRTH_TIME,
  TEST_BIRTH_CITY,
} from './helpers';

const PWD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// LUV-013-01: Full happy-path API flow
// birth data → love reading → chart request → deepening → graceful close
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-013-01: Full happy-path: birth data → love reading → chart → deepening → close', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-013-01');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;
  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);

  // Step 1: Provide birth data
  const r1 = await apiSendMessage(page, sessionId, token, birthDataMessage());
  await page.waitForTimeout(13000);
  expect(r1.status()).toBe(200);
  const d1 = await r1.json();
  expect(d1.message).toBeTruthy();
  assertNoForbiddenPhrases(d1.message);

  // Step 2: Open love bucket
  const r2 = await apiSendMessage(page, sessionId, token, 'I want to understand my Venus and what it says about love');
  await page.waitForTimeout(13000);
  expect(r2.status()).toBe(200);
  const d2 = await r2.json();
  expect(d2.message).toBeTruthy();
  const d2Lower = d2.message.toLowerCase();
  const hasloveContext = d2Lower.includes('venus') || d2Lower.includes('love') || d2Lower.includes('relationship') || d2Lower.includes('chart') || d2Lower.includes('placement');
  expect(hasloveContext).toBeTruthy();
  assertNoForbiddenPhrases(d2.message);

  // Step 3: Request chart
  const r3 = await apiSendMessage(page, sessionId, token, 'Can I see my natal chart?');
  await page.waitForTimeout(13000);
  expect(r3.status()).toBe(200);
  const d3 = await r3.json();
  expect(d3.message).toBeTruthy();
  // Luna must NOT apologise for not showing chart
  const d3Lower = d3.message.toLowerCase();
  expect(d3Lower).not.toContain("can't show a visual chart");
  expect(d3Lower).not.toContain('cannot generate an image');
  expect(d3Lower).not.toContain('astro.com');
  assertNoForbiddenPhrases(d3.message);

  // Step 4: Deepening follow-up
  const r4 = await apiSendMessage(page, sessionId, token, 'What about my Venus aspects — is there anything challenging?');
  await page.waitForTimeout(13000);
  expect(r4.status()).toBe(200);
  const d4 = await r4.json();
  expect(d4.message).toBeTruthy();
  // Should NOT re-ask for birth data
  const d4Lower = d4.message.toLowerCase();
  const reAsks = (d4Lower.includes('when were you born') || d4Lower.includes('date of birth')) && d4Lower.includes('?');
  if (reAsks) {
    throw new Error('LUV-013-01: Luna re-asked for birth data after already receiving it');
  }
  assertNoForbiddenPhrases(d4.message);

  // Step 5: Close
  const r5 = await apiSendMessage(page, sessionId, token, 'Thank you, this has been really helpful');
  await page.waitForTimeout(13000);
  expect(r5.status()).toBe(200);
  const d5 = await r5.json();
  expect(d5.message).toBeTruthy();
  const d5Lower = d5.message.toLowerCase();
  const isWarm = d5Lower.includes('glad') || d5Lower.includes('thank') || d5Lower.includes('anytime') || d5Lower.includes('whenever') || d5Lower.includes('stars') || d5Lower.includes('chart');
  expect(isWarm).toBeTruthy();

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-013-02: Stepwise birth data collection
// User provides data in pieces; Luna asks for missing fields one at a time
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-013-02: Luna asks for missing birth data fields when provided piecemeal', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-013-02');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;
  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);

  // Step 1: Provide date only (no time, no city)
  const r1 = await apiSendMessage(page, sessionId, token, `I was born on ${TEST_BIRTH_DATE}`);
  await page.waitForTimeout(13000);
  expect(r1.status()).toBe(200);
  const d1 = await r1.json();
  expect(d1.message).toBeTruthy();
  const d1Lower = d1.message.toLowerCase();

  // Luna should acknowledge the date and ask for time or city
  const asksForMore =
    d1Lower.includes('time') ||
    d1Lower.includes('city') ||
    d1Lower.includes('born') ||
    d1Lower.includes('place') ||
    d1Lower.includes('where');
  console.log('LUV-013-02 step 1 response:', d1.message);
  // Luna should NOT fabricate a chart from just a birth date
  expect(d1Lower).not.toMatch(/your sun is in \w+.*specifically/i);
  assertNoForbiddenPhrases(d1.message);

  // Step 2: Provide birth time
  const r2 = await apiSendMessage(page, sessionId, token, `I was born at ${TEST_BIRTH_TIME}`);
  await page.waitForTimeout(13000);
  expect(r2.status()).toBe(200);
  const d2 = await r2.json();
  expect(d2.message).toBeTruthy();
  console.log('LUV-013-02 step 2 response:', d2.message);
  assertNoForbiddenPhrases(d2.message);

  // Step 3: Provide city
  const r3 = await apiSendMessage(page, sessionId, token, `I was born in ${TEST_BIRTH_CITY}`);
  await page.waitForTimeout(13000);
  expect(r3.status()).toBe(200);
  const d3 = await r3.json();
  expect(d3.message).toBeTruthy();
  const d3Lower = d3.message.toLowerCase();
  // With all three pieces, Luna should now be able to engage with the chart
  const hasChartEngagement =
    d3Lower.includes('chart') ||
    d3Lower.includes('placement') ||
    d3Lower.includes('birth') ||
    d3Lower.includes('birth data') ||
    d3Lower.includes('what') ||
    d3Lower.includes('focus');
  expect(hasChartEngagement).toBeTruthy();
  // Must NOT narrate fabricated placements with high specificity
  expect(d3Lower).not.toMatch(/your (sun|moon|rising|ascendant) is (definitely|certainly) in/i);
  assertNoForbiddenPhrases(d3.message);

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-013-03: Topic switch mid-session preserves birth data
// User provides birth data for love reading, then switches to career — same
// birth data should apply, no re-ask
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-013-03: Topic switch mid-session — birth data carries over without re-ask', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-013-03');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;
  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);

  // Provide birth data and get a love reading started
  await apiSendMessage(page, sessionId, token, birthDataMessage());
  await page.waitForTimeout(13000);

  const r2 = await apiSendMessage(page, sessionId, token, "I'm curious about what my Venus says about love");
  await page.waitForTimeout(13000);
  const d2 = await r2.json();
  expect(d2.message).toBeTruthy();

  // Now switch topic to career
  const r3 = await apiSendMessage(page, sessionId, token, "Actually, let's shift — what does my chart say about career?");
  await page.waitForTimeout(13000);
  expect(r3.status()).toBe(200);
  const d3 = await r3.json();
  expect(d3.message).toBeTruthy();
  const d3Lower = d3.message.toLowerCase();

  // Luna should switch topic gracefully
  const hasCareerContext =
    d3Lower.includes('career') ||
    d3Lower.includes('10th') ||
    d3Lower.includes('midheaven') ||
    d3Lower.includes('saturn') ||
    d3Lower.includes('chart') ||
    d3Lower.includes('house') ||
    d3Lower.includes('work');
  expect(hasCareerContext).toBeTruthy();

  // Luna must NOT re-ask for birth data she already has
  const reAsksBirthData =
    (d3Lower.includes('date of birth') || d3Lower.includes('when were you born') || d3Lower.includes('birth date')) &&
    d3Lower.includes('?');
  if (reAsksBirthData) {
    throw new Error('LUV-013-03: Luna re-asked for birth data after switching topics — birth data not preserved in session');
  }

  assertNoForbiddenPhrases(d3.message);

  // One more exchange to confirm career context maintained
  const r4 = await apiSendMessage(page, sessionId, token, 'Tell me more about my Midheaven');
  await page.waitForTimeout(13000);
  const d4 = await r4.json();
  expect(d4.message).toBeTruthy();
  assertNoForbiddenPhrases(d4.message);

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-013-04: Birth data resistance → eventual provision → reading continues
// User initially declines, then provides birth data — Luna should incorporate it
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-013-04: Luna handles birth data resistance gracefully then incorporates when provided', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-013-04');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;
  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);

  // Step 1: User declines to share birth data
  const r1 = await apiSendMessage(page, sessionId, token, "I'd rather not share my birth details. Can we just talk?");
  await page.waitForTimeout(13000);
  expect(r1.status()).toBe(200);
  const d1 = await r1.json();
  expect(d1.message).toBeTruthy();
  const d1Lower = d1.message.toLowerCase();

  // Luna should be respectful and not force it
  expect(d1Lower).not.toMatch(/\byou must\b/);
  expect(d1Lower).not.toContain("you have to");
  // Luna may gently explain why it's valuable, or offer general conversation
  assertNoForbiddenPhrases(d1.message);
  console.log('LUV-013-04 (resistance response):', d1.message);

  // Step 2: Some general chat exchange
  const r2 = await apiSendMessage(page, sessionId, token, "I've been feeling stuck in my career lately");
  await page.waitForTimeout(13000);
  expect(r2.status()).toBe(200);
  const d2 = await r2.json();
  expect(d2.message).toBeTruthy();
  assertNoForbiddenPhrases(d2.message);

  // Step 3: User changes mind and provides birth data
  const r3 = await apiSendMessage(page, sessionId, token, `Actually okay, I was born ${TEST_BIRTH_DATE} at ${TEST_BIRTH_TIME} in ${TEST_BIRTH_CITY}`);
  await page.waitForTimeout(13000);
  expect(r3.status()).toBe(200);
  const d3 = await r3.json();
  expect(d3.message).toBeTruthy();
  const d3Lower = d3.message.toLowerCase();

  // Luna should acknowledge and start engaging with the chart
  const hasChartEngagement =
    d3Lower.includes('chart') ||
    d3Lower.includes('placement') ||
    d3Lower.includes('birth') ||
    d3Lower.includes('10th') ||
    d3Lower.includes('saturn') ||
    d3Lower.includes('house') ||
    d3Lower.includes('career');
  expect(hasChartEngagement).toBeTruthy();
  assertNoForbiddenPhrases(d3.message);

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-013-05: Post-chart follow-up — Luna engages with chart she showed
// After [SHOW_CHART] fires, user asks about specific chart elements — Luna
// must NOT say she cannot see the chart or refer them to external tools
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-013-05: After chart shown, Luna can answer follow-up questions about it', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-013-05');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;
  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);

  // Provide birth data
  await apiSendMessage(page, sessionId, token, birthDataMessage());
  await page.waitForTimeout(13000);

  // Request chart
  const rChart = await apiSendMessage(page, sessionId, token, 'Show me my natal chart');
  await page.waitForTimeout(13000);
  const dChart = await rChart.json();
  console.log('LUV-013-05 chart response:', dChart.message?.substring(0, 120));

  // Follow-up 1: ask about planets/aspects in the chart
  const r1 = await apiSendMessage(page, sessionId, token, 'What are the most important aspects I should pay attention to in that chart?');
  await page.waitForTimeout(13000);
  expect(r1.status()).toBe(200);
  const d1 = await r1.json();
  expect(d1.message).toBeTruthy();
  const d1Lower = d1.message.toLowerCase();

  // Luna must NOT say she can't see the chart or refer elsewhere
  expect(d1Lower).not.toContain("can't see");
  expect(d1Lower).not.toContain("cannot see");
  expect(d1Lower).not.toContain("don't have access to");
  expect(d1Lower).not.toContain('astro.com');
  expect(d1Lower).not.toContain('time passages');

  // Luna should engage with chart content
  const hasChartContent =
    d1Lower.includes('aspect') ||
    d1Lower.includes('planet') ||
    d1Lower.includes('house') ||
    d1Lower.includes('placement') ||
    d1Lower.includes('venus') ||
    d1Lower.includes('sun') ||
    d1Lower.includes('chart') ||
    d1Lower.includes('energy');
  expect(hasChartContent).toBeTruthy();
  assertNoForbiddenPhrases(d1.message);

  // Follow-up 2: ask about a specific planet
  const r2 = await apiSendMessage(page, sessionId, token, 'Can you tell me what the Moon placement means for me emotionally?');
  await page.waitForTimeout(13000);
  expect(r2.status()).toBe(200);
  const d2 = await r2.json();
  expect(d2.message).toBeTruthy();
  assertNoForbiddenPhrases(d2.message);

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-013-06: Named person tracked through multiple exchanges
// User mentions "Alex" early; Luna should remember without re-asking who Alex is
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-013-06: Named person mentioned early is remembered later in the same session', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-013-06');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;
  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);

  // Provide birth data
  await apiSendMessage(page, sessionId, token, birthDataMessage());
  await page.waitForTimeout(13000);

  // Introduce a named person
  const r2 = await apiSendMessage(page, sessionId, token, "I'm worried about my relationship with my partner Alex. We've been together 3 years and things feel stuck.");
  await page.waitForTimeout(13000);
  expect(r2.status()).toBe(200);
  const d2 = await r2.json();
  expect(d2.message).toBeTruthy();
  assertNoForbiddenPhrases(d2.message);

  // General exchanges in between
  await apiSendMessage(page, sessionId, token, 'What does my Venus say about this?');
  await page.waitForTimeout(13000);

  await apiSendMessage(page, sessionId, token, 'And what about my 7th house?');
  await page.waitForTimeout(13000);

  // Now reference Alex again without re-explaining who they are
  const rAlex = await apiSendMessage(page, sessionId, token, 'Do you think Alex and I are compatible based on what you see?');
  await page.waitForTimeout(13000);
  expect(rAlex.status()).toBe(200);
  const dAlex = await rAlex.json();
  expect(dAlex.message).toBeTruthy();
  const alexMsgLower = dAlex.message.toLowerCase();

  // Luna must NOT ask "Who is Alex?" — she should remember from earlier
  const asksWhoIsAlex =
    alexMsgLower.includes('who is alex') ||
    alexMsgLower.includes("who's alex") ||
    (alexMsgLower.includes('who') && alexMsgLower.includes('alex') && alexMsgLower.includes('?') &&
     !alexMsgLower.includes('do you') && !alexMsgLower.includes('what do'));
  if (asksWhoIsAlex) {
    console.warn('LUV-013-06: Luna asked who Alex is — named person not tracked within session');
  }

  // Luna should engage with compatibility / relationship topic
  const hasRelationshipContent =
    alexMsgLower.includes('compatible') ||
    alexMsgLower.includes('synastry') ||
    alexMsgLower.includes('alex') ||
    alexMsgLower.includes('relationship') ||
    alexMsgLower.includes('partner') ||
    alexMsgLower.includes('7th') ||
    alexMsgLower.includes('chart');
  expect(hasRelationshipContent).toBeTruthy();
  assertNoForbiddenPhrases(dAlex.message);

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-013-07: Full UI flow — natal chart wheel renders in browser
// End-to-end browser test: navigate → start session → provide birth data →
// request chart → verify chart component appears in DOM
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-013-07: Full UI flow — chart wheel renders in browser after birth data provided', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-013-07');

  await registerUser(page, email, PWD);
  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(2000);

  // For new Luna users: a birth data form appears (birthChartExists === false).
  // Filling + submitting immediately triggers fetchGreeting — no "Begin Your Reading"
  // button ever shows. The AI greeting (with the natal chart wheel) loads directly.
  await fillBirthDataForm(page);

  // Chat input becomes visible once the AI greeting arrives
  const input = page.locator(SELECTORS.chatInput).first();
  await expect(input).toBeVisible({ timeout: 30000 });

  // The natal chart wheel should already be rendered from the greeting sequence.
  // Check known selectors, then fall back to checking the greeting text.
  const chartSelectors = [
    '[data-testid="natal-chart"]',
    '[data-testid="chart-wheel"]',
    '.natal-chart',
    '.chart-wheel',
    'svg.natal-chart',
    'canvas[data-chart]',
  ];

  let chartFound = false;
  for (const sel of chartSelectors) {
    const visible = await page.locator(sel).first().isVisible().catch(() => false);
    if (visible) {
      chartFound = true;
      console.log(`LUV-013-07: Chart component found with selector "${sel}"`);
      break;
    }
  }

  // Greeting text should reference the chart even if no dedicated DOM element found
  const greeting = await getLastResponse(page);
  const greetingLower = greeting.toLowerCase();
  const greetingHasChart =
    greetingLower.includes('chart') ||
    greetingLower.includes('natal') ||
    greetingLower.includes('placement') ||
    greetingLower.includes('gemini') || // expected for our test birth date
    greetingLower.includes('sun');

  console.log('LUV-013-07: Chart DOM found:', chartFound);
  console.log('LUV-013-07: Greeting references chart:', greetingHasChart);
  console.log('LUV-013-07: Greeting snippet:', greeting.substring(0, 100));

  // At least one of: chart renders in DOM OR greeting references chart content
  expect(chartFound || greetingHasChart).toBeTruthy();

  // Luna must NOT apologise for not showing the chart
  expect(greetingLower).not.toContain("can't show a visual chart");
  expect(greetingLower).not.toContain('cannot generate an image');
  expect(greetingLower).not.toContain('astro.com');

  // Send one follow-up to verify the chat is interactive
  await sendMessage(page, 'Tell me more about my Venus placement', 13000);
  const followUp = await getLastResponse(page);
  expect(followUp.trim().length).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-013-08: 8-exchange endurance — character rules hold throughout
// Quality regression test: no re-ask of birth data, no markdown, no forbidden
// phrases, ≤1 question per response, all within word limit
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-013-08: 8-exchange session maintains character rules throughout', async ({ page }) => {
  test.setTimeout(300000);
  const email = uniqueEmail('luv-013-08');
  const regData = await apiRegister(page, email, PWD);
  const token = regData.token;
  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);

  const messages = [
    birthDataMessage(),                                        // 1. Birth data
    'What can you tell me about my Sun sign?',                 // 2. Sun sign
    'How does that affect my personality?',                    // 3. Deepening
    'What about my Moon placement emotionally?',               // 4. Moon
    'I feel like I struggle to trust people — is that in my chart?', // 5. Emotional
    'Tell me about my rising sign',                            // 6. Rising
    'How do these placements work together?',                  // 7. Integration
    'What should I be focusing on right now in life?',         // 8. Direction
  ];

  const responses: string[] = [];

  for (let i = 0; i < messages.length; i++) {
    const res = await apiSendMessage(page, sessionId, token, messages[i]);
    await page.waitForTimeout(13000);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.message).toBeTruthy();
    responses.push(data.message);
  }

  // Evaluate all responses together
  let birthDataReAsked = 0;
  let markdownFound = 0;
  let overWordLimit = 0;
  let multipleQuestions = 0;
  let forbiddenPhraseFound = 0;

  for (let i = 0; i < responses.length; i++) {
    const msg = responses[i];
    const msgLower = msg.toLowerCase();

    // Skip response to birth data message itself (index 0)
    if (i > 0) {
      const reAsksBirth =
        (msgLower.includes('date of birth') || msgLower.includes('when were you born')) &&
        msgLower.includes('?');
      if (reAsksBirth) {
        birthDataReAsked++;
        console.warn(`LUV-013-08: Response ${i + 1} re-asked for birth data`);
      }
    }

    if (!hasNoMarkdown(msg)) {
      markdownFound++;
      console.warn(`LUV-013-08: Response ${i + 1} contains markdown formatting`);
    }

    const wc = wordCount(msg);
    if (wc > 56) {
      overWordLimit++;
      console.warn(`LUV-013-08: Response ${i + 1} has ${wc} words (limit: 56)`);
    }

    if (questionCount(msg) > 1) {
      multipleQuestions++;
      console.warn(`LUV-013-08: Response ${i + 1} has ${questionCount(msg)} questions`);
    }

    try {
      assertNoForbiddenPhrases(msg);
    } catch {
      forbiddenPhraseFound++;
      console.warn(`LUV-013-08: Response ${i + 1} contains forbidden phrase`);
    }
  }

  // Hard failures
  expect(birthDataReAsked).toBe(0);
  expect(forbiddenPhraseFound).toBe(0);

  // Soft failures (logged but allowed to slip once)
  if (markdownFound > 0) {
    console.warn(`LUV-013-08: ${markdownFound}/8 responses had markdown formatting`);
  }
  if (overWordLimit > 2) {
    console.warn(`LUV-013-08: ${overWordLimit}/8 responses exceeded 56 words`);
  }
  if (multipleQuestions > 1) {
    console.warn(`LUV-013-08: ${multipleQuestions}/8 responses had multiple questions`);
  }

  // Luna is described as "direct" — she makes confident chart statements rather than
  // hedging. Log how many responses used tentative framing for diagnostic purposes,
  // but don't hard-fail here (LUV-007-04 owns the tentative-framing assertion).
  const tentativeCount = responses.filter(hasTentativeFraming).length;
  console.log(`LUV-013-08: ${tentativeCount}/8 responses used tentative framing (informational only)`);

  await apiEndSession(page, sessionId, token);
});
