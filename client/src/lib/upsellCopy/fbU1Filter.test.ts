// /fb Upsell 1 copy test (v1_fb_u1_copy_2026), arm B: "hook 6, the stone is a filter".
//
//   npx vitest run client/src/lib/upsellCopy/fbU1Filter.test.ts
//
// The approved script is parsed straight from the repo copy of it, and every bubble,
// question, button and AFTER branch must match it exactly, for all four topics and both
// RITUAL lines. Then the chain is walked stage by stage as useUpsellChat walks it, the
// placeholders are filled for every topic, and the typed-answer matching is checked,
// including both ordering traps from the script's NOTES FOR BUILD.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Bucket } from "@shared/types";
import { personalizeMessage, type QuickReply } from "../upsellMessages";
import { V1_CHAIN_1 } from "./v1";
import type { Upsell1Chain, Upsell1Copy } from "./types";
import { upsell1Intent, upsell1Question2, upsell1Question3 } from "./questions";
import {
  detectFilterQ1,
  detectFilterQ2,
  detectFilterQ3,
  fbU1FilterCopy,
  isFilterBucket,
  RITUAL_ALTAR_LINE,
  RITUAL_CANDLE_LINE,
} from "./fbU1Filter";

const SCRIPT = readFileSync(
  new URL("../../../../docs/superpowers/specs/2026-11-27-v1-fb-u1-copy-2026-hook-6-filter.md", import.meta.url),
  "utf8",
);

// ── The script, parsed ───────────────────────────────────────────────────────
interface Section {
  bubbles: string[];
  question?: string;
  replies: QuickReply[];
}
interface Topic {
  gap4: string[];
  feel4: string[];
  bucket: string[];
}

function parseScript(md: string) {
  const main: Record<string, Section> = {};
  const topics: Record<string, Topic> = {};
  let mode: "head" | "main" | "topics" | "notes" = "head";
  let cur: Section | null = null;
  let topic: Topic | null = null;
  let part: keyof Topic | null = null;
  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) {
      const name = line.slice(3).trim();
      if (name === "OTHER TOPICS") mode = "topics";
      else if (name === "NOTES FOR BUILD") mode = "notes";
      else {
        mode = "main";
        cur = main[name] = { bubbles: [], replies: [] };
      }
      continue;
    }
    if (mode === "main" && cur) {
      if (line.startsWith("- ")) cur.bubbles.push(line.slice(2));
      else if (line.startsWith("? ")) cur.question = line.slice(2);
      else if (line.startsWith("* ")) {
        const [value, text] = line.slice(2).split(" | ");
        cur.replies.push({ text, value });
      }
    } else if (mode === "topics") {
      if (line.startsWith("### ")) {
        topic = topics[line.slice(4).trim()] = { gap4: [], feel4: [], bucket: [] };
      } else if (line.startsWith("GAP bubble 4:")) part = "gap4";
      else if (line.startsWith("FEEL bubble 4:")) part = "feel4";
      else if (/^BUCKET \w+:/.test(line)) part = "bucket";
      else if (topic && part && line.startsWith("- ")) topic[part].push(line.slice(2));
    }
  }
  return { main, topics };
}

const { main: S, topics: T } = parseScript(SCRIPT);
const NOTES = SCRIPT.slice(SCRIPT.indexOf("## NOTES FOR BUILD"));
const TOPICS: Bucket[] = ["love", "money", "purpose", "someone"];
const bubbles = (name: string) => {
  const s = S[name];
  if (!s) throw new Error(`script has no section ${name}`);
  return s.bubbles;
};

// love is the main script; the other three swap GAP bubble 4, FEEL bubble 4 and BUCKET.
const expectedGap = (t: Bucket) => {
  const g = [...bubbles("GAP")];
  if (t !== "love") g[3] = T[t].gap4[0];
  return g;
};
const expectedFeel = (t: Bucket) => {
  const f = [...bubbles("FEEL")];
  if (t !== "love") f[3] = T[t].feel4[0];
  return f;
};
const expectedBucket = (t: Bucket) => (t === "love" ? bubbles("BUCKET love") : T[t].bucket);

