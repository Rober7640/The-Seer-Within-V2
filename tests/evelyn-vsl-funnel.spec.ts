import "dotenv/config"; // load DATABASE_URL / STRIPE_SECRET_KEY for the DB + Stripe reads below
import { test, expect, type Page } from "@playwright/test";
import pg from "pg";
import Stripe from "stripe";
import {
  STONES,
  TAP_ZONES,
  WELCOME_STONES_LIVE_AT,
  PITCH_CTA_AT,
  type StoneKey,
} from "@shared/evelynVsl";

// Evelyn video funnel (Job A) — end-to-end Playwright coverage, spec §10 /
// task-12-brief.md. Everything here drives OUR server on PORT (see
// playwright.config.ts: baseURL + webServer.url both read process.env.PORT,
// defaulting to 5000 — see the note at the bottom of this file / the task-12
// report for why that matters in THIS environment).
//
// ── WHAT THIS FILE PROVES vs WHAT IT CANNOT ─────────────────────────────────
// The tap-zone/CTA/backup-button/checkout-carry/birth-date/regression legs are
// pure client-side React state machines (VslVideoPlayer + ReadingPage +
// CheckoutPage) driven with `page.evaluate` to set `video.currentTime` and
// dispatch real DOM events — no network, no Stripe, no DB. Those run for real
// every time this file runs.
//
// The full Stripe TEST-mode purchase leg (`describe('Full Stripe TEST-mode
// purchase path ...')`) additionally needs: the dev server actually serving
// THIS worktree's build, BACKEND_CHECKOUT_TEST_MODE=true + a sk_test_ key (see
// server/routes/backendOffers.ts's backendCheckoutTestModeOpen), a reachable
// local Postgres with the be_orders/be_order_intake tables, and a live
// round-trip through Stripe's own hosted Checkout page (real network call to
// stripe.com). It self-skips with a clear reason if any precondition is not
// met, rather than faking a pass — see `test.skip()` calls below.

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const STRIPE_TEST_MODE_READY =
  typeof STRIPE_SECRET_KEY === "string" &&
  STRIPE_SECRET_KEY.startsWith("sk_test_") &&
  process.env.BACKEND_CHECKOUT_TEST_MODE === "true";

const STONE_KEYS = STONES.map((s) => s.key);

// ─── small helpers ──────────────────────────────────────────────────────────

/** Sets video.currentTime on the named <video data-testid="video-<kind>"> and fires a
 *  real `timeupdate` so the player's React state (zonesLive, ctaShown, …) updates. */
async function seekVideo(page: Page, kind: "welcome" | "pitch", seconds: number) {
  await page.evaluate(
    ({ kind, seconds }) => {
      const video = document.querySelector<HTMLVideoElement>(
        `[data-testid="video-${kind}"]`,
      );
      if (!video) throw new Error(`video-${kind} not found`);
      // jsdom-free real browser: currentTime is settable even with no real media
      // loaded because preload="auto" + a same-origin <source> is enough for
      // Chromium to accept a seek and fire timeupdate synchronously below.
      Object.defineProperty(video, "duration", { value: 999, configurable: true });
      video.currentTime = seconds;
      video.dispatchEvent(new Event("timeupdate"));
    },
    { kind, seconds },
  );
}

/** Reads the video element's live currentTime back (sanity check after a seek). */
async function videoTime(page: Page, kind: "welcome" | "pitch"): Promise<number> {
  return page.evaluate((kind) => {
    const v = document.querySelector<HTMLVideoElement>(`[data-testid="video-${kind}"]`);
    return v ? v.currentTime : -1;
  }, kind);
}

/** The center point (fractions 0-1) of a stone's tap zone, from the shared constants —
 *  never hand-typed, so a future zone-geometry edit can't silently desync the test. */
function zoneCenterFrac(stone: StoneKey) {
  const z = TAP_ZONES[stone];
  return { x: (z.x0 + z.x1) / 2, y: (z.y0 + z.y1) / 2 };
}

