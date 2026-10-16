import { test, expect, type Page } from "@playwright/test";
import pg from "pg";
import { fileURLToPath } from "node:url";
import { RETARGET_U2_REVEAL, RETARGET_U2_PERSONALIZE } from "../client/src/lib/upsellCopy/retargetUpsell2";

// The post-purchase path of a /fb-tarot RETARGETING buyer (bought on the offer page, no
// chat, no email at checkout) — and a normal tarot buyer as the control.
//
//   · U1 (/fb-tarot/welcome1): the LIVE page runs for her on a seeded no-concern row —
//     her name, no "Friend", no "undefined", no unfilled {placeholder}
//   · U2 (/fb-tarot/welcome2): with the server's retarget flag, the reveal and the stone
//     beat are the FIXED lines (retargetUpsell2.ts) and /api/upsell2/reading is NEVER
//     requested; the rest is live (questions, offer, $30 downsell)
//   · /fb-tarot/success: an `evelyn` handoff shows the Evelyn card + link
//   · CONTROL: a normal tarot buyer still gets the AI reveal (the request fires, with her
//     concern) and the Luna card from the REAL handoff endpoint
//
// What is stubbed, and why: the sandbox has no Stripe key, and the retarget decision is
// read from the order's Stripe session (server/lib/retargetOrder.ts — unit tested in
// retargetOrder.test.ts / evelynThankyouGift.test.ts). So for the retarget buyer the REAL
// /api/upsell2/user-data response is fetched and only the two server-side retarget keys
// are added, and /api/luna-ty/handoff is answered with what the server returns for a
// retarget order. Everything else is the real sandbox server + DB.
//
// 🔒 SAFETY: localhost only (hard-refused otherwise); the DB seed is hard-wired to the
//    local sandbox Postgres (127.0.0.1:5433), never an env URL; no Stripe; the AI reveal
//    is answered by a stub (no LLM spend); Meta + PostHog blocked at the network layer.
//
//   LOCAL_BASE_URL=http://127.0.0.1:5066 npx playwright test --config=playwright.fb-tarot-retarget.config.ts

const SANDBOX_DB = "postgresql://postgres@127.0.0.1:5433/seer";
const RT_SESSION = "cs_test_pw_rt_love";
const CTL_SESSION = "cs_test_pw_control";
const RT_EMAIL = "pw-rt-love@example.test";
const CTL_EMAIL = "pw-control@example.test";
const SCREENS = fileURLToPath(new URL("../improve-v1/retargeting-test/page/screens", import.meta.url));

test.beforeAll(async ({ baseURL }) => {
  const host = new URL(baseURL!).hostname;
  if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`refusing non-local base URL ${baseURL}`);
  const client = new pg.Client({ connectionString: SANDBOX_DB });
  await client.connect();
  try {
    await client.query("delete from conversations where email = any($1)", [[RT_EMAIL, CTL_EMAIL]]);
    // A retarget buyer's row as the /api/upsell/user-data Stripe fallback creates it:
    // first name + topic from the session metadata, NO concern / person / price variant.
    await client.query(
      `insert into conversations (email, first_name, bucket, payment_gateway, stripe_session_id,
         stripe_customer_id, main_purchase_amount)
       values ($1, 'Ann', 'love', 'stripe', $2, 'cus_test_pw_rt', 3000)`,
      [RT_EMAIL, RT_SESSION],
    );
    // A normal /fb-tarot buyer: she chatted, so the row has her concern and tarot variant.
    await client.query(
      `insert into conversations (email, first_name, bucket, concern, payment_gateway, stripe_session_id,
         stripe_customer_id, main_purchase_amount, price_variant, purchased)
       values ($1, 'Beth', 'love', 'he went quiet after my birthday', 'stripe', $2, 'cus_test_pw_ctl', 3500, '35_tarot', true)`,
      [CTL_EMAIL, CTL_SESSION],
    );
  } finally {
    await client.end();
  }
});

