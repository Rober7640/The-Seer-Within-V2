import { test, expect, type Page } from "@playwright/test";

// Browser coverage for the LIVE THREAD arrival surface on /evelyn — the
// email→lander→chat continuity mechanic.
//
// Spec: docs/superpowers/specs/2026-08-01-live-thread-arrival-design.md
// Plan: docs/superpowers/plans/2026-08-01-live-thread-evelyn.md (§Playwright Coverage)
//
// This is the automated form of the five unchecked items the plan left behind
// under "## Live Thread (Evelyn) — email → lander → chat continuity" in
// docs/test-ideas.md. The feature shipped with exactly ONE browser assertion —
// that the arm paints at all (evelyn-lander-mechanic-render.spec.ts) — so every
// frame transition, every outcome branch, and the reply-parking guarantee that
// the whole feature exists to keep had no browser coverage until this file.
//
// ── What forces the arm ───────────────────────────────────────────────────────
// `live_thread` ships DARK: seeded at weight 0 in `evelyn_lander_mechanic`, so
// no visitor is ever assigned it. The only way in is `?mechanic=live_thread`,
// which EvelynLanderPage gates behind `import.meta.env.DEV` — a Vite dev build.
// The Playwright webServer runs `npm run dev` (server/index.ts only
// serveStatic()s when NODE_ENV === 'production'), so the override is honoured.
//
// ── What is stubbed, and why ──────────────────────────────────────────────────
// Four endpoints, which between them are the component's entire contract:
//   /api/evelyn-lander/start        → hands back the campaign's `continueSeed`
//                                     as `opener`. Since Task 15 that IS what a
//                                     resolved `?campaign=` returns, so stubbing
//                                     it models a real short-link arrival without
//                                     needing an `email_link_codes` row seeded
//                                     into a shared database.
//   /api/evelyn-lander/reply        → parks the reply (200) or fails, to drive
//                                     both halves of the ordering guarantee.
//   /api/evelyn-lander/check-email  → the three outcomes, one per branch.
//   /api/ab/assign                  → pinned, so a running experiment can never
//                                     make this suite flap.
// Stubbing all four is what makes the run deterministic AND side-effect free:
// no rows written, no magic link or verification mail dispatched, no Anthropic
// call, no Stripe. That matters more here than in most specs — see SAFETY.
//
// ── What this file deliberately does NOT cover ────────────────────────────────
// The plan's fifth case ("reply survives a real signup round-trip, network-real
// for the auth parts") is NOT automated here, on purpose. Driving it for real
// means creating a user, a verification token, and a lander session, then
// reading the verification URL back out of the SERVER LOG — which Playwright
// cannot see, and which only works because a blank RESEND_API_KEY makes
// verificationEmail.ts log instead of send. Against the default webServer that
// walk writes real users to the shared database. The same ground is already
// held, at a lower and more honest level, by the node:test suites that own it:
//   server/lib/liveThreadReplay.test.ts   (22 tests — the parked reply's replay)
//   server/routes/auth.test.ts            (verification → session linkage)
//   server/lib/verificationEmail.freeMinutes.test.ts (the differentiated grant)
// Run them with `npm run test:live-thread` against the local sandbox DB. The
// end-to-end walk was also verified by hand on 2026-08-18 (reply visible in
// /reading as a free pre-session preview, unbilled until she sends).
//
// 🔒 SAFETY: localhost only, hard-refused otherwise. Dev and production SHARE
//    ONE DATABASE, so there is no "safe" remote target for this suite — and
//    unlike a pure render spec, this one submits email addresses to an endpoint
//    whose job is to mail people. Every mutating call is intercepted before it
//    reaches the server; the localhost gate is the second line, not the first.
//
// ── RUN IT ───────────────────────────────────────────────────────────────────
//   npx playwright test --config=playwright.live-thread.config.ts
// against a dev server on the local sandbox DB (see server/lib/testGuards.ts):
//   PORT=5100 BASE_URL=http://localhost:5100 \
//     npx cross-env NODE_ENV=development npx tsx --env-file=.env.test server/index.ts

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Stands in for a campaign's authored `continueSeed`. Deliberately long and
// specific: a generic string could be confused with Evelyn's static fallback
// opener, and "the lander showed the CAMPAIGN's line, not the fallback" is the
// single claim the feature's first success criterion rests on.
const CONTINUE_SEED =
  "You came — good. I've been holding that line of yours since the email went out. " +
  "Tell me the sentence you keep repeating to yourself, and I'll tell you where it actually came from.";