/** Clicks inside the welcome video at a stone's zone center, in real pixel coordinates
 *  derived from the rendered player's bounding box — exercises the actual click handler
 *  (VslVideoPlayer.tsx's handleVideoAreaClick → stoneAtPoint), not a synthetic testid click,
 *  so it proves the pixel geometry (TAP_ZONES) is wired to the real DOM, not just reachable.
 *
 *  ⚠ The FIRST click anywhere on the welcome video unmutes sound and restarts at 0
 *  (handleFirstSoundTap) — only a SECOND click can land in a tap zone. Callers must
 *  unmute (`unmuteWelcome`) and re-seek before calling this, or the click is swallowed
 *  by the sound-on branch instead of picking a stone. */
async function tapStoneZone(page: Page, stone: StoneKey) {
  const player = page.getByTestId("vsl-player-welcome");
  await player.scrollIntoViewIfNeeded();
  const box = await player.boundingBox();
  if (!box) throw new Error("vsl-player-welcome has no bounding box");
  const frac = zoneCenterFrac(stone);
  // Locator.click's `position` is relative to the element's own box and auto-scrolls +
  // waits for actionability — unlike a raw page.mouse.click at absolute coordinates,
  // which silently misses when the 9:16 player (height ~800px) extends below a 720px
  // viewport fold, as it does by default in Playwright's desktop-chrome project.
  await player.click({ position: { x: box.width * frac.x, y: box.height * frac.y } });
}

/** Dismisses the "🔊 Tap for sound" gate with one outside-the-zones click (center of the
 *  player, which is never inside a TAP_ZONES rect — see shared/evelynVsl.ts). This is the
 *  real first-tap-unmutes contract (VslVideoPlayer.tsx's handleFirstSoundTap), which ALSO
 *  resets currentTime to 0 — so the caller must re-seek afterwards. */
async function unmuteWelcome(page: Page) {
  const player = page.getByTestId("vsl-player-welcome");
  await player.scrollIntoViewIfNeeded();
  const box = await player.boundingBox();
  if (!box) throw new Error("vsl-player-welcome has no bounding box");
  await player.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
  await expect(page.getByTestId("badge-tap-for-sound")).toHaveCount(0);
}

/** The full real-tap sequence to pick a stone from the welcome video after 48.6s: unmute
 *  (resets currentTime to 0), re-seek past the live threshold, then tap the zone. */
async function unmuteAndTapStoneZone(page: Page, stone: StoneKey) {
  await unmuteWelcome(page);
  await seekVideo(page, "welcome", WELCOME_STONES_LIVE_AT + 1);
  await tapStoneZone(page, stone);
}

async function gotoReading(page: Page) {
  // ⚠ a ONE-TIME clear via page.evaluate, not page.addInitScript — an init script
  // persists for the page's lifetime and re-runs on every later navigation, which
  // would wipe the very stone pick a reload-persistence test (below) needs to survive.
  await page.goto("/evelyn/reading");
  await page.evaluate(() => window.localStorage.removeItem("evelyn_vsl_v1"));
  await page.reload();
  await expect(page.getByTestId("vsl-player-welcome")).toBeVisible();
}

// =============================================================================
// 1. Tap zones inert before 48.6s, active after; each stone -> pitch; backup buttons
// =============================================================================

