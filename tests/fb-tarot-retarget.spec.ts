import { test, expect, type Page, type Request } from "@playwright/test";
import { RETARGET_OFFER } from "../client/src/content/tarotRetargetOffer";
import { retargetOfferPricing } from "../shared/retargetCheckout";

// Coverage for the /fb-tarot RETARGETING page — `/fb-tarot/b?src=retarget&hook=…`.
// Since 2026-10-16 it is ONE page, the offer page (pages/TarotRetargetOffer.tsx): every
// `src=retarget` visit sees it.
//
//   · it renders top to bottom: eyebrow, headline, intro, NO card images, the offer box
//     (badge with 14%, struck $35, $30, a screen-reader "was/now" line), what you get,
//     three steps, two doubts, a second buy block, sign-off, P.S. — no chat door
//   · ONE first-name value across both buy blocks; the name is required; a stored first
//     name (seer_conversation, NOT wiped in retarget mode) greets her and pre-fills it
//   · both buy blocks POST /api/checkout with src=retarget, the offer-page marker
//     (retargetPage=offer) and returnTo=lander (intercepted, never followed) — and NO
//     price field: the server prices the order from the marker
//   · PostHog (posthog.capture spied in the page, nothing sent): tarot_bridge_view
//     (mode retarget), retarget_offer_cta_click {position}, retarget_cancelled_view,
//     checkout_initiated — and no format props
//   · cancelled=1 shows the note and scrolls to the first buy block
//   · deck= is ignored (always return-mhf); /fb-tarot?src=retarget is the same page
//   · a NORMAL /fb-tarot/b visit behaves exactly as before
//
// Copy is read from content/tarotRetargetOffer.ts, so the spec follows copy edits.
//
// 🔒 SAFETY: localhost only (hard-refused otherwise). /api/checkout is intercepted
//    (never reaches Stripe), nothing is typed into a chat (no LLM turn, no /api/lead),
//    and Meta + PostHog are blocked at the network layer. No DB writes.
//
//   LOCAL_BASE_URL=http://127.0.0.1:5066 npx playwright test --config=playwright.fb-tarot-retarget.config.ts

const HOOK = "cards-return"; // love
const MONEY_HOOK = "cards-nest-egg"; // money
const LOVE = RETARGET_OFFER.love;
const MONEY = RETARGET_OFFER.money;
const PRICING = retargetOfferPricing();
const FULL = `$${PRICING.fullDollars}`;
const NOW = `$${PRICING.offerDollars}`;
const PCT = `${PRICING.pct}%`;
const SLOW = { timeout: 90_000 };

type PhEvent = { event: string; properties: Record<string, unknown> };

async function blockOutbound(page: Page) {
  await page.route("**://*.facebook.com/**", (r) => r.abort());
  await page.route("**://connect.facebook.net/**", (r) => r.abort());
  await page.route("**://*.posthog.com/**", (r) => r.abort());
}

/**
 * Record every posthog.capture() the page makes, by wrapping capture on the SAME
 * posthog-js module instance the app uses (the dev server's pre-bundled dep). Nothing
 * reaches PostHog — blockOutbound aborts its network. Call after the page has loaded;
 * events before that are not seen (use remount() to replay the page's mount events).
 */
async function spyPostHog(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((n) => n.includes("/deps/posthog-js.js"));
    if (!url) throw new Error("posthog-js module not found on the page");
    const m = await import(/* @vite-ignore */ url);
    const w = window as unknown as { __ph: PhEvent[] };
    w.__ph = [];
    const orig = m.default.capture.bind(m.default);
    m.default.capture = (event: string, properties: Record<string, unknown>) => {
      w.__ph.push({ event, properties });
      return orig(event, properties);
    };
  });
}
const phEvents = (page: Page) => page.evaluate(() => (window as unknown as { __ph: PhEvent[] }).__ph);

/** Leave and come back through the SPA router, so the page mounts again with the spy on. */
async function remount(page: Page, path: string) {
  const go = (p: string) =>
    page.evaluate((to) => {
      history.pushState({}, "", to);
      dispatchEvent(new PopStateEvent("popstate"));
    }, p);
  await go("/privacy");
  await expect(page.getByTestId("retarget-offer-page")).toHaveCount(0);
  await go(path);
  await expect(page.getByTestId("retarget-offer-page")).toBeVisible();
}

