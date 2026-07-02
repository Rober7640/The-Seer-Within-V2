import { test, expect, type Page } from "@playwright/test";

// E2E for the offline typo-fallback hardening (server/lib/neverbounce.ts).
// Locally NEVERBOUNCE_API_KEY is unset, so validateEmail() takes the fail-open
// path — which now still catches KNOWN domain typos offline. This drives the
// real /evelyn quiz -> gate and submits a "@gmial.com" typo, expecting the
// server to reply INVALID_EMAIL + suggestedCorrection and the UI to show the
// "Did you mean ...?" link (no account is created — validation blocks first).
//
// A non-typo address on the same fail-open server must NOT be blocked; that
// direction is covered by the vitest unit test (network-free).

async function reachGate(page: Page) {
  await page.goto("/evelyn", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Begin My Reading/i }).click({ timeout: 20000 });
  await page.getByRole("button", { name: "Love & connection" }).click();
  await page.getByText("Step 2 of 3").waitFor();
  await page.getByRole("button", { name: "I feel stuck" }).click();
  await page.getByText("Step 3 of 3").waitFor();
  await page.getByRole("button", { name: "Clarity on what's next" }).click();
  await expect(page.getByText("Your reading is ready, love", { exact: false })).toBeVisible({
    timeout: 5000,
  });
}

test("gate surfaces 'Did you mean' for a domain typo when NeverBounce is unavailable", async ({ page }) => {
  await reachGate(page);

  // Unique local part so we never collide with an existing account.
  const typo = "mediabuyers+evtypo1@gmial.com";
  const fixed = "mediabuyers+evtypo1@gmail.com";

  await page.getByPlaceholder("Your first name").fill("Robert");
  await page.getByPlaceholder("your@email.com").fill(typo);
  await page.getByText("I confirm I am 18 years or older").click();

  await page.getByRole("button", { name: /Show me my reading/i }).click();

  // Offline fallback -> INVALID_EMAIL + suggestedCorrection -> "Did you mean" link.
  const suggestion = page.getByRole("button", { name: /Did you mean/i });
  await expect(suggestion).toBeVisible({ timeout: 10000 });
  await expect(suggestion).toContainText(fixed);

  // Still on the gate — no account was created, we did NOT advance to checking_email.
  await expect(page.getByText("Check your email", { exact: false })).toHaveCount(0);

  // Clicking the suggestion corrects the email field.
  await suggestion.click();
  await expect(page.getByPlaceholder("your@email.com")).toHaveValue(fixed);
});