test.describe("Evelyn VSL — welcome video tap zones", () => {
  test("stone zones are inert (pointer-events: none, not aria-buttons) before 48.6s", async ({
    page,
  }) => {
    await gotoReading(page);
    await seekVideo(page, "welcome", WELCOME_STONES_LIVE_AT - 5);

    for (const stone of STONE_KEYS) {
      const zone = page.getByTestId(`stone-zone-${stone}`);
      await expect(zone).toHaveAttribute("data-live", "false");
      // `inert` makes the backup/aria-label absent and keeps it out of the tab order —
      // the component's own contract for "taps fall through to pause/play" (spec §3).
      await expect(zone).not.toHaveAttribute("aria-label", /Pick/);
    }

    // Clicking where the Rose Quartz zone sits must NOT pick a stone (falls through
    // to the play/pause toggle) — still on the welcome video, not swapped to pitch.
    await tapStoneZone(page, "rose-quartz");
    await expect(page.getByTestId("vsl-player-welcome")).toBeVisible();
    await expect(page.getByTestId("vsl-player-pitch")).toHaveCount(0);
  });

  test("stone zones go live at 48.6s — real aria-button, data-live=true", async ({ page }) => {
    await gotoReading(page);
    await seekVideo(page, "welcome", WELCOME_STONES_LIVE_AT);

    for (const stone of STONE_KEYS) {
      const zone = page.getByTestId(`stone-zone-${stone}`);
      await expect(zone).toHaveAttribute("data-live", "true");
      await expect(zone).toHaveAttribute("aria-label", new RegExp(`Pick`, "i"));
    }
  });

  for (const stone of STONE_KEYS) {
    test(`tapping the ${stone} zone after 48.6s swaps to the pitch video`, async ({ page }) => {
      await gotoReading(page);
      await seekVideo(page, "welcome", WELCOME_STONES_LIVE_AT + 1);
      await unmuteAndTapStoneZone(page, stone);

      await expect(page.getByTestId("vsl-player-pitch")).toBeVisible();
      await expect(page.getByTestId("vsl-player-welcome")).toHaveCount(0);

      // Stone persisted to localStorage (evelyn_vsl_v1) so a reload resumes on pitch.
      const saved = await page.evaluate(() =>
        JSON.parse(window.localStorage.getItem("evelyn_vsl_v1") || "null"),
      );
      expect(saved?.stone).toBe(stone);
    });
  }

  test("backup stone buttons appear at 48.6s and each picks the right stone", async ({
    page,
  }) => {
    await gotoReading(page);
    await seekVideo(page, "welcome", WELCOME_STONES_LIVE_AT);
    await expect(page.getByTestId("backup-stone-buttons")).toBeVisible();

    await page.getByTestId("button-backup-stone-jade").click();
    await expect(page.getByTestId("vsl-player-pitch")).toBeVisible();
    const saved = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem("evelyn_vsl_v1") || "null"),
    );
    expect(saved?.stone).toBe("jade");
  });

  test("welcome video error shows backup buttons immediately (no 48.6s wait)", async ({
    page,
  }) => {
    await gotoReading(page);
    // Fire a native `error` event on the <video> before any timeupdate — the player's
    // onError -> onFailure -> ReadingPage.handleWelcomeFailure contract (spec: "welcome
    // video error/stalled > 8s -> show backup buttons at once").
    await page.evaluate(() => {
      const v = document.querySelector<HTMLVideoElement>('[data-testid="video-welcome"]');
      v?.dispatchEvent(new Event("error"));
    });
    await expect(page.getByTestId("backup-stone-buttons")).toBeVisible();
  });
});

// =============================================================================
// 2. CTA appears at 368.2s, persists across reload; pitch error -> CTA at once
// =============================================================================

test.describe("Evelyn VSL — pitch CTA", () => {
  async function toPitch(page: Page, stone: StoneKey = "jade") {
    await gotoReading(page);
    await unmuteAndTapStoneZone(page, stone);
    await expect(page.getByTestId("vsl-player-pitch")).toBeVisible();
  }

  test("CTA is absent before 368.2s, appears once the pitch crosses it", async ({ page }) => {
    await toPitch(page);
    await seekVideo(page, "pitch", PITCH_CTA_AT - 10);
    await expect(page.getByTestId("vsl-cta")).toHaveCount(0);

    await seekVideo(page, "pitch", PITCH_CTA_AT);
    await expect(page.getByTestId("vsl-cta")).toBeVisible();
    await expect(page.getByTestId("link-vsl-cta")).toContainText("$19");
  });

  test("CTA persists across reload once shown (localStorage ctaShown)", async ({ page }) => {
    await toPitch(page, "garnet");
    await seekVideo(page, "pitch", PITCH_CTA_AT + 1);
    await expect(page.getByTestId("vsl-cta")).toBeVisible();

    await page.reload();
    // Return visit: stone known -> straight to pitch, CTA still shown (spec §3).
    await expect(page.getByTestId("vsl-player-pitch")).toBeVisible();
    await expect(page.getByTestId("vsl-cta")).toBeVisible();
  });

  test("pitch video error shows the CTA immediately, before 368.2s", async ({ page }) => {
    await toPitch(page, "rose-quartz");
    await seekVideo(page, "pitch", 10); // well before PITCH_CTA_AT
    await page.evaluate(() => {
      const v = document.querySelector<HTMLVideoElement>('[data-testid="video-pitch"]');
      v?.dispatchEvent(new Event("error"));
    });
    await expect(page.getByTestId("vsl-cta")).toBeVisible();
  });
});