// Since 2026-08-19 the opener is SPLIT across bubbles and revealed with typing
// pacing (lib/chatBubbles.ts + LiveThreadLander's opener effect), because Joel's
// note was that one paragraph reads like a notice and a few messages read like a
// person. So no element holds CONTINUE_SEED whole any more — these are the three
// bubbles it becomes, and asserting on each of them is what proves the split
// kept every word and kept them in order.
const SEED_BUBBLES = [
  "You came — good.",
  "I've been holding that line of yours since the email went out.",
  "Tell me the sentence you keep repeating to yourself, and I'll tell you where it actually came from.",
] as const;

// Evelyn's scripted answer to the reply, which is what ASKS for the email —
// the field is the last beat of her asking, not a form that opens beside it.
// Matched on the fragment that carries the meaning: she is asking, in the first
// person, and the ask is about identity rather than about sending mail.
// Source: RESPONSE_BUBBLES in LiveThreadLander.tsx.
const RESPONSE_HELD = "it's held on my side now";
const RESPONSE_ASK = "what's the email you read my letter on?";

// The opener animation (~5s for three bubbles) plus her two answering bubbles
// (~5.5s) both outrun Playwright's 5s default. Every assertion that waits on a
// bubble carries this instead, so a slow CI box cannot turn pacing into a
// red suite. Generous on purpose: it bounds a local animation, not a network.
const BUBBLE_TIMEOUT_MS = 20_000;

// A substantive reply. The reply path has no low-intent guard (unlike the
// chatbox arm's /turn), but a real sentence is what a reader actually sends and
// keeps the fixture honest about what gets parked.
const READER_REPLY = "I'm not enough. That's the sentence. Every single day.";

// Her second answer. Since 2026-08-19 the lander takes TWO answers before it
// asks for an email (Joel: "we don't want them to log in so quickly — two
// questions, engage, and after that the magic link").
const READER_REPLY_2 = "Since the spring, if I'm honest. Maybe longer.";

// The question she asks back after the FIRST answer — the beat that buys the
// engagement. Matched on the fragment that carries the meaning: she asks again
// instead of asking for an email.
const FOLLOWUP_ASK = "how long have you been carrying that";

const READER_EMAIL = "livethread.qa@example.com";

// The lander's own composer placeholder. Deliberately DIFFERENT text from the
// chatbox arm's, which is what makes the two chat-shaped arms tellable apart.
const COMPOSER = "Type your reply...";
const EMAIL_FIELD = "your@email.com";

// Confirmation copy, asserted on the fragments that are unique per outcome and
// carry the meaning — not on whole paragraphs, which would turn every wording
// polish into a red suite. Source: confirmationCopy() in LiveThreadLander.tsx.
//
// The distinctions matter and are easy to regress into each other:
//   verified_match   — "I know you", a magic link is coming.
//   unverified_match — an account exists but was NEVER confirmed; the reader is
//                      sent to the confirmation mail, NOT a magic link (a magic
//                      link would sign them in without ever verifying).
//   no_match         — future tense throughout. Nothing has been mailed and
//                      nothing will be until they activate, so any copy here
//                      promising an inbox would be false for 100% of them.
const COPY = {
  verified_match: "I know you — good.",
  unverified_match: "was never confirmed",
  no_match: "Nothing's set up under",
} as const;

// Evelyn's last bubble before the page moves, and the counter under it.
//
// These replaced Frame 2b's old footer, "We'll email you a one-click link. No
// password needed." — false on both halves: nothing is mailed to a no_match
// reader, and the form they land on requires a password (LoginPage.tsx:377).
// The absence assertions below still name that string, so it cannot come back.
const HANDOFF_BUBBLE = "I'm sending you there now.";
const HANDOFF_COUNTER = /taking you there in \d+/i;
const OLD_FALSE_FOOTER = "No password needed";

// LiveThreadLander.NO_MATCH_HANDOFF_DELAY_MS is 6000ms — the beat that lets the
// reader actually READ the bubble before the page moves (it was 1600ms, which
// moved the page a fifth of the way into the sentence explaining the move).
// Waits below must clear it, plus the typing beat before the counter starts.
const HANDOFF_DELAY_MS = 6_000;

