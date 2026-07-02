import { test, expect, type Page } from "@playwright/test";

// Presentational-parity checks for the /evelyn tap-quiz after it was restyled to
// match the Aiden quiz's visual polish (2026-07-02). This drives the quiz through
// intro -> quiz -> transition -> gate entirely client-side: /api/quiz/start and
// /api/quiz/answer are fire-and-forget, and a brand-new anonymous session resolves
// to isReturningUser=false, so the inline signup gate is shown (no onComplete).
//
// It asserts the NEW Aiden-style structure while confirming Evelyn keeps her own
// words: the intro block (name/subtitle/stars/quote/free-minutes), the top progress
// bar + "Step N of 3" indicator, the press-scale options, and the phase copy.

async function gotoEvelynIntro(page: Page) {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto("/evelyn", { waitUntil: "domcontentloaded" });
  // Wait past the parent lander's loading spinner into the quiz intro.
  await expect(page.getByText("EVELYN CROSS", { exact: false })).toBeVisible({ timeout: 20000 });
  return pageErrors;
}

test("intro block shows Aiden-style layout with Evelyn's data", async ({ page }) => {
  const pageErrors = await gotoEvelynIntro(page);
  const root = page.locator("#root");

  // Logo header + overlapping name treatment.
  await expect(root).toContainText("The Seer Within");
  await expect(page.getByRole("heading", { name: "EVELYN CROSS" })).toBeVisible();
  await expect(root).toContainText("Intuitive Reader");

  // Stats row (rating / volume / experience) — Evelyn's data.
  await expect(root).toContainText("4.9");
  await expect(root).toContainText("10,000+ readings");
  await expect(root).toContainText("20 years reading energy");

  // Persona quote (Evelyn's voice) + free-minutes badge (real 5-min grant).
  await expect(root).toContainText("I read what's actually there");
  await expect(root).toContainText("5 FREE minutes");

  // CTA present.
  await expect(page.getByRole("button", { name: /Begin My Reading/i })).toBeVisible();

  expect(pageErrors, "no uncaught page errors on intro").toEqual([]);
});

test("quiz shows progress bar + Step N of 3 and press-scale options advance", async ({ page }) => {
  await gotoEvelynIntro(page);

  await page.getByRole("button", { name: /Begin My Reading/i }).click();

  // Top progress bar (fixed, primary fill) appears in the quiz phase.
  const progressFill = page.locator("div.fixed.top-0 > div.bg-primary");
  await expect(progressFill).toBeVisible();

  // Step indicator + first Evelyn question.
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  await expect(page.getByText("What's pulling at you most right now?")).toBeVisible();

  // Options use the bigger rounded-xl treatment; tapping auto-advances.
  await page.getByRole("button", { name: "Love & connection" }).click();
  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  await expect(page.getByText("When you sit with it, what comes up?")).toBeVisible();

  await page.getByRole("button", { name: "I feel stuck" }).click();
  await expect(page.getByText("Step 3 of 3")).toBeVisible();
  await expect(page.getByText("What would change everything?")).toBeVisible();
});

test("completing the quiz shows avatar-glow transition then the signup gate", async ({ page }) => {
  await gotoEvelynIntro(page);
  await page.getByRole("button", { name: /Begin My Reading/i }).click();

  await page.getByRole("button", { name: "Love & connection" }).click();
  await page.getByText("Step 2 of 3").waitFor();
  await page.getByRole("button", { name: "I feel stuck" }).click();
  await page.getByText("Step 3 of 3").waitFor();
  await page.getByRole("button", { name: "Clarity on what's next" }).click();

  // Transition beat (Evelyn's copy).
  await expect(page.getByText(/Reading the energy around your answers/i)).toBeVisible();

  // Inline signup gate (Aiden-style card, Evelyn's words).
  await expect(page.getByText("Your reading is ready, love", { exact: false })).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByPlaceholder("Your first name")).toBeVisible();
  await expect(page.getByPlaceholder("your@email.com")).toBeVisible();
  await expect(page.getByText("I confirm I am 18 years or older")).toBeVisible();
});
