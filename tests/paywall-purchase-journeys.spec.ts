import { test, expect, type Page, type FrameLocator } from "@playwright/test";

// COMPREHENSIVE customer purchase journeys for the V2 chat paywall — every path a
// buyer can take on the credits store, end-to-end with REAL Stripe TEST cards:
//   • buy a specific pack ($20) in variant A   • buy in the redesigned variant B
//   • buy a CUSTOM amount                       • a DECLINED card shows an error, no credit
//   • custom amount above the max is refused     • a completed purchase shows in history
//
// Requires test-mode server (auto-verify + free-trial grant) + Stripe TEST keys.
// Uses the config baseURL (local :5008).

const TOKEN_KEY = "seer_auth_token";
const STRIPE_OK = "4242424242424242";        // succeeds, no 3DS
const STRIPE_DECLINE = "4000000000000002";   // generic decline

async function registerCustomer(page: Page): Promise<{ token: string; evelynId: string }> {
  const email = `buy-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const reg = await page.request.post("/api/auth/register", {
    data: { email, password: "TestPass123!", firstName: "Buyer" },
  });
  expect(reg.ok(), "registration should succeed").toBeTruthy();
  const token = (await reg.json()).token as string;
  const personas = await (await page.request.get("/api/personas")).json();
  const list = Array.isArray(personas) ? personas : personas.personas;
  const evelynId = list.find((p: any) => p.slug === "evelyn-cross").id;
  await page.addInitScript(([k, t]) => localStorage.setItem(k as string, t as string), [TOKEN_KEY, token]);
  return { token, evelynId };
}

async function getBalance(page: Page, token: string): Promise<number> {
  const res = await page.request.get("/api/credits/balance", { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).coinBalance;
}

async function fillStripeCard(dialog: ReturnType<Page["getByRole"]>, card: string) {
  const frame: FrameLocator = dialog.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await frame.locator('[name="number"]').fill(card);
  await frame.locator('[name="expiry"]').fill("1234");
  await frame.locator('[name="cvc"]').fill("123");
  const postal = frame.locator('[name="postalCode"]');
  if (await postal.count()) await postal.fill("12345");
}

test.describe("paywall purchase journeys", () => {
  test("buys the $20 pack with a card (variant A) — balance credited by exactly $20", async ({ page }) => {
    const { token, evelynId } = await registerCustomer(page);
    const before = await getBalance(page, token);

    await page.goto(`/credits?personaId=${evelynId}`);
    await expect(page.getByRole("heading", { name: /Add to your balance/i })).toBeVisible();

    // The $20 pack is the second tile (packs: $10, $20, $30, $50).
    await page.getByRole("button", { name: "Keep going", exact: true }).nth(1).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("$20.00").first()).toBeVisible();

    await dialog.getByRole("button", { name: /Credit Card/i }).click();
    await fillStripeCard(dialog, STRIPE_OK);
    await dialog.getByRole("button", { name: /Pay \$20\.00/i }).click();

    await expect.poll(() => getBalance(page, token), { timeout: 30000, intervals: [1000] }).toBe(before + 2000);
  });

  test("buys with a card through the REDESIGNED variant B paywall — credited by $10", async ({ page }) => {
    const { token, evelynId } = await registerCustomer(page);
    const before = await getBalance(page, token);

    await page.goto(`/credits?personaId=${evelynId}&paywallVariant=B`);
    await expect(page.getByRole("heading", { name: /Add to your balance/i })).toBeVisible();

    await page.getByRole("button", { name: "Keep going", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Variant B trust copy is present and the contradictory line is gone.
    await expect(dialog.getByText(/money-back guarantee/i)).toBeVisible();
    await expect(dialog.getByText(/non-refundable/i)).toHaveCount(0);

    await dialog.getByRole("button", { name: /Credit Card/i }).click();
    await fillStripeCard(dialog, STRIPE_OK);
    await dialog.getByRole("button", { name: /Pay \$10\.00/i }).click();

    await expect.poll(() => getBalance(page, token), { timeout: 30000, intervals: [1000] }).toBe(before + 1000);
  });

  test("buys a CUSTOM amount ($17) with a card — credited by exactly $17", async ({ page }) => {
    const { token, evelynId } = await registerCustomer(page);
    const before = await getBalance(page, token);

    await page.goto(`/credits?personaId=${evelynId}`);
    await page.getByPlaceholder(/custom amount/i).fill("17");
    const buy = page.getByRole("button", { name: "Buy", exact: true });
    await expect(buy).toBeEnabled();
    await buy.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("$17.00").first()).toBeVisible();

    await dialog.getByRole("button", { name: /Credit Card/i }).click();
    await fillStripeCard(dialog, STRIPE_OK);
    await dialog.getByRole("button", { name: /Pay \$17\.00/i }).click();

    await expect.poll(() => getBalance(page, token), { timeout: 30000, intervals: [1000] }).toBe(before + 1700);
  });

  test("a DECLINED card shows an error and does NOT credit the balance", async ({ page }) => {
    const { token, evelynId } = await registerCustomer(page);
    const before = await getBalance(page, token);

    await page.goto(`/credits?personaId=${evelynId}`);
    await page.getByRole("button", { name: "Keep going", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /Credit Card/i }).click();
    await fillStripeCard(dialog, STRIPE_DECLINE);
    await dialog.getByRole("button", { name: /Pay \$10\.00/i }).click();

    // An error is shown to the customer…
    await expect(dialog.getByText(/declin|try another|failed/i)).toBeVisible({ timeout: 20000 });
    // …and the balance is unchanged (give any async grant a chance to NOT happen).
    await page.waitForTimeout(2000);
    expect(await getBalance(page, token)).toBe(before);
  });

  test("a custom amount above the max is refused (no charge)", async ({ page }) => {
    const { token, evelynId } = await registerCustomer(page);
    const before = await getBalance(page, token);

    await page.goto(`/credits?personaId=${evelynId}`);
    await page.getByPlaceholder(/custom amount/i).fill("201"); // max is $200
    await expect(page.getByRole("button", { name: "Buy", exact: true })).toBeDisabled();
    expect(await getBalance(page, token)).toBe(before);
  });

  test("a completed purchase appears in the customer's purchase history", async ({ page }) => {
    const { token, evelynId } = await registerCustomer(page);
    const before = await getBalance(page, token);

    await page.goto(`/credits?personaId=${evelynId}`);
    await page.getByRole("button", { name: "Keep going", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /Credit Card/i }).click();
    await fillStripeCard(dialog, STRIPE_OK);
    await dialog.getByRole("button", { name: /Pay \$10\.00/i }).click();
    await expect.poll(() => getBalance(page, token), { timeout: 30000, intervals: [1000] }).toBe(before + 1000);

    // The purchase is recorded and visible to the customer.
    const history = await (await page.request.get("/api/credits/purchases", {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const rows = Array.isArray(history) ? history : (history.purchases ?? []);
    expect(rows.some((r: any) => (r.priceUsd === 1000 || r.amount === 1000) && /complete/i.test(r.status ?? "completed"))).toBeTruthy();
  });
});
