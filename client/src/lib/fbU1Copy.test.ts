// /fb Upsell 1 copy test (v1_fb_u1_copy_2026): the client side. Only /fb's own Upsell 1
// asks, the preview switch never calls the server, and every failure (bad answer, network
// error, a slow server) shows today's copy.
//
//   npx vitest run client/src/lib/fbU1Copy.test.ts

import { describe, expect, it } from "vitest";
import {
  FB_U1_TODAY,
  fbU1CopyFor,
  fbU1CopyPreview,
  fetchFbU1Copy,
  isFbU1CopyRoute,
} from "./fbU1Copy";
import { RITUAL_ALTAR_LINE, RITUAL_CANDLE_LINE } from "./upsellCopy/fbU1Filter";

const json = (body: unknown, ok = true, status = 200) =>
  (async () => ({ ok, status, json: async () => body }) as unknown as Response) as unknown as typeof fetch;

describe("only /fb's Upsell 1 takes part", () => {
  it("/fb/welcome1 asks", () => {
    expect(isFbU1CopyRoute("/fb/welcome1")).toBe(true);
  });
  it("no other funnel's Upsell 1 does", () => {
    for (const p of [
      "/welcome1",
      "/fb2/welcome1",
      "/fb-palm/welcome1",
      "/fb-tarot/welcome1",
      "/fb-read/welcome1",
      "/gdn/welcome1",
      "/tarot/twin-flame/welcome1",
    ]) {
      expect(isFbU1CopyRoute(p)).toBe(false);
    }
  });
});

describe("the ?u1copy= preview switch", () => {
  it("filter forces B, with the altar line unless &chatflow=b", () => {
    expect(fbU1CopyPreview("?u1copy=filter")).toEqual({ copy: "filter", candle: false });
    expect(fbU1CopyPreview("?u1copy=filter&chatflow=b")).toEqual({ copy: "filter", candle: true });
    expect(fbU1CopyPreview("session_id=cs_test_x&u1copy=filter")).toEqual({ copy: "filter", candle: false });
  });
  it("today forces A", () => {
    expect(fbU1CopyPreview("?u1copy=today")).toEqual(FB_U1_TODAY);
  });
  it("absent or unknown ⇒ null, so the server decides", () => {
    expect(fbU1CopyPreview("")).toBeNull();
    expect(fbU1CopyPreview("?session_id=cs_test_x")).toBeNull();
    expect(fbU1CopyPreview("?u1copy=B")).toBeNull();
  });
});

describe("fetchFbU1Copy", () => {
  it("asks for this order, and takes B with its candle flag", async () => {
    let url = "";
    const f = (async (u: string) => {
      url = u;
      return { ok: true, json: async () => ({ copy: "filter", candle: true }) };
    }) as unknown as typeof fetch;
    expect(await fetchFbU1Copy("cs_test_a1/b", f)).toEqual({ copy: "filter", candle: true });
    expect(url).toBe("/api/fb/u1-copy?session_id=cs_test_a1%2Fb");
  });
  it("candle is true only when the server says exactly true", async () => {
    expect(await fetchFbU1Copy("cs_x", json({ copy: "filter" }))).toEqual({ copy: "filter", candle: false });
    expect(await fetchFbU1Copy("cs_x", json({ copy: "filter", candle: "yes" }))).toEqual({ copy: "filter", candle: false });
  });
  it("anything but copy 'filter' is today's copy", async () => {
    for (const body of [{ copy: "today" }, {}, null, "filter", { copy: "FILTER" }, { flow: "b" }]) {
      expect(await fetchFbU1Copy("cs_x", json(body))).toEqual(FB_U1_TODAY);
    }
  });
  it("a non-OK answer is today's copy", async () => {
    expect(await fetchFbU1Copy("cs_x", json({ copy: "filter" }, false, 500))).toEqual(FB_U1_TODAY);
  });
  it("a network error or a bad body is today's copy", async () => {
    const throws = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect(await fetchFbU1Copy("cs_x", throws)).toEqual(FB_U1_TODAY);
    const badBody = (async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    })) as unknown as typeof fetch;
    expect(await fetchFbU1Copy("cs_x", badBody)).toEqual(FB_U1_TODAY);
  });
  it("a server that never answers is today's copy, on time", async () => {
    const never = (() => new Promise(() => {})) as unknown as typeof fetch;
    const t0 = Date.now();
    expect(await fetchFbU1Copy("cs_x", never, 40)).toEqual(FB_U1_TODAY);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
  it("a B that arrives after the timeout is still today's copy", async () => {
    const late = (() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true, json: async () => ({ copy: "filter", candle: true }) }), 120),
      )) as unknown as typeof fetch;
    expect(await fetchFbU1Copy("cs_x", late, 30)).toEqual(FB_U1_TODAY);
  });
});

describe("fbU1CopyFor: the override handed to the Upsell 1 hook", () => {
  it("today ⇒ no override, so the hook resolves V1_UPSELL1 (see questions.test.ts)", () => {
    expect(fbU1CopyFor(FB_U1_TODAY, "love")).toBeUndefined();
  });
  it("B with no known topic ⇒ no override (today's copy)", () => {
    for (const b of [null, undefined, "", "career"]) {
      expect(fbU1CopyFor({ copy: "filter", candle: true }, b)).toBeUndefined();
    }
  });
  it("B ⇒ arm B for her topic, with the right RITUAL line", () => {
    const withCandle = fbU1CopyFor({ copy: "filter", candle: true }, "money")!;
    expect(withCandle.acceptLabel).toBe("Yes, set my stone tonight");
    expect(withCandle.GAP[3]).toMatch(/^Someone else's money worries\./);
    expect(withCandle.RITUAL[1]).toBe(RITUAL_CANDLE_LINE);
    expect(fbU1CopyFor({ copy: "filter", candle: false }, "money")!.RITUAL[1]).toBe(RITUAL_ALTAR_LINE);
  });
});