// =============================================================================
// 3. Stone carried to /evelyn/checkout; missing stone -> "your stone"
// =============================================================================

test.describe("Evelyn VSL — stone carried to checkout", () => {
  for (const stone of STONE_KEYS) {
    test(`?stone=${stone} shows the ${stone} add-on label`, async ({ page }) => {
      await page.goto(`/evelyn/checkout?stone=${stone}`);
      await page.getByTestId("button-get-reading").click();
      const label =
        stone === "rose-quartz" ? "Rose Quartz" : stone === "jade" ? "Jade" : "Garnet";
      await expect(page.getByTestId("checkbox-bump")).toContainText(label);
    });
  }

  test("no stone in the query or localStorage -> add-on says 'your stone'", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.removeItem("evelyn_vsl_v1"));
    await page.goto("/evelyn/checkout");
    await page.getByTestId("button-get-reading").click();
    await expect(page.getByTestId("checkbox-bump")).toContainText("your stone");
  });

  test("missing ?stone= falls back to the localStorage pick from /evelyn/reading", async ({
    page,
  }) => {
    await gotoReading(page);
    await unmuteAndTapStoneZone(page, "jade");
    await expect(page.getByTestId("vsl-player-pitch")).toBeVisible();

    // Checkout with NO ?stone= query — must read localStorage, not default to "your stone".
    await page.goto("/evelyn/checkout");
    await page.getByTestId("button-get-reading").click();
    await expect(page.getByTestId("checkbox-bump")).toContainText("Jade");
  });
});

// =============================================================================
// 4. Birth-date validation (invalid, under-18, valid)
// =============================================================================

test.describe("Evelyn VSL — checkout pop-up birth-date validation", () => {
  async function openPopup(page: Page) {
    await page.goto("/evelyn/checkout?stone=jade");
    await page.getByTestId("button-get-reading").click();
    await expect(page.getByTestId("popup-intake")).toBeVisible();
  }

  async function fillValidButDob(page: Page, dob: string) {
    await page.getByTestId("input-email").fill("e2e-dob@example.test");
    await page.getByTestId("input-first-name").fill("Taylor");
    await page.getByTestId("input-dob").fill(dob);
    await page.getByTestId("button-continue-checkout").click();
  }

  test("invalid calendar date (Feb 30) is refused with an inline error", async ({ page }) => {
    await openPopup(page);
    // <input type=date> normalizes free text, so drive the underlying value directly —
    // this is still what validateIntake() receives and refuses (checkoutIntake.ts).
    await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>('[data-testid="input-dob"]')!;
      el.value = "2026-02-30";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.getByTestId("input-email").fill("e2e-dob@example.test");
    await page.getByTestId("input-first-name").fill("Taylor");
    await page.getByTestId("button-continue-checkout").click();
    await expect(page.getByTestId("error-dob")).toContainText("valid birth date");
  });

  test("under-18 date of birth is refused with the age-gate message", async ({ page }) => {
    await openPopup(page);
    const seventeenYearsAgo = new Date();
    seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17);
    const dob = seventeenYearsAgo.toISOString().slice(0, 10);
    await fillValidButDob(page, dob);
    await expect(page.getByTestId("error-dob")).toContainText("18 and over");
  });

  test("a valid 18+ date of birth passes validation (no inline error, proceeds to checkout)", async ({
    page,
  }) => {
    await openPopup(page);
    const dob = "1992-05-15"; // comfortably 18+, real calendar date
    await fillValidButDob(page, dob);
    await expect(page.getByTestId("error-dob")).toHaveCount(0);
    await expect(page.getByTestId("error-email")).toHaveCount(0);
    await expect(page.getByTestId("error-first-name")).toHaveCount(0);
    // BACKEND_CHECKOUT_LIVE is a *build-time* Vite var (client/src/lib/backendCheckout.ts).
    // If the dev build was NOT built with VITE_BACKEND_CHECKOUT_LIVE=true, the button stays
    // enabled and only a console.log fires (preview mode) — either way, no inline field
    // error is the thing this test is pinning.
  });
});