describe("the script parses the way this test assumes", () => {
  it("has every section the build uses, and nothing it ignores", () => {
    expect(Object.keys(S).sort()).toEqual(
      [
        "CONFIRMATION", "GAP", "RISK", "Q1", "AFTER_Q1 yes", "AFTER_Q1 maybe", "AFTER_Q1 unsure",
        "SOLUTION", "LAVA_INTRO", "Q2", "AFTER_Q2 yes", "AFTER_Q2 understand", "AFTER_Q2 more",
        "RITUAL", "FEEL", "Q3", "AFTER_Q3 yes", "AFTER_Q3 maybe", "AFTER_Q3 what", "BUCKET love",
        "DELIVERY", "OFFER", "SOFT_DECLINE", "SUCCESS", "SHIPPING_CONFIRMED",
      ].sort(),
    );
    expect(Object.keys(T).sort()).toEqual(["money", "purpose", "someone"]);
    for (const t of ["money", "purpose", "someone"]) {
      expect(T[t].gap4).toHaveLength(1);
      expect(T[t].feel4).toHaveLength(1);
      expect(T[t].bucket).toHaveLength(4);
    }
  });
});

// ── Transcription: every line, word for word ────────────────────────────────
describe("arm B transcribes the approved script exactly", () => {
  for (const t of TOPICS) {
    describe(t, () => {
      const c = fbU1FilterCopy({ bucket: t, candle: true });
      it("shared blocks", () => {
        expect(c.CONFIRMATION).toEqual(bubbles("CONFIRMATION"));
        expect(c.RISK).toEqual(bubbles("RISK"));
        expect(c.SOLUTION).toEqual(bubbles("SOLUTION"));
        expect(c.LAVA_INTRO).toEqual(bubbles("LAVA_INTRO"));
        expect(c.RITUAL).toEqual(bubbles("RITUAL"));
        expect(c.DELIVERY).toEqual(bubbles("DELIVERY"));
        expect(c.OFFER).toEqual(bubbles("OFFER"));
        expect(c.SOFT_DECLINE).toEqual(bubbles("SOFT_DECLINE"));
        expect(c.SUCCESS).toEqual(bubbles("SUCCESS"));
        expect(c.SHIPPING_CONFIRMED).toEqual(bubbles("SHIPPING_CONFIRMED"));
      });
      it("the three topic spots: GAP bubble 4, FEEL bubble 4, BUCKET", () => {
        expect(c.GAP).toEqual(expectedGap(t));
        expect(c.FEEL).toEqual(expectedFeel(t));
        expect(c.bucketMessages(t, null)).toEqual(expectedBucket(t));
      });
      it("questions, buttons and AFTER branches", () => {
        expect(c.QUESTION_1).toBe(S.Q1.question);
        expect(c.QUESTION_1_REPLIES).toEqual(S.Q1.replies);
        expect(c.QUESTION_2).toBe(S.Q2.question);
        expect(c.QUESTION_2_REPLIES).toEqual(S.Q2.replies);
        expect(c.QUESTION_3).toBe(S.Q3.question);
        expect(c.QUESTION_3_REPLIES).toEqual(S.Q3.replies);
        for (const k of ["yes", "maybe", "unsure"]) expect(c.AFTER_Q1[k]).toEqual(bubbles(`AFTER_Q1 ${k}`));
        for (const k of ["yes", "understand", "more"]) expect(c.AFTER_Q2![k]).toEqual(bubbles(`AFTER_Q2 ${k}`));
        for (const k of ["yes", "maybe", "what"]) expect(c.AFTER_Q3![k]).toEqual(bubbles(`AFTER_Q3 ${k}`));
      });
      it("defaults go where the notes say: Q1 unsure, Q2 understand, Q3 what", () => {
        expect(c.AFTER_Q1.default).toEqual(c.AFTER_Q1.unsure);
        expect(c.AFTER_Q2!.default).toEqual(c.AFTER_Q2!.understand);
        expect(c.AFTER_Q3!.default).toEqual(c.AFTER_Q3!.what);
      });
    });
  }

  it("acceptLabel is the one in the notes", () => {
    expect(fbU1FilterCopy({ bucket: "love", candle: false }).acceptLabel).toBe("Yes, set my stone tonight");
    expect(NOTES).toContain('acceptLabel: "Yes, set my stone tonight"');
  });

  it("keeps the 30-day line, until it's full", () => {
    expect(fbU1FilterCopy({ bucket: "love", candle: false }).DELIVERY).toContain(
      "It works for at least 30 days, until it's full.",
    );
  });
});

