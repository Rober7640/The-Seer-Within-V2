// /fb Upsell 2 copy test (v1_fb_u2_copy_2026): client side.
//
// A is today's Upsell 2 script (V1_UPSELL2, reached by passing NO copy override). B is
// "hook M, the magnet" (./upsellCopy/fbU2Magnet.ts).
//
// The server decides everything about who is in (her order row: /fb, no belief lane, a known
// topic) and logs the exposure in the same call that hands back the arm, so AWAIT THIS
// BEFORE THE FIRST BUBBLE: rendering first would record an arm she never saw.
//
// ⛔ Any failure means today's copy: a non-OK response, a bad body, a network error, or no
// answer within FB_U2_COPY_TIMEOUT_MS. Only /fb/welcome2 ever asks (isFbU2CopyRoute).
//
// Preview: `?u2copy=magnet` forces B (add `&chatflow=b` for the candle line) and
// `?u2copy=today` forces A, WITHOUT calling the server, so a preview is never logged and
// never counted.

import type { Upsell2Copy } from "@/lib/upsellCopy/types";
import { fbU2MagnetCopy, isMagnetBucket } from "@/lib/upsellCopy/fbU2Magnet";
import { currentFunnel } from "@/lib/funnel";
import { createTimeoutSignal } from "@/lib/timeoutSignal";

export interface FbU2Arm {
  copy: "today" | "magnet";
  // B only: she saw the candle bend at her name (plain /fb chat B). Picks RITUAL_INSTRUCTION
  // bubble 2.
  candle: boolean;
}

export const FB_U2_TODAY: FbU2Arm = { copy: "today", candle: false };

// Short on purpose: the chat never waits on the test. A slower answer shows today's copy.
export const FB_U2_COPY_TIMEOUT_MS = 2000;

/** Only /fb's own Upsell 2 page takes part. /fb2, /fb-palm, /fb-tarot, / and the rest never ask. */
export function isFbU2CopyRoute(pathname?: string): boolean {
  return currentFunnel(pathname) === "v1-fb";
}

/** The `?u2copy=` preview switch, or null when absent (then the server decides). */
export function fbU2CopyPreview(search: string): FbU2Arm | null {
  const params = new URLSearchParams(search);
  const forced = params.get("u2copy");
  if (forced === "magnet") return { copy: "magnet", candle: params.get("chatflow") === "b" };
  if (forced === "today") return FB_U2_TODAY;
  return null;
}

/** Ask the server which Upsell 2 script this order gets. Never throws; never waits long. */
export async function fetchFbU2Copy(
  sessionId: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = FB_U2_COPY_TIMEOUT_MS,
): Promise<FbU2Arm> {
  const { signal, cleanup } = createTimeoutSignal(timeoutMs);
  let timer: ReturnType<typeof setTimeout> | undefined;
  // The race is the guarantee: even a fetch that ignores the abort cannot hold the chat.
  const late = new Promise<FbU2Arm>((resolve) => {
    timer = setTimeout(() => resolve(FB_U2_TODAY), timeoutMs);
  });
  const ask = (async (): Promise<FbU2Arm> => {
    try {
      const r = await fetchImpl(`/api/fb/u2-copy?session_id=${encodeURIComponent(sessionId)}`, {
        signal,
      });
      if (!r.ok) return FB_U2_TODAY;
      const data = await r.json();
      return data?.copy === "magnet" ? { copy: "magnet", candle: data?.candle === true } : FB_U2_TODAY;
    } catch {
      return FB_U2_TODAY;
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
 * The copy override for the Upsell 2 hook. undefined ⇒ no override ⇒ the hook resolves
 * today's V1_UPSELL2, byte for byte. B needs a known topic; without one she gets A (the
 * server never assigns B to such an order either).
 */
export function fbU2CopyFor(arm: FbU2Arm, bucket: unknown): Upsell2Copy | undefined {
  if (arm.copy !== "magnet" || !isMagnetBucket(bucket)) return undefined;
  return fbU2MagnetCopy({ bucket, candle: arm.candle });
}