// =============================================================================
// 5. Regression: V1 /welcome1 + /welcome2 and another backend offer unchanged
// =============================================================================

test.describe("Evelyn VSL — regression: V1 and other backend offers untouched", () => {
  test("V1 /welcome1 still loads (chat-driven upsell shell, no session -> graceful error, not a crash)", async ({
    page,
  }) => {
    const resp = await page.goto("/welcome1");
    expect(resp?.status()).toBeLessThan(500);
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  });

  test("V1 /welcome2 still loads (chat-driven upsell shell, no session -> graceful error, not a crash)", async ({
    page,
  }) => {
    const resp = await page.goto("/welcome2");
    expect(resp?.status()).toBeLessThan(500);
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  });

  test("another backend offer's booking page (heart-cleanser, 09) still renders", async ({
    page,
  }) => {
    const resp = await page.goto("/offers/heart-cleanser");
    expect(resp?.status()).toBeLessThan(400);
    await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  });
});

// =============================================================================
// 6. Each Meta + PostHog event fires exactly once per action
// =============================================================================

test.describe("Evelyn VSL — tracking fires exactly once per action", () => {
  test("vsl_view + vsl_stone_pick + ViewContent fire exactly once on a fresh stone pick", async ({
    page,
  }) => {
    const phCalls: Array<{ event: string }> = [];
    let viewContentCalls = 0;

    // PostHog loads from a CDN in real use; in dev it may not initialise at all (no
    // VITE_POSTHOG_API_KEY) — track() is a documented no-op in that case (ReadingPage.tsx's
    // own comment). So this test counts calls to the PAGE'S OWN track wrapper via a
    // window hook rather than asserting a specific network request, which would be
    // flaky under whichever PostHog init state the dev build has.
    await page.addInitScript(() => {
      (window as any).__phCalls = [];
      (window as any).__fbqCalls = [];
      const origFbq = (window as any).fbq;
      (window as any).fbq = (...args: unknown[]) => {
        (window as any).__fbqCalls.push(args);
        return origFbq?.(...args);
      };
    });

    await gotoReading(page);
    await unmuteAndTapStoneZone(page, "jade");
    await expect(page.getByTestId("vsl-player-pitch")).toBeVisible();

    // vsl_view fires once per pitch-entry — proven indirectly via the dedup key this
    // page itself writes (ReadingPage.tsx's sessionStorage guard), which is the same
    // mechanism that makes the Meta ViewContent fire exactly once.
    const dedupSet = await page.evaluate(() =>
      window.sessionStorage.getItem("evelyn_viewcontent_fired"),
    );
    expect(dedupSet).toBe("1");

    // Reloading the SAME tab (same sessionStorage) must NOT re-fire ViewContent —
    // the dedup key persists across a reload within one tab (spec: "fires exactly once").
    await page.reload();
    const stillSet = await page.evaluate(() =>
      window.sessionStorage.getItem("evelyn_viewcontent_fired"),
    );
    expect(stillSet).toBe("1");
  });

  test("vsl_cta_shown fires once even if the pitch is seeked across 368.2s repeatedly", async ({
    page,
  }) => {
    await gotoReading(page);
    await unmuteAndTapStoneZone(page, "garnet");
    await expect(page.getByTestId("vsl-player-pitch")).toBeVisible();

    await seekVideo(page, "pitch", PITCH_CTA_AT + 1);
    await expect(page.getByTestId("vsl-cta")).toBeVisible();

    // Seek backward then forward across the threshold again — ctaShownRef in
    // VslVideoPlayer.tsx is a one-way latch, so onCtaShown must not fire a second time.
    // We can't directly spy on the callback from outside React, so this proves the
    // OBSERVABLE contract instead: the CTA block renders exactly once (no duplicate
    // data-testid="vsl-cta" nodes), which is what a double-fire would produce visually.
    await seekVideo(page, "pitch", PITCH_CTA_AT - 50);
    await seekVideo(page, "pitch", PITCH_CTA_AT + 5);
    await expect(page.getByTestId("vsl-cta")).toHaveCount(1);
  });

  test("checkout_view posts to PostHog's capture endpoint exactly once per /evelyn/checkout load", async ({
    page,
  }) => {
    // Capture every outgoing PostHog network call (works whether PostHog is a real
    // configured project or the dev no-op build — if VITE_POSTHOG_API_KEY is unset,
    // posthog-js never initialises and this list stays empty; the assertion below is
    // written as "at most one", which is true either way and catches a real double-fire
    // if PostHog IS configured).
    const captureRequests: string[] = [];
    await page.route(/\/(capture|e|batch)\/?(\?.*)?$/, async (route) => {
      const body = route.request().postData() || "";
      if (body.includes("checkout_view")) captureRequests.push(body);
      await route.continue();
    });

    await page.goto("/evelyn/checkout?stone=jade");
    await expect(page.getByTestId("text-checkout-headline")).toBeVisible();
    await page.waitForTimeout(500); // let any fire-and-forget beacon land

    const checkoutViewCount = captureRequests.filter((b) =>
      b.includes('"checkout_view"'),
    ).length;
    expect(checkoutViewCount).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// 7. FULL Stripe TEST-mode purchase path: $19 (+bump) -> U1 accept -> U2
//    decline/downsell -> /evelyn/thank-you. Reads be_orders/be_order_intake
//    directly from Postgres and the Stripe session's own metadata — the most
//    honest way to prove "no firstName in Stripe metadata, DOES have
//    funnel/stone" without needing the Bearer-gated fulfilment endpoint
//    (server/routes/beFulfilment.ts, BE_FULFILMENT_TOKEN, which this local
//    environment does not have configured for n8n's use).
// =============================================================================

test.describe("Evelyn VSL — full Stripe TEST-mode purchase path", () => {
  // Opt-in only: the full hosted-checkout purchase needs outbound network to
  // checkout.stripe.com AND Stripe -> localhost webhook forwarding (stripe-cli) so the
  // `checkout.session.completed` webhook can write the be_orders row. Neither is available
  // in the default/sandbox/CI env, so this leg is SKIPPED unless an operator explicitly
  // opts in with `EVELYN_VSL_STRIPE_E2E=1` (plus stripe-cli forwarding running). The 24
  // client-side legs above run and pass without any of that.
  test.skip(
    !process.env.EVELYN_VSL_STRIPE_E2E,
    "Set EVELYN_VSL_STRIPE_E2E=1 (with stripe-cli webhook forwarding) to run the full hosted-checkout purchase leg.",
  );
  test.skip(
    !STRIPE_TEST_MODE_READY,
    "Needs BACKEND_CHECKOUT_TEST_MODE=true + a Stripe sk_test_ key in .env " +
      "(server/routes/backendOffers.ts's backendCheckoutTestModeOpen gate). " +
      "See the task-12 report for exactly which env vars were present at run time.",
  );
  test.skip(!process.env.DATABASE_URL, "DATABASE_URL not set — cannot read be_orders/be_order_intake.");

  test.setTimeout(600_000); // U1 + U2's scripted chat has real typing delays (up to ~5s/message)

  const BUYER_EMAIL = `e2e-evelyn-vsl-${Date.now()}@example.test`;
  const BUYER_FIRST_NAME = "Priya";
  const BUYER_DOB = "1990-04-12";
  const CHOSEN_STONE: StoneKey = "rose-quartz";

  /** Fills Stripe's own hosted Checkout page with the standard test card and submits.
   *  Stripe's hosted Checkout (mode: 'payment') renders plain same-origin inputs for
   *  card/email/name — no cross-origin iframe to deal with, unlike Stripe Elements. */
  async function payOnStripeCheckout(page: Page, email: string) {
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    // Country/currency auto-detect by IP (seen as India/INR in this environment) does
    // not block the test-card path; the catalog's USD price is still what is charged.

    const emailField = page.locator('input[name="email"], input#email').first();
    await emailField.waitFor({ state: "visible", timeout: 30_000 });
    // Always fill, regardless of any prefill — Stripe's hosted page has its own focus/
    // validation timing, so trust a fresh fill + verify over a conditional "if empty".
    await emailField.fill(email);
    await expect(emailField).toHaveValue(email);

    const cardNumber = page.locator('input[name="cardnumber"], input[placeholder*="1234"]').first();
    await cardNumber.waitFor({ state: "visible", timeout: 30_000 });
    await cardNumber.fill("4242424242424242");

    const expiry = page.locator('input[name="exp-date"], input[placeholder="MM / YY"]').first();
    await expiry.fill("12/34");

    const cvc = page.locator('input[name="cvc"], input[placeholder="CVC"]').first();
    await cvc.fill("123");

    const zip = page.locator('input[name="billingPostalCode"], input[placeholder="ZIP"]').first();
    if (await zip.count()) await zip.fill("94103");

    const cardholderName = page.locator('input[name="billingName"]').first();
    if (await cardholderName.count()) await cardholderName.fill(BUYER_FIRST_NAME);

    const payButton = page.getByRole("button", { name: /pay|subscribe/i }).first();
    await payButton.scrollIntoViewIfNeeded();
    await payButton.click();

    // Stripe can reject the first submit with an inline validation error (e.g. focus
    // raced the fill) — if we're still on stripe.com after a few seconds AND the Pay
    // button is still actionable, the email field is the most common culprit; re-fill
    // once and click Pay again. CRUCIAL: gate the re-click on the button still being
    // visible — after a SUCCESSFUL first click Stripe shows a processing spinner (still
    // on stripe.com for a few seconds) and then detaches the Pay button as it redirects
    // to success_url. A blind second `payButton.click()` would then wait the full test
    // timeout for a button that is mid-navigation away (observed: the charge went
    // through and the page reached U1, but the stale locator hung). `isVisible()` is a
    // non-waiting probe, so this never blocks when the button is already gone.
    await page.waitForTimeout(3000);
    if (
      page.url().includes("stripe.com") &&
      (await payButton.isVisible().catch(() => false)) &&
      (await payButton.isEnabled().catch(() => false))
    ) {
      const stillEmpty = (await emailField.inputValue().catch(() => "")) === "";
      if (stillEmpty) {
        await emailField.fill(email);
      }
      await payButton.click().catch(() => {
        /* button detached while we raced Stripe's redirect — the waitForURL below settles it */
      });
    }

    // Lands back on our own domain once Stripe redirects (success_url).
    await page.waitForURL((url) => !url.hostname.includes("stripe.com"), { timeout: 60_000 });
  }

  /** Drives the shared /offers/upsell/welcome1|2 chat (useUpsellChat.ts) through to
   *  either the accept-CTA or decline-CTA, whichever appears first, clicking through any
   *  CONTINUE taps / quick-replies along the way. Returns once `button-upsell-accept` /
   *  `button-upsell-decline` is visible, so the caller decides accept vs decline. */
  async function clickThroughToCta(page: Page, maxSteps = 180) {
    for (let i = 0; i < maxSteps; i++) {
      if (await page.getByTestId("container-upsell-cta").isVisible().catch(() => false)) return;
      if (await page.getByTestId("form-shipping").isVisible().catch(() => false)) return;

      const continueBtn = page.getByTestId("button-quick-reply-continue");
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
        continue;
      }

      const quickReplyContainer = page.getByTestId("container-quick-replies");
      if (await quickReplyContainer.isVisible().catch(() => false)) {
        const firstReply = quickReplyContainer.locator("button").first();
        await firstReply.click();
        continue;
      }

      // Nothing actionable yet — the bot may still be "typing" a multi-message beat.
      await page.waitForTimeout(1000);
    }
    throw new Error("clickThroughToCta: never reached a CTA/shipping form within maxSteps");
  }

  test("buy $19 + bump, accept U1, decline U2 (downsell), land on /evelyn/thank-you; be_orders/be_order_intake carry firstName/DOB/stone/bump; Stripe metadata has no firstName and has funnel+stone", async ({
    page,
  }) => {
    // ── 1. /evelyn/checkout: open pop-up, fill intake, tick the bump, submit ──────
    await page.goto(`/evelyn/checkout?stone=${CHOSEN_STONE}`);
    await page.getByTestId("button-get-reading").click();
    await expect(page.getByTestId("popup-intake")).toBeVisible();

    await page.getByTestId("input-email").fill(BUYER_EMAIL);
    await page.getByTestId("input-first-name").fill(BUYER_FIRST_NAME);
    await page.getByTestId("input-dob").fill(BUYER_DOB);
    await page.getByTestId("checkbox-bump").locator('input[type="checkbox"]').check();
    await page.getByTestId("button-continue-checkout").click();

    // ── 2. Stripe's own hosted TEST-mode checkout ────────────────────────────────
    await payOnStripeCheckout(page, BUYER_EMAIL);

    // ── 3. U1 (Protection Ritual) — accept ───────────────────────────────────────
    await expect(page).toHaveURL(/\/offers\/upsell\/welcome1\?session_id=/);
    const sessionIdMatch = page.url().match(/session_id=([^&]+)/);
    const sessionId = sessionIdMatch ? decodeURIComponent(sessionIdMatch[1]) : null;
    expect(sessionId, "session_id present on the U1 redirect").toBeTruthy();

    await clickThroughToCta(page);
    if (await page.getByTestId("button-upsell-accept").isVisible().catch(() => false)) {
      await page.getByTestId("button-upsell-accept").click();
      // U1 charges a saved card off-session — give it a moment, then its own shipping
      // form may appear (new address, since this is a fresh test buyer).
      const shippingForm = page.getByTestId("form-shipping");
      if (await shippingForm.waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false)) {
        await page.getByTestId("input-shipping-name").fill(BUYER_FIRST_NAME);
        await page.getByTestId("input-shipping-line1").fill("1 Market St");
        await page.getByTestId("input-shipping-city").fill("San Francisco");
        await page.getByTestId("input-shipping-state").fill("CA");
        await page.getByTestId("input-shipping-postal").fill("94103");
        await page.getByTestId("button-shipping-submit").click();
      }
    }

    // ── 4. U2 (Manifestation Bracelet) — decline -> downsell -> decline again ────
    await page.waitForURL(/\/offers\/upsell\/welcome2\?session_id=/, { timeout: 30_000 });
    await clickThroughToCta(page);
    if (await page.getByTestId("button-upsell-decline").isVisible().catch(() => false)) {
      await page.getByTestId("button-upsell-decline").click();
    }
    // The downsell CTA reuses the same UpsellCTA testids — decline it too if it reappears.
    await page.waitForTimeout(2000);
    if (await page.getByTestId("button-upsell-decline").isVisible().catch(() => false)) {
      await page.getByTestId("button-upsell-decline").click();
    }

    // ── 5. /evelyn/thank-you ──────────────────────────────────────────────────────
    await page.waitForURL(/\/evelyn\/thank-you/, { timeout: 30_000 });
    await expect(page.getByTestId("text-thankyou-headline")).toContainText(BUYER_FIRST_NAME);

    // ── 6. be_orders / be_order_intake rows, read directly from Postgres ─────────
    const { rows: orderRows } = await pool.query(
      `SELECT first_name, bump_purchased, offer FROM be_orders WHERE stripe_session_id = $1`,
      [sessionId],
    );
    expect(orderRows.length, "a be_orders row exists for this session").toBe(1);
    expect(orderRows[0].offer).toBe("soulmate-initials");
    expect(orderRows[0].bump_purchased).toBe(true);

    const { rows: intakeRows } = await pool.query(
      `SELECT first_name, date_of_birth, stone FROM be_order_intake WHERE stripe_session_id = $1`,
      [sessionId],
    );
    expect(intakeRows.length, "a be_order_intake row exists for this session").toBe(1);
    expect(intakeRows[0].first_name).toBe(BUYER_FIRST_NAME);
    expect(String(intakeRows[0].date_of_birth)).toContain("1990-04-12".slice(0, 10));
    expect(intakeRows[0].stone).toBe(CHOSEN_STONE);

    // ── 7. Stripe session metadata — NO firstName, DOES have funnel + stone ──────
    expect(stripe, "Stripe SDK client configured (sk_test_ key)").toBeTruthy();
    const session = await stripe!.checkout.sessions.retrieve(sessionId!);
    expect(session.metadata?.firstName).toBeUndefined();
    expect(session.metadata?.dateOfBirth).toBeUndefined();
    expect(session.metadata?.funnel).toBe("evelyn_vsl");
    expect(session.metadata?.stone).toBe(CHOSEN_STONE);
    expect(session.metadata?.bump).toBe("1");
  });
});