// ── The candle line ───────────────────────────────────────────────────────────
describe("RITUAL bubble 2: the candle only for a buyer who saw it", () => {
  it("candle: the script's own line", () => {
    expect(bubbles("RITUAL")[1]).toBe(RITUAL_CANDLE_LINE);
    expect(fbU1FilterCopy({ bucket: "love", candle: true }).RITUAL[1]).toBe(RITUAL_CANDLE_LINE);
  });
  it("no candle: the fallback line from the notes, word for word", () => {
    const fallback = /swap it for: "([^"]+)"/.exec(NOTES)?.[1];
    expect(fallback).toBe(RITUAL_ALTAR_LINE);
    expect(fbU1FilterCopy({ bucket: "love", candle: false }).RITUAL[1]).toBe(RITUAL_ALTAR_LINE);
  });
  it("is the only line that changes, for every topic", () => {
    for (const t of TOPICS) {
      const withCandle = fbU1FilterCopy({ bucket: t, candle: true });
      const without = fbU1FilterCopy({ bucket: t, candle: false });
      const all = (c: Upsell1Copy) => allStrings(c, t);
      const diff = all(withCandle).filter((s, i) => s !== all(without)[i]);
      expect(diff).toEqual([RITUAL_CANDLE_LINE]);
      expect(all(without).join(" ")).not.toMatch(/candle/i);
    }
  });
});

// ── Stage order: the same chain as today, walked as the hook walks it ──────────
describe("chain", () => {
  const c = fbU1FilterCopy({ bucket: "love", candle: false });
  it("is V1_CHAIN_1 itself, no pauses, today's stone photo", () => {
    expect(c.chain).toBe(V1_CHAIN_1);
    expect(c.pauses).toEqual({});
    expect(c.stoneImage).toBeUndefined(); // ⇒ the lava stone, after the last LAVA_INTRO bubble
    expect(c.DOWNSELL).toBeUndefined(); // ⇒ a decline goes straight to SOFT_DECLINE
    expect(c.ctaReassurance).toBeUndefined();
    expect(c.priceNoteItem).toBeUndefined();
    expect(c.placeholderNames).toEqual([]);
  });
  it("CONFIRMATION → GAP → RISK → Q1 → … → OFFER, every question asked", () => {
    const visited: string[] = [];
    let stage = "CONFIRMATION";
    const after: Record<string, string> = { QUESTION_1: "AFTER_Q1", QUESTION_2: "AFTER_Q2", QUESTION_3: "AFTER_Q3" };
    for (let guard = 0; guard < 30 && stage !== "OFFER"; guard++) {
      visited.push(stage);
      stage = after[stage] ?? c.chain[stage as keyof Upsell1Chain];
    }
    visited.push(stage);
    expect(visited).toEqual([
      "CONFIRMATION", "GAP", "RISK", "QUESTION_1", "AFTER_Q1", "SOLUTION", "LAVA_INTRO",
      "QUESTION_2", "AFTER_Q2", "RITUAL", "FEEL", "QUESTION_3", "AFTER_Q3", "BUCKET",
      "DELIVERY", "OFFER",
    ]);
  });
  it("the hook reads arm B's own Q2, Q3 and matching", () => {
    expect(upsell1Question2(c)).toEqual({ question: c.QUESTION_2, replies: c.QUESTION_2_REPLIES, after: c.AFTER_Q2 });
    expect(upsell1Question3(c)).toEqual({ question: c.QUESTION_3, replies: c.QUESTION_3_REPLIES, after: c.AFTER_Q3 });
    expect(upsell1Intent(c, 1)).toBe(detectFilterQ1);
    expect(upsell1Intent(c, 2)).toBe(detectFilterQ2);
    expect(upsell1Intent(c, 3)).toBe(detectFilterQ3);
  });
});

