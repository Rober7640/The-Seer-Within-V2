import { test, expect } from "@playwright/test";

// Tracking check for the heart-line lander: Meta Pixel + server CAPI.
//
// HERMETIC. `connect.facebook.net` is blocked so Meta's fbevents.js never loads,
// which leaves every fbq(...) call sitting readable in `window.fbq.queue` — we can
// prove the pixel WOULD fire without a single byte reaching Meta. Any direct
// facebook.com/tr beacon is aborted too and counted.
//
// PostHog is deliberately NOT asserted here: the sandbox blanks the key, so the
// client SDK no-ops by design. Verified by code inspection instead — PalmBridge
// passes `sign` into palm_bridge_view / palm_thumb_select / palm_read_continue,
// and useConversation sets palm_sign as a person property at identify.
//
//   npx playwright test --config=playwright.fb-palm-heart-line-tracking.config.ts

const DEFAULT_PIXEL = "446814716830295";

test("heart-line lander fires Meta PageView (pixel + CAPI) on the default palm pixel", async ({ page }) => {
  let escaped = 0;
  const capi: { name: string; status: number }[] = [];

  await page.route(/(facebook\.com|connect\.facebook\.net)/, (r) => { escaped++; return r.abort(); });
  page.on("response", async (res) => {
    if (!res.url().includes("/api/fb-event")) return;
    let name = "?";
    try { name = JSON.parse(res.request().postData() || "{}").eventName ?? "?"; } catch { /* noop */ }
    capi.push({ name, status: res.status() });
  });

  await page.goto("/fb-palm/c?hook=wrong-person&sign=heart-line&utm_source=pw_check", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("palm-thumb-a")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(4000);

  // What the browser pixel queued, read straight out of fbq's own queue.
  // The two call shapes differ in where the event name sits:
  //   fbq('track', 'PageView', {...})               -> c[1] is the event
  //   fbq('trackSingle', <pixelId>, 'PageView', {}) -> c[1] is the PIXEL, c[2] the event
  // Reading c[1] for both reports the pixel id as if it were an event name.
  const { inits, events } = await page.evaluate(() => {
    const q: any[][] = (window as any).fbq?.queue ?? [];
    return {
      inits: q.filter((c) => c[0] === "init").map((c) => String(c[1])),
      events: q
        .filter((c) => c[0] === "track" || c[0] === "trackSingle")
        .map((c) => String(c[0] === "trackSingle" ? c[2] : c[1])),
    };
  });

  console.log("  pixel init  :", inits.join(", ") || "(none)");
  console.log("  pixel events:", events.join(", ") || "(none)");
  console.log("  server CAPI :", capi.map((c) => `${c.name}->${c.status}`).join(", ") || "(none)");

  expect(inits, "initialised on the DEFAULT palm pixel").toContain(DEFAULT_PIXEL);
  expect(events, "browser PageView queued").toContain("PageView");
  expect(capi.map((c) => c.name), "server CAPI PageView relayed").toContain("PageView");
  expect(capi.find((c) => c.name === "PageView")?.status, "CAPI accepted").toBe(200);
  expect(escaped, "🔒 every Meta request was blocked in-browser").toBeGreaterThan(0);
});