async function setup(page: Page) {
  await page.route("**://*.facebook.com/**", (r) => r.abort());
  await page.route("**://connect.facebook.net/**", (r) => r.abort());
  await page.route("**://*.posthog.com/**", (r) => r.abort());
  // The scripted typing delays (1–5s a bubble, ~50 bubbles) compressed ×25 so a whole
  // upsell runs in seconds. Short timers (UI ticks) are left alone.
  await page.addInitScript(() => {
    const orig = window.setTimeout.bind(window);
    (window as any).setTimeout = (fn: TimerHandler, ms?: number, ...args: unknown[]) =>
      orig(fn, typeof ms === "number" && ms >= 200 ? Math.max(15, ms / 25) : ms, ...args);
  });
}

const bubbles = (page: Page) =>
  page.locator('[data-testid^="message-bot-"]').allInnerTexts();

/** Tap the first quick reply each time one appears, until `until` is visible. */
async function driveTo(page: Page, until: string, timeout = 120_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await page.locator(until).isVisible()) return;
    const qr = page.locator('[data-testid="container-quick-replies"] button').first();
    if (await qr.isVisible().catch(() => false)) await qr.click().catch(() => {});
    await page.waitForTimeout(150);
  }
  throw new Error(`never reached ${until}`);
}

function assertClean(texts: string[], name: string) {
  const all = texts.join("\n");
  expect(all).toContain(name);
  expect(all).not.toMatch(/\bFriend\b|undefined|null|\{firstName\}|\{personName\}|\{concern\}/);
}

test("retarget buyer: U1 live → U2 fixed reveal (no AI call) → downsell → thank-you hands to Evelyn", async ({ page }) => {
  await setup(page);
  const aiCalls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/upsell2/reading")) aiCalls.push(r.postData() ?? "");
  });
  // Retarget flag as the server sets it from the Stripe session (no Stripe in the sandbox).
  await page.route(/\/api\/upsell2\/user-data/, async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    expect(body.firstName).toBe("Ann");
    await route.fulfill({ response: res, json: { ...body, concern: "", personName: "", retarget: true, retargetBucket: "love" } });
  });
  await page.route("**/api/luna-ty/handoff", (route) =>
    route.fulfill({ json: { mode: "signup", email: RT_EMAIL, firstName: "Ann", persona: "evelyn", retarget: true } }),
  );

  // ── U1: real endpoint, real seeded row, live copy ──
  const u1Data = page.waitForResponse((r) => r.url().includes("/api/upsell/user-data"));
  await page.goto(`/fb-tarot/welcome1?session_id=${RT_SESSION}`);
  const u1 = await (await u1Data).json();
  expect(u1).toMatchObject({ firstName: "Ann", bucket: "love", personName: null, mainPurchaseAmount: 3000, upsell1PriceCents: 4700 });
  await driveTo(page, '[data-testid="button-upsell-decline"]');
  assertClean(await bubbles(page), "Ann");
  expect((await bubbles(page)).join("\n")).toContain("It's done, Ann.");
  await expect(page.locator('[data-testid="container-upsell-cta"]')).toContainText("$47");
  await page.screenshot({ path: `${SCREENS}/post-u1.png` });

  // Decline → /welcome2 (Path B).
  await page.locator('[data-testid="button-upsell-decline"]').click();
  await page.waitForURL(/\/fb-tarot\/welcome2\?session_id=/, { timeout: 60_000 });

  // ── U2: fixed reveal, no AI request ──
  const reveal = RETARGET_U2_REVEAL.love.map((l) => l.replace("{firstName}", "Ann"));
  await expect(page.getByText(reveal[2])).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: `${SCREENS}/post-u2-fixed-reveal.png` });
  for (const l of reveal) expect(await bubbles(page)).toContain(l);

  await driveTo(page, '[data-testid="button-upsell2-decline"]');
  const personalize = RETARGET_U2_PERSONALIZE.love.map((l) => l.replace("{firstName}", "Ann"));
  const u2Texts = await bubbles(page);
  for (const l of personalize) expect(u2Texts).toContain(l);
  assertClean(u2Texts, "Ann");
  // Live offer copy is still there, at the live price.
  expect(u2Texts.join("\n")).toContain("is $47. Shipped directly to you.");
  await page.screenshot({ path: `${SCREENS}/post-u2-offer.png` });

  // ── Downsell: live copy, live $30 ──
  await page.locator('[data-testid="button-upsell2-decline"]').click();
  await expect(page.locator('[data-testid="button-upsell2-downsell-decline"]')).toBeVisible({ timeout: 60_000 });
  expect((await bubbles(page)).join("\n")).toContain("I can send it to you for $30 instead.");
  await page.screenshot({ path: `${SCREENS}/post-u2-downsell.png` });

  expect(aiCalls, "the AI reveal endpoint must never be called for a retarget buyer").toEqual([]);

  // ── Thank-you: Evelyn card ──
  await page.locator('[data-testid="button-upsell2-downsell-decline"]').click();
  await page.waitForURL(/\/fb-tarot\/success\?session_id=/, { timeout: 60_000 });
  const evelyn = page.locator('[data-testid="link-evelyn-offer"]');
  await expect(evelyn).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="link-luna-offer"]')).toHaveCount(0);
  await expect(page.getByText("Thank You, Ann")).toBeVisible();
  await expect(page.getByText("15 Minutes of Free Chat", { exact: true })).toBeVisible();
  // Her brief tells Evelyn she does NOT know what was said — the card must not claim otherwise.
  await expect(page.getByText("She knows what you came back for", { exact: false })).toBeVisible();
  await expect(page.getByText("She already knows your reading", { exact: false })).toHaveCount(0);
  const href = await evelyn.getAttribute("href");
  expect(href).toContain("/evelyn?campaign=v1-ty-evelyn");
  expect(href).toContain(`email=${encodeURIComponent(RT_EMAIL)}`);
  await page.screenshot({ path: `${SCREENS}/post-thankyou.png`, fullPage: true });
  expect(aiCalls).toEqual([]);
});