/** Capture /api/checkout bodies; answer with nothing to follow so the page stays put. */
async function captureCheckout(page: Page): Promise<Record<string, unknown>[]> {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/checkout", async (route, req: Request) => {
    bodies.push(req.postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  return bodies;
}

/** Seed the chat's localStorage session exactly as useConversation saves it (once per tab). */
async function seedChatSession(page: Page, firstName: string) {
  await page.addInitScript((name) => {
    if (sessionStorage.getItem("__seeded")) return;
    sessionStorage.setItem("__seeded", "1");
    localStorage.setItem(
      "seer_conversation",
      JSON.stringify({
        state: { state: "EMAIL_CAPTURE", messages: [], userData: { firstName: name, email: null } },
        timestamp: Date.now(),
      }),
    );
  }, firstName);
}

function expectNoFormatProps(e: PhEvent) {
  for (const k of Object.keys(e.properties)) expect(k, `${e.event} carries ${k}`).not.toMatch(/format/i);
}

test.beforeAll(({}, testInfo) => {
  const base = String(testInfo.project.use.baseURL ?? "");
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)) {
    throw new Error(`🔴 REFUSING to run against "${base}" — localhost sandbox only.`);
  }
});

test("the offer prices come from the shared tables: $35 struck, $30, 14%", () => {
  expect(PRICING).toEqual({ fullDollars: 35, offerDollars: 30, pct: 14 });
});

test("src=retarget renders the offer page top to bottom — no cards, no bubbles, no chat door", async ({ page }) => {
  await blockOutbound(page);
  await page.goto(`/fb-tarot/b?src=retarget&hook=${HOOK}`, { waitUntil: "domcontentloaded" });

  const root = page.getByTestId("retarget-offer-page");
  await expect(root).toBeVisible();
  // The quiz bridge is not rendered.
  await expect(page.getByTestId("tarot-card-a")).toHaveCount(0);
  await expect(page.locator('[data-testid^="message-bot-"]')).toHaveCount(0);

  // 1 — Evelyn, eyebrow, headline, intro.
  await expect(page.getByTestId("offer-evelyn-photo")).toHaveAttribute("alt", "Evelyn Cross");
  await expect(page.getByTestId("offer-eyebrow")).toHaveText(LOVE.eyebrow);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(LOVE.headline);
  await expect(page.getByTestId("offer-intro").locator("p")).toHaveText(LOVE.intro);

  // NO card images anywhere: the only image is Evelyn, and no element paints card art.
  await expect(root.locator("img")).toHaveCount(1);
  await expect(root.locator('[style*="mhf"], [style*="tarot"], [role="img"]')).toHaveCount(0);

  // 2 — the offer box.
  await expect(page.getByTestId("offer-badge")).toHaveText(LOVE.badge(PCT));
  await expect(page.getByTestId("offer-badge")).toContainText("14%");
  await expect(page.getByRole("heading", { level: 2, name: LOVE.offerTitle })).toBeVisible();
  await expect(page.getByTestId("offer-summary")).toHaveText(LOVE.offerSummary);
  await expect(page.getByTestId("offer-price-full-1")).toHaveText(FULL);
  await expect(page.getByTestId("offer-price-full-1")).toHaveText("$35");
  expect(await page.getByTestId("offer-price-full-1").evaluate((el) => el.tagName)).toBe("S");
  await expect(page.getByTestId("offer-price-now-1")).toHaveText(NOW);
  await expect(page.getByTestId("offer-price-now-1")).toHaveText("$30");
  await expect(page.getByTestId("offer-price-sr-1")).toHaveText("Was $35, now $30.");
  await expect(page.getByTestId("offer-price-sr-1")).toHaveClass(/sr-only/);
  await expect(page.getByTestId("offer-price-label")).toHaveText(LOVE.priceLabel);

  // Reachable on a phone: the price inside 1.5 screens of a 390×844 viewport.
  const priceBox = await page.getByTestId("offer-price-now-1").boundingBox();
  expect(priceBox).not.toBeNull();
  expect(priceBox!.y + priceBox!.height).toBeLessThan(844 * 1.5);

  // Both buy blocks.
  for (const n of [1, 2]) {
    await expect(page.getByTestId(`offer-button-${n}`)).toHaveText(LOVE.offerButton("$30"));
    await expect(page.getByTestId(`offer-note-${n}`)).toHaveText(LOVE.offerNote);
    await expect(page.getByLabel(LOVE.nameLabel).nth(n - 1)).toBeVisible();
  }
  await expect(page.getByTestId("offer-price-full-2")).toHaveText("$35");
  await expect(page.getByTestId("offer-price-now-2")).toHaveText("$30");

  // 3 — includes, steps, why, doubts, sign-off, P.S.
  await expect(page.getByRole("heading", { level: 2, name: LOVE.includesHeading })).toBeVisible();
  await expect(page.getByTestId("offer-include-item")).toHaveCount(LOVE.includes.length);
  await expect(page.getByRole("heading", { level: 2, name: LOVE.stepsHeading })).toBeVisible();
  await expect(page.getByTestId("offer-step")).toHaveCount(3);
  await expect(page.getByRole("heading", { level: 2, name: LOVE.whyHeading })).toBeVisible();
  for (const t of LOVE.why) await expect(page.getByTestId("offer-why")).toContainText(t);
  await expect(page.getByTestId("offer-doubt")).toHaveCount(2);
  await expect(page.getByTestId("offer-doubt-q")).toHaveText(LOVE.doubts.map((d) => d.q));
  await expect(page.getByTestId("offer-signature")).toHaveText(LOVE.signature);
  await expect(page.getByTestId("offer-ps")).toHaveText(LOVE.ps);
  const text = await page.getByTestId("offer-paper").innerText();
  expect(text).not.toMatch(/P\.S\.\s*P\.S\./);

  // No "ask me first" door: nothing links or navigates into the chat.
  await expect(page.locator('[data-testid*="ask"]')).toHaveCount(0);
  await expect(root.locator('a[href*="/chat"]')).toHaveCount(0);
  await expect(page.getByTestId("offer-cancelled-note")).toHaveCount(0);

  // No horizontal scroll.
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(m.sw).toBeLessThanOrEqual(m.cw);
});