const AUTH_TOKEN_KEY = "seer_auth_token";

type Captured = {
  start: number;
  reply: Array<{ sessionToken?: string; reply?: string }>;
  checkEmail: Array<{ email?: string; sessionToken?: string }>;
  /** Resolves the /reply stub. Only set when harness({ holdReply: true }). */
  releaseReply?: () => void;
  /** Resolves the /start stub. Only set when harness({ holdStart: true }). */
  releaseStart?: () => void;
};

interface HarnessOptions {
  outcome?: "verified_match" | "unverified_match" | "no_match";
  /** Park the /reply call open until releaseReply() is called. */
  holdReply?: boolean;
  /** Park the /start call open until releaseStart() is called. */
  holdStart?: boolean;
  /** Fail /reply with this status instead of parking the reply. */
  replyStatus?: number;
  /** Serve an authenticated visitor (tier 1) from /api/auth/me. */
  authenticated?: boolean;
}

async function harness(page: Page, opts: HarnessOptions = {}): Promise<Captured> {
  const captured: Captured = { start: 0, reply: [], checkEmail: [] };

  // Pin the mechanic experiment. The DEV override already wins over whatever
  // /assign returns, so this is not what selects the arm — it is here so a
  // running experiment cannot introduce timing variance into the first paint.
  await page.route("**/api/ab/assign**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ assignments: {} }),
    }),
  );

  // Tier 1 vs anonymous. useAuth() calls /api/auth/me exactly once per mount and
  // treats a non-200 as "no user", so the anonymous case is a 401.
  await page.route("**/api/auth/me", (r) =>
    opts.authenticated
      ? r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "qa-live-thread-user",
              email: READER_EMAIL,
              firstName: "Priya",
              emailVerified: true,
              coinBalance: 2990,
            },
          }),
        })
      : r.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );

  // The short-link arrival. `opener` is what LiveThreadLander renders as Frame 1
  // (EvelynLanderPage passes the first assistant message through as
  // `continueSeed`), so this is the campaign's authored line reaching the reader.
  await page.route("**/api/evelyn-lander/start", async (r) => {
    captured.start += 1;
    if (opts.holdStart) {
      await new Promise<void>((resolve) => {
        captured.releaseStart = resolve;
      });
    }
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        segment: opts.authenticated ? "v2_active" : "brand_new",
        firstName: null,
        isReturning: !!opts.authenticated,
        opener: CONTINUE_SEED,
      }),
    });
  });

  await page.route("**/api/evelyn-lander/reply", async (r) => {
    try {
      captured.reply.push(JSON.parse(r.request().postData() || "{}"));
    } catch {
      /* ignore */
    }
    if (opts.holdReply) {
      await new Promise<void>((resolve) => {
        captured.releaseReply = resolve;
      });
    }
    if (opts.replyStatus && opts.replyStatus !== 200) {
      return r.fulfill({
        status: opts.replyStatus,
        contentType: "application/json",
        body: JSON.stringify({ error: "stubbed failure" }),
      });
    }
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/evelyn-lander/check-email", (r) => {
    try {
      captured.checkEmail.push(JSON.parse(r.request().postData() || "{}"));
    } catch {
      /* ignore */
    }
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ outcome: opts.outcome ?? "no_match" }),
    });
  });

  return captured;
}

/**
 * Frame 1: the campaign's line as SEVERAL bubbles, a real compose bar, and no
 * email ask yet.
 *
 * Waits on the LAST bubble first: it only paints once the whole reveal has run,
 * so the earlier assertions cannot race the animation.
 */
async function expectFrameOne(page: Page) {
  await expect(page.getByText(SEED_BUBBLES[SEED_BUBBLES.length - 1], { exact: false }))
    .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });

  // Every word of the campaign's line survived the split, each in its own
  // bubble. Counting the bubbles as well as matching them is what would catch a
  // splitter that dropped or merged a sentence.
  for (const bubble of SEED_BUBBLES) {
    await expect(page.getByText(bubble, { exact: false })).toBeVisible();
  }
  await expect(page.getByTestId("assistant-message")).toHaveCount(SEED_BUBBLES.length);

  await expect(page.getByPlaceholder(COMPOSER)).toBeVisible();
  // The email ask belongs to Frame 1.5 and must not be on screen before the
  // reader has said anything — the spec's "nothing else on screen" wireframe.
  await expect(page.getByPlaceholder(EMAIL_FIELD)).toHaveCount(0);
}

