import { test, expect } from "@playwright/test";
import zlib from "node:zlib";

// Read-only production smoke for the 3 finger-shape hook links handed to the
// media buyer. Proves, on live www:
//   1. the hook resolves (no silent fallback to soulmate-timing)
//   2. the finger-shape art + 3 options render
//   3. FB Pixel PageView + server-side CAPI (/api/fb-event) both fire, deduped
//   4. PostHog lander_view + palm_bridge_view fire with sign=finger-shape
//   5. the tap hands off to /fb-palm/chat with sign + version preserved
//
//   npx playwright test --config=playwright.fb-palm-fingershape.config.ts

const HOOKS = [
  { hook: "soulmate-timing", headline: "When is my soulmate coming?" },
  { hook: "already-met", headline: "Have you already met your soulmate?" },
  { hook: "love-again", headline: "Will I love again?" },
] as const;

const DEFAULT_PIXEL = "446814716830295";

for (const { hook, headline } of HOOKS) {
  test(`fb-palm/c · ${hook} · finger-shape`, async ({ page }) => {
    const fbPixel: { ev: string; id: string }[] = [];
    const capi: { name: string; status: number; eventId?: string }[] = [];
    const consoleWarnings: string[] = [];

    // PostHog is a MODULE import (posthog-js), not a window global, so the only
    // sound signal is the wire: decode the gzipped capture payloads it POSTs to
    // the ingestion host and pull the event names + properties out.
    const phCaptures: { event: string; props: Record<string, any> }[] = [];
    let phHits = 0;

    const decodePH = (buf: Buffer | null, url: string) => {
      const texts: string[] = [];
      if (buf) {
        try { texts.push(zlib.gunzipSync(buf).toString("utf8")); }
        catch { texts.push(buf.toString("utf8")); }
      }
      // form-encoded `data=<base64[gzip]>`, in body or querystring
      for (const src of [buf?.toString("utf8") ?? "", url]) {
        const m = src.match(/(?:[?&]|^)data=([^&]+)/);
        if (!m) continue;
        try {
          const raw = Buffer.from(decodeURIComponent(m[1]), "base64");
          try { texts.push(zlib.gunzipSync(raw).toString("utf8")); }
          catch { texts.push(raw.toString("utf8")); }
        } catch { /* noop */ }
      }
      for (const t of texts) {
        try {
          const parsed = JSON.parse(t);
          for (const e of Array.isArray(parsed) ? parsed : [parsed]) {
            if (e?.event) phCaptures.push({ event: e.event, props: e.properties ?? {} });
          }
        } catch { /* not json — ignore */ }
      }
    };

    page.on("console", (msg) => {
      const t = msg.text();
      if (/posthog/i.test(t)) consoleWarnings.push(t);
    });

    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("facebook.com/tr")) {
        const p = new URL(url).searchParams;
        fbPixel.push({ ev: p.get("ev") || "?", id: p.get("id") || "?" });
      }
      if (/posthog\.com|\/ingest\//.test(url)) {
        phHits++;
        decodePH(req.postDataBuffer(), url);
      }
    });

    // Server-side CAPI relay — capture the request body AND the response code.
    page.on("response", async (res) => {
      if (!res.url().includes("/api/fb-event")) return;
      let name = "?";
      let eventId: string | undefined;
      try {
        const body = JSON.parse(res.request().postData() || "{}");
        name = body.eventName ?? "?";
        eventId = body.eventId ?? body.event_id;
      } catch { /* noop */ }
      capi.push({ name, status: res.status(), eventId });
    });

    const strip: number[] = [];
    page.on("response", (res) => {
      if (res.url().includes("finger-shape-strip.png")) strip.push(res.status());
    });

    await page.goto(
      `/fb-palm/c?hook=${hook}&sign=finger-shape`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForTimeout(4000);

    // ---- 1. Hook resolved, no fallback -------------------------------------
    await expect(page.getByRole("heading", { name: headline })).toBeVisible();
    await expect(page.getByText("According to Your Finger Shape")).toBeVisible();

    // ---- 2. finger-shape art + 3 tappable options --------------------------
    for (const opt of ["a", "b", "c"]) {
      await expect(page.getByTestId(`palm-thumb-${opt}`)).toBeVisible();
    }
    expect(strip, "finger-shape strip art loaded").toContain(200);

    const phNames = phCaptures.map((c) => c.event);
    console.log(`\n  [${hook}]`);
    console.log("   FB Pixel :", fbPixel.map((f) => `${f.ev}(${f.id})`).join(", ") || "(none)");
    console.log("   FB CAPI  :", capi.map((c) => `${c.name}→${c.status}`).join(", ") || "(none)");
    // NOTE: no PostHog events are expected here — posthog-js drops events from
    // automated browsers (see maskBotSignals below). PostHog is asserted in its
    // own test, which masks the bot signals. Absence here is NOT a bug.
    console.log("   PH hits  :", phHits, "(asset/config only — bot-filtered, expected)");
    console.log("   PH events:", [...new Set(phNames)].join(", ") || "(none — bot-filtered, expected)");
    if (consoleWarnings.length) console.log("   PH console:", consoleWarnings.join(" | "));

    // ---- 3. Meta: browser pixel + server CAPI, same event, deduped ----------
    expect(fbPixel.map((f) => f.ev), "browser PageView fired").toContain("PageView");
    expect(
      fbPixel.find((f) => f.ev === "PageView")?.id,
      "PageView on the default palm pixel",
    ).toBe(DEFAULT_PIXEL);
    expect(capi.map((c) => c.name), "server CAPI PageView relayed").toContain("PageView");
    expect(
      capi.find((c) => c.name === "PageView")?.status,
      "CAPI endpoint accepted the event",
    ).toBe(200);

    // ---- 4. Handoff into chat carries sign + version ------------------------
    await page.getByTestId("palm-thumb-a").click();
    await expect(page.getByText(/Evelyn is reading your fingers/i)).toBeVisible();
    await page.waitForURL(/\/fb-palm\/chat\?/, { timeout: 20000 });

    const q = new URL(page.url()).searchParams;
    expect(q.get("hook"), "hook handed to chat").toBe(hook);
    expect(q.get("thumb"), "option handed to chat").toBe("a");
    expect(q.get("sign"), "sign handed to chat").toBe("finger-shape");
    expect(q.get("v"), "version handed to chat").toBe("c");

    // The chat opener must be the finger-shape read, not a fallback.
    await expect(
      page.getByText(/its sides like two steady lines/i).first(),
    ).toBeVisible({ timeout: 25000 });

    console.log("   → chat  :", page.url().replace(/^https?:\/\/[^/]+/, ""));
  });
}

