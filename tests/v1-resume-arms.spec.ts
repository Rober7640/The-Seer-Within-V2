import { test, expect, type Page } from "@playwright/test";

// Browser coverage for the EMAILED V1 RECOVERY LINK — `/<funnel>/chat?resume=<id>`.
//
// ── The bug this locks out (found on the dev server, 2026-08-14) ──────────────
// Opening a recovery link showed the plain purchase CTA: no commitment gate, no
// order bump. Both arms are set ONLY from the `/api/lead` response at email
// capture, and a resumed session restarts PAST email capture, so
// `/api/conversation/resume/:id` was the sole source of her state and it returned
// name/bucket/price and nothing else. She therefore sat in the arm's denominator
// (her exposure was logged weeks earlier) while being structurally unable to see
// the offer — biasing the live test against whichever arm the recovery traffic
// belonged to.
//
// The second half: a reader who had ALREADY PAID was dropped at the start of a
// fresh funnel and could buy the same reading twice.
//
// ── How it forces each case ───────────────────────────────────────────────────
// `/api/conversation/resume/:id` is stubbed, which is the whole point — it is the
// one channel that carries her arms onto a resumed session, so stubbing it drives
// every case (gate arm, bump arm, control, already-paid, expired) without a DB, a
// seeded conversation, or a live experiment. `/api/chat` and `/api/checkout` are
// stubbed for the same reasons as the commitment-gate spec: determinism, zero
// Anthropic spend, and no Stripe session.
//
// What this canNOT see is the SERVER half — that the real endpoint resolves the
// arms and pins them to her first logged exposure. That is covered by
// experiments.test.ts + experimentTally.test.ts (assign() stickiness/scope) and by
// the `?funnel=` assertion below, which catches the one piece of plumbing the
// server cannot do for itself.
//
// 🔒 SAFETY: localhost only (hard-refused otherwise), Meta blocked at the network
//    layer, /api/checkout intercepted. Nothing here writes to a database.
//
// ── RUN IT (local only — never production) ───────────────────────────────────
//   npm run dev            (or: DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts)
//   npx playwright test --config=playwright.v1-resume.config.ts

const RESUME_ID = "1871ded1-1350-4e8c-b295-959b7de669e8";
const ENTRY = `/fb-palm/chat?resume=${RESUME_ID}&src=recovery`;
const PALM_VARIANT = "35_palm_u47";

type Arms = {
  commitmentGate?: boolean;
  orderBump?: boolean;
  bumpCopy?: string;
};

type Captured = {
  checkout: Array<Record<string, unknown>>;
  resumeUrls: string[];
  metaBlocked: number;
};

/**
 * Stub the three endpoints a resumed session touches and hand back `arms`.
 *
 * `gone` short-circuits the resume endpoint to the 410 under test instead:
 * 'purchased' (she already bought) or 'expired' (link older than 30 days). Both
 * are 410 by design, which is exactly why the client must branch on `reason` and
 * not on the human-readable message.
 */
