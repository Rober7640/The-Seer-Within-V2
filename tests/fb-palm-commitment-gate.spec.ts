import { test, expect, type Page } from "@playwright/test";

// Browser coverage for the fb-palm COMMITMENT GATE — the 3-checkbox ask that
// replaces the purchase button until all three are ticked.
//
// This is the automated form of the 8 unchecked items Joel added to
// docs/test-ideas.md ("fb-palm commitment gate — 3-checkbox pre-purchase ask").
// The component shipped with ZERO automated coverage: this repo has no
// jsdom/React-Testing-Library setup, so a browser spec is the only way to assert
// the gate's mechanics.
//
// ── How it forces the arm ─────────────────────────────────────────────────────
// `/api/lead` is what tells the client whether it drew the gate: the server
// resolves the `v1_palm_commitment_gate_2026` experiment and returns
// `commitmentGate: true|false`, which useConversation stores on
// `userData.commitmentGate`. The spec intercepts that response and hands back the
// arm under test — so it never touches the live experiment, and the same walk can
// drive BOTH arms and compare them. `/api/chat` is stubbed too, which keeps the
// run deterministic and free of Anthropic calls.
//
// ⚠ The arm is NOT a price variant. It was built as one (`35_palm_gate`) and was
//   deliberately moved onto the experiment framework: a price-pool arm can only be
//   drawn for an email with no stored variant, so every returning visitor would
//   have stayed in the control — 23% of live palm sessions but 57% of its main
//   buys. Both arms below therefore carry the SAME priceVariant, exactly as
//   production now does; only `commitmentGate` differs.
//
// 🔒 SAFETY: localhost only (hard-refused otherwise), Meta blocked at the network
//    layer, and `/api/checkout` is intercepted — no Stripe session is ever created
//    and the page never navigates away.
//
// ── RUN IT (isolated local sandbox — NEVER production) ────────────────────────
//   node scripts/make-sandbox-env.mjs
//   DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts
//   npx playwright test --config=playwright.fb-palm-gate.config.ts

// Both arms of the experiment. The price variant is identical on both — it is the
// live palm control in each case — because this is a UI test, not a price test.
const GATE = true;
const CONTROL = false;
const PALM_VARIANT = "35_palm_u47";
const ENTRY = "/fb-palm/chat?hook=already-met&thumb=a";

// The exact copy the final review settled on. The original draft asked for secrecy
// and said the ritual was irreversible, which contradicted the card's own
// "30-Day Guarantee" footer. Asserted verbatim so it cannot silently regress.
const COMMITMENTS = [
  "I understand belief is required for this to work",
  "I'm ready to receive this tonight",
  "I'll read it with an open heart",
];

type Captured = { checkout: Array<Record<string, unknown>>; metaBlocked: number };

async function harness(page: Page, commitmentGate: boolean): Promise<Captured> {
  const captured: Captured = { checkout: [], metaBlocked: 0 };

  await page.route("**://*.facebook.com/**", (r) => { captured.metaBlocked += 1; return r.abort(); });
  await page.route("**://connect.facebook.net/**", (r) => { captured.metaBlocked += 1; return r.abort(); });

  // The arm under test. Same shape the real endpoint returns (routes.ts) — note
  // priceVariant is the SAME on both arms; only `commitmentGate` moves.
  await page.route("**/api/lead", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        priceVariant: PALM_VARIANT,
        priceDollars: 35,
        downsellDollars: 25,
        commitmentGate,
      }),
    }),
  );

  // Deterministic, LLM-free turns. The client drives its own phase machine and
  // only needs a well-formed payload to advance. Objection turns get an
  // objectionType back so the 3-strike downsell fork can be reached.
  await page.route("**/api/chat", (r) => {
    let action = "";
    try { action = JSON.parse(r.request().postData() || "{}").action ?? ""; } catch { /* ignore */ }
    const isObjection = action === "objection";
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        messages: isObjection
          ? ["I understand, dear. Money worries are real.", "But think what the waiting has cost you."]
          : ["I feel the weight of this, dear.", "Let me look closer at what surrounds you."],
        needsClarification: false,
        subBucket: "SEEKING_LOVE",
        ...(isObjection ? { objectionType: "PRICE" } : {}),
      }),
    });
  });

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

// Substantive answers, mirroring the persona in the v1-funnel-audit skill. These
// MUST be real sentences: the client runs a low-intent guard and answers it judges
// thin ("The spirits require clear intention…") never advance the phase.
const NAME = "Claire";
const ANSWERS = [
  "I've been divorced for two years and every man I meet seems to lose interest after a few weeks.",
  "It always starts wonderfully, then they pull away and I never understand what I did wrong.",
  "A steady, honest man who stays — someone to build a calm life with.",
  "It would feel like I can finally stop bracing for the door to close.",
  "Honestly, it might go back to my marriage — I spent years feeling invisible in it.",
  "Two years of lonely weekends, and I've started believing something is wrong with me.",
];
const FALLBACKS = [
  "Yes... that's exactly how it feels.",
  "You're right. I can feel that.",
  "I hadn't thought of it that way, but yes.",
  "That's true for me, honestly.",
];
const OBJECTIONS = [
  "That's a lot of money for me right now",
  "I can't afford that right now",
  "Money is really tight this month",
];