test("/fb-tarot?src=retarget (no /b) is the same offer page", async ({ page }) => {
  await blockOutbound(page);
  await page.goto(`/fb-tarot?src=retarget&hook=${MONEY_HOOK}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("retarget-offer-page")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(MONEY.headline);
});

test("ONE name across both buy blocks; each POSTs an offer-page retarget checkout (no price in the body)", async ({ page }) => {
  await blockOutbound(page);
  const bodies = await captureCheckout(page);
  await page.goto(`/fb-tarot/b?src=retarget&hook=${HOOK}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("retarget-offer-page")).toBeVisible();
  await spyPostHog(page);

  await page.getByTestId("offer-first-name-1").fill("Maria");
  await expect(page.getByTestId("offer-first-name-2")).toHaveValue("Maria");

  await page.getByTestId("offer-button-1").click();
  await expect.poll(() => bodies.length).toBe(1);
  await expect(page.getByTestId("offer-button-2")).toBeEnabled();
  await page.getByTestId("offer-first-name-2").fill("  Maria Jo ");
  await expect(page.getByTestId("offer-first-name-1")).toHaveValue("  Maria Jo ");
  await page.getByTestId("offer-button-2").click();
  await expect.poll(() => bodies.length).toBe(2);

  for (const [i, b] of bodies.entries()) {
    expect(b).toMatchObject({
      src: "retarget",
      retargetPage: "offer",
      returnTo: "lander",
      funnel: "v1-tarot",
      type: "main",
      bucket: "love",
      tarotHook: HOOK,
      tarotDeck: "return-mhf",
      firstName: i === 0 ? "Maria" : "Maria Jo",
    });
    expect(b).not.toHaveProperty("email");
    expect(b).not.toHaveProperty("noemail");
    for (const k of Object.keys(b)) expect(k).not.toMatch(/price|amount|cents|format|bump/i);
  }

  // PostHog: the CTA click with its position, checkout_initiated, no format props.
  const events = await phEvents(page);
  const clicks = events.filter((e) => e.event === "retarget_offer_cta_click");
  expect(clicks.map((e) => e.properties.position)).toEqual([1, 2]);
  for (const c of clicks) expect(c.properties).toMatchObject({ name_valid: true, mode: "retarget", discount_pct: 14 });
  const inits = events.filter((e) => e.event === "checkout_initiated");
  expect(inits).toHaveLength(2);
  for (const e of inits) expect(e.properties).toMatchObject({ src: "retarget", mode: "retarget", price_cents: 3000 });
  expect(events.find((e) => e.event === "retarget_offer_click")?.properties).toMatchObject({ price_cents: 3000, position: 1 });
  for (const e of events) expectNoFormatProps(e);
});

