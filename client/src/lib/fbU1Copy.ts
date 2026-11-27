// /fb Upsell 1 copy test (v1_fb_u1_copy_2026): client side.
//
// A is today's Upsell 1 script (V1_UPSELL1, reached by passing NO copy override). B is
// "hook 6, the stone is a filter" (./upsellCopy/fbU1Filter.ts).
//
// The server decides everything about who is in (her order row: /fb, no belief lane, an
// Upsell 1 price of $47, a known topic) and logs the exposure in the same call that hands
// back the arm, so AWAIT THIS BEFORE THE FIRST BUBBLE: rendering first would record an arm
// she never saw.
//
// ⛔ Any failure means today's copy: a non-OK response, a bad body, a network error, or no
// answer within FB_U1_COPY_TIMEOUT_MS. Only /fb/welcome1 ever asks (isFbU1CopyRoute).
//
// Preview: `?u1copy=filter` forces B (add `&chatflow=b` for the candle line) and
// `?u1copy=today` forces A, WITHOUT calling the server, so a preview is never logged and
// never counted.

import type { Upsell1Copy } from "@/lib/upsellCopy/types";
import { fbU1FilterCopy, isFilterBucket } from "@/lib/upsellCopy/fbU1Filter";
import { currentFunnel } from "@/lib/funnel";
import { createTimeoutSignal } from "@/lib/timeoutSignal";

export interface FbU1Arm {
  copy: "today" | "filter";
  // B only: she saw the candle bend at her name (plain /fb chat B). Picks RITUAL bubble 2.
  candle: boolean;
}

export const FB_U1_TODAY: FbU1Arm = { copy: "today", candle: false };

// Short on purpose: the chat never waits on the test. A slower answer shows today's copy.
export const FB_U1_COPY_TIMEOUT_MS = 2000;

// The Upsell 1 price the test runs at. The server re-checks it on her order row and never
// trusts this; the client only uses it to skip a call that could only answer A.
export const FB_U1_COPY_PRICE_CENTS = 4700;

/** Only /fb's own Upsell 1 page takes part. /fb2, /fb-palm, /fb-tarot, / and the rest never ask. */
export function isFbU1CopyRoute(pathname?: string): boolean {
  return currentFunnel(pathname) === "v1-fb";
}

/** The `?u1copy=` preview switch, or null when absent (then the server decides). */
export function fbU1CopyPreview(search: string): FbU1Arm | null {
  const params = new URLSearchParams(search);
  const forced = params.get("u1copy");
  if (forced === "filter") return { copy: "filter", candle: params.get("chatflow") === "b" };
  if (forced === "today") return FB_U1_TODAY;
  return null;
}

/** Ask the server which Upsell 1 script this order gets. Never throws; never waits long. */
export async function fetchFbU1Copy(
  sessionId: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = FB_U1_COPY_TIMEOUT_MS,
): Promise<FbU1Arm> {
  const { signal, cleanup } = createTimeoutSignal(timeoutMs);
  let timer: ReturnType<typeof setTimeout> | undefined;
  // The race is the guarantee: even a fetch that ignores the abort cannot hold the chat.
  const late = new Promise<FbU1Arm>((resolve) => {
    timer = setTimeout(() => resolve(FB_U1_TODAY), timeoutMs);
  });
  const ask = (async (): Promise<FbU1Arm> => {
    try {
      const r = await fetchImpl(`/api/fb/u1-copy?session_id=${encodeURIComponent(sessionId)}`, {
        signal,
      });
      if (!r.ok) return FB_U1_TODAY;
      const data = await r.json();
      return data?.copy === "filter" ? { copy: "filter", candle: data?.candle === true } : FB_U1_TODAY;
    } catch {
      return FB_U1_TODAY;
    }
  })();
  try {
    return await Promise.race([ask, late]);
  } finally {
    clearTimeout(timer);
    cleanup();
  }
}

/**
 * The copy override for the Upsell 1 hook. undefined ⇒ no override ⇒ the hook resolves
 * today's V1_UPSELL1, byte for byte. B needs a known topic; without one she gets A (the
 * server never assigns B to such an order either).
 */
export function fbU1CopyFor(arm: FbU1Arm, bucket: unknown): Upsell1Copy | undefined {
  if (arm.copy !== "filter" || !isFilterBucket(bucket)) return undefined;
  return fbU1FilterCopy({ bucket, candle: arm.candle });
}
