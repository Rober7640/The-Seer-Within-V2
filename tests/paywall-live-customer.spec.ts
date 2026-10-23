import { test, expect } from "@playwright/test";

// LIVE-CUSTOMER purchase journey for the V2 chat paywall, end-to-end:
//   register → land on the credits store → see the standard $10/$20/$30/$50 packs
//   → buy the $10 pack with a REAL Stripe TEST card (4242) → the balance is
//   credited by exactly $10.
//
// Requires: server in test mode (NODE_ENV=test or DISABLE_RATE_LIMIT=true, so a
// fresh account is verified + granted the free trial) AND Stripe TEST keys
// (sk_test / pk_test) so the inline PaymentElement runs. Uses the config baseURL
// (local dev listens on :5008; macOS AirPlay holds :5000).

const TOKEN_KEY = "seer_auth_token";

async function getBalance(page: any, token: string): Promise<number> {
  const res = await page.request.get("/api/credits/balance", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()).coinBalance;
}

test("a live customer buys the $10 pack with a card and the balance is credited by $10", async ({ page }) => {
  // 1. Register a fresh customer. In test mode the account is auto-verified and
  //    granted the free trial — exactly the state a real verified user is in.
  const email = `live-cust-${Date.now()}@example.com`;
  const reg = await page.request.post("/api/auth/register", {
    data: { email, password: "TestPass123!", firstName: "Live" },
  });
  expect(reg.ok(), "registration should succeed").toBeTruthy();
  const token = (await reg.json()).token as string;
  expect(token, "register returns an auth token").toBeTruthy();

  const personas = await (await page.request.get("/api/personas")).json();
  const list = Array.isArray(personas) ? personas : personas.personas;
  const evelynId = list.find((p: any) => p.slug === "evelyn-cross").id;

  const balanceBefore = await getBalance(page, token);

  // 2. Land on the credits store as the authenticated customer.
  await page.addInitScript(
    ([k, t]) => localStorage.setItem(k as string, t as string),
    [TOKEN_KEY, token],
  );
  await page.goto(`/credits?personaId=${evelynId}`);
  await expect(page.getByRole("heading", { name: /Add to your balance/i })).toBeVisible();

  // 3. The standard packs are shown ($10, $20, …).
  await expect(page.getByText("$10.00").first()).toBeVisible();
  await expect(page.getByText("$20.00").first()).toBeVisible();

  // 4. Buy the cheapest ($10) pack → payment modal. The $10 tile is first.
  await page.getByRole("button", { name: "Keep going", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Confirm we're buying the $10 pack.
  await expect(dialog.getByText("$10.00").first()).toBeVisible();

  // 5. Choose Credit Card.
  await dialog.getByRole("button", { name: /Credit Card/i }).click();

  // 6. Fill the Stripe PaymentElement with the 4242 test card (no 3DS).
  const frame = dialog.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await frame.locator('[name="number"]').fill("4242424242424242");
  await frame.locator('[name="expiry"]').fill("1234");
  await frame.locator('[name="cvc"]').fill("123");
  const postal = frame.locator('[name="postalCode"]');
  if (await postal.count()) await postal.fill("12345");

  // 7. Pay $10.
  await dialog.getByRole("button", { name: /Pay \$10\.00/i }).click();

  // 8. The purchase completes and the balance is credited by exactly $10 (1000¢).
  await expect
    .poll(async () => getBalance(page, token), { timeout: 30000, intervals: [1000] })
    .toBe(balanceBefore + 1000);
});
