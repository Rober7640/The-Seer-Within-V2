// Arm A of the /fb Upsell 2 copy test (v1_fb_u2_copy_2026) is today's V1_UPSELL2, byte for
// byte, and every new copy-first lookup in useUpsell2Chat (Q1-Q3, the typed-answer matching,
// the $47 reply bubble and button, the two AI fallbacks, the success lines, the reading
// request) hands V1, the /fb-tarot retarget copy and every backend offer exactly what the
// hook used before.
//
//   npx vitest run client/src/lib/upsellCopy/upsell2Fields.test.ts

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  UPSELL2_QUESTION_1,
  UPSELL2_QUESTION_1_REPLIES,
  UPSELL2_AFTER_Q1,
  UPSELL2_QUESTION_2,
  UPSELL2_QUESTION_2_REPLIES,
  UPSELL2_AFTER_Q2,
  UPSELL2_QUESTION_3,
  UPSELL2_QUESTION_3_REPLIES,
  UPSELL2_AFTER_Q3,
  UPSELL2_SUCCESS,
  UPSELL2_DOWNSELL,
  detectU2Q1Intent,
  detectU2Q2Intent,
  detectU2Q3Intent,
} from "../upsell2Messages";
import { BACKEND_UPSELL_PITCH, upsell2Copy } from "../backendOffers";
import { FB_U2_TODAY, fbU2CopyFor } from "../fbU2Copy";
import { V1_UPSELL2 } from "./v1";
import { retargetUpsell2Copy } from "./retargetUpsell2";
import type { Upsell2Copy } from "./types";
import { upsell2Intent, upsell2Question1, upsell2Question2, upsell2Question3 } from "./questions";
import {
  buyStepLines,
  upsell2ReadingBody,
  UPSELL2_ACCEPT_BUBBLE,
  UPSELL2_ACCEPT_BUTTON,
  UPSELL2_PERSONALIZE_FALLBACK,
  UPSELL2_REVEAL_FALLBACK,
} from "./upsell2Fields";
import { fbU2MagnetCopy, FULL_PRICE_SUCCESS_EXTRA } from "./fbU2Magnet";

// AFTER_Q1/2/3 are NOT new: HEAD's hook already read `copy.AFTER_Qn ?? UPSELL2_AFTER_Qn`, and
// four backend offers (tea-reading, pixiu, heart-cleanser, soulmate-initials) set their own.
// The lookup keeps that exact fallback.
const NEW_FIELDS = [
  "QUESTION_1", "QUESTION_1_REPLIES",
  "QUESTION_2", "QUESTION_2_REPLIES",
  "QUESTION_3", "QUESTION_3_REPLIES",
  "detectIntent", "acceptLabel", "revealFallback", "personalizeFallback", "aiPrompts",
  "fullPriceSuccessExtra",
] as const;

// Typed answers run through today's three matchers for the fingerprint.
const CORPUS = [
  "Yes, I feel it", "I think so", "What do you mean?", "Yes, one stood out", "They all resonate",
  "Tell me more", "Yes, I'm ready", "What exactly will I receive?", "no", "hmm", "", "maybe",
  "how", "all of them", "I am", "details please",
];

// Computed from HEAD (f1fb8d4, before this test existed) with this same recipe: V1_UPSELL2 +
// the nine shared Q1-Q3 constants + the three matchers' answers to CORPUS. A change to any
// of them, or to any line of today's Upsell 2 copy, changes it.
const HEAD_COPY_FINGERPRINT = "dfeb6b50aa962b46fdec2e43b4fd813c03b6df8d34d4487de28cd816e734adca";

function fingerprint(): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        copy: V1_UPSELL2,
        q: [
          UPSELL2_QUESTION_1, UPSELL2_QUESTION_1_REPLIES, UPSELL2_AFTER_Q1,
          UPSELL2_QUESTION_2, UPSELL2_QUESTION_2_REPLIES, UPSELL2_AFTER_Q2,
          UPSELL2_QUESTION_3, UPSELL2_QUESTION_3_REPLIES, UPSELL2_AFTER_Q3,
        ],
        intents: CORPUS.map((c) => [detectU2Q1Intent(c), detectU2Q2Intent(c), detectU2Q3Intent(c)]),
      }),
    )
    .digest("hex");
}

// Every Upsell 2 copy that is NOT arm B: V1 (and so arm A), the retarget copies, every
// backend offer's.
const OTHERS: [string, Upsell2Copy][] = [
  ["V1_UPSELL2", V1_UPSELL2],
  ["retarget love", retargetUpsell2Copy("love")],
  ["retarget money", retargetUpsell2Copy("money")],
  ...Object.entries(BACKEND_UPSELL_PITCH).map(([k, p]) => [`backend ${k}`, p!.upsell2] as [string, Upsell2Copy]),
];

describe("arm A is today's V1_UPSELL2", () => {
  it("is byte-identical to HEAD's copy, questions and matching", () => {
    expect(fingerprint()).toBe(HEAD_COPY_FINGERPRINT);
  });
  it("the /fb page resolves V1_UPSELL2 itself when the arm is A, or B meets no topic", () => {
    expect(fbU2CopyFor(FB_U2_TODAY, "love")).toBeUndefined();
    expect(fbU2CopyFor({ copy: "magnet", candle: true }, null)).toBeUndefined();
    expect(fbU2CopyFor({ copy: "magnet", candle: true }, "career")).toBeUndefined();
    expect(upsell2Copy("/fb/welcome2")).toBe(V1_UPSELL2);
  });
});

