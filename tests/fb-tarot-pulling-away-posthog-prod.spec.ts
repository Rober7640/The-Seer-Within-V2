import { test, expect } from "@playwright/test";
import { REAL_UA, maskBotSignals, decodePostHogRequest, type PhEvent } from "./helpers/palm-tracking";

// TEMP verification (2026-08-06): do the three PULLING-AWAY hooks reach PostHog ingestion from
// a FRESH visitor on live www, tagged angle=pulling-away / facing=down?
//
// Run after the 2026-08-06 prod deploy and BEFORE any ad spend — a hook with no reads on the
// resolved deck falls back to DEFAULT_HOOK ('cards-honest') and the mislabelling is PERMANENT
// in stored events. `syncTarotAttribution` validates the hook TWICE and falls back on either
// failure, so a miss here reports every visitor on all three landers as cards-honest.
//
// 🔴 WHY ONE CONTEXT PER HOOK: breakdown attribution is First touchpoint, so each PERSON
// gets exactly ONE breakdown value — their first. A second hook opened in a browser
// PostHog already knows folds into the existing person and produces NO new row, and the
// tell is that the Baseline count does not rise. Playwright gives each test a fresh
// context = fresh distinct ID, which is the whole point of running it this way.
//
//   npx playwright test --config=playwright.fb-tarot-pulling-away-prod.config.ts
//
// 🔴 angle=pulling-away is asserted per-hook and NOT 'commitment'. The 7/31 commitment family
// is a different topic (the future he will not name); merging the two would retroactively mix
// two questions inside one set of numbers — and the per-lander order-bump table breaks down on
// exactly this `angle` value, so a wrong tag corrupts that row too.
//
// SIDE EFFECTS (deliberate, this is a live-traffic test):
//   - fires real PostHog events on the production project (tagged
//     utm_source=claude_smoke so they can be excluded later)
//   - fires Meta Pixel PageView + the server-side CAPI relay, same as any visit
//   - NO email is ever entered => no /api/lead, no DB write, no AWeber, no experiment exposure
//   - /api/chat is stubbed so no Claude call is made

const HOOKS = [
  { hook: "cards-pulling-away", headline: "Why is he pulling away from me?" },
  { hook: "cards-gone-cold", headline: "Why has he gone cold on me?" },
  { hook: "cards-losing-interest", headline: "Is he losing interest, or just going through something?" },
] as const;

test.use({ userAgent: REAL_UA });

for (const { hook, headline } of HOOKS) {
  test(`fb-tarot pulling-away · ${hook} · reaches PostHog`, async ({ page }) => {
    // 🔴 posthog-js drops every capture from automation on 3 signals, one of which
    // (userAgentData.brands) still says HeadlessChrome after the UA string is spoofed.
    // Without this the run "proves" PostHog is dead.
    await maskBotSignals(page);

    const events: PhEvent[] = [];
    page.on("request", (req) => events.push(...decodePostHogRequest(req)));

    // Narrow fulfill, never a broad route()/abort() — a catch-all kills the SPA mount.
    await page.route("**/api/chat", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "stubbed", phase: "greeting" }),
      }),
    );

    await page.goto(`/fb-tarot/c?hook=${hook}&utm_source=claude_smoke`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(7000);

    // Rules out the DEFAULT_HOOK fallback (which renders "Is he being honest with you?").
    await expect(page.getByRole("heading", { name: headline })).toBeVisible();

    await page.getByTestId("tarot-card-a").click();
    await page.waitForTimeout(7000);

    const names = [...new Set(events.map((e) => e.event))];
    const lander = events.find((e) => e.event === "lander_view");
    const select = events.find((e) => e.event === "tarot_card_select");

    console.log(`\n  [${hook}]`);
    console.log("   events      :", names.join(", ") || "(NONE)");
    console.log("   lander_view :", JSON.stringify({
      funnel: lander?.props?.funnel,
      step: lander?.props?.step,
      hook: lander?.props?.hook,
      angle: lander?.props?.angle,
      facing: lander?.props?.facing,
      deck: lander?.props?.deck,
    }));
    console.log("   card_select :", JSON.stringify({
      hook: select?.props?.hook,
      angle: select?.props?.angle,
      card: select?.props?.card,
    }));
    console.log("   distinct_id :", lander?.props?.distinct_id ?? "(n/a)");

    // ---- Exactly what the insight's step 1 filters on -------------------------
    expect(names, "lander_view reached ingestion").toContain("lander_view");
    expect(lander?.props?.funnel, "funnel=tarot").toBe("tarot");
    expect(lander?.props?.step, "step=landing").toBe("landing");
    expect(lander?.props?.facing, "facing=down").toBe("down");
    expect(lander?.props?.angle, "angle=pulling-away, NOT commitment").toBe("pulling-away");
    expect(lander?.props?.hook, "hook is itself, not cards-honest").toBe(hook);
    expect(lander?.props?.deck, "deck=return-mhf").toBe("return-mhf");

    // The card-select event carries the same identity — this is the event the
    // per-lander order-bump table's angle ultimately derives from downstream.
    expect(select?.props?.hook, "card_select hook matches").toBe(hook);
    expect(select?.props?.angle, "card_select angle matches").toBe("pulling-away");
  });
}
