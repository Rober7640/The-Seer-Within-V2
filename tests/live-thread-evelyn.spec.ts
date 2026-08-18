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

// A substantive reply. The reply path has no low-intent guard (unlike the
// chatbox arm's /turn), but a real sentence is what a reader actually sends and
// keeps the fixture honest about what gets parked.
const READER_REPLY = "I'm not enough. That's the sentence. Every single day.";

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

// Frame 2b's footer, under the no_match bubble.
const NO_MATCH_FOOTER = "We'll email you a one-click link. No password needed.";

// EvelynLanderPage.NO_MATCH_HANDOFF_DELAY_MS is 1600ms — the beat that lets the
// reader read the bubble before the page moves. Waits below must clear it.
const HANDOFF_DELAY_MS = 1600;

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

/** Frame 1: the campaign's line, a real compose bar, and no email ask yet. */
async function expectFrameOne(page: Page) {
  await expect(page.getByText(CONTINUE_SEED, { exact: false })).toBeVisible({ timeout: 20_000 });
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
async function sendReply(page: Page, text = READER_REPLY) {
  await page.getByPlaceholder(COMPOSER).fill(text);
  await page.getByPlaceholder(COMPOSER).press("Enter");
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

    // Frame 1.5's email ask appears only after the park succeeded.
    await expect(page.getByPlaceholder(EMAIL_FIELD)).toBeVisible();

    // And the reply that was parked is the reader's actual text, carrying the
    // session token the post-auth routes later use to find it again.
    expect(captured.reply).toHaveLength(1);
    expect(captured.reply[0].reply).toBe(READER_REPLY);
    expect(captured.reply[0].sessionToken, "reply must be keyed to the lander session").toBeTruthy();
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
    await sendReply(page);

    // The optimistic bubble is allowed to paint immediately; the email ask is not.
    await expect(page.getByText(READER_REPLY, { exact: false })).toBeVisible();
    await expect(page.getByPlaceholder(EMAIL_FIELD)).toHaveCount(0);

    await expect
      .poll(() => typeof captured.releaseReply === "function", {
        message: "/reply should have been called and held",
      })
      .toBe(true);
    captured.releaseReply!();

    await expect(page.getByPlaceholder(EMAIL_FIELD)).toBeVisible();
  });

  test("a failed park rolls the reply back into the box instead of advancing", async ({ page }) => {
    // The other half of the same promise. On a failed park NOTHING is stored
    // server-side, so advancing to the email step would strand the reader in a
    // flow whose entire point is that her words survive. The component must put
    // the text back in her hands, visibly and one tap from a retry.
    await harness(page, { replyStatus: 500 });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendReply(page);

    await expect(page.getByPlaceholder(COMPOSER)).toHaveValue(READER_REPLY);
    await expect(page.getByPlaceholder(EMAIL_FIELD)).toHaveCount(0);
    await expect(page.getByText(/try sending it again/i)).toBeVisible();
  });

  test("no_match: Frame 2b's future-tense copy, then the handoff into signup", async ({ page }) => {
    const captured = await harness(page, { outcome: "no_match" });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendReply(page);
    await page.getByPlaceholder(EMAIL_FIELD).fill(READER_EMAIL);
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText(COPY.no_match, { exact: false })).toBeVisible();
    await expect(page.getByText(NO_MATCH_FOOTER, { exact: false })).toBeVisible();
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

  test("verified_match: 'I know you', a resend, and the page does NOT navigate", async ({ page }) => {
    await harness(page, { outcome: "verified_match" });
    await gotoLander(page);

    await expectFrameOne(page);
    await sendReply(page);
    await page.getByPlaceholder(EMAIL_FIELD).fill(READER_EMAIL);
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText(COPY.verified_match, { exact: false })).toBeVisible();
    // Frame 2b's copy must NOT also be on screen — the two branches are one
    // switch statement apart and regress into each other easily.
    await expect(page.getByText(COPY.no_match, { exact: false })).toHaveCount(0);
    await expect(page.getByText(NO_MATCH_FOOTER, { exact: false })).toHaveCount(0);

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
    await page.getByPlaceholder(EMAIL_FIELD).fill(READER_EMAIL);
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText(COPY.unverified_match, { exact: false })).toBeVisible();
    await expect(page.getByText(COPY.verified_match, { exact: false })).toHaveCount(0);
    await expect(page.getByText(NO_MATCH_FOOTER, { exact: false })).toHaveCount(0);
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