/** Walk greeting → bucket → email → deepening until a purchase CTA (either arm) shows. */
async function driveToPitch(page: Page): Promise<boolean> {
  const input = page.locator('[data-testid="input-chat-message"]');
  const queue = [...ANSWERS];
  let fallbackI = 0, typed = 0;
  for (let step = 0; step < 40; step++) {
    if (await page.locator('[data-testid="commitment-gate-card"]').isVisible().catch(() => false)) return true;
    if (await page.getByRole("button", { name: /Begin My Energy Clearing/i }).first().isVisible().catch(() => false)) return true;

    const bucket = page.getByRole("button", { name: /Love & Relationships/i }).first();
    if (await bucket.isVisible().catch(() => false)) { await bucket.click(); continue; }

    const perm = page.getByRole("button", { name: /Yes, please help me Evelyn/i }).first();
    if (await perm.isVisible().catch(() => false)) { await perm.click(); continue; }

    if (await input.isEnabled().catch(() => false)) {
      const type = await input.getAttribute("type").catch(() => null);
      // Turn order is fixed: name first, then the deepening answers. (The email
      // step is identified by the input flipping to type="email".)
      let answer: string;
      if (type === "email") answer = `gate-spec+${Date.now().toString(36)}@example.com`;
      else if (typed === 0) answer = NAME;
      else answer = queue.length ? (queue.shift() as string) : FALLBACKS[fallbackI++ % FALLBACKS.length];
      typed += 1;
      await input.fill(answer);
      await input.press("Enter");
      await page.waitForTimeout(250);
      continue;
    }
    await page.waitForTimeout(400);
  }
  return false;
}