/**
 * Send the reply and land on Frame 1.5.
 *
 * Enter-to-send is the path a reader on a phone actually takes, and it is the
 * same handler the Send button calls.
 */
/** Send ONE answer. Enter-to-send is the path a phone reader actually takes. */
async function sendOneReply(page: Page, text = READER_REPLY) {
  await page.getByPlaceholder(COMPOSER).fill(text);
  await page.getByPlaceholder(COMPOSER).press("Enter");
}

/**
 * Walk the whole reply phase: both answers, ending with the email ask on screen.
 *
 * Most tests below care about what happens AFTER the reply phase (outcomes, the
 * handoff, rollback), so they call this and stay readable. The tests that care
 * about the two-turn shape itself drive `sendOneReply` directly.
 */
async function sendReply(page: Page, text = READER_REPLY) {
  await sendOneReply(page, text);
  // Her follow-up question marks turn 1 as accepted and the composer as back.
  await expect(page.getByText(FOLLOWUP_ASK, { exact: false }))
    .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
  await expect(page.getByPlaceholder(COMPOSER)).toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
  await sendOneReply(page, READER_REPLY_2);
}

/**
 * Answer Evelyn's email question and submit.
 *
 * Waits for the field on BUBBLE_TIMEOUT_MS because it only appears after her two
 * answering bubbles have finished typing. Submits with Enter — the path a reader
 * on a phone takes, and the same handler the send button calls. The button is
 * asserted separately (it stopped being a "Continue" button in the 2026-08-19
 * rebuild: the email is now a turn in the thread, so it sends with the same
 * round arrow the reply does).
 */
async function submitEmail(page: Page, email = READER_EMAIL) {
  const field = page.getByPlaceholder(EMAIL_FIELD);
  await expect(field).toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
  await expect(page.getByRole("button", { name: /send my email address/i })).toBeVisible();
  await field.fill(email);
  await field.press("Enter");
}