test("the name is required — error under THAT block, nothing posted", async ({ page }) => {
  await blockOutbound(page);
  const bodies = await captureCheckout(page);
  await page.goto(`/fb-tarot/b?src=retarget&hook=${HOOK}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("retarget-offer-page")).toBeVisible();

  await page.getByTestId("offer-button-2").click();
  await expect(page.getByTestId("offer-name-error-2")).toBeVisible();
  await expect(page.getByTestId("offer-name-error-1")).toHaveCount(0);
  await expect(page.getByTestId("offer-first-name-2")).toBeFocused();
  await expect(page.getByTestId("offer-first-name-2")).toHaveAttribute("aria-invalid", "true");

  await page.getByTestId("offer-first-name-1").fill("   ");
  await page.getByTestId("offer-button-1").click();
  await expect(page.getByTestId("offer-name-error-1")).toBeVisible();
  await expect(page.getByTestId("offer-name-error-2")).toHaveCount(0);

  await page.getByTestId("offer-first-name-1").fill("Ann");
  await expect(page.getByTestId("offer-name-error-1")).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(bodies).toHaveLength(0);
});

test("a stored first name is NOT wiped: it greets her and pre-fills both boxes", async ({ page }) => {
  await blockOutbound(page);
  await seedChatSession(page, "Rosa");
  await page.goto(`/fb-tarot/b?src=retarget&hook=${HOOK}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("offer-intro-first")).toHaveText(LOVE.introNamed("Rosa"));
  await expect(page.getByTestId("offer-first-name-1")).toHaveValue("Rosa");
  await expect(page.getByTestId("offer-first-name-2")).toHaveValue("Rosa");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => localStorage.getItem("seer_conversation"))).toContain("Rosa");
});

test("cancelled=1: the note shows, the page scrolls to the first buy block (money copy); view events fire", async ({ page }) => {
  await blockOutbound(page);
  const bodies = await captureCheckout(page);
  const path = `/fb-tarot/b?src=retarget&hook=${MONEY_HOOK}&cancelled=1`;
  await page.goto(path, { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("offer-cancelled-note")).toHaveText(MONEY.cancelledNote);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(MONEY.headline);
  await expect(page.getByTestId("offer-badge")).toBeInViewport();
  await expect(page.getByTestId("offer-button-1")).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);

  // PostHog: re-mount with the spy on, so the page's mount events are recorded.
  await spyPostHog(page);
  await remount(page, path);
  await expect(page.getByTestId("offer-cancelled-note")).toBeVisible();
  await expect
    .poll(async () => (await phEvents(page)).map((e) => e.event))
    .toEqual(expect.arrayContaining(["tarot_bridge_view", "retarget_cancelled_view"]));
  const events = await phEvents(page);
  expect(events.filter((e) => e.event === "tarot_bridge_view")).toHaveLength(1);
  expect(events.find((e) => e.event === "tarot_bridge_view")?.properties).toMatchObject({
    mode: "retarget",
    cancelled: true,
    hook: MONEY_HOOK,
    bucket: "money",
    deck: "return-mhf",
  });
  expect(events.filter((e) => e.event === "retarget_cancelled_view")).toHaveLength(1);
  for (const e of events) expectNoFormatProps(e);

  await page.getByTestId("offer-first-name-1").fill("June");
  await page.getByTestId("offer-button-1").click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toMatchObject({ src: "retarget", bucket: "money", retargetPage: "offer", returnTo: "lander", tarotHook: MONEY_HOOK });
});

test("deck= is ignored in retarget mode (always return-mhf)", async ({ page }) => {
  await blockOutbound(page);
  const bodies = await captureCheckout(page);
  await page.goto(`/fb-tarot/b?src=retarget&hook=${HOOK}&deck=arcana-mfh`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("offer-first-name-1").fill("Ann");
  await page.getByTestId("offer-button-1").click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toMatchObject({ tarotDeck: "return-mhf" });
});

test("no regression: a normal /fb-tarot/b visit is the quiz, wipes the chat session, and hands to chat", async ({ page }) => {
  await blockOutbound(page);
  await seedChatSession(page, "Rosa");
  await page.goto(`/fb-tarot/b?hook=${HOOK}`, { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("tarot-card-a")).toBeVisible();
  await expect(page.getByTestId("retarget-offer-page")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("seer_conversation")))
    .toBeNull();

  await page.getByTestId("tarot-card-b").click();
  await expect(page).toHaveURL(/\/fb-tarot\/chat\?hook=cards-return&card=[abc]&v=b/, SLOW);
  await expect(page).not.toHaveURL(/src=retarget/);
});