describe("no copy but arm B sets any new field", () => {
  for (const [name, c] of OTHERS) {
    it(name, () => {
      for (const f of NEW_FIELDS) expect(c[f]).toBeUndefined();
    });
  }
  it("arm B sets the ones its script needs", () => {
    const b = fbU2MagnetCopy({ bucket: "love", candle: true });
    for (const f of NEW_FIELDS) expect(b[f]).toBeDefined();
  });
  it("the backend offers that already set their own AFTER branches still do", () => {
    const own = OTHERS.filter(([, c]) => c.AFTER_Q1 || c.AFTER_Q2 || c.AFTER_Q3).map(([n]) => n).sort();
    expect(own).toEqual([
      "backend heart-cleanser", "backend pixiu-bracelet", "backend soulmate-initials", "backend tea-reading",
    ]);
  });
});

describe("the hook's Q1-Q3 / matching lookup falls back to the shared constants", () => {
  for (const [name, c] of OTHERS) {
    it(name, () => {
      // The very same objects, not copies: what the hook imported before.
      expect(upsell2Question1(c).question).toBe(UPSELL2_QUESTION_1);
      expect(upsell2Question1(c).replies).toBe(UPSELL2_QUESTION_1_REPLIES);
      expect(upsell2Question1(c).after).toBe(c.AFTER_Q1 ?? UPSELL2_AFTER_Q1);
      expect(upsell2Question2(c).question).toBe(UPSELL2_QUESTION_2);
      expect(upsell2Question2(c).replies).toBe(UPSELL2_QUESTION_2_REPLIES);
      expect(upsell2Question2(c).after).toBe(c.AFTER_Q2 ?? UPSELL2_AFTER_Q2);
      expect(upsell2Question3(c).question).toBe(UPSELL2_QUESTION_3);
      expect(upsell2Question3(c).replies).toBe(UPSELL2_QUESTION_3_REPLIES);
      expect(upsell2Question3(c).after).toBe(c.AFTER_Q3 ?? UPSELL2_AFTER_Q3);
      expect(upsell2Intent(c, 1)).toBe(detectU2Q1Intent);
      expect(upsell2Intent(c, 2)).toBe(detectU2Q2Intent);
      expect(upsell2Intent(c, 3)).toBe(detectU2Q3Intent);
    });
  }
});

describe("today's hard-wired text, kept as the defaults", () => {
  it("the $47 reply bubble, the button, and the two AI fallbacks are HEAD's strings", () => {
    expect(UPSELL2_ACCEPT_BUBBLE).toBe("Yes, I want the Manifestation Bracelet");
    expect(UPSELL2_ACCEPT_BUTTON).toBe("Yes, send me the Manifestation Bracelet");
    expect(UPSELL2_REVEAL_FALLBACK).toBe(
      "I see something beyond the block, {firstName}... something trying to reach you.",
    );
    expect(UPSELL2_PERSONALIZE_FALLBACK).toBe(
      "The stones that speak loudest to your energy are calling, {firstName}.",
    );
  });
});

describe("buyStepLines: the extra $47 SUCCESS bubble", () => {
  const b = fbU2MagnetCopy({ bucket: "love", candle: false });
  it("every copy but arm B: the very same success lines, both tiers", () => {
    for (const [, c] of OTHERS) {
      expect(buyStepLines(UPSELL2_SUCCESS, c, "full")).toBe(UPSELL2_SUCCESS);
      expect(buyStepLines(UPSELL2_DOWNSELL, c, "downsell")).toBe(UPSELL2_DOWNSELL);
    }
  });
  it("arm B at $47: the extra line straight after bubble 1, nothing else moves", () => {
    const out = buyStepLines(b.SUCCESS, b, "full");
    expect(out).toEqual([b.SUCCESS[0], FULL_PRICE_SUCCESS_EXTRA, ...b.SUCCESS.slice(1)]);
    expect(b.SUCCESS).not.toContain(FULL_PRICE_SUCCESS_EXTRA); // input left alone
  });
  it("arm B at $30: no extra line", () => {
    expect(buyStepLines(b.SUCCESS, b, "downsell")).toBe(b.SUCCESS);
  });
  it("an empty list stays empty", () => {
    expect(buyStepLines([], b, "full")).toEqual([]);
  });
});

describe("upsell2ReadingBody: the request to /api/upsell2/reading", () => {
  const user = { firstName: "Maria", bucket: "love", concern: "will he come back", personName: "Tom" };
  it("with no aiPrompts, byte-identical to HEAD's body", () => {
    // HEAD's hook: JSON.stringify({ type, userData: {firstName, bucket, concern, personName}, concern })
    const head = JSON.stringify({
      type: "manifest_reveal",
      userData: { firstName: "Maria", bucket: "love", concern: "will he come back", personName: "Tom" },
      concern: "will he come back",
    });
    expect(upsell2ReadingBody("manifest_reveal", user, undefined)).toBe(head);
    for (const [, c] of OTHERS) {
      expect(upsell2ReadingBody("manifest_personalize", user, c.aiPrompts)).not.toContain('"copy"');
    }
  });
  it('arm B adds copy: "magnet" and nothing else', () => {
    const body = JSON.parse(upsell2ReadingBody("manifest_personalize", user, "magnet"));
    expect(body).toEqual({
      type: "manifest_personalize",
      userData: { firstName: "Maria", bucket: "love", concern: "will he come back", personName: "Tom" },
      concern: "will he come back",
      copy: "magnet",
    });
  });
});