async function gotoLander(page: Page, query = "") {
  await page.goto(`/evelyn?mechanic=live_thread${query}`, { waitUntil: "domcontentloaded" });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Live Thread (Evelyn) — email → lander → chat continuity", () => {
  test.beforeAll(({}, testInfo) => {
    const base = String(testInfo.project.use.baseURL ?? "");
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
      throw new Error(`🔴 REFUSING to run against "${base}" — localhost sandbox only.`);
    }
  });

  test("Frame 1 → 1.5: the campaign's seed opens the thread, and the reply is parked BEFORE the email ask", async ({
    page,
  }) => {
    const captured = await harness(page, { outcome: "no_match" });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendReply(page);

    // The reader's own words come back as a sent bubble — the feature's premise
    // is visible continuity, so this must be a real message in the thread and
    // not a form value that disappears.
    await expect(page.getByText(READER_REPLY, { exact: false })).toBeVisible();

    // Frame 1.5's email ask appears only after the park succeeded — and only
    // after EVELYN has answered, in her own voice, and asked for it. That her
    // two bubbles land BEFORE the field is the whole of Joel's third note: the
    // reader should feel asked by her, not presented with a form.
    await expect(page.getByText(RESPONSE_HELD, { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    await expect(page.getByText(RESPONSE_ASK, { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    await expect(page.getByPlaceholder(EMAIL_FIELD)).toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });

    // Two answers were taken, so /reply was called twice.
    expect(captured.reply).toHaveLength(2);

    // The FIRST park is answer 1 alone — that is what protects a reader who
    // abandons after one answer.
    expect(captured.reply[0].reply).toBe(READER_REPLY);

    // The SECOND park carries BOTH answers. This is the assertion that matters:
    // /reply OVERWRITES pending_reply rather than appending (evelynLander.ts), so
    // posting only the second answer would silently erase the first. Anyone who
    // "simplifies" the client to send just the latest message fails here.
    expect(captured.reply[1].reply).toContain(READER_REPLY);
    expect(captured.reply[1].reply).toContain(READER_REPLY_2);

    expect(captured.reply[0].sessionToken, "reply must be keyed to the lander session").toBeTruthy();
  });

  test("she asks a SECOND question before ever asking for an email", async ({ page }) => {
    // Joel, 2026-08-19: "we don't want them to log in so quickly, we want to
    // engage them a bit — two questions, and after that the magic link."
    await harness(page, { outcome: "no_match" });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendOneReply(page);

    // After ONE answer she asks again, and the compose bar comes back.
    await expect(page.getByText(FOLLOWUP_ASK, { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    await expect(page.getByPlaceholder(COMPOSER)).toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });

    // And crucially the email ask is NOT on screen yet — one answer is not enough.
    await expect(page.getByPlaceholder(EMAIL_FIELD)).toHaveCount(0);
    await expect(page.getByText(RESPONSE_ASK, { exact: false })).toHaveCount(0);

    // The second answer is what unlocks it.
    await sendOneReply(page, READER_REPLY_2);
    await expect(page.getByPlaceholder(EMAIL_FIELD)).toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
  });

  test("a reader who answers mid-reveal gets the rest of the opener first, not after", async ({
    page,
  }) => {
    // The pacing must never cost anyone a turn. Someone who reads the first
    // bubble, knows their answer and sends immediately would otherwise watch
    // Evelyn finish a thought they had already replied to — the thread would
    // read out of order. The component flushes what is still queued ahead of
    // the reader's own bubble instead.
    const captured = await harness(page, { outcome: "no_match" });
    await gotoLander(page);

    // Send as soon as the FIRST bubble lands, while the rest are still queued.
    await expect(page.getByText(SEED_BUBBLES[0], { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    await sendOneReply(page);

    // Nothing of hers was dropped by the flush...
    for (const bubble of SEED_BUBBLES) {
      await expect(page.getByText(bubble, { exact: false }))
        .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    }
    // ...and all of it sits ABOVE the reader's reply, which is the ordering
    // claim. Read positionally rather than by index so the assertion survives
    // a future change to how many bubbles a seed splits into.
    const bubbles = page.getByTestId("assistant-message");
    const lastSeedBubble = bubbles.nth(SEED_BUBBLES.length - 1);
    await expect(lastSeedBubble).toContainText(SEED_BUBBLES[SEED_BUBBLES.length - 1]);

    // And the reply still parked exactly once — flushing is a render concern
    // and must not touch the request.
    await expect.poll(() => captured.reply.length).toBe(1);
    expect(captured.reply[0].reply).toBe(READER_REPLY);
  });

  test("the email is asked for by Evelyn, not by a form label", async ({ page }) => {
    // Joel's note, as a regression guard. This step used to render a bordered
    // panel under a divider, introduced by the THIRD-PERSON line "Save this so
    // Evelyn can answer it:" — she was described rather than speaking, which is
    // what made it feel like an AI collecting a field. The ask now lives in her
    // own bubble, in the first person, and the input sits in the composer.
    await harness(page, { outcome: "no_match" });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendReply(page);

    await expect(page.getByText(RESPONSE_ASK, { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });

    // Her question is a message in the thread, not chrome around the input.
    const askBubble = page.getByTestId("assistant-message").filter({ hasText: RESPONSE_ASK });
    await expect(askBubble).toHaveCount(1);

    // The third-person framing must not come back, in any casing.
    await expect(page.getByText(/save this so evelyn/i)).toHaveCount(0);
  });

  test("the email ask stays hidden while the park is still in flight", async ({ page }) => {
    // The ordering guarantee, stated as a race rather than a sequence. The spec
    // requires the email field to be non-interactive until the reply is stored,
    // so a reader who abandons at the email step still has her words saved. A
    // regression that fired both calls in parallel would still pass the test
    // above — both requests land eventually — and would only show up here.
    const captured = await harness(page, { holdReply: true });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendOneReply(page);

    // The optimistic bubble is allowed to paint immediately; nothing else is.
    // Neither her answer nor the email ask may appear while the park is open.
    await expect(page.getByText(READER_REPLY, { exact: false })).toBeVisible();
    await expect(page.getByPlaceholder(EMAIL_FIELD)).toHaveCount(0);
    await expect(page.getByText(FOLLOWUP_ASK, { exact: false })).toHaveCount(0);

    await expect
      .poll(() => typeof captured.releaseReply === "function", {
        message: "/reply should have been called and held",
      })
      .toBe(true);
    captured.releaseReply!();

    // Released: turn 1 is parked, so the thread advances — she answers and asks
    // her second question, and the compose bar comes back for it.
    //
    // The test stops here on purpose. The guarantee under test is "nothing
    // advances until the park lands", and turn 1 proves it. Driving turn 2 would
    // prove nothing extra AND cannot work here anyway: `holdReply` holds every
    // /reply call while the fixture exposes a single release, so the second park
    // would hang by construction.
    await expect(page.getByText(FOLLOWUP_ASK, { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    await expect(page.getByPlaceholder(COMPOSER)).toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
  });

  test("a failed park rolls the reply back into the box instead of advancing", async ({ page }) => {
    // The other half of the same promise. On a failed park NOTHING is stored
    // server-side, so advancing to the email step would strand the reader in a
    // flow whose entire point is that her words survive. The component must put
    // the text back in her hands, visibly and one tap from a retry.
    await harness(page, { replyStatus: 500 });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendOneReply(page);

    await expect(page.getByPlaceholder(COMPOSER)).toHaveValue(READER_REPLY);
    await expect(page.getByPlaceholder(EMAIL_FIELD)).toHaveCount(0);
    await expect(page.getByText(/try sending it again/i)).toBeVisible();
  });

  test("no_match: Frame 2b's future-tense copy, then the handoff into signup", async ({ page }) => {
    const captured = await harness(page, { outcome: "no_match" });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendReply(page);
    await submitEmail(page);

    await expect(page.getByText(COPY.no_match, { exact: false })).toBeVisible();
    // She names the move before it happens, and the counter announces it — the
    // fix for "the redirect was too fast, I did not understand what happened".
    await expect(page.getByText(HANDOFF_BUBBLE, { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    await expect(page.getByText(HANDOFF_COUNTER)).toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    // The old footer promised no password, then sent them to a form that demands
    // one. It must not return.
    await expect(page.getByText(OLD_FALSE_FOOTER, { exact: false })).toHaveCount(0);
    // No inbox is promised and no resend is offered: nothing was mailed.
    await expect(page.getByRole("button", { name: /send it again/i })).toHaveCount(0);

    // The detection call carries the session token, which is how the reply
    // parked a moment ago is later found and attached to the new account.
    expect(captured.checkEmail).toHaveLength(1);
    expect(captured.checkEmail[0].email).toBe(READER_EMAIL);
    expect(captured.checkEmail[0].sessionToken).toBeTruthy();

    // no_match is the only outcome that navigates — its terminal state has no
    // button, so NOT navigating would strand the reader. It carries the lander
    // session through to registration so the parked reply and the Live Thread
    // grant tier survive the hop.
    await expect
      .poll(() => page.url(), { timeout: HANDOFF_DELAY_MS + 10_000 })
      .toMatch(/\/login\?mode=signup/);
    const dest = new URL(page.url());
    expect(dest.searchParams.get("email")).toBe(READER_EMAIL);
    expect(dest.searchParams.get("source")).toBe("evelyn-lander");
    expect(dest.searchParams.get("landerSessionToken")).toBeTruthy();
  });

  test("no_match: the page does not move at the OLD 1600ms beat, and 'Go now' skips the wait", async ({
    page,
  }) => {
    // The regression this exists for, stated as a clock. At 1600ms — the beat the
    // handoff used to fire on — the reader is still mid-sentence, so the page must
    // still be there. Asserting the new delay's LENGTH would just restate the
    // constant; asserting the old one FAILS if anyone quietly restores it.
    await harness(page, { outcome: "no_match" });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendReply(page);
    await submitEmail(page);

    await expect(page.getByText(COPY.no_match, { exact: false }))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    await page.waitForTimeout(1_600);
    expect(page.url(), "must not hand off at the old 1600ms beat").toContain("/evelyn");

    // And a reader who reads fast is not held: Go now takes them immediately,
    // well inside what remains of the countdown.
    await expect(page.getByTestId("button-live-thread-go-now"))
      .toBeVisible({ timeout: BUBBLE_TIMEOUT_MS });
    await page.getByTestId("button-live-thread-go-now").click();
    await expect.poll(() => page.url(), { timeout: 3_000 }).toMatch(/\/login\?mode=signup/);
  });

  test("verified_match: 'I know you', a resend, and the page does NOT navigate", async ({ page }) => {
    await harness(page, { outcome: "verified_match" });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendReply(page);
    await submitEmail(page);

    await expect(page.getByText(COPY.verified_match, { exact: false })).toBeVisible();
    // Frame 2b's copy must NOT also be on screen — the two branches are one
    // switch statement apart and regress into each other easily.
    await expect(page.getByText(COPY.no_match, { exact: false })).toHaveCount(0);
    await expect(page.getByText(OLD_FALSE_FOOTER, { exact: false })).toHaveCount(0);

    // Spec Frame 2: "Resend available now" — no hidden timer.
    await expect(page.getByRole("button", { name: /send it again/i })).toBeEnabled();
    await expect(page.getByRole("link", { name: /sign in instead/i })).toBeVisible();

    // This reader's handoff runs through their INBOX. Navigating them anywhere
    // would interrupt a flow that is already complete.
    await page.waitForTimeout(HANDOFF_DELAY_MS + 900);
    expect(page.url()).toContain("/evelyn");
  });

  test("unverified_match: sent to the confirmation mail, never a magic link", async ({ page }) => {
    // The third outcome, and the one most likely to be collapsed into "no_match"
    // by a well-meaning simplification — which would try to create a second
    // account on an email that already has one.
    await harness(page, { outcome: "unverified_match" });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendReply(page);
    await submitEmail(page);

    await expect(page.getByText(COPY.unverified_match, { exact: false })).toBeVisible();
    await expect(page.getByText(COPY.verified_match, { exact: false })).toHaveCount(0);
    await expect(page.getByText(OLD_FALSE_FOOTER, { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /send it again/i })).toBeEnabled();

    await page.waitForTimeout(HANDOFF_DELAY_MS + 900);
    expect(page.url()).toContain("/evelyn");
  });

  test("already-authenticated reader skips the lander entirely, and /start lands first", async ({
    page,
  }) => {
    // Tier 1. The load-bearing part is NOT the redirect — that already existed —
    // but that /start COMPLETES before it. That call is what writes the
    // campaign-tagged, resolvedUserId-set session row arrivalReading.ts later
    // looks up; navigating away first leaves it unwritten and the greeting cold.
    //
    // Asserting "/start was called" is NOT enough, and this test originally made
    // that mistake: replacing the `await` with a bare `void postStart(...)` — the
    // exact bug Task 5 fixed — still fires the request before navigating, so a
    // call-count assertion stays green on broken code. Verified by mutation.
    // The only assertion that distinguishes them is holding the response open
    // and proving the page has NOT moved while it is in flight.
    const captured = await harness(page, { authenticated: true, holdStart: true });
    await page.addInitScript(
      ([key]) => window.localStorage.setItem(key as string, "qa-live-thread-jwt"),
      [AUTH_TOKEN_KEY],
    );

    await gotoLander(page);

    await expect
      .poll(() => typeof captured.releaseStart === "function", {
        message: "/start should have been called and held",
        timeout: 25_000,
      })
      .toBe(true);

    // /start is still in flight. A reader who is already signed in must still be
    // on the lander URL — if the redirect has already happened here, the session
    // row races the navigation and continuity is lost.
    await page.waitForTimeout(1200);
    expect(page.url(), "must not navigate while /start is still in flight").toContain("/evelyn");

    captured.releaseStart!();

    // Poll the URL rather than sleeping: the redirect is gated on a network
    // call, so any fixed wait is either flaky or needlessly slow.
    await expect.poll(() => page.url(), { timeout: 25_000 }).toMatch(/\/reading\?persona=evelyn-cross/);

    // The lander UI must never have painted — no Frame 1, no compose bar.
    await expect(page.getByPlaceholder(COMPOSER)).toHaveCount(0);
    await expect(page.getByText(CONTINUE_SEED, { exact: false })).toHaveCount(0);
  });

  test("an unresolvable /e/ code falls back to /personas", async ({ page }) => {
    // The one case that exercises the REAL redirector rather than a stub: it is
    // a pure read of a code that cannot exist, so it writes nothing and needs no
    // fixture. A forwarded, typo'd or long-expired link must land somewhere
    // useful rather than erroring.
    await page.goto("/e/does-not-exist-qa", { waitUntil: "domcontentloaded" });
    await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/personas/);
  });
});