async function harness(
  page: Page,
  arms: Arms,
  gone?: "purchased" | "expired",
): Promise<Captured> {
  const captured: Captured = { checkout: [], resumeUrls: [], metaBlocked: 0 };

  await page.route("**://*.facebook.com/**", (r) => { captured.metaBlocked += 1; return r.abort(); });
  await page.route("**://connect.facebook.net/**", (r) => { captured.metaBlocked += 1; return r.abort(); });

  await page.route("**/api/conversation/resume/**", (r) => {
    captured.resumeUrls.push(r.request().url());
    if (gone) {
      return r.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({
          error: gone === "purchased" ? "Already purchased" : "Link expired",
          reason: gone,
        }),
      });
    }
    // The shape the real endpoint returns. State PITCH so the welcome-back
    // sequence re-offers the CTA, which is the moment both arms are visible.
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        userData: {
          firstName: "Claire",
          email: "resume-spec@example.com",
          bucket: "love",
          objectionCount: 0,
          priceVariantId: PALM_VARIANT,
          priceDollars: 35,
          downsellDollars: 25,
          ...arms,
        },
        conversationState: "PITCH",
        messages: [],
      }),
    });
  });

  await page.route("**/api/chat", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        messages: ["I feel the weight of this, dear.", "Let me look closer."],
        needsClarification: false,
        subBucket: "SEEKING_LOVE",
      }),
    }),
  );

  // Capture the purchase intent WITHOUT creating a Stripe session or navigating.
  await page.route("**/api/checkout", async (r) => {
    try { captured.checkout.push(JSON.parse(r.request().postData() || "{}")); } catch { /* ignore */ }
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "" }) });
  });

  // The scripted typing delays are wall-clock; collapse them so the walk is quick.
  await page.addInitScript(() => {
    const real = window.setTimeout.bind(window);
    // @ts-expect-error - test-only shim
    window.setTimeout = (fn: TimerHandler, ms?: number, ...a: unknown[]) =>
      real(fn as never, Math.min(Number(ms) || 0, 40), ...(a as []));
  });

  return captured;
}

/** The welcome-back sequence types a few lines before re-offering the CTA. */
async function waitForBuySurface(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        (await page.locator('[data-testid="commitment-gate-card"]').isVisible().catch(() => false)) ||
        (await page.getByRole("button", { name: /Begin My Energy Clearing/i }).first().isVisible().catch(() => false)),
      { timeout: 30_000 },
    )
    .toBe(true);
}

