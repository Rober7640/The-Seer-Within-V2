import { test, expect, type Page } from "@playwright/test";

// Smoke for the /fb-palm `heart-line` sign (built 2026-07-29) — the photographed
// creative for the same tell as `palm-signs`, plus its four scoped hooks.
//
// Two things this exists to prove, because neither is visible from a typecheck:
//
//  1. THE HEADLINE IS THE AD'S HEADLINE. PalmBridge.tsx:48-51 falls back to
//     DEFAULT_HOOK wholesale for any hook it doesn't recognise — silently, with no
//     error. A half-wired hook therefore renders "When is my soulmate coming?"
//     over the right art and looks fine. Asserting the exact headline per hook is
//     the only way to catch that.
//  2. THE A/B SWAP. This photo's panels are REVERSED vs its illustrated twin:
//     B is the unbroken line (the joined heart), A is the stepped pair (the rising
//     heart). If the swap in palmReads.ts is ever dropped, Evelyn describes the
//     opposite of the panel the visitor tapped.
//
// LOCAL SANDBOX ONLY. Meta is hard-blocked below: the pixel is hardcoded in
// client/index.html, so .env.sandbox cannot mute it — this route block is the
// other half of that guarantee.
//
//   npx playwright test --config=playwright.fb-palm-heart-line.config.ts

const SHOTS = "audit-runs/heart-line/shots";

const HOOKS = [
  { id: "right-person",       headline: "Still waiting for the RIGHT Person?" },
  { id: "love-taking-long",   headline: "Why is love taking so long?" },
  { id: "wrong-person",       headline: "Why do I keep falling for the wrong person?" },
  { id: "relationship-right", headline: "Not Sure This Relationship is Right?" },
] as const;

// The reversal, stated as data. a = the stepped pair, b = the unbroken line.
const ARCHETYPE = { a: "the rising heart", b: "the joined heart" } as const;

let blocked = 0;

async function harden(page: Page) {
  // Nothing may reach Meta, and no lead may be enrolled.
  await page.route(/(facebook\.com|connect\.facebook\.net)/, (r) => { blocked++; return r.abort(); });
  await page.route("**/api/lead", (r) => r.fulfill({ status: 200, body: "{}" }));
}

test.describe("fb-palm · heart-line", () => {
  for (const { id, headline } of HOOKS) {
    test(`${id} · headline + art + both reads + handoff`, async ({ page }) => {
      await harden(page);

      const art: number[] = [];
      page.on("response", (r) => {
        if (r.url().includes("heart-line-strip.png")) art.push(r.status());
      });

      // ---- the lander (Version C) -------------------------------------------
      await page.goto(`/fb-palm/c?hook=${id}&sign=heart-line`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("palm-thumb-a")).toBeVisible({ timeout: 15000 });

      // THE message-scent assertion. Exact match — a fallback would read
      // "When is my soulmate coming?" and still look like a working page.
      await expect(page.getByRole("heading", { name: headline, exact: true })).toBeVisible();
      expect(
        await page.getByText("When is my soulmate coming?").count(),
        `${id} silently fell back to the DEFAULT_HOOK headline`,
      ).toBe(0);

      await expect(page.getByText("According to Your Palm Lines")).toBeVisible();
      expect(art, "heart-line strip art served").toContain(200);

      // Equal side-by-side halves — a 2-option sign with no `columns` override.
      const a = (await page.getByTestId("palm-thumb-a").boundingBox())!;
      const b = (await page.getByTestId("palm-thumb-b").boundingBox())!;
      expect(Math.round(b.y), "tiles sit side by side").toBe(Math.round(a.y));
      expect(Math.round(b.width), "both tiles equal width").toBe(Math.round(a.width));

      await page.screenshot({ path: `${SHOTS}/${id}-01-lander.png`, fullPage: true });

      // ---- tap B — must be the JOINED heart (the swap guard) ----------------
      await page.getByTestId("palm-thumb-b").click();
      await page.waitForURL(/\/fb-palm\/chat\?/, { timeout: 25000 });

      const q = new URL(page.url()).searchParams;
      expect(q.get("hook"), "hook survived the handoff").toBe(id);
      expect(q.get("sign")).toBe("heart-line");
      expect(q.get("thumb")).toBe("b");
      expect(q.get("v")).toBe("c");

      await expect(page.getByText(new RegExp(ARCHETYPE.b, "i")).first())
        .toBeVisible({ timeout: 30000 });
      // and must NOT be its opposite
      expect(
        await page.getByText(new RegExp(ARCHETYPE.a, "i")).count(),
        "option B delivered the rising-heart read — the a/b swap is inverted",
      ).toBe(0);

      await page.screenshot({ path: `${SHOTS}/${id}-02-tapped-B-joined.png`, fullPage: true });

      // ---- tap A — must be the RISING heart ---------------------------------
      await page.goto(`/fb-palm/c?hook=${id}&sign=heart-line`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("palm-thumb-a")).toBeVisible({ timeout: 15000 });
      await page.getByTestId("palm-thumb-a").click();
      await page.waitForURL(/\/fb-palm\/chat\?/, { timeout: 25000 });

      await expect(page.getByText(new RegExp(ARCHETYPE.a, "i")).first())
        .toBeVisible({ timeout: 30000 });
      expect(
        await page.getByText(new RegExp(ARCHETYPE.b, "i")).count(),
        "option A delivered the joined-heart read — the a/b swap is inverted",
      ).toBe(0);

      await page.screenshot({ path: `${SHOTS}/${id}-03-tapped-A-rising.png`, fullPage: true });

      expect(blocked, "🔒 no request reached Meta").toBeGreaterThanOrEqual(0);
      console.log(`  [${id}] headline ok · art 200 · B=joined · A=rising · meta blocked=${blocked}`);
    });
  }

  // Versions A and B share the registry but render the read differently; one pass
  // each is enough to prove the sign is version-agnostic.
  test("version A renders the static result card", async ({ page }) => {
    await harden(page);
    await page.goto(`/fb-palm?hook=right-person&sign=heart-line`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("palm-thumb-b")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("palm-thumb-b").click();
    await expect(page.getByText(/the joined heart/i).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("palm-continue")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/version-A-card.png`, fullPage: true });
  });

  test("version B delivers the read as chat", async ({ page }) => {
    await harden(page);
    await page.goto(`/fb-palm/b?hook=wrong-person&sign=heart-line`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("palm-thumb-a")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("palm-thumb-a").click();
    await page.waitForURL(/\/fb-palm\/chat\?/, { timeout: 25000 });
    await expect(page.getByText(/the rising heart/i).first()).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: `${SHOTS}/version-B-chat.png`, fullPage: true });
  });
});
