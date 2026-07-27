import { test, expect } from "@playwright/test";
import { DEFAULT_PRICING } from "../shared/types";

// Problem-4 paywall A/B integration, now folded onto the generic experiment
// framework (server/lib/experiments.ts: assign()/logExposure()/tally()). The
// `paywall_copy_2026` experiment ships as status='draft', so the generic
// assign() returns control for everyone → /api/credits/pricing reports
// variant 'A' and the store renders byte-identically (proven below). Variant B
// = redesign, forced here via the non-prod `?paywallVariant=B` QA override.
// See docs/ab-testing-framework-prd.md §7 (Phase 1) + posthog-evelyn-purchase-findings §3.14–3.15.

const TOKEN_KEY = "seer_auth_token";
let token = "";
let evelynId = "";

test.beforeAll(async ({ playwright }) => {
  const api = await playwright.request.newContext({ baseURL: "http://localhost:5000" });
  const personasRes = await api.get("/api/personas?pricing=true");
  const personas = await personasRes.json();
  const list = Array.isArray(personas) ? personas : personas.personas;
  evelynId = list.find((p: any) => p.slug === "evelyn-cross").id;

  const email = `paywall-spec-${Date.now()}@example.com`;
  const regRes = await api.post("/api/auth/register", {
    data: { email, password: "TestPass123!", firstName: "Spec" },
  });
  token = (await regRes.json()).token;
  await api.dispose();
});

test.beforeEach(async ({ context }) => {
  await context.addInitScript(
    ([k, t]) => localStorage.setItem(k as string, t as string),
    [TOKEN_KEY, token],
  );
});

test("experiment OFF ⇒ generic assign() reports variant A from /api/credits/pricing", async ({ playwright }) => {
  // No override → the real assign() path decides. paywall_copy_2026 is draft, so
  // every authed user resolves to control 'A' (live behaviour unchanged).
  const api = await playwright.request.newContext({ baseURL: "http://localhost:5000" });
  const res = await api.get(`/api/credits/pricing?personaId=${evelynId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.experimentKey).toBe("paywall_copy_2026");
  expect(body.variant).toBe("A");
  await api.dispose();
});

// 2026-07-17 retired the A/B *layout* split: the Keen-style minutes-led store is now
// the single layout and the components ignore `variant` for structure (the experiment
// infrastructure is left intact for copy tests). The two tests that used to assert
// "A = old coin grid / B = new store" therefore no longer describe the product —
// they're replaced by the invariant that matters now: whichever arm you land in, you
// get the same minutes-led store and never see the word "coins".
for (const [label, query] of [
  ["control", ""],
  ["variant B", "&paywallVariant=B"],
] as const) {
  test(`${label} renders the shared dollar-wallet store`, async ({ page }) => {
    await page.goto(`/credits?personaId=${evelynId}${query}`);

    // 2026-07-27: the store led with "How much time would you like" while pricing
    // was flat. Per-guide rates made a single time figure wrong, so the store is
    // now dollar-led and the time is shown per guide in the grid below.
    await expect(page.getByRole("heading", { name: /Add to your balance/i })).toBeVisible();
    await expect(page.getByText(/Works with every guide/i)).toBeVisible();
    // exact — the pack TILE's accessible name also ends in "Keep going".
    await expect(page.getByRole("button", { name: "Keep going", exact: true }).first()).toBeVisible();
    await expect(page.getByText(/money-back guarantee on unused minutes/)).toBeVisible();

    // The retired coin grid must not come back.
    await expect(page.getByText("Buy Coins")).toHaveCount(0);
    await expect(page.getByText("Choose Your Package")).toHaveCount(0);
  });

  test(`${label} shows the balance in dollars and never says "coins"`, async ({ page }) => {
    await page.goto(`/credits?personaId=${evelynId}${query}`);
    await expect(page.getByRole("heading", { name: /Add to your balance/i })).toBeVisible();

    // The balance is a DOLLAR figure, not a clock: this wallet is shared across
    // guides that charge different rates, so no single m:ss value is correct.
    const freeDollars = `$${(DEFAULT_PRICING.freeCoins / 100).toFixed(2)}`;
    await expect(page.getByText("Your balance", { exact: true })).toBeVisible();
    await expect(page.getByText(freeDollars, { exact: false }).first()).toBeVisible();

    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/\bcoins?\b/i);
  });
}

test("variant B payment sheet opens with the fixed trust block", async ({ page }) => {
  await page.goto(`/credits?personaId=${evelynId}&paywallVariant=B`);
  // exact — the pack TILE shares the accessible name "Keep going" with its own
  // buy button, and clicking the tile only PREVIEWS, so a loose match never opens
  // the sheet (this is why this test failed).
  await page.getByRole("button", { name: "Keep going", exact: true }).first().click();
  // Scope to the modal — "no subscription" also appears in the store behind it.
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Choose payment method")).toBeVisible();
  await expect(sheet.getByText(/Keep going with Evelyn/)).toBeVisible();
  await expect(sheet.getByText(/no subscription/)).toBeVisible();
  // The contradictory "non-refundable" copy must never appear in B.
  await expect(page.getByText(/non-refundable/i)).toHaveCount(0);
});

test("dev preview route renders the hero", async ({ page }) => {
  await page.goto(`/paywall-preview?surface=modal&slug=evelyn-cross`);
  await expect(page.getByText(/Let's pick this back up/)).toBeVisible();
  await expect(page.getByText("MOST CHOSEN")).toBeVisible();
});
