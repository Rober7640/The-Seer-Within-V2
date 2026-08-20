import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// One smoke per soulmate lander — test A (age, 11) and test B (keyword, 8). Page loads only —
// no chat, no lead capture, no checkout — so this is safe against the shared dev/prod DB, same
// contract as v1-landers-smoke.spec.ts.
//
// 🔴 WHY THE HEADLINE ASSERTION IS THE WHOLE TEST. TarotBridge resolves an unknown hook to
// DEFAULT_HOOK ('cards-honest') and renders it without complaint:
//
//     const hook = getDeck(deck).reads[hookRaw] ? hookRaw : DEFAULT_HOOK   // TarotBridge.tsx:65
//
// So a smoke that only checks "the page mounted and has words on it" goes GREEN on all eleven
// of these while none of them exists — it would be checking the cards-honest lander eleven
// times. Every test below therefore asserts the page is showing THIS hook's own ad headline,
// which is the one thing the fallback cannot fake.
//
// EXPECTED STATE: red until the family is wired, green after. Both have now been observed —
// all 19 failed on 2026-08-19/20 showing the cards-honest fallback, and went green when the
// registry, the server vocab and the route validator were wired together. See
// scripts/guard-tripwire.mjs for the same discipline applied to the copy guards.

const DRAFTS = "fb-tarot/docs/drafts/rewrites/";
const DECK = "return-mhf";
// The headline comes from the draft, so this spec and the copy cannot drift apart.
const headlineOf = (hook: string): string =>
  JSON.parse(readFileSync(`${DRAFTS}${hook}.json`, "utf8")).headline;

const LANDERS: Array<{ hook: string; band: string; rung: string }> = [
  { hook: "cards-slipping-past", band: "25-44", rung: "WHY" },
  { hook: "cards-choosing-wrong", band: "25-44", rung: "WHY" },
  { hook: "cards-found-me-yet", band: "45-54", rung: "WHY" },
  { hook: "cards-keeps-waiting", band: "45-54", rung: "HOW-LONG" },
  { hook: "cards-missed-chance", band: "45-54", rung: "BINARY" },
  { hook: "cards-after-marriage", band: "55-64", rung: "BINARY" },
  { hook: "cards-second-time", band: "55-64", rung: "HOW-LONG" },
  { hook: "cards-best-years", band: "55-64", rung: "WHY" },
  { hook: "cards-too-late-love", band: "65+", rung: "BINARY" },
  { hook: "cards-longer-to-wait", band: "65+", rung: "HOW-LONG" },
  { hook: "cards-allowed-to-want", band: "65+", rung: "WHY" },
  // Test B — soulmate x keyword. Two per keyword, BINARY and WHY.
  { hook: "cards-blocking-soulmate", band: "blocked", rung: "BINARY" },
  { hook: "cards-blocked-before", band: "blocked", rung: "WHY" },
  { hook: "cards-connection-soulmate", band: "connection", rung: "BINARY" },
  { hook: "cards-connection-nothing", band: "connection", rung: "WHY" },
  { hook: "cards-energy-away", band: "energy", rung: "BINARY" },
  { hook: "cards-energy-soulmate", band: "energy", rung: "WHY" },
  { hook: "cards-waiting-to-heal", band: "healing", rung: "BINARY" },
  { hook: "cards-heal-first", band: "healing", rung: "WHY" },
];

// What the page shows when the hook does not resolve. Asserted against by name so the failure
// message says "you are looking at the fallback", not "text not found".
const FALLBACK_HEADLINE = "Is he being honest with me?";

async function smokeLander(page: Page, hook: string, headline: string) {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  // Version B is the locked arm: /fb-tarot/c 302s to /b (server/routes.ts:415).
  const route = `/fb-tarot/b?hook=${hook}&deck=${DECK}`;
  const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(resp?.status(), `HTTP status for ${route}`).toBeLessThan(400);

  const root = page.locator("#root");
  await expect(root, `#root mounted for ${hook}`).not.toBeEmpty({ timeout: 15000 });
  await expect(
    page.getByText("Something went wrong", { exact: false }),
    `${hook} hit the ErrorBoundary`,
  ).toHaveCount(0);

  // 🔴 The real assertion: her ad question is on her page.
  await expect(
    root,
    `${hook} is not wired — the page is showing the ${FALLBACK_HEADLINE ? "DEFAULT_HOOK" : ""} fallback instead of "${headline}"`,
  ).toContainText(headline, { timeout: 15000 });

  // …and belt-and-braces, that it is not the fallback lander wearing a green tick.
  await expect(
    root,
    `${hook} fell through to DEFAULT_HOOK (cards-honest) — a silent fallback, not a pass`,
  ).not.toContainText(FALLBACK_HEADLINE);

  // The three face-down cards she picks from are on the page.
  await expect(page.locator("#root button, #root [role='button']").first(), `${hook} has no tappable card`).toBeVisible();

  expect(pageErrors, `${hook} uncaught page errors`).toEqual([]);
}

for (const l of LANDERS) {
  test(`soulmate lander ${l.band} ${l.rung}: ${l.hook}`, async ({ page }) => {
    await smokeLander(page, l.hook, headlineOf(l.hook));
  });
}
