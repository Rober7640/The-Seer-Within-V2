// /fb Upsell 2 copy test (v1_fb_u2_copy_2026): the client side. Only /fb's own Upsell 2
// asks, the preview switch never calls the server, and every failure (bad answer, network
// error, a slow server) shows today's copy.
//
//   npx vitest run client/src/lib/fbU2Copy.test.ts

import { describe, expect, it } from "vitest";
import {
  FB_U2_COPY_TIMEOUT_MS,
  FB_U2_TODAY,
  fbU2CopyFor,
  fbU2CopyPreview,
  fetchFbU2Copy,
  isFbU2CopyRoute,
} from "./fbU2Copy";
import { RITUAL_ALTAR_LINE, RITUAL_CANDLE_LINE } from "./upsellCopy/fbU2Magnet";

const json = (body: unknown, ok = true, status = 200) =>
  (async () => ({ ok, status, json: async () => body }) as unknown as Response) as unknown as typeof fetch;

describe("only /fb's Upsell 2 takes part", () => {
  it("/fb/welcome2 asks", () => {
    expect(isFbU2CopyRoute("/fb/welcome2")).toBe(true);
  });
  it("no other funnel's Upsell 2 does", () => {
    for (const p of [
      "/welcome2",
      "/fb2/welcome2",
      "/fb-palm/welcome2",
      "/fb-tarot/welcome2",
      "/fb-read/welcome2",
      "/gdn/welcome2",
      "/tarot/twin-flame/welcome2",
      "/offers/upsell/2",
    ]) {
      expect(isFbU2CopyRoute(p)).toBe(false);
    }
  });
  it("waits 2 seconds at most, like Upsell 1", () => {
    expect(FB_U2_COPY_TIMEOUT_MS).toBe(2000);
  });
});

describe("the ?u2copy= preview switch", () => {
  it("magnet forces B, with the altar line unless &chatflow=b", () => {
    expect(fbU2CopyPreview("?u2copy=magnet")).toEqual({ copy: "magnet", candle: false });
    expect(fbU2CopyPreview("?demo=true&u2copy=magnet&chatflow=b")).toEqual({ copy: "magnet", candle: true });
    expect(fbU2CopyPreview("session_id=cs_test_x&u2copy=magnet")).toEqual({ copy: "magnet", candle: false });
  });
  it("today forces A", () => {
    expect(fbU2CopyPreview("?u2copy=today")).toEqual(FB_U2_TODAY);
  });
  it("absent or unknown ⇒ null, so the server decides", () => {
    expect(fbU2CopyPreview("")).toBeNull();
    expect(fbU2CopyPreview("?session_id=cs_test_x")).toBeNull();
    expect(fbU2CopyPreview("?u2copy=B")).toBeNull();
    expect(fbU2CopyPreview("?u1copy=filter")).toBeNull();
  });
});

describe("fetchFbU2Copy", () => {
  it("asks for this order, and takes B with its candle flag", async () => {
    let url = "";
    const f = (async (u: string) => {
      url = u;
      return { ok: true, json: async () => ({ copy: "magnet", candle: true }) };
    }) as unknown as typeof fetch;
    expect(await fetchFbU2Copy("cs_test_a1/b", f)).toEqual({ copy: "magnet", candle: true });
    expect(url).toBe("/api/fb/u2-copy?session_id=cs_test_a1%2Fb");
  });
  it("candle is true only when the server says exactly true", async () => {
    expect(await fetchFbU2Copy("cs_x", json({ copy: "magnet" }))).toEqual({ copy: "magnet", candle: false });
    expect(await fetchFbU2Copy("cs_x", json({ copy: "magnet", candle: "yes" }))).toEqual({ copy: "magnet", candle: false });
  });
  it("anything but copy 'magnet' is today's copy", async () => {
    for (const body of [{ copy: "today" }, {}, null, "magnet", { copy: "MAGNET" }, { copy: "filter" }]) {
      expect(await fetchFbU2Copy("cs_x", json(body))).toEqual(FB_U2_TODAY);
    }
  });
  it("a non-OK answer is today's copy", async () => {
    expect(await fetchFbU2Copy("cs_x", json({ copy: "magnet" }, false, 500))).toEqual(FB_U2_TODAY);
  });
  it("a network error or a bad body is today's copy", async () => {
    const throws = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect(await fetchFbU2Copy("cs_x", throws)).toEqual(FB_U2_TODAY);
    const badBody = (async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    })) as unknown as typeof fetch;
    expect(await fetchFbU2Copy("cs_x", badBody)).toEqual(FB_U2_TODAY);
  });
  it("a server that never answers is today's copy, on time", async () => {
    const never = (() => new Promise(() => {})) as unknown as typeof fetch;
    const t0 = Date.now();
    expect(await fetchFbU2Copy("cs_x", never, 40)).toEqual(FB_U2_TODAY);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
  it("a B that arrives after the timeout is still today's copy", async () => {
    const late = (() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true, json: async () => ({ copy: "magnet", candle: true }) }), 120),
      )) as unknown as typeof fetch;
    expect(await fetchFbU2Copy("cs_x", late, 30)).toEqual(FB_U2_TODAY);
  });
});

describe("fbU2CopyFor: the override handed to the Upsell 2 hook", () => {
  it("today ⇒ no override, so the hook resolves V1_UPSELL2 (see upsellCopy/upsell2Fields.test.ts)", () => {
    expect(fbU2CopyFor(FB_U2_TODAY, "love")).toBeUndefined();
  });
  it("B with no known topic ⇒ no override (today's copy)", () => {
    for (const b of [null, undefined, "", "career"]) {
      expect(fbU2CopyFor({ copy: "magnet", candle: true }, b)).toBeUndefined();
    }
  });
  it("B ⇒ arm B for her topic, with the right RITUAL line", () => {
    const withCandle = fbU2CopyFor({ copy: "magnet", candle: true }, "money")!;
    expect(withCandle.acceptLabel).toBe("Yes, set my bracelet tonight");
    expect(withCandle.aiPrompts).toBe("magnet");
    expect(withCandle.QUESTION_2_REPLIES![1].text).toBe("Money and more");
    expect(withCandle.RITUAL_INSTRUCTION[1]).toBe(RITUAL_CANDLE_LINE);
    expect(fbU2CopyFor({ copy: "magnet", candle: false }, "money")!.RITUAL_INSTRUCTION[1]).toBe(RITUAL_ALTAR_LINE);
  });
});