test("retarget buyer, money: the money reveal lines", async ({ page }) => {
  await setup(page);
  let aiCalled = false;
  page.on("request", (r) => {
    if (r.url().includes("/api/upsell2/reading")) aiCalled = true;
  });
  await page.route(/\/api\/upsell2\/user-data/, async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, json: { ...(await res.json()), concern: "", personName: "", retarget: true, retargetBucket: "money" } });
  });
  await page.goto(`/fb-tarot/welcome2?session_id=${RT_SESSION}`);
  const reveal = RETARGET_U2_REVEAL.money.map((l) => l.replace("{firstName}", "Ann"));
  await expect(page.getByText(reveal[2])).toBeVisible({ timeout: 60_000 });
  for (const l of reveal) expect(await bubbles(page)).toContain(l);
  expect(aiCalled).toBe(false);
});

test("CONTROL — a normal tarot buyer: AI reveal requested with her concern, thank-you stays on Luna (real handoff)", async ({ page }) => {
  await setup(page);
  const aiBodies: any[] = [];
  await page.route("**/api/upsell2/reading", async (route) => {
    aiBodies.push(route.request().postDataJSON());
    await route.fulfill({ json: { messages: ["STUB AI reveal for Beth."] } });
  });
  const u2Data = page.waitForResponse((r) => r.url().includes("/api/upsell2/user-data"));
  await page.goto(`/fb-tarot/welcome2?session_id=${CTL_SESSION}`);
  const body = await (await u2Data).json();
  // The real server response for a normal buyer carries no retarget keys at all.
  expect(body).not.toHaveProperty("retarget");
  expect(body).not.toHaveProperty("retargetBucket");
  expect(body.concern).toBe("he went quiet after my birthday");
  await expect(page.getByText("STUB AI reveal for Beth.")).toBeVisible({ timeout: 60_000 });
  expect(aiBodies[0]).toMatchObject({ type: "manifest_reveal", concern: "he went quiet after my birthday" });
  for (const l of RETARGET_U2_REVEAL.love) {
    expect(await bubbles(page)).not.toContain(l.replace("{firstName}", "Beth"));
  }

  const handoff = page.waitForResponse((r) => r.url().includes("/api/luna-ty/handoff"));
  await page.goto(`/fb-tarot/success?session_id=${CTL_SESSION}`);
  const h = await (await handoff).json();
  expect(h.persona).toBeUndefined();
  await expect(page.locator('[data-testid="link-luna-offer"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="link-evelyn-offer"]')).toHaveCount(0);
});