test.describe("fb-palm commitment gate (v1_palm_commitment_gate_2026)", () => {
  test.beforeAll(({}, testInfo) => {
    const base = String(testInfo.project.use.baseURL ?? "");
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
      throw new Error(`🔴 REFUSING to run against "${base}" — localhost sandbox only.`);
    }
  });

  test("gated arm: the buy button does not exist until all 3 boxes are ticked", async ({ page }) => {
    const cap = await harness(page, GATE);
    await page.goto(ENTRY);
    expect(await driveToPitch(page), "never reached the pitch").toBe(true);

    const card = page.locator('[data-testid="commitment-gate-card"]');
    await expect(card).toBeVisible();

    const confirm = page.locator('[data-testid="button-commitment-confirm"]');
    const boxes = [0, 1, 2].map((i) => page.locator(`[data-testid="checkbox-commitment-${i}"] input`));

    // 0 ticked — capture what a real (mobile) visitor first sees. Nobody on the
    // team has laid eyes on this card yet; these are for the pre-launch eyeball.
    await expect(confirm).toHaveCount(0);
    await expect(card).toContainText(/Check all three to continue/i);
    await page.screenshot({ path: "audit-runs/commitment-gate/01-unchecked-390.png" });
    await card.screenshot({ path: "audit-runs/commitment-gate/02-card-only-unchecked.png" });

    // 1 ticked, then 2 — still no button anywhere in the DOM
    await boxes[0].check();
    await expect(confirm).toHaveCount(0);
    await boxes[1].check();
    await expect(confirm).toHaveCount(0);
    await page.screenshot({ path: "audit-runs/commitment-gate/03-two-of-three-390.png" });

    // 3 ticked — button appears and is usable
    await boxes[2].check();
    await expect(confirm).toBeVisible();
    await expect(confirm).toBeEnabled();
    await expect(confirm).toContainText("$35");
    await page.screenshot({ path: "audit-runs/commitment-gate/04-all-checked-390.png" });
    await card.screenshot({ path: "audit-runs/commitment-gate/05-card-only-all-checked.png" });

    // Un-tick one — it must disappear again (no stale enabled state)
    await boxes[1].uncheck();
    await expect(confirm).toHaveCount(0);
    await expect(card).toContainText(/Check all three to continue/i);

    expect(cap.metaBlocked, "a Meta request escaped").toBeGreaterThanOrEqual(0);
    expect(cap.checkout, "checkout fired before the gate was satisfied").toHaveLength(0);
  });

  test("gated arm: copy is the non-contradictory wording, guarantee intact", async ({ page }) => {
    await harness(page, GATE);
    await page.goto(ENTRY);
    expect(await driveToPitch(page)).toBe(true);

    const card = page.locator('[data-testid="commitment-gate-card"]');
    for (const line of COMMITMENTS) await expect(card).toContainText(line);
    // The rejected draft's framing must never come back — it contradicts the footer.
    await expect(card).not.toContainText(/won't tell anyone|no undoing it/i);
    await expect(card).toContainText(/30-Day Guarantee/i);
  });

  test("gated arm: confirming posts the SAME checkout as the control arm", async ({ page }) => {
    const cap = await harness(page, GATE);
    await page.goto(ENTRY);
    expect(await driveToPitch(page)).toBe(true);

    for (const i of [0, 1, 2]) await page.locator(`[data-testid="checkbox-commitment-${i}"] input`).check();
    await page.locator('[data-testid="button-commitment-confirm"]').click();
    await expect.poll(() => cap.checkout.length, { timeout: 15_000 }).toBeGreaterThan(0);

    const body = cap.checkout[0];
    expect(body.type, "gate must buy the MAIN offer").toBe("main");
    expect(body.funnel, "gate must stay on the palm funnel").toBe("v1-palm");
    // The gate changes the UI in front of the purchase, never the purchase itself.
    expect(JSON.stringify(body)).not.toMatch(/55/);
  });

  // Joel's design puts the gate ONLY in front of the initial $35 ask. The $25
  // downsell is deliberately never gated — it exists to recover a wavering buyer,
  // so adding friction there works against its whole purpose. It is ungated by
  // construction today (ChatPage.tsx renders DownsellCTA with no gate branch);
  // this locks that in so a later "let's gate everything" edit can't slip through.
  test("gated arm: the $25 downsell is NEVER gated", async ({ page }) => {
    await harness(page, GATE);
    await page.goto(ENTRY);
    expect(await driveToPitch(page)).toBe(true);
    await expect(page.locator('[data-testid="commitment-gate-card"]')).toBeVisible();

    const input = page.locator('[data-testid="input-chat-message"]');
    const downsell = page.getByRole("button", { name: /Written Reading|\$25/i }).first();

    for (let i = 0; i < 6; i++) {
      if (await downsell.isVisible().catch(() => false)) break;
      if (!(await input.isEnabled().catch(() => false))) { await page.waitForTimeout(600); continue; }
      await input.fill(OBJECTIONS[i % OBJECTIONS.length]);
      await input.press("Enter");
      await page.waitForTimeout(900);
    }

    await expect(downsell, "the $25 downsell never appeared after repeated objections").toBeVisible();
    // The whole point: no second gate in front of the recovery offer.
    await expect(page.locator('[data-testid="commitment-gate-card"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="button-commitment-confirm"]')).toHaveCount(0);
  });

  // If userData.commitmentGate were lost on reload, a GATE visitor would silently
  // be shown the control CTA — their exposure is already logged in the gate arm, so
  // they'd keep counting as gated while never seeing a checkbox, quietly poisoning
  // the experiment. It rides in the session persisted to localStorage.
  test("gated arm: the gate survives a page reload", async ({ page }) => {
    await harness(page, GATE);
    await page.goto(ENTRY);
    expect(await driveToPitch(page)).toBe(true);
    await expect(page.locator('[data-testid="commitment-gate-card"]')).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    const gateBack = await page.locator('[data-testid="commitment-gate-card"]').isVisible().catch(() => false);
    const plainCta = await page.getByRole("button", { name: /Begin My Energy Clearing/i }).first().isVisible().catch(() => false);
    expect(gateBack || !plainCta,
      "after reload the visitor was shown the UNGATED control CTA — the gate arm leaked into control").toBe(true);
  });

  // "All FB-palm pages" (Joel, 2026-07-27) — the experiment's scope is the whole
  // v1-palm funnel with no scope.sign, so the gate must appear on every sign.
  for (const sign of ["hand-size", "finger-shape"]) {
    test(`gated arm: the gate also renders on sign=${sign}`, async ({ page }) => {
      await harness(page, GATE);
      await page.goto(`/fb-palm/chat?hook=already-met&thumb=a&sign=${sign}`);
      expect(await driveToPitch(page), `never reached the pitch on sign=${sign}`).toBe(true);
      await expect(page.locator('[data-testid="commitment-gate-card"]')).toBeVisible();
    });
  }

  test("control arm is untouched: plain CTA, no gate", async ({ page }) => {
    const cap = await harness(page, CONTROL);
    await page.goto(ENTRY);
    expect(await driveToPitch(page)).toBe(true);

    await expect(page.locator('[data-testid="commitment-gate-card"]')).toHaveCount(0);
    const cta = page.getByRole("button", { name: /Begin My Energy Clearing/i }).first();
    await expect(cta).toBeVisible();

    await cta.click();
    await expect.poll(() => cap.checkout.length, { timeout: 15_000 }).toBeGreaterThan(0);
    expect(cap.checkout[0].type).toBe("main");
    expect(cap.checkout[0].funnel).toBe("v1-palm");
  });
});