// ── Placeholders ──────────────────────────────────────────────────────────────
// Every string a buyer can see, in the order she sees it.
function allStrings(c: Upsell1Copy, t: Bucket): string[] {
  return [
    ...c.CONFIRMATION, ...c.GAP, ...c.RISK, c.QUESTION_1, ...c.QUESTION_1_REPLIES.map((r) => r.text),
    ...Object.values(c.AFTER_Q1).flat(), ...c.SOLUTION, ...c.LAVA_INTRO,
    c.QUESTION_2!, ...c.QUESTION_2_REPLIES!.map((r) => r.text), ...Object.values(c.AFTER_Q2!).flat(),
    ...c.RITUAL, ...c.FEEL,
    c.QUESTION_3!, ...c.QUESTION_3_REPLIES!.map((r) => r.text), ...Object.values(c.AFTER_Q3!).flat(),
    ...c.bucketMessages(t, null), ...c.DELIVERY, ...c.OFFER, c.acceptLabel,
    ...c.SOFT_DECLINE, ...c.SUCCESS, ...c.SHIPPING_CONFIRMED,
  ];
}
const fill = (s: string, personName?: string) => personalizeMessage(s, "Maria", personName, "$47");

describe("placeholders fill for all four topics", () => {
  for (const t of TOPICS) {
    for (const person of ["Tom", undefined]) {
      it(`${t}, personName ${person ?? "missing"}: nothing left unfilled`, () => {
        for (const c of [true, false].map((candle) => fbU1FilterCopy({ bucket: t, candle }))) {
          for (const s of allStrings(c, t).map((x) => fill(x, person))) {
            expect(s).not.toMatch(/[{}]/);
            expect(s).not.toMatch(/undefined|null/);
          }
        }
      });
    }
  }
  it("the price and her name land where the script puts them", () => {
    const c = fbU1FilterCopy({ bucket: "love", candle: false });
    expect(fill(c.OFFER[0])).toBe("The Protection Ritual is $47, Maria.");
    expect(personalizeMessage(c.CONFIRMATION[0], "", undefined, "$47")).toBe(
      "Your Energy Clearing is confirmed, dear. I start tonight.",
    );
  });
  it('someone with no name on file reads "them", with no possessives', () => {
    const c = fbU1FilterCopy({ bucket: "someone", candle: false });
    expect(fill(c.GAP[3])).toBe(
      "Other people's opinions about you and them. Someone's jealousy. Every bad mood that comes from them.",
    );
    expect(fill(c.FEEL[3])).toBe(
      "And when a bad day comes from them, your friends will notice it doesn't become yours.",
    );
    expect(fill(c.bucketMessages("someone", null)[1])).toBe(
      "Whatever comes from them reaches that hand first. The texts, the moods, the long quiet spells.",
    );
    expect(fill(c.GAP[3], "Tom")).toBe(
      "Other people's opinions about you and Tom. Someone's jealousy. Every bad mood that comes from Tom.",
    );
  });
  it("only someone carries {personName}", () => {
    for (const t of ["love", "money", "purpose"] as Bucket[]) {
      expect(allStrings(fbU1FilterCopy({ bucket: t, candle: true }), t).join(" ")).not.toContain("{personName}");
    }
  });
});

