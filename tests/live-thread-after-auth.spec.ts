import { test, expect, type Page } from "@playwright/test";

// Browser coverage for the FIRST SCREEN AFTER SIGN-IN — the half of the
// email→lander→chat handoff that live-thread-evelyn.spec.ts stops short of.
//
// That file walks the lander and ends at the email ask. Everything after it —
// the reader lands on /reading and sees [greeting][their parked words][her
// answer] — had no browser coverage at all, and it is where both of the last two
// bugs actually surfaced (2026-08-19: the answer arriving with no idea what the
// letter was about; 2026-08-20: it arriving as one 50-word block while the
// lander two screens earlier arrived in pieces).
//
// ── What this asserts, and what it deliberately cannot ───────────────────────
// The greeting and the answer are both written by the model on the server, so
// their WORDS are not assertable here — they are pinned where they are decided,
// in server/lib/arrivalReading.ts's builders and their unit tests. What only a
// browser can see is the SHAPE of the screen, which is exactly what changed:
//   - the three parts arrive in the right order;
//   - the answer is broken into several bubbles rather than one block;
//   - and the split keeps every word, in order.
//
// ── What is stubbed, and why ──────────────────────────────────────────────────
// /greeting is stubbed FIRST because it is an unstubbed model call on every
// request — the one endpoint live-thread-evelyn.spec.ts's header singles out as
// "deliberately NOT exercised anywhere here". Leaving it live would bill the
// account on every run of every case below. /live-thread is stubbed because the
// real one needs a parked reply on a lander row belonging to this reader, and
// with both stubbed nothing in this file writes a row, starts a session, or
// starts a meter.
//
// 🔒 SAFETY: localhost only, hard-refused otherwise.
//
// ── RUN IT ───────────────────────────────────────────────────────────────────
//   PORT=5100 BASE_URL=http://localhost:5100 npx cross-env NODE_ENV=development \
//     npx tsx --env-file=.env.test server/index.ts
//   npx playwright test --config=playwright.live-thread.config.ts

const AUTH_TOKEN_KEY = "seer_auth_token";
const PERSONA_ID = "qa-evelyn-persona-id";
const PERSONA_SLUG = "evelyn-cross";

/** Stands in for the arrival greeting. Short, because since 2026-08-19 it is. */
const GREETING = "Good — you came back to finish the chains. I have what you told me.";

/** What the reader typed into the lander before they had an account. */
const PARKED_REPLY = "I keep going back to my ex even though she treats me badly";

// Her answer to it. THREE sentences on purpose: this is the shape that used to
// land as one block, and splitIntoBubbles turns it into more than one bubble.
// Every sentence is asserted, so a split that drops or reorders a clause fails.
const ANSWER_SENTENCES = [
  "The chains feel comfortable because they are familiar, don't they?",
  "You already know this pattern is not serving you, and something still pulls you back.",
  "What do you believe would happen if you walked away and stayed away?",
] as const;
const ANSWER = ANSWER_SENTENCES.join(" ");

/** A one-sentence answer, which must stay ONE bubble — the control case. */
const SHORT_ANSWER = "Then say the sentence out loud and we will look at what it is tied to.";

// The reveal is paced with typing beats (400ms + a delay per bubble), so every
// wait here has to outlast an animation, not a network. Same reasoning as
// live-thread-evelyn.spec.ts's BUBBLE_TIMEOUT_MS.
const BUBBLE_TIMEOUT_MS = 20_000;

interface HarnessOptions {
  /** Her answer to the parked reply. `null` models a failed generation. */
  response?: string | null;
  /** No parked reply at all — i.e. everyone who did not come from a letter. */
  noLiveThread?: boolean;
}

async function harness(page: Page, opts: HarnessOptions = {}) {
  // Signed in before the app boots. useAuth reads this key on mount, so setting
  // it afterwards would race the first render.
  await page.addInitScript(
    ([key, token]) => window.localStorage.setItem(key, token),
    [AUTH_TOKEN_KEY, "qa-fake-jwt"],
  );

  await page.route("**/api/auth/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "qa-after-auth-user",
          email: "after.auth.qa@example.com",
          firstName: "Priya",
          emailVerified: true,
          coinBalance: 1495,
          defaultPersonaId: PERSONA_ID,
        },
      }),
    }),
  );

  await page.route("**/api/personas", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: PERSONA_ID,
          slug: PERSONA_SLUG,
          displayName: "Evelyn Cross",
          tagline: "Spiritual guide",
          avatarUrl: null,
          description: null,
          categories: null,
          isActive: true,
          isOnline: true,
          coinsPerMinute: 299,
        },
      ]),
    }),
  );

  await page.route("**/api/credits/pricing**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ variant: "A", tiers: [] }) }),
  );

  // ⚠ The model call. Stubbed on every path — see this file's header.
  await page.route(`**/api/chat-service/greeting/${PERSONA_SLUG}`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ greeting: GREETING, pricing: { freeCoins: 1495 } }),
    }),
  );

  await page.route(`**/api/chat-service/live-thread/${PERSONA_SLUG}`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        opts.noLiveThread
          ? { liveThread: null }
          : { liveThread: { reply: PARKED_REPLY, response: opts.response === undefined ? ANSWER : opts.response } },
      ),
    }),
  );

  // Nothing below should ever reach these, and a test that starts billing must
  // fail loudly rather than quietly spend a grant.
  await page.route("**/api/chat-service/session/**", (r) =>
    r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "no session in this suite" }) }),
  );
}

