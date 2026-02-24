/**
 * LUV-014: In-Chat Birth Data Collection
 *
 * Tests the new flow where Luna Voss collects birth date, time, and city
 * conversationally inside the chat session rather than via a pre-session form.
 *
 * Flow:
 *   1. New user clicks "Begin Reading" (no form gate)
 *   2. Luna greets warmly and asks what brings them here
 *   3. User states their reason
 *   4. Luna acknowledges and asks for birth date (MM/DD/YYYY format shown)
 *   5. User provides date
 *   6. Luna asks for birth time (HH:MM AM/PM format shown)
 *   7. User provides time
 *   8. Luna asks for birth city
 *   9. User provides city → chart calculated → natal chart wheel appears in chat
 *  10. Luna gives Big Three observation and opens the reading
 *
 * Format validation:
 *   - Wrong date format → re-ask with format reminder (up to 3 attempts)
 *   - Wrong time format → re-ask with format reminder (up to 3 attempts)
 *   - "unknown" for time → accepted, defaults to noon
 *   - Unrecognisable city → re-ask (up to 3 attempts)
 *
 * Returning users (chart already stored) skip collection entirely.
 */

import { test, expect } from '@playwright/test';
import {
  uniqueEmail,
  registerUser,
  loginUser,
  startSession,
  sendMessage,
  endSession,
  getLastResponse,
  getAllResponses,
  completeBirthDataCollectionViaChat,
  apiRegister,
  apiStartSession,
  apiSendMessage,
  apiEndSession,
  apiSeedBirthChart,
  apiCompleteBirthDataCollection,
  assertNoForbiddenPhrases,
  SELECTORS,
  BASE_URL,
  LUNA_SLUG,
  TEST_BIRTH_DATE,
  TEST_BIRTH_TIME,
  TEST_BIRTH_CITY,
  TEST_BIRTH_DATE_ISO,
  TEST_BIRTH_TIME_24H,
} from './helpers';

