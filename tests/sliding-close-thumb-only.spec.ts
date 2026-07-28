import { test, expect, type APIRequestContext } from "@playwright/test";

// ⚠ RETIRED 2026-07-26. The `55-35_palm` sliding-close variant this whole spec
// tests was parked at weight 0 in the live pool and superseded by the
// `35_palm_gate` commitment-gate A/B test (70/30 against the unscoped
// control, across every fb-palm sign — see
// docs/superpowers/specs/2026-07-26-fb-palm-commitment-gate-design.md). The
// suite below is `.skip`'d rather than deleted so it stays available as a
// historical/re-activatable reference; it is NOT rewritten to cover the new
// behavior — that is already covered by server/lib/priceVariantPool.test.ts
// and the fixed tests/fb-palm-thumb-angle-smoke.spec.ts.
//
// The $55/$35 sliding close runs on the fb-palm THUMB ads and NOWHERE ELSE.
//
//   Joel, 2026-07-14 call: "we should never put new tests onto a new lander… the one
//   that is getting the most traffic is still the thumb. The test should go on to
//   thumb, and then once Ruby has confirmed hand size or the decode-him or finger
//   shape is working, then we will make sure the test also goes to those."
//
// This drives the REAL /api/lead endpoint (real assignment, real DB write, real
// stickiness) and asserts the split per sign. It is the integration counterpart to
// the pure unit tests in server/lib/priceVariantPool.test.ts (`npm run test:price`).
//
// ── RUN IT (isolated local sandbox — NEVER production) ────────────────────────
//   1. Start the local Postgres sandbox   (D:\pg-local, port 5433, db `seer`)
//   2. Start the app against it, with the go-live pool loaded from env:
//        DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seer \
//        V1_PRICE_VARIANTS_JSON="$(cat improve-v1/go-live-pool.json)" \
//        STRIPE_SECRET_KEY=sk_test_... \
//        npm run dev
//   3. npx playwright test --config=playwright.sliding-close.config.ts
//
// See docs/sliding-close-thumb-only-runbook.md.
//
// ⚠ It writes ~160 conversation rows and hits /api/lead's (non-blocking) AWeber /
//   Resend / Kit side-effects. The guard below hard-refuses any non-local base URL
//   so it can never do that to the shared production database.

const PALM = "v1-palm";
const CONTROL = "35_palm_u47";
const SLIDING = "55-35_palm";

// Every non-thumb sign with a live or possible ad lander. None of these may EVER be
// assigned the sliding close until the business says so (a `signs` config edit).
const OTHER_SIGNS = ["hand-size", "finger-shape", "palms", "finger-lock"] as const;

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
let seq = 0;
const testEmail = () => `slidetest+${RUN}-${seq++}@example.com`;

interface LeadResult {
  priceVariant: string | null;
  priceDollars: number | null;
  downsellDollars: number | null;
}

async function lead(
  request: APIRequestContext,
  sign: string | undefined,
  email = testEmail(),
): Promise<LeadResult> {
  const res = await request.post("/api/lead", {
    data: {
      email,
      firstName: "SlideTest",
      bucket: "love",
      funnel: PALM,
      ...(sign === undefined ? {} : { sign }),
    },
  });
  expect(res.ok(), `/api/lead failed: ${res.status()}`).toBeTruthy();
  return (await res.json()) as LeadResult;
}