/** Assistant bubbles in thread order. The first one carries its own test id. */
async function assistantTexts(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll('[data-testid="chat-greeting"], [data-testid="assistant-message"]'),
    ).map((n) => (n.textContent || "").trim()),
  );
}

const readingUrl = `/reading?persona=${PERSONA_SLUG}`;

test.describe("after authentication — the arrival screen", () => {
  test.beforeAll(({}, testInfo) => {
    const base = String(testInfo.project.use.baseURL ?? "");
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
      throw new Error(`🔴 REFUSING to run against "${base}" — localhost sandbox only.`);
    }
  });

  test("her answer arrives in SEVERAL bubbles, not one block", async ({ page }) => {
    await harness(page);
    await page.goto(readingUrl, { waitUntil: "domcontentloaded" });

    // Wait for the last sentence — everything before it has landed by then.
    await expect(page.getByText(ANSWER_SENTENCES[2], { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });

    const texts = await assistantTexts(page);
    // [0] is the greeting. Her answer is what follows it.
    const answerBubbles = texts.slice(1);
    expect(
      answerBubbles.length,
      `expected the answer to be split; got ${answerBubbles.length} bubble(s): ${JSON.stringify(answerBubbles)}`,
    ).toBeGreaterThan(1);

    // Nothing lost and nothing reordered: the bubbles joined back together are
    // the answer the server sent, whitespace aside.
    const rejoined = answerBubbles.join(" ").replace(/\s+/g, " ").trim();
    expect(rejoined).toBe(ANSWER.replace(/\s+/g, " ").trim());
  });

  test("the screen reads greeting → their words → her answer", async ({ page }) => {
    await harness(page);
    await page.goto(readingUrl, { waitUntil: "domcontentloaded" });

    await expect(page.getByText(ANSWER_SENTENCES[2], { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });

    // Roles in DOM order, which is thread order. The reader's own line must sit
    // BETWEEN the greeting and the answer: above it, she would be answering
    // something not yet on screen; below it, the answer would read as unprompted.
    const roles = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          '[data-testid="chat-greeting"], [data-testid="assistant-message"], [data-testid="user-message"]',
        ),
      ).map((n) => n.getAttribute("data-testid")),
    );
    const firstUser = roles.indexOf("user-message");
    const firstAnswer = roles.indexOf("assistant-message");
    expect(roles[0]).toBe("chat-greeting");
    expect(firstUser).toBeGreaterThan(0);
    expect(firstAnswer).toBeGreaterThan(firstUser);

    await expect(page.getByText(PARKED_REPLY, { exact: false })).toBeVisible();
    await expect(page.getByText(GREETING, { exact: false })).toBeVisible();
  });

  test("a one-sentence answer stays a single bubble", async ({ page }) => {
    await harness(page, { response: SHORT_ANSWER });
    await page.goto(readingUrl, { waitUntil: "domcontentloaded" });

    await expect(page.getByText(SHORT_ANSWER, { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });

    // The split follows the sentences; it does not chop a sentence up to hit a
    // bubble count. One sentence in, one bubble out.
    const texts = await assistantTexts(page);
    expect(texts.slice(1)).toEqual([SHORT_ANSWER]);
  });

  test("a failed generation still shows the reader their own words", async ({ page }) => {
    await harness(page, { response: null });
    await page.goto(readingUrl, { waitUntil: "domcontentloaded" });

    // The continuity the reader came for survives a model failure: their line is
    // in the thread, and the persona answers it on her next real turn.
    await expect(page.getByText(PARKED_REPLY, { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    const texts = await assistantTexts(page);
    expect(texts).toEqual([GREETING]);
  });

  test("a reader with nothing parked sees only the greeting", async ({ page }) => {
    await harness(page, { noLiveThread: true });
    await page.goto(readingUrl, { waitUntil: "domcontentloaded" });

    await expect(page.getByText(GREETING, { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });

    // All normal traffic. The screen must be exactly what it was before any of
    // this existed — no stray bubble, no empty user message.
    await expect(page.getByTestId("user-message")).toHaveCount(0);
    const texts = await assistantTexts(page);
    expect(texts).toEqual([GREETING]);
  });
});
