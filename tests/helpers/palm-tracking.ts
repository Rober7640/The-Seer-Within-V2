import type { Page, Request } from "@playwright/test";
import zlib from "node:zlib";

// A REAL desktop Chrome UA. Playwright's default contains "HeadlessChrome",
// which posthog-js has on its bot blocklist.
export const REAL_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * posthog-js SILENTLY drops every capture() from an automated browser — no
 * console warning, no queued event, no network request. `isLikelyBot()` returns
 * true if ANY of these hold:
 *   1. navigator.userAgent matches its blocklist (contains "headlesschrome")
 *   2. navigator.userAgentData.brands contains a blocked brand  <-- still says
 *      HeadlessChrome even when the UA STRING is spoofed, so spoofing the UA
 *      alone is not enough
 *   3. navigator.webdriver is true (always true under Playwright/CDP)
 *
 * Without masking all three, PostHog looks completely dead from Playwright when
 * it is perfectly healthy — so any PostHog assertion is meaningless. Pair this
 * with `test.use({ userAgent: REAL_UA })`.
 *
 * Meta Pixel / CAPI, GA4 and Clarity do NOT bot-filter, so they need none of this.
 */
export async function maskBotSignals(page: Page): Promise<void> {
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

export interface PhEvent {
  event: string;
  props: Record<string, any>;
}

/** Decode PostHog's capture payloads (gzipped, sometimes base64 in `data=`). */
export function decodePostHogRequest(req: Request): PhEvent[] {
  const url = req.url();
  if (!/i\.posthog\.com/.test(url) || /us-assets/.test(url)) return [];
  if (!/\/e\/|\/i\/v0\/e/.test(url)) return [];

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

  const out: PhEvent[] = [];
  for (const t of texts) {
    try {
      const parsed = JSON.parse(t);
      for (const e of Array.isArray(parsed) ? parsed : [parsed]) {
        if (e?.event) out.push({ event: e.event, props: e.properties ?? {} });
      }
    } catch { /* not the payload we want */ }
  }
  return out;
}
