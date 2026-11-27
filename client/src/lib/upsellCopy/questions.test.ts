// Arm A of the /fb Upsell 1 copy test (v1_fb_u1_copy_2026) is today's V1_UPSELL1, byte for
// byte, and the hook's new copy-first lookup for Q2, Q3 and the typed-answer matching hands
// V1 and every backend offer the very same shared objects it imported before.
//
//   npx vitest run client/src/lib/upsellCopy/questions.test.ts

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Bucket } from "@shared/types";
import {
  UPSELL_QUESTION_2,
  UPSELL_QUESTION_2_REPLIES,
  UPSELL_AFTER_Q2,
  UPSELL_QUESTION_3,
  UPSELL_QUESTION_3_REPLIES,
  UPSELL_AFTER_Q3,
  detectQ1Intent,
  detectQ2Intent,
  detectQ3Intent,
} from "../upsellMessages";
import { BACKEND_UPSELL_PITCH, upsell1Copy } from "../backendOffers";
import { TWIN_FLAME_UPSELL1 } from "./twinFlame";
import { V1_UPSELL1 } from "./v1";
import type { Upsell1Copy } from "./types";
import { upsell1Intent, upsell1Question2, upsell1Question3 } from "./questions";

const NEW_FIELDS = [
  "QUESTION_2",
  "QUESTION_2_REPLIES",
  "AFTER_Q2",
  "QUESTION_3",
  "QUESTION_3_REPLIES",
  "AFTER_Q3",
  "detectIntent",
] as const;

// Everything V1_UPSELL1 renders, including what the hook pulls from upsellMessages.ts for
// Q2 and Q3 and what bucketMessages() returns per topic.
function fingerprint(c: Upsell1Copy): string {
  const { bucketMessages, ...rest } = c;
  const topics: Array<Bucket | undefined> = ["love", "money", "purpose", "someone", undefined];
  return createHash("sha256")
    .update(
      JSON.stringify({
        rest,
        buckets: topics.map((t) => bucketMessages(t, null)),
        q2: upsell1Question2(c),
        q3: upsell1Question3(c),
      }),
    )
    .digest("hex");
}

describe("arm A is today's V1_UPSELL1", () => {
  it("/fb/welcome1 with no override resolves V1_UPSELL1 itself", () => {
    expect(upsell1Copy("/fb/welcome1")).toBe(V1_UPSELL1);
  });

  // 🔴 Pinned from the copy on origin/Production 3c0deb8, before this test was built. If it
  // fails, something every live funnel reads has changed (see the warning in v1.ts).
  it("renders exactly what it rendered before this test was built", () => {
    expect(V1_UPSELL1.acceptLabel).toBe("Yes, protect what we clear");
    expect(fingerprint(V1_UPSELL1)).toBe("291436e13bafa0f98069a720656a09c7cceb75f7c644a1c0f725f0fe6c1ef09e");
  });

  it("sets none of the new optional fields", () => {
    for (const f of NEW_FIELDS) expect(f in V1_UPSELL1).toBe(false);
  });
});

describe("the hook's Q2 / Q3 / matching lookup falls back to the shared constants", () => {
  const everyOldOffer: Array<[string, Upsell1Copy]> = [
    ["v1", V1_UPSELL1],
    ["twin-flame prefix", TWIN_FLAME_UPSELL1],
    ...Object.entries(BACKEND_UPSELL_PITCH).map(([k, v]) => [k, v!.upsell1] as [string, Upsell1Copy]),
  ];
  for (const [name, copy] of everyOldOffer) {
    it(`${name}: same objects as before`, () => {
      for (const f of NEW_FIELDS) expect(f in copy).toBe(false);
      const q2 = upsell1Question2(copy);
      expect(q2.question).toBe(UPSELL_QUESTION_2);
      expect(q2.replies).toBe(UPSELL_QUESTION_2_REPLIES);
      expect(q2.after).toBe(UPSELL_AFTER_Q2);
      const q3 = upsell1Question3(copy);
      expect(q3.question).toBe(UPSELL_QUESTION_3);
      expect(q3.replies).toBe(UPSELL_QUESTION_3_REPLIES);
      expect(q3.after).toBe(UPSELL_AFTER_Q3);
      expect(upsell1Intent(copy, 1)).toBe(detectQ1Intent);
      expect(upsell1Intent(copy, 2)).toBe(detectQ2Intent);
      expect(upsell1Intent(copy, 3)).toBe(detectQ3Intent);
    });
  }
});