test.describe("V1 recovery link — arms carried onto a resumed session", () => {
  test.beforeAll(({}, testInfo) => {
    const base = String(testInfo.project.use.baseURL ?? "");
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
      throw new Error(`🔴 REFUSING to run against "${base}" — localhost only.`);
    }
  });

  // The regression itself. Before the fix this rendered the plain CTA.
  test("gate arm survives the resume link", async ({ page }) => {
    await harness(page, { commitmentGate: true });
    await page.goto(ENTRY);
    await waitForBuySurface(page);

    await expect(page.locator('[data-testid="commitment-gate-card"]')).toBeVisible();
  });

  // The other half of the same regression: the bump is an extra TURN, so it only
  // appears after the buy CTA is tapped. Before the fix that tap went straight to
  // Stripe and the offer was never played.
  test("bump arm survives the resume link — tapping buy plays the offer turn", async ({ page }) => {
    const cap = await harness(page, { orderBump: true, bumpCopy: "control" });
    await page.goto(ENTRY);
    await waitForBuySurface(page);

    await page.getByRole("button", { name: /Begin My Energy Clearing/i }).first().click();

    const bump = page.locator('[data-testid="bump-offer-card"]');
    await expect(bump).toBeVisible();
    // The offer must be played BEFORE Stripe, never alongside it.
    expect(cap.checkout, "checkout fired before the bump was answered").toHaveLength(0);

    await page.locator('[data-testid="button-bump-accept"]').click();
    await expect.poll(() => cap.checkout.length, { timeout: 15_000 }).toBeGreaterThan(0);

    const body = cap.checkout[0];
    expect(body.bumpOffered, "take-rate denominator must be sent").toBe(true);
    expect(body.bumpAccepted).toBe(true);
    expect(body.type).toBe("main");
    expect(body.funnel, "a resumed palm reader must stay on the palm funnel").toBe("v1-palm");
  });

  test("declining the bump still buys the main offer, and records the exposure", async ({ page }) => {
    const cap = await harness(page, { orderBump: true, bumpCopy: "control" });
    await page.goto(ENTRY);
    await waitForBuySurface(page);
    await page.getByRole("button", { name: /Begin My Energy Clearing/i }).first().click();

    await page.locator('[data-testid="button-bump-decline"]').click();
    await expect.poll(() => cap.checkout.length, { timeout: 15_000 }).toBeGreaterThan(0);

    expect(cap.checkout[0].bumpOffered, "offered is the denominator — sent even on a decline").toBe(true);
    expect(cap.checkout[0].bumpAccepted).toBe(false);
  });

  // Assignment is funnel-scoped, and `conversations` has no funnel column, so the
  // client is the only thing that knows which funnel she resumed on. Drop this
  // param and every resumed reader falls out of scope and silently loses her arm.
  test("the resume request carries its own funnel", async ({ page }) => {
    const cap = await harness(page, {});
    await page.goto(ENTRY);
    await waitForBuySurface(page);

    expect(cap.resumeUrls.length, "the resume endpoint was never called").toBeGreaterThan(0);
    expect(cap.resumeUrls[0]).toContain("funnel=v1-palm");
  });

  // Control must be byte-identical to what shipped before any of this.
  test("neither arm: plain CTA, straight to checkout, no bump card", async ({ page }) => {
    const cap = await harness(page, {});
    await page.goto(ENTRY);
    await waitForBuySurface(page);

    await expect(page.locator('[data-testid="commitment-gate-card"]')).toHaveCount(0);
    await page.getByRole("button", { name: /Begin My Energy Clearing/i }).first().click();

    await expect.poll(() => cap.checkout.length, { timeout: 15_000 }).toBeGreaterThan(0);
    await expect(page.locator('[data-testid="bump-offer-card"]')).toHaveCount(0);
    expect(cap.checkout[0].bumpOffered, "a control lead must send no bump fields").toBeUndefined();
  });

  // Her price is stored on her row and only ever read back. Nothing on the resume
  // path may re-draw it — that is why the endpoint resolves the arms directly and
  // never through assignVariantIfMissing, which re-prices a stale variant.
  test("the locked price rides through the resume + bump turn unchanged", async ({ page }) => {
    const cap = await harness(page, { orderBump: true, bumpCopy: "control" });
    await page.goto(ENTRY);
    await waitForBuySurface(page);

    await expect(page.getByRole("button", { name: /Begin My Energy Clearing/i }).first()).toContainText("$35");
    await page.getByRole("button", { name: /Begin My Energy Clearing/i }).first().click();
    await page.locator('[data-testid="button-bump-accept"]').click();
    await expect.poll(() => cap.checkout.length, { timeout: 15_000 }).toBeGreaterThan(0);

    // The client must never post a price — the server prices from her stored row.
    // Asserting the shape keeps a future "send the price along" edit from making
    // the quote and the charge two independent numbers.
    expect(cap.checkout[0]).not.toHaveProperty("priceDollars");
    expect(cap.checkout[0].type).toBe("main");
  });

  // 🔴 A PAYING CUSTOMER MUST NEVER BE RE-PITCHED. Before the fix the 410 was
  // swallowed and she got the whole funnel again — able to buy the same reading
  // twice, which is precisely the shape of the disputes we write evidence for.
  test("already purchased: redirects to HER funnel's thank-you page, never restarts", async ({ page }) => {
    const cap = await harness(page, {}, "purchased");
    await page.goto(ENTRY);

    await page.waitForURL(/\/fb-palm\/success/, { timeout: 20_000 });
    // Her OWN funnel's thank-you page — the bare /success would strand a palm
    // buyer outside her funnel and re-brand her as base V1 from that point on.
    expect(new URL(page.url()).pathname).toBe("/fb-palm/success");
    expect(cap.checkout, "a paid reader must not reach checkout again").toHaveLength(0);
  });

  // The other 410. Same status, opposite handling — she genuinely has no reading
  // to come back to, so a fresh greeting is right. This is what makes matching on
  // `reason` rather than the message text load-bearing.
  test("expired link: falls through to a fresh greeting, no redirect", async ({ page }) => {
    await harness(page, {}, "expired");
    await page.goto(ENTRY);

    // Name capture is the first thing a brand-new session asks for.
    const input = page.locator('[data-testid="input-chat-message"]');
    await expect(input).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => input.getAttribute("placeholder"), { timeout: 30_000 })
      .toMatch(/name/i);
    expect(new URL(page.url()).pathname).toBe("/fb-palm/chat");
  });
});
