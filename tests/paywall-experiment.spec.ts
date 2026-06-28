import { test, expect } from "@playwright/test";

// Problem-4 paywall A/B integration. Variant A = current UI (experiment off /
// default). Variant B = redesign, forced here via the non-prod `?paywallVariant=B`
// QA override. See docs/posthog-evelyn-purchase-findings.md §3.14–3.15.

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

test("variant A renders the current store unchanged", async ({ page }) => {
  await page.goto(`/credits?personaId=${evelynId}`);
  await expect(page.getByText("Choose Your Package")).toBeVisible();
  await expect(page.getByRole("button", { name: "Buy Coins" }).first()).toBeVisible();
  await expect(page.getByText(/How much time would you like/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Keep going/ })).toHaveCount(0);
});

test("variant B renders the redesigned, minutes-led store", async ({ page }) => {
  await page.goto(`/credits?personaId=${evelynId}&paywallVariant=B`);
  await expect(page.getByText(/How much time would you like/)).toBeVisible();
  await expect(page.getByText(/minutes left/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Keep going/ }).first()).toBeVisible();
  await expect(page.getByText(/money-back guarantee on unused coins/)).toBeVisible();
  // No old coin-store language in B.
  await expect(page.getByText("Buy Coins")).toHaveCount(0);
  await expect(page.getByText("Choose Your Package")).toHaveCount(0);
});

test("variant B payment sheet opens with the fixed trust block", async ({ page }) => {
  await page.goto(`/credits?personaId=${evelynId}&paywallVariant=B`);
  await page.getByRole("button", { name: /Keep going/ }).first().click();
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