async function tally(
  request: APIRequestContext,
  sign: string | undefined,
  n: number,
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const r = await lead(request, sign);
    const key = r.priceVariant ?? "(none)";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

test.describe.configure({ mode: "serial" });

test.describe.skip("sliding close ($55/$35) — thumb-only", () => {
  test.beforeAll(async ({ playwright }, testInfo) => {
    const base = String(testInfo.project.use.baseURL ?? "");
    // Hard stop: this test creates real leads. It must never run against the shared
    // production database — dev and prod share ONE DB, so "dev" is not safe either.
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
      throw new Error(
        `REFUSING TO RUN against "${base}". This spec writes real conversation rows and fires ` +
          `/api/lead's AWeber/Resend/Kit side-effects. Dev and production SHARE one database, ` +
          `so it must only ever run against a local server pointed at the isolated local ` +
          `Postgres sandbox (127.0.0.1:5433). See the header.`,
      );
    }

    // Guard against a VACUOUS PASS. If the sliding arm isn't in the pool at all, every
    // "…never sees the sliding close" assertion below would pass while proving nothing.
    const request = await playwright.request.newContext({ baseURL: base });
    const probe = await tally(request, "thumb", 30);
    await request.dispose();
    if (!probe[SLIDING]) {
      throw new Error(
        `The server is NOT serving the sliding arm (${SLIDING}) to thumb traffic — got ` +
          `${JSON.stringify(probe)}. Every thumb-only assertion in this file would pass ` +
          `vacuously. Load the go-live pool via V1_PRICE_VARIANTS_JSON and restart the server.`,
      );
    }
  });

  test("thumb gets a ~50/50 between the control and the sliding close", async ({ request }) => {
    const t = await tally(request, "thumb", 60);
    expect(Object.keys(t).sort()).toEqual([CONTROL, SLIDING]);

    const share = t[SLIDING] / 60;
    expect(share, `expected ~50% sliding, got ${(share * 100).toFixed(0)}% — ${JSON.stringify(t)}`)
      .toBeGreaterThan(0.3);
    expect(share).toBeLessThan(0.7);
  });

  test("palm traffic with NO sign param is thumb (the thumb ad URLs omit &sign=)", async ({ request }) => {
    const t = await tally(request, undefined, 40);
    expect(
      t[SLIDING],
      `thumb traffic that sends no sign was excluded from its own test — ${JSON.stringify(t)}`,
    ).toBeGreaterThan(0);
  });

  for (const sign of OTHER_SIGNS) {
    test(`sign="${sign}" NEVER sees the sliding close — 100% control at $35`, async ({ request }) => {
      const t = await tally(request, sign, 25);
      expect(
        t[SLIDING],
        `🔴 CONTAMINATION: "${sign}" was assigned the $55 sliding close — ${JSON.stringify(t)}`,
      ).toBeUndefined();
      expect(Object.keys(t)).toEqual([CONTROL]);
    });
  }

  test("the sliding arm charges $55 main and $35 GRACE — not the legacy $25 downsell", async ({ request }) => {
    // The grace option rides the existing `downsell` checkout slot. The whole test is
    // worthless (and we undercharge) if that slot still carries the old $25.
    let checked = 0;
    for (let i = 0; i < 40 && checked < 3; i++) {
      const r = await lead(request, "thumb");
      if (r.priceVariant !== SLIDING) continue;
      expect(r.priceDollars).toBe(55);
      expect(r.downsellDollars, "🔴 grace must be $35 — a $25 here means it fell back to the legacy downsell").toBe(35);
      checked++;
    }
    expect(checked, "never drew the sliding arm in 40 tries").toBeGreaterThan(0);
  });

  test("the control arm is untouched — $35 main / $25 downsell", async ({ request }) => {
    let checked = 0;
    for (let i = 0; i < 40 && checked < 3; i++) {
      const r = await lead(request, "hand-size"); // guaranteed control
      expect(r.priceVariant).toBe(CONTROL);
      expect(r.priceDollars).toBe(35);
      expect(r.downsellDollars).toBe(25);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  test("assignment is STICKY — a visitor's price can never flip mid-funnel", async ({ request }) => {
    for (let i = 0; i < 8; i++) {
      const email = testEmail();
      const first = await lead(request, "thumb", email);
      for (let r = 0; r < 3; r++) {
        const again = await lead(request, "thumb", email);
        expect(again.priceVariant).toBe(first.priceVariant);
        expect(again.priceDollars).toBe(first.priceDollars);
        expect(again.downsellDollars).toBe(first.downsellDollars);
      }
    }
  });

  test("a spoofed sign cannot buy its way into (or out of) the $55 arm", async ({ request }) => {
    // Unknown signs fall through to the unscoped control — they never reach $55.
    for (const sign of ["THUMBS", "thumb2", "../thumb", "nonsense"]) {
      const t = await tally(request, sign, 10);
      expect(t[SLIDING], `spoofed sign "${sign}" reached the $55 arm`).toBeUndefined();
    }
  });
});