// ── Typed answers ─────────────────────────────────────────────────────────────
describe("typed answers (NOTES FOR BUILD matching, in its order)", () => {
  const c = fbU1FilterCopy({ bucket: "love", candle: false });
  it("every button tap lands on its own branch", () => {
    for (const r of c.QUESTION_1_REPLIES) expect(detectFilterQ1(r.text)).toBe(r.value);
    for (const r of c.QUESTION_2_REPLIES!) expect(detectFilterQ2(r.text)).toBe(r.value);
    for (const r of c.QUESTION_3_REPLIES!) expect(detectFilterQ3(r.text)).toBe(r.value);
  });
  it('Q1 checks maybe before yes: "not always" contains "always"', () => {
    expect(detectFilterQ1("not always")).toBe("maybe");
    expect(detectFilterQ1("Not always, but yes")).toBe("maybe");
    // "not me" contains "me": a no must never get "I thought so."
    expect(detectFilterQ1("not me")).toBe("unsure");
    expect(detectFilterQ1("No, not really")).toBe("unsure");
    expect(detectFilterQ1("never")).toBe("unsure");
    expect(detectFilterQ1("yes, no one else does")).toBe("yes");
    expect(detectFilterQ1("always")).toBe("yes");
  });
  it('Q3 checks yes before what: "only what\'s mine" contains "what"', () => {
    expect(detectFilterQ3("only what's mine")).toBe("yes");
    expect(detectFilterQ3("Only whats mine please")).toBe("yes");
    expect(detectFilterQ3("what")).toBe("what");
  });
  it("a phone's curly apostrophe does not break either trap", () => {
    expect(detectFilterQ3("Only what’s mine")).toBe("yes");
    expect(detectFilterQ1("I don’t know")).toBe("unsure");
  });
  it("Q1 patterns", () => {
    for (const s of ["sometimes", "a bit", "a little", "it depends", "Not always"]) expect(detectFilterQ1(s)).toBe("maybe");
    for (const s of ["yes", "Always", "every time", "that's me", "I am"]) expect(detectFilterQ1(s)).toBe("yes");
    for (const s of ["not sure", "don't know", "no idea", "unsure"]) expect(detectFilterQ1(s)).toBe("unsure");
  });
  it("Q2 patterns", () => {
    for (const s of ["yes", "only the good", "I want that", "want it", "please"]) expect(detectFilterQ2(s)).toBe("yes");
    for (const s of ["makes sense", "I understand", "i see", "I get it"]) expect(detectFilterQ2(s)).toBe("understand");
    for (const s of ["how?", "the filter", "pond?", "explain", "tell me more", "why"]) expect(detectFilterQ2(s)).toBe("more");
  });
  it("Q3 patterns", () => {
    for (const s of ["yes", "please", "set it", "do it", "I'm ready"]) expect(detectFilterQ3(s)).toBe("yes");
    for (const s of ["I think so", "maybe", "probably", "i guess"]) expect(detectFilterQ3(s)).toBe("maybe");
    for (const s of ["what do I get", "get?", "what's included", "how much does it cost", "price"]) expect(detectFilterQ3(s)).toBe("what");
  });
  it("anything else goes to the default branch the notes give", () => {
    for (const s of ["hmm", "", "no", "ok"]) {
      expect(detectFilterQ1(s)).toBe("unsure");
      expect(detectFilterQ2(s)).toBe("understand");
      expect(detectFilterQ3(s)).toBe("what");
    }
  });
  it("every answer the matching can give has a branch to play", () => {
    for (const s of ["yes", "sometimes", "hmm", "how", "makes sense", "what", "think so"]) {
      expect(c.AFTER_Q1[detectFilterQ1(s)]).toBeDefined();
      expect(c.AFTER_Q2![detectFilterQ2(s)]).toBeDefined();
      expect(c.AFTER_Q3![detectFilterQ3(s)]).toBeDefined();
    }
  });
});

// ── Copy rules ────────────────────────────────────────────────────────────────
describe("copy rules", () => {
  it("no em or en dash anywhere in arm B", () => {
    for (const t of TOPICS) {
      for (const candle of [true, false]) {
        for (const s of allStrings(fbU1FilterCopy({ bucket: t, candle }), t)) expect(s).not.toMatch(/[–—]/);
      }
    }
  });
  it("only the four topics build arm B", () => {
    for (const t of TOPICS) expect(isFilterBucket(t)).toBe(true);
    for (const t of [null, undefined, "", "career", "LOVE", 3]) expect(isFilterBucket(t)).toBe(false);
  });
});