// PostHog drops every event from an automated browser: posthog-js `isLikelyBot()`
// checks the UA blocklist (which contains "headlesschrome"), navigator.webdriver,
// AND navigator.userAgentData.brands. Spoofing the UA string alone is NOT enough —
// the brands array still says HeadlessChrome. Without masking all three, capture()
// silently returns and this test would "prove" PostHog is broken when it is fine.
async function maskBotSignals(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", {
      get: () => false,
      configurable: true,
    });
    Object.defineProperty(Navigator.prototype, "userAgentData", {
      get: () => ({
        brands: [
          { brand: "Google Chrome", version: "126" },
          { brand: "Chromium", version: "126" },
        ],
        mobile: false,
        platform: "Windows",
      }),
      configurable: true,
    });
  });
}

test.describe("PostHog", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });

  test("palm bridge events reach PostHog ingestion", async ({ page }) => {
    await maskBotSignals(page);

    const events: { event: string; props: Record<string, any> }[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (!/i\.posthog\.com/.test(url) || /us-assets/.test(url)) return;
      if (!/\/e\/|\/i\/v0\/e/.test(url)) return;
      const buf = req.postDataBuffer();
      const texts: string[] = [];
      if (buf) {
        try { texts.push(zlib.gunzipSync(buf).toString("utf8")); }
        catch { texts.push(buf.toString("utf8")); }
      }
      const m = (buf?.toString("utf8") ?? "").match(/(?:[?&]|^)data=([^&]+)/);
      if (m) {
        try {
          const raw = Buffer.from(decodeURIComponent(m[1]), "base64");
          try { texts.push(zlib.gunzipSync(raw).toString("utf8")); }
          catch { texts.push(raw.toString("utf8")); }
        } catch { /* noop */ }
      }
      for (const t of texts) {
        try {
          const parsed = JSON.parse(t);
          for (const e of Array.isArray(parsed) ? parsed : [parsed]) {
            if (e?.event) events.push({ event: e.event, props: e.properties ?? {} });
          }
        } catch { /* noop */ }
      }
    });

    await page.goto("/fb-palm/c?hook=already-met&sign=finger-shape&utm_source=pw_smoke", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(7000);
    await page.getByTestId("palm-thumb-a").click();
    await page.waitForTimeout(7000);

    const names = events.map((e) => e.event);
    console.log("   PostHog events:", [...new Set(names)].join(", ") || "(NONE)");

    expect(names, "lander_view reaches PostHog").toContain("lander_view");
    expect(names, "palm_thumb_select reaches PostHog").toContain("palm_thumb_select");

    // The init-order race: PalmBridge's mount effect (child) used to fire
    // palm_bridge_view BEFORE App's mount effect called initPostHog(), so
    // track()'s `if (!initialized) return` dropped it. Fixed by initialising
    // PostHog in main.tsx before React renders. Fails until that ships.
    expect(names, "palm_bridge_view reaches PostHog (init-order race fixed)").toContain(
      "palm_bridge_view",
    );

    const bridge = events.find((e) => e.event === "palm_bridge_view");
    expect(bridge?.props?.sign, "palm_bridge_view tagged finger-shape").toBe("finger-shape");
    expect(bridge?.props?.hook, "palm_bridge_view tagged hook").toBe("already-met");
    expect(bridge?.props?.version, "palm_bridge_view tagged version c").toBe("c");
    // UTM super-props are registered before render, so the mount-time event carries them.
    expect(bridge?.props?.utm_source, "palm_bridge_view carries utm_source").toBe("pw_smoke");
  });
});
