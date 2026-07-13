import { test, expect } from "@playwright/test";
import {
  REAL_UA,
  maskBotSignals,
  decodePostHogRequest,
  type PhEvent,
} from "./helpers/palm-tracking";

// Smoke for the /fb-palm hand-size sign after the art rework:
//   989761e crop dead margin · f12e992 pad to a SQUARE panel · e3cb302 erase the
//   grey smudge + purple line artifacts.
// Covers the tile geometry, the art, Meta Pixel + server CAPI, PostHog, and the
// chat handoff.
//
//   npx playwright test --config=playwright.fb-palm-handsize.config.ts
//   PROD_BASE_URL=https://www.theseerwithin.com npx playwright test --config=...

const DEFAULT_PIXEL = "446814716830295";
const HOOKS = ["soulmate-timing", "already-met", "love-again"] as const;

test.describe("fb-palm · hand-size", () => {
  test.use({ userAgent: REAL_UA });

  for (const hook of HOOKS) {
    test(`${hook} · renders, tracks, hands off`, async ({ page }) => {
      await maskBotSignals(page);

      const fbPixel: { ev: string; id: string }[] = [];
      const capi: { name: string; status: number }[] = [];
      const ph: PhEvent[] = [];
      const art: number[] = [];

      page.on("request", (req) => {
        const url = req.url();
        if (url.includes("facebook.com/tr")) {
          const p = new URL(url).searchParams;
          fbPixel.push({ ev: p.get("ev") || "?", id: p.get("id") || "?" });
        }
        ph.push(...decodePostHogRequest(req));
      });
      page.on("response", async (res) => {
        if (res.url().includes("hand-size-strip.png")) art.push(res.status());
        if (!res.url().includes("/api/fb-event")) return;
        let name = "?";
        try { name = JSON.parse(res.request().postData() || "{}").eventName ?? "?"; } catch { /* noop */ }
        capi.push({ name, status: res.status() });
      });

      await page.goto(`/fb-palm/c?hook=${hook}&sign=hand-size&utm_source=pw_smoke`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(6000);

      // ---- art + tile geometry ------------------------------------------------
      await expect(page.getByText("According to Your Hand Size")).toBeVisible();
      expect(art, "hand-size strip art served").toContain(200);

      const a = await page.getByTestId("palm-thumb-a").boundingBox();
      const b = await page.getByTestId("palm-thumb-b").boundingBox();
      expect(a, "option A rendered").toBeTruthy();
      expect(b, "option B rendered").toBeTruthy();

      // The panel is 745x745, so the tile must be SQUARE (this is the regression
      // guard for the strip dims in palmReads.ts — a wrong width/height there
      // silently letterboxes the tile again).
      const ratio = a!.height / a!.width;
      console.log(`\n  [${hook}] tile ${Math.round(a!.width)}x${Math.round(a!.height)} (h/w ${ratio.toFixed(2)})`);
      expect(ratio, "tile is square (h/w ~1.0)").toBeGreaterThan(0.93);
      expect(ratio, "tile is square (h/w ~1.0)").toBeLessThan(1.07);
      expect(Math.round(b!.height), "both tiles same height").toBe(Math.round(a!.height));

      // ---- Meta: browser pixel + server CAPI ---------------------------------
      console.log("   FB Pixel :", fbPixel.map((f) => `${f.ev}(${f.id})`).join(", ") || "(none)");
      console.log("   FB CAPI  :", capi.map((c) => `${c.name}→${c.status}`).join(", ") || "(none)");
      expect(fbPixel.map((f) => f.ev), "browser PageView fired").toContain("PageView");
      expect(fbPixel.find((f) => f.ev === "PageView")?.id, "on the default palm pixel").toBe(DEFAULT_PIXEL);
      expect(capi.map((c) => c.name), "server CAPI PageView relayed").toContain("PageView");
      expect(capi.find((c) => c.name === "PageView")?.status, "CAPI accepted it").toBe(200);

      // ---- PostHog ------------------------------------------------------------
      const names = ph.map((e) => e.event);
      console.log("   PostHog  :", [...new Set(names)].join(", ") || "(none)");
      expect(names, "lander_view").toContain("lander_view");
      expect(names, "palm_bridge_view (needs the init-before-render fix)").toContain("palm_bridge_view");

      const bridge = ph.find((e) => e.event === "palm_bridge_view");
      expect(bridge?.props?.sign, "tagged sign=hand-size").toBe("hand-size");
      expect(bridge?.props?.hook, "tagged hook").toBe(hook);
      expect(bridge?.props?.version, "tagged version c").toBe("c");
      expect(bridge?.props?.utm_source, "carries utm_source").toBe("pw_smoke");
      expect(ph.find((e) => e.event === "lander_view")?.props?.funnel, "funnel=palm").toBe("palm");

      // ---- tap → chat handoff -------------------------------------------------
      await page.getByTestId("palm-thumb-a").click();
      await expect(page.getByText(/Evelyn is reading your hands/i)).toBeVisible();
      await page.waitForURL(/\/fb-palm\/chat\?/, { timeout: 20000 });

      const q = new URL(page.url()).searchParams;
      expect(q.get("hook")).toBe(hook);
      expect(q.get("thumb")).toBe("a");
      expect(q.get("sign")).toBe("hand-size");
      expect(q.get("v")).toBe("c");

      // Option A must still be the BIG-hands read — the guard against a strip
      // recomposite silently swapping the panels.
      await expect(
        page.getByText(/large and generous/i).first(),
      ).toBeVisible({ timeout: 25000 });

      // Re-read the captures: `names` above is a snapshot from BEFORE the tap, and
      // palm_thumb_select/palm_read_continue only fire on the tap. PostHog batches,
      // so give the queue a moment to flush.
      await page.waitForTimeout(5000);
      const afterTap = ph.map((e) => e.event);
      console.log("   PostHog (post-tap):", [...new Set(afterTap)].join(", "));
      expect(afterTap, "palm_thumb_select").toContain("palm_thumb_select");
      expect(afterTap, "palm_read_continue").toContain("palm_read_continue");

      const sel = ph.find((e) => e.event === "palm_thumb_select");
      expect(sel?.props?.sign, "palm_thumb_select tagged sign=hand-size").toBe("hand-size");
      expect(sel?.props?.thumb, "palm_thumb_select tagged the tapped option").toBe("a");

      console.log("   → chat  :", page.url().replace(/^https?:\/\/[^/]+/, ""));
    });
  }
});
