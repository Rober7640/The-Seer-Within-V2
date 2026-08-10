import { test, expect } from "@playwright/test";
import { REAL_UA, maskBotSignals, decodePostHogRequest, type PhEvent } from "./helpers/palm-tracking";

// TEMP verification (2026-08-06): do the three RECONCILIATION hooks reach PostHog ingestion
// from a FRESH visitor on live www, tagged angle=reconciliation / facing=down?
//
// Run after the prod deploy and BEFORE any ad spend — a hook with no reads on the resolved
// deck falls back to DEFAULT_HOOK ('cards-honest') and the mislabelling is PERMANENT in
// stored events. `syncTarotAttribution` validates the hook TWICE and falls back on either
// failure, so a miss here reports every visitor on all three landers as cards-honest.
//
// 🔴 angle MUST read `reconciliation` and NOT `reunion`. These two families ask the same
// question with a different subject — reunion is him-framed ("will HE come back"),
// reconciliation is us-framed ("will WE get back together") — and comparing them at angle
// level is the entire reason this set was commissioned. A wrong tag here does not merely
// mislabel a row; it silently merges the test arm into its own control and the dashboard
// still looks perfectly healthy.
//
// 🔴 WHY ONE CONTEXT PER HOOK: breakdown attribution is First touchpoint, so each PERSON
// gets exactly ONE breakdown value — their first. A second hook opened in a browser
// PostHog already knows folds into the existing person and produces NO new row, and the
// tell is that the Baseline count does not rise. Playwright gives each test a fresh
// context = fresh distinct ID, which is the whole point of running it this way.
//
//   npx playwright test --config=playwright.fb-tarot-reconciliation-prod.config.ts
//
// SIDE EFFECTS (deliberate, this is a live-traffic test):
//   - fires real PostHog events on the production project (tagged
//     utm_source=claude_smoke so they can be excluded later)
//   - fires Meta Pixel PageView + the server-side CAPI relay, same as any visit
//   - NO email is ever entered => no /api/lead, no DB write, no AWeber, no experiment exposure
//   - /api/chat is stubbed so no Claude call is made

const HOOKS = [
  { hook: "cards-back-together", headline: "Will we get back together?" },
  { hook: "cards-still-a-chance", headline: "Is there still a chance for us?" },
  { hook: "cards-really-over", headline: "Is it really over between us?" },
] as const;

test.use({ userAgent: REAL_UA });

for (const { hook, headline } of HOOKS) {
  test(`fb-tarot reconciliation · ${hook} · reaches PostHog`, async ({ page }) => {
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
    expect(lander?.props?.angle, "angle=reconciliation, NOT reunion").toBe("reconciliation");
    expect(lander?.props?.hook, "hook is itself, not cards-honest").toBe(hook);
    expect(lander?.props?.deck, "deck=return-mhf").toBe("return-mhf");

    // The card-select event carries the same identity — this is the event the
    // per-lander order-bump table's angle ultimately derives from downstream.
    expect(select?.props?.hook, "card_select hook matches").toBe(hook);
    expect(select?.props?.angle, "card_select angle matches").toBe("reconciliation");
  });
}