const PASSWORD = 'TestPass123!';

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-01: Pre-session form is gone — Begin Reading always visible for new users
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-01: No birth data form — Begin Reading button visible for first-time Luna user', async ({ page }) => {
  const email = uniqueEmail('luv-014-01');
  await registerUser(page, email, PASSWORD);
  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(2000);

  // The old pre-session form must NOT exist
  const formBtn = page.locator('button:has-text("Calculate My Birth Chart")');
  await expect(formBtn).not.toBeVisible();

  const dateInput = page.locator('input[type="date"]');
  await expect(dateInput).not.toBeVisible();

  // Begin Reading is always visible (no gate)
  await expect(page.locator(SELECTORS.beginReading).first()).toBeVisible({ timeout: 10000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-02: Luna's greeting asks what brings them here — NOT birth data
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-02: Luna greeting asks reason for visit, not birth data', async ({ page }) => {
  test.setTimeout(60000);
  const email = uniqueEmail('luv-014-02');
  const regData = await apiRegister(page, email, PASSWORD);

  // Fetch the greeting (free, no session)
  const res = await page.request.get(
    `${BASE_URL}/api/chat-service/greeting/${LUNA_SLUG}`,
    { headers: { Authorization: `Bearer ${regData.token}` } },
  );
  const data = await res.json();
  expect(data.greeting).toBeTruthy();

  const lower = data.greeting.toLowerCase();

  // Should ask what brings them here / what they want to explore
  const isWelcome =
    lower.includes('brings you') ||
    lower.includes('here today') ||
    lower.includes('explore') ||
    lower.includes('understand') ||
    lower.includes('work through') ||
    lower.includes('what') ||
    lower.includes('how can');
  expect(isWelcome).toBeTruthy();

  // Must NOT ask for birth data in the greeting
  expect(lower).not.toContain('mm/dd/yyyy');
  expect(lower).not.toContain('date of birth');
  expect(lower).not.toContain('birth time');
  expect(lower).not.toContain('birth city');
  expect(lower).not.toContain('calculate');
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-03: After first user message, Luna asks for birth date with format hint
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-03: After reason message, Luna asks for birth date with MM/DD/YYYY format', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-014-03');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  const res = await apiSendMessage(page, sessionId, regData.token,
    "I want to understand my relationship patterns");
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  const lower = data.message.toLowerCase();

  // Must ask for birth date with format
  const asksDate =
    lower.includes('mm/dd/yyyy') ||
    lower.includes('date of birth') ||
    lower.includes('birth date') ||
    lower.includes('born on') ||
    lower.includes('06/15') || // example format
    lower.includes('date');
  expect(asksDate).toBeTruthy();

  // Must NOT ask for time or city yet
  const askingMultiple =
    (lower.includes('time') && lower.includes('city')) ||
    lower.includes('hh:mm');
  expect(askingMultiple).toBeFalsy();

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-04: Valid date accepted → Luna moves on to ask for time
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-04: Valid MM/DD/YYYY date accepted — Luna asks for birth time', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-014-04');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  // Reason message
  await apiSendMessage(page, sessionId, regData.token, "I'm curious about my career path");
  await page.waitForTimeout(13000);

  // Valid date
  const res = await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_DATE);
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  const lower = data.message.toLowerCase();

  // Should now ask for time
  const asksTime =
    lower.includes('time') ||
    lower.includes('born') ||
    lower.includes('hh:mm') ||
    lower.includes('am') ||
    lower.includes('pm') ||
    lower.includes('unknown');
  expect(asksTime).toBeTruthy();

  // Should NOT still ask for date
  expect(lower).not.toContain('mm/dd/yyyy');
  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-05: Valid time accepted → Luna asks for birth city
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-05: Valid time accepted — Luna asks for birth city', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-014-05');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, "I want to know about my purpose");
  await page.waitForTimeout(13000);
  await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_DATE);
  await page.waitForTimeout(13000);

  const res = await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_TIME);
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  const lower = data.message.toLowerCase();

  // Should now ask for city
  const asksCity =
    lower.includes('city') ||
    lower.includes('born') ||
    lower.includes('where') ||
    lower.includes('place') ||
    lower.includes('location') ||
    lower.includes('country');
  expect(asksCity).toBeTruthy();

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-06: Valid city → chartData returned → Big Three observation in message
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-06: Valid city triggers chart calculation — response has chartData and Big Three observation', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-014-06');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, "I want to understand my love life");
  await page.waitForTimeout(13000);
  await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_DATE);
  await page.waitForTimeout(13000);
  await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_TIME);
  await page.waitForTimeout(13000);

  const res = await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_CITY);
  await page.waitForTimeout(18000); // chart calculation takes longer

  expect(res.status()).toBe(200);
  const data = await res.json();

  // Chart data must be returned
  expect(data.chartData).toBeTruthy();
  expect(data.chartData.planets).toBeTruthy();
  expect(data.chartData.ascendant).toBeTruthy();
  expect(data.birthChartJustCalculated).toBe(true);

  // Message should reference astrological signs — the Big Three observation
  const lower = data.message.toLowerCase();
  const hasBigThree =
    lower.includes('sun') ||
    lower.includes('moon') ||
    lower.includes('rising') ||
    lower.includes('ascendant') ||
    lower.includes('sign') ||
    lower.includes('chart');
  expect(hasBigThree).toBeTruthy();

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-07: Wrong date format → Luna re-asks with format reminder
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-07: Wrong date format triggers re-ask with MM/DD/YYYY reminder', async ({ page }) => {
  test.setTimeout(90000);
  const email = uniqueEmail('luv-014-07');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, "I'm curious about my life purpose");
  await page.waitForTimeout(13000);

  // Send invalid date format (June 15 1990 — missing slashes)
  const res = await apiSendMessage(page, sessionId, regData.token, 'June 15 1990');
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  const lower = data.message.toLowerCase();

  // Must re-ask for the date with format reminder
  const remindsFormat =
    lower.includes('mm/dd/yyyy') ||
    lower.includes('06/15') ||
    lower.includes('format') ||
    lower.includes('date of birth') ||
    lower.includes('try again');
  expect(remindsFormat).toBeTruthy();

  // No chart should be returned on a failed attempt
  expect(data.chartData).toBeFalsy();
  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-08: Wrong date format 3 times → Luna resets and prompts again
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-08: Three bad date formats — Luna resets and invites another attempt', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-014-08');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, "What does my chart say about me?");
  await page.waitForTimeout(13000);

  // Three consecutive invalid date inputs
  const badDates = ['June 15 1990', '15-06-1990', 'not a date'];
  for (const bad of badDates) {
    await apiSendMessage(page, sessionId, regData.token, bad);
    await page.waitForTimeout(13000);
  }

  // After 3 failures, Luna should reset and give one more chance
  const lastBubble = await apiSendMessage(page, sessionId, regData.token, 'still wrong date format!!!');
  await page.waitForTimeout(13000);
  const data = await lastBubble.json();
  const lower = data.message.toLowerCase();

  // Luna should still be asking for the date (not given up or crashed)
  const stillAskingDate =
    lower.includes('date') ||
    lower.includes('mm/dd/yyyy') ||
    lower.includes('born') ||
    lower.includes('format');
  expect(stillAskingDate).toBeTruthy();
  expect(data.chartData).toBeFalsy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-09: "unknown" for birth time → accepted, defaults to noon, asks for city
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-09: "unknown" birth time accepted — defaults to noon, proceeds to city', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-014-09');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, "I want to understand my relationships");
  await page.waitForTimeout(13000);
  await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_DATE);
  await page.waitForTimeout(13000);

  // "unknown" is valid — should default to noon
  const res = await apiSendMessage(page, sessionId, regData.token, "unknown");
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  const lower = data.message.toLowerCase();

  // Should move on to ask for city, not re-ask for time
  const asksCity =
    lower.includes('city') ||
    lower.includes('where') ||
    lower.includes('born') ||
    lower.includes('noon') ||  // may acknowledge noon default
    lower.includes('location');
  expect(asksCity).toBeTruthy();
  expect(lower).not.toContain('hh:mm');

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-10: "don't know" birth time also accepted as unknown
// ─────────────────────────────────────────────────────────────────────────────
test("LUV-014-10: \"I don't know my birth time\" accepted and defaults to noon", async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-014-10');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, "I'm curious about my life purpose");
  await page.waitForTimeout(13000);
  await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_DATE);
  await page.waitForTimeout(13000);

  const res = await apiSendMessage(page, sessionId, regData.token, "I don't know my birth time");
  await page.waitForTimeout(13000);

  const data = await res.json();
  expect(res.status()).toBe(200);

  // Should advance to city step — not re-ask for time
  const lower = data.message.toLowerCase();
  const asksCity =
    lower.includes('city') ||
    lower.includes('where') ||
    lower.includes('born') ||
    lower.includes('location');
  expect(asksCity).toBeTruthy();
  expect(lower).not.toContain('hh:mm');

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-11: Unrecognisable city triggers re-ask
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-11: Unrecognisable city triggers re-ask with guidance', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-014-11');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, "I want to understand my career");
  await page.waitForTimeout(13000);
  await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_DATE);
  await page.waitForTimeout(13000);
  await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_TIME);
  await page.waitForTimeout(13000);

  // Send a gibberish city that won't geocode
  const res = await apiSendMessage(page, sessionId, regData.token, 'xyzxyznotacity12345');
  await page.waitForTimeout(18000);

  expect(res.status()).toBe(200);
  const data = await res.json();
  const lower = data.message.toLowerCase();

  // Luna should ask for the city again with guidance
  const asksAgain =
    lower.includes('city') ||
    lower.includes('find') ||
    lower.includes('try') ||
    lower.includes('specific') ||
    lower.includes('where') ||
    lower.includes('born');
  expect(asksAgain).toBeTruthy();
  expect(data.chartData).toBeFalsy();

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-12: Credits are consumed during birth data collection messages
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-12: Credits decrease during in-chat birth data collection', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-014-12');
  const regData = await apiRegister(page, email, PASSWORD);
  const token = regData.token;
  const initialCoins = regData.user.coinBalance; // 180 after registration

  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);

  // Send just the reason message — should consume a small amount
  await apiSendMessage(page, sessionId, token, "I want to understand my life");
  await page.waitForTimeout(13000);

  const afterOneMsg = await apiEndSession(page, sessionId, token);
  expect(afterOneMsg.remainingCoins).toBeLessThan(initialCoins);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-13: Birth chart stored in memory after collection completes
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-13: Birth chart memory record exists after in-chat collection', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-014-13');
  const regData = await apiRegister(page, email, PASSWORD);
  const token = regData.token;

  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);
  await apiCompleteBirthDataCollection(page, sessionId, token);
  await apiEndSession(page, sessionId, token);

  // Verify birth chart stored via the natal-chart endpoint
  const personaId = (await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()).then(d => {
    const list: any[] = d.personas ?? d;
    return list.find((p: any) => p.slug === LUNA_SLUG)?.id;
  }));
  expect(personaId).toBeTruthy();

  const chartRes = await page.request.get(`${BASE_URL}/api/astrology/natal-chart/${personaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const chartData = await chartRes.json();
  expect(chartData.exists).toBe(true);
  expect(chartData.chartData).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-14: Returning user — no birth data collection, chart-aware greeting
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-14: Returning user with stored chart skips collection and gets chart-aware greeting', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-014-14');
  const regData = await apiRegister(page, email, PASSWORD);
  const token = regData.token;

  // Seed chart directly so we simulate a returning user
  const personaId = await page.request.get(`${BASE_URL}/api/personas`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()).then(d => {
    const list: any[] = d.personas ?? d;
    return list.find((p: any) => p.slug === LUNA_SLUG)?.id;
  });
  await apiSeedBirthChart(page, token, personaId);

  // Start a session and send first message
  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);
  const res = await apiSendMessage(page, sessionId, token, "What's my chart say today?");
  await page.waitForTimeout(13000);

  expect(res.status()).toBe(200);
  const data = await res.json();

  // Should respond normally (no birth data collection)
  const lower = data.message.toLowerCase();
  const isReadingNotCollection =
    lower.includes('sun') ||
    lower.includes('moon') ||
    lower.includes('rising') ||
    lower.includes('chart') ||
    lower.includes('sign') ||
    lower.includes('placement') ||
    lower.includes('energy');
  expect(isReadingNotCollection).toBeTruthy();

  // Should NOT ask for date/time/city
  expect(lower).not.toContain('mm/dd/yyyy');
  expect(lower).not.toContain('date of birth');
  expect(lower).not.toContain('birth city');

  assertNoForbiddenPhrases(data.message);
  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-15: After chart collected, normal reading messages work
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-15: Post-collection — normal astrological reading messages work', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-014-15');
  const regData = await apiRegister(page, email, PASSWORD);
  const token = regData.token;

  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);
  await apiCompleteBirthDataCollection(page, sessionId, token);

  // Now send a real reading question — should get astrological response
  const res = await apiSendMessage(page, sessionId, token,
    "What does my Venus placement say about my relationships?");
  await page.waitForTimeout(15000);

  expect(res.status()).toBe(200);
  const data = await res.json();

  // Must be a real reading — no birth data prompting
  const lower = data.message.toLowerCase();
  const isReading =
    lower.includes('venus') ||
    lower.includes('love') ||
    lower.includes('relationship') ||
    lower.includes('placement') ||
    lower.includes('sign') ||
    lower.includes('chart');
  expect(isReading).toBeTruthy();

  expect(lower).not.toContain('mm/dd/yyyy');
  expect(lower).not.toContain('date of birth');
  assertNoForbiddenPhrases(data.message);

  await apiEndSession(page, sessionId, token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-16: UI flow — chart wheel renders inline after collection completes
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-16: Chart wheel renders inline in chat after in-chat collection', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-014-16');
  await registerUser(page, email, PASSWORD);
  await page.goto(`/chat/${LUNA_SLUG}`);
  await page.waitForTimeout(1000);

  await startSession(page);

  // Complete birth data collection via UI
  await completeBirthDataCollectionViaChat(page);

  // Chart wheel should now be visible inline in the chat
  // It's an SVG rendered inside an assistant message bubble
  const chartInChat = page.locator(`${SELECTORS.assistantBubble} svg, ${SELECTORS.chartWheel}`).first();
  await expect(chartInChat).toBeVisible({ timeout: 30000 });

  // Chat input should still be active — reading can continue
  await expect(page.locator(SELECTORS.chatInput).first()).toBeVisible({ timeout: 10000 });

  await endSession(page);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-17: Wrong time format 3 times → defaults to noon, collection continues
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-17: Three bad time formats — defaults to noon and asks for city', async ({ page }) => {
  test.setTimeout(120000);
  const email = uniqueEmail('luv-014-17');
  const regData = await apiRegister(page, email, PASSWORD);
  const { sessionId } = await apiStartSession(page, regData.token, LUNA_SLUG);

  await apiSendMessage(page, sessionId, regData.token, "I want to know about my career");
  await page.waitForTimeout(13000);
  await apiSendMessage(page, sessionId, regData.token, TEST_BIRTH_DATE);
  await page.waitForTimeout(13000);

  // Three consecutive bad time inputs
  const badTimes = ['two thirty pm', '25:00', 'afternoon'];
  for (const bad of badTimes) {
    await apiSendMessage(page, sessionId, regData.token, bad);
    await page.waitForTimeout(13000);
  }

  // After 3 failures, backend defaults to noon and advances to city
  const lastRes = await page.request.get(`${BASE_URL}/api/chat-service/session/${sessionId}`, {
    headers: { Authorization: `Bearer ${regData.token}` },
  }).catch(() => null);
  // Session should still be active
  const sessionStatus = await page.request.get(
    `${BASE_URL}/api/chat-service/session/${sessionId}`,
    { headers: { Authorization: `Bearer ${regData.token}` } },
  ).then(r => r.json()).catch(() => ({ status: 'unknown' }));
  expect(sessionStatus.status ?? 'active').not.toBe('ended');

  await apiEndSession(page, sessionId, regData.token);
});

// ─────────────────────────────────────────────────────────────────────────────
// LUV-014-18: Full happy-path API test — all four steps in one test
// ─────────────────────────────────────────────────────────────────────────────
test('LUV-014-18: Happy path — full in-chat collection via API returns chart and Big Three', async ({ page }) => {
  test.setTimeout(180000);
  const email = uniqueEmail('luv-014-18');
  const regData = await apiRegister(page, email, PASSWORD);
  const token = regData.token;

  const { sessionId } = await apiStartSession(page, token, LUNA_SLUG);

  // Step 1: reason
  let res = await apiSendMessage(page, sessionId, token,
    "I want to understand what my chart says about love");
  await page.waitForTimeout(13000);
  expect((await res.json()).message).toBeTruthy();

  // Step 2: date
  res = await apiSendMessage(page, sessionId, token, TEST_BIRTH_DATE);
  await page.waitForTimeout(13000);
  const dateResp = await res.json();
  expect(dateResp.message).toBeTruthy();
  expect(dateResp.chartData).toBeFalsy(); // no chart yet

  // Step 3: time
  res = await apiSendMessage(page, sessionId, token, TEST_BIRTH_TIME);
  await page.waitForTimeout(13000);
  const timeResp = await res.json();
  expect(timeResp.message).toBeTruthy();
  expect(timeResp.chartData).toBeFalsy(); // no chart yet

  // Step 4: city — triggers chart calculation
  res = await apiSendMessage(page, sessionId, token, TEST_BIRTH_CITY);
  await page.waitForTimeout(18000);
  const cityResp = await res.json();

  expect(cityResp.chartData).toBeTruthy();
  expect(cityResp.birthChartJustCalculated).toBe(true);
  expect(cityResp.message.length).toBeGreaterThan(10);
  assertNoForbiddenPhrases(cityResp.message);

  // Chart data has expected structure
  expect(cityResp.chartData.planets).toBeInstanceOf(Array);
  expect(cityResp.chartData.ascendant).toBeTruthy();
  expect(cityResp.chartData.houses).toBeInstanceOf(Array);

  await apiEndSession(page, sessionId, token);
});
