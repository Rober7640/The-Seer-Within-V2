// /fb Upsell 2 copy test (v1_fb_u2_copy_2026), arm B: "hook M, the magnet".
//
//   npx vitest run client/src/lib/upsellCopy/fbU2Magnet.test.ts
//
// The approved script is parsed straight from the repo copy of it, and every bubble,
// question, button, AFTER branch, fallback and topic swap must match it exactly, for all
// four topics and both RITUAL_INSTRUCTION lines. Then the chain is walked stage by stage as
// useUpsell2Chat walks it, the placeholders are filled for every topic, the five proof lines
// and the guarantee are checked against today's, and the typed-answer matching is checked,
// including the order traps from the script's NOTES FOR BUILD.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Bucket } from "@shared/types";
import {
  personalizeMessage,
  UPSELL2_DOWNSELL,
  UPSELL2_PRICE,
  UPSELL2_SOCIAL_PROOF,
  UPSELL2_WHAT_RECEIVE,
  type QuickReply,
} from "../upsell2Messages";
import { V1_CHAIN_2, V1_UPSELL2 } from "./v1";
import type { Upsell2Chain, Upsell2Copy } from "./types";
import { upsell2Intent, upsell2Question1, upsell2Question2, upsell2Question3 } from "./questions";
import {
  detectMagnetQ1,
  detectMagnetQ2,
  detectMagnetQ3,
  fbU2MagnetCopy,
  FULL_PRICE_SUCCESS_EXTRA,
  isMagnetBucket,
  REVEAL_FALLBACK,
  RITUAL_ALTAR_LINE,
  RITUAL_CANDLE_LINE,
} from "./fbU2Magnet";

const SCRIPT = readFileSync(
  new URL("../../../../docs/superpowers/specs/2026-11-27-v1-fb-u2-copy-2026-hook-M-magnet.md", import.meta.url),
  "utf8",
);

// ── The script, parsed ───────────────────────────────────────────────────────
interface Section {
  bubbles: string[];
  question?: string;
  replies: QuickReply[];
  ai?: string;
  fallback?: string;
}

function parseScript(md: string) {
  const main: Record<string, Section> = {};
  // topic → label ("GAP bubbles 1 and 2", "Q2 (button 2 becomes \"Money and more\")", …) → lines
  const topics: Record<string, Record<string, string[]>> = {};
  let mode: "head" | "main" | "topics" | "notes" = "head";
  let cur: Section | null = null;
  let topic: Record<string, string[]> | null = null;
  let label: string | null = null;
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
      if (line.startsWith("- [AI:")) cur.ai = line.slice(2);
      else if (line.startsWith("  - fallback: ")) cur.fallback = line.slice("  - fallback: ".length);
      else if (line.startsWith("- ")) cur.bubbles.push(line.slice(2));
      else if (line.startsWith("? ")) cur.question = line.slice(2);
      else if (line.startsWith("* ")) {
        const [value, text] = line.slice(2).split(" | ");
        cur.replies.push({ text, value });
      }
    } else if (mode === "topics") {
      if (line.startsWith("### ")) {
        topic = topics[line.slice(4).trim()] = {};
        label = null;
      } else if (topic && /^\S.*:$/.test(line)) {
        label = line.slice(0, -1);
        topic[label] = [];
      } else if (topic && label && line.startsWith("- ")) topic[label].push(line.slice(2));
    }
  }
  return { main, topics };
}

const { main: S, topics: T } = parseScript(SCRIPT);
const NOTES = SCRIPT.slice(SCRIPT.indexOf("## NOTES FOR BUILD"));
const TOPICS: Bucket[] = ["love", "money", "purpose", "someone"];
const sec = (name: string) => {
  const s = S[name];
  if (!s) throw new Error(`script has no section ${name}`);
  return s;
};
const bubbles = (name: string) => sec(name).bubbles;

// love is the main script. money and purpose swap what OTHER TOPICS lists; someone keeps the
// love lines and changes only Q2. Built here from the parsed script alone, never from the
// copy file, so a drift on either side fails.
interface Expected {
  PATH_A_OPEN: string[];
  GAP: string[];
  QUESTION_1: string;
  INTRODUCE: string[];
  QUESTION_2: string;
  QUESTION_2_REPLIES: QuickReply[];
  personalizeFallback: string;
  RITUAL_PATH_A_EXTRA: string;
  WHAT_RECEIVE: string[];
  URGENCY: string[];
}
function expectedFor(t: Bucket): Expected {
  const e: Expected = {
    PATH_A_OPEN: [...bubbles("PATH_A_OPEN")],
    GAP: [...bubbles("GAP")],
    QUESTION_1: sec("Q1").question!,
    INTRODUCE: [...bubbles("INTRODUCE")],
    QUESTION_2: sec("Q2").question!,
    QUESTION_2_REPLIES: sec("Q2").replies.map((r) => ({ ...r })),
    personalizeFallback: sec("MANIFEST_PERSONALIZE").fallback!,
    RITUAL_PATH_A_EXTRA: bubbles("RITUAL_PATH_A_EXTRA")[0],
    WHAT_RECEIVE: [...bubbles("WHAT_RECEIVE")],
    URGENCY: [...bubbles("URGENCY")],
  };
  if (t === "love") return e;
  for (const [label, lines] of Object.entries(T[t])) {
    const bubbleSwap = /^(PATH_A_OPEN|GAP|INTRODUCE|WHAT_RECEIVE|URGENCY) bubbles? ([\d, and]+)$/.exec(label);
    if (bubbleSwap) {
      const field = bubbleSwap[1] as "PATH_A_OPEN" | "GAP" | "INTRODUCE" | "WHAT_RECEIVE" | "URGENCY";
      const idx = bubbleSwap[2].match(/\d+/g)!.map((n) => Number(n) - 1);
      expect(idx).toHaveLength(lines.length);
      idx.forEach((i, k) => (e[field][i] = lines[k]));
    } else if (label.startsWith("Q1 ")) e.QUESTION_1 = lines[0];
    else if (label.startsWith("Q2 ")) {
      e.QUESTION_2 = lines[0];
      e.QUESTION_2_REPLIES[1].text = /button 2 becomes "([^"]+)"/.exec(label)![1];
    } else if (label === "PERSONALIZE fallback") e.personalizeFallback = lines[0];
    else if (label === "RITUAL_PATH_A_EXTRA") e.RITUAL_PATH_A_EXTRA = lines[0];
    else throw new Error(`unhandled OTHER TOPICS label for ${t}: ${label}`);
  }
  return e;
}

describe("the script parses the way this test assumes", () => {
  it("has every section the build uses", () => {
    expect(Object.keys(S).sort()).toEqual(
      [
        "PATH_A_OPEN", "PATH_B_OPEN", "MANIFEST_REVEAL", "GAP", "Q1",
        "AFTER_Q1 yes", "AFTER_Q1 maybe", "AFTER_Q1 unsure", "AFTER_Q1 default",
        "INTRODUCE", "STONES", "Q2",
        "AFTER_Q2 yes", "AFTER_Q2 more", "AFTER_Q2 unsure", "AFTER_Q2 default",
        "MANIFEST_PERSONALIZE", "RITUAL_INSTRUCTION", "RITUAL_PATH_A_EXTRA", "WHAT_RECEIVE", "Q3",
        "AFTER_Q3 yes", "AFTER_Q3 maybe", "AFTER_Q3 what", "AFTER_Q3 default",
        "SOCIAL_PROOF", "PRICE", "URGENCY", "DOWNSELL",
        "SUCCESS", "SUCCESS_HAS_SHIPPING", "SUCCESS_NEEDS_SHIPPING", "SHIPPING_CONFIRMED", "SOFT_DECLINE",
      ].sort(),
    );
    expect(Object.keys(T).sort()).toEqual(["money", "purpose", "someone"]);
  });
  it("OTHER TOPICS swaps exactly these lines", () => {
    const shared = [
      "PATH_A_OPEN bubble 5", "Q1 (buttons stay)", "INTRODUCE bubble 2", "PERSONALIZE fallback",
      "RITUAL_PATH_A_EXTRA", "WHAT_RECEIVE bubble 4", "URGENCY bubble 3",
    ];
    expect(Object.keys(T.money).sort()).toEqual(
      [...shared, "GAP bubbles 1 and 2", 'Q2 (button 2 becomes "Money and more")'].sort(),
    );
    expect(Object.keys(T.purpose).sort()).toEqual(
      [...shared, "GAP bubbles 1, 2 and 4", 'Q2 (button 2 becomes "That and more")'].sort(),
    );
    expect(Object.keys(T.someone)).toEqual(['Q2 (button 2 becomes "That and more")']);
  });
  it("both AI lines carry a fallback", () => {
    expect(sec("MANIFEST_REVEAL").ai).toMatch(/^\[AI: /);
    expect(sec("MANIFEST_PERSONALIZE").ai).toMatch(/^\[AI: /);
    expect(sec("MANIFEST_REVEAL").bubbles).toEqual([]);
    expect(sec("MANIFEST_PERSONALIZE").bubbles).toEqual([]);
  });
});

// ── Transcription: every line, word for word ────────────────────────────────
describe("arm B transcribes the approved script exactly", () => {
  for (const t of TOPICS) {
    describe(t, () => {
      for (const candle of [true, false]) {
        const c = fbU2MagnetCopy({ bucket: t, candle });
        const e = expectedFor(t);
        it(`candle ${candle}: every shared stage`, () => {
          expect(c.PATH_B_OPEN).toEqual(bubbles("PATH_B_OPEN"));
          expect(c.STONES).toEqual(bubbles("STONES"));
          expect(c.SOCIAL_PROOF).toEqual(bubbles("SOCIAL_PROOF"));
          expect(c.PRICE).toEqual(bubbles("PRICE"));
          expect(c.DOWNSELL).toEqual(bubbles("DOWNSELL"));
          expect(c.SUCCESS).toEqual(bubbles("SUCCESS"));
          expect(c.SUCCESS_HAS_SHIPPING).toEqual(bubbles("SUCCESS_HAS_SHIPPING"));
          expect(c.SUCCESS_NEEDS_SHIPPING).toEqual(bubbles("SUCCESS_NEEDS_SHIPPING"));
          expect(c.SHIPPING_CONFIRMED).toEqual(bubbles("SHIPPING_CONFIRMED"));
          expect(c.SOFT_DECLINE).toEqual(bubbles("SOFT_DECLINE"));
          expect(c.revealFallback).toBe(sec("MANIFEST_REVEAL").fallback);
          const ritual = [...bubbles("RITUAL_INSTRUCTION")];
          if (!candle) ritual[1] = RITUAL_ALTAR_LINE;
          expect(c.RITUAL_INSTRUCTION).toEqual(ritual);
        });
        it(`candle ${candle}: the topic's own lines`, () => {
          expect(c.PATH_A_OPEN).toEqual(e.PATH_A_OPEN);
          expect(c.GAP).toEqual(e.GAP);
          expect(c.INTRODUCE).toEqual(e.INTRODUCE);
          expect(c.RITUAL_PATH_A_EXTRA).toBe(e.RITUAL_PATH_A_EXTRA);
          expect(c.WHAT_RECEIVE).toEqual(e.WHAT_RECEIVE);
          expect(c.URGENCY).toEqual(e.URGENCY);
          expect(c.personalizeFallback).toBe(e.personalizeFallback);
        });
        it(`candle ${candle}: questions, buttons and every AFTER branch`, () => {
          expect(c.QUESTION_1).toBe(e.QUESTION_1);
          expect(c.QUESTION_1_REPLIES).toEqual(sec("Q1").replies);
          expect(c.QUESTION_2).toBe(e.QUESTION_2);
          expect(c.QUESTION_2_REPLIES).toEqual(e.QUESTION_2_REPLIES);
          expect(c.QUESTION_3).toBe(sec("Q3").question);
          expect(c.QUESTION_3_REPLIES).toEqual(sec("Q3").replies);
          for (const k of ["yes", "maybe", "unsure", "default"]) expect(c.AFTER_Q1![k]).toEqual(bubbles(`AFTER_Q1 ${k}`));
          for (const k of ["yes", "more", "unsure", "default"]) expect(c.AFTER_Q2![k]).toEqual(bubbles(`AFTER_Q2 ${k}`));
          for (const k of ["yes", "maybe", "what", "default"]) expect(c.AFTER_Q3![k]).toEqual(bubbles(`AFTER_Q3 ${k}`));
          expect(Object.keys(c.AFTER_Q1!).sort()).toEqual(["default", "maybe", "unsure", "yes"]);
          expect(Object.keys(c.AFTER_Q2!).sort()).toEqual(["default", "more", "unsure", "yes"]);
          expect(Object.keys(c.AFTER_Q3!).sort()).toEqual(["default", "maybe", "what", "yes"]);
        });
      }
    });
  }

  it("someone keeps every love line except Q2", () => {
    const love = fbU2MagnetCopy({ bucket: "love", candle: false });
    const someone = fbU2MagnetCopy({ bucket: "someone", candle: false });
    const { QUESTION_2: q2a, QUESTION_2_REPLIES: r2a, detectIntent: _a, ...restLove } = love;
    const { QUESTION_2: q2b, QUESTION_2_REPLIES: r2b, detectIntent: _b, ...restSomeone } = someone;
    expect(restSomeone).toEqual(restLove);
    expect(q2b).not.toBe(q2a);
    expect(r2b.map((r) => r.text)).toEqual(["Yes, it is", "That and more", "I'm not sure"]);
    expect(r2a.map((r) => r.text)).toEqual(["Yes, it is", "Love and more", "I'm not sure"]);
  });

  it("the labels and fields the notes set", () => {
    const c = fbU2MagnetCopy({ bucket: "love", candle: false });
    expect(NOTES).toContain('acceptLabel: "Yes, set my bracelet tonight"');
    expect(c.acceptLabel).toBe("Yes, set my bracelet tonight");
    expect(NOTES).toContain('The downsell decline label stays "No thanks, just the clearing"');
    expect(c.downsellDeclineLabel).toBe("No thanks, just the clearing");
    expect(c.downsellDeclineLabel).toBe(V1_UPSELL2.downsellDeclineLabel);
    expect(c.downsellReassurance).toBeUndefined();
    expect(c.aiPrompts).toBe("magnet");
    // The AI beats are written by the server (magnet prompts), never fixed copy.
    expect(c.REVEAL).toBeNull();
    expect(c.PERSONALIZE).toBeNull();
    expect(REVEAL_FALLBACK).toBe("I saw past the block, {firstName}... and what you asked for is close.");
  });

  it("the extra $47 SUCCESS bubble is the notes' own line", () => {
    expect(/one extra SUCCESS bubble after bubble 1: "([^"]+)"/.exec(NOTES)?.[1]).toBe(FULL_PRICE_SUCCESS_EXTRA);
    expect(fbU2MagnetCopy({ bucket: "money", candle: true }).fullPriceSuccessExtra).toBe(FULL_PRICE_SUCCESS_EXTRA);
  });

  it("the bracelet photo follows INTRODUCE bubble 5, the line the notes name", () => {
    const quoted = /Bracelet photo shows after INTRODUCE bubble 5 \("([^"]+)"\)/.exec(NOTES)?.[1];
    for (const t of TOPICS) {
      const intro = fbU2MagnetCopy({ bucket: t, candle: false }).INTRODUCE;
      expect(intro).toHaveLength(5);
      expect(intro[4]).toBe(quoted); // the hook sends the photo after the last INTRODUCE bubble
    }
  });
});

// ── The candle line ───────────────────────────────────────────────────────────
describe("RITUAL_INSTRUCTION bubble 2: the candle only for a buyer who saw it", () => {
  it("candle: the script's own line", () => {
    expect(bubbles("RITUAL_INSTRUCTION")[1]).toBe(RITUAL_CANDLE_LINE);
    expect(fbU2MagnetCopy({ bucket: "love", candle: true }).RITUAL_INSTRUCTION[1]).toBe(RITUAL_CANDLE_LINE);
  });
  it("no candle: the altar line from the notes, word for word", () => {
    expect(/swap in: "([^"]+)"/.exec(NOTES)?.[1]).toBe(RITUAL_ALTAR_LINE);
    expect(fbU2MagnetCopy({ bucket: "love", candle: false }).RITUAL_INSTRUCTION[1]).toBe(RITUAL_ALTAR_LINE);
  });
  it("is the only line that changes, for every topic, and the candle appears once", () => {
    for (const t of TOPICS) {
      const withCandle = allStrings(fbU2MagnetCopy({ bucket: t, candle: true }));
      const without = allStrings(fbU2MagnetCopy({ bucket: t, candle: false }));
      expect(withCandle.filter((s, i) => s !== without[i])).toEqual([RITUAL_CANDLE_LINE]);
      expect(without.join(" ")).not.toMatch(/candle/i);
      expect(withCandle.filter((s) => /candle/i.test(s))).toHaveLength(1);
    }
  });
});

// ── Stage order: the same chain as today, walked as the hook walks it ──────────
describe("chain", () => {
  const c = fbU2MagnetCopy({ bucket: "love", candle: false });
  it("is V1_CHAIN_2 itself, no pauses", () => {
    expect(c.chain).toBe(V1_CHAIN_2);
    expect(c.pauses).toEqual({});
    expect(c.placeholderNames).toEqual([]);
  });
  for (const open of ["PATH_A_OPEN", "PATH_B_OPEN"] as const) {
    it(`${open} → … → URGENCY, every question asked`, () => {
      const visited: string[] = [];
      let stage: string = open;
      const after: Record<string, string> = { QUESTION_1: "AFTER_Q1", QUESTION_2: "AFTER_Q2", QUESTION_3: "AFTER_Q3" };
      for (let guard = 0; guard < 30 && stage !== "URGENCY"; guard++) {
        visited.push(stage);
        stage = after[stage] ?? c.chain[stage as keyof Upsell2Chain];
      }
      visited.push(stage);
      expect(visited).toEqual([
        open, "MANIFEST_REVEAL", "GAP", "QUESTION_1", "AFTER_Q1", "INTRODUCE", "STONES",
        "QUESTION_2", "AFTER_Q2", "MANIFEST_PERSONALIZE", "RITUAL_INSTRUCTION", "WHAT_RECEIVE",
        "QUESTION_3", "AFTER_Q3", "SOCIAL_PROOF", "PRICE", "URGENCY",
      ]);
    });
  }
  it("the hook reads arm B's own questions and matching", () => {
    expect(upsell2Question1(c)).toEqual({ question: c.QUESTION_1, replies: c.QUESTION_1_REPLIES, after: c.AFTER_Q1 });
    expect(upsell2Question2(c)).toEqual({ question: c.QUESTION_2, replies: c.QUESTION_2_REPLIES, after: c.AFTER_Q2 });
    expect(upsell2Question3(c)).toEqual({ question: c.QUESTION_3, replies: c.QUESTION_3_REPLIES, after: c.AFTER_Q3 });
    expect(upsell2Intent(c, 1)).toBe(detectMagnetQ1);
    expect(upsell2Intent(c, 2)).toBe(detectMagnetQ2);
    expect(upsell2Intent(c, 3)).toBe(detectMagnetQ3);
  });
});

// ── Every string a buyer can see, in the order she can see it ───────────────────
function allStrings(c: Upsell2Copy): string[] {
  return [
    ...c.PATH_A_OPEN, ...c.PATH_B_OPEN, c.revealFallback!, ...c.GAP,
    c.QUESTION_1!, ...c.QUESTION_1_REPLIES!.map((r) => r.text), ...Object.values(c.AFTER_Q1!).flat(),
    ...c.INTRODUCE, ...c.STONES,
    c.QUESTION_2!, ...c.QUESTION_2_REPLIES!.map((r) => r.text), ...Object.values(c.AFTER_Q2!).flat(),
    c.personalizeFallback!, ...c.RITUAL_INSTRUCTION, c.RITUAL_PATH_A_EXTRA, ...c.WHAT_RECEIVE,
    c.QUESTION_3!, ...c.QUESTION_3_REPLIES!.map((r) => r.text), ...Object.values(c.AFTER_Q3!).flat(),
    ...c.SOCIAL_PROOF, ...c.PRICE, ...c.URGENCY, c.acceptLabel!, ...c.DOWNSELL, c.downsellDeclineLabel,
    ...c.SUCCESS, ...c.SUCCESS_HAS_SHIPPING, ...c.SUCCESS_NEEDS_SHIPPING, c.fullPriceSuccessExtra!,
    ...c.SHIPPING_CONFIRMED, ...c.SOFT_DECLINE,
  ];
}

describe("copy rules", () => {
  for (const t of TOPICS) {
    for (const candle of [true, false]) {
      it(`${t}, candle ${candle}: no em or en dash, no ALL CAPS word`, () => {
        for (const s of allStrings(fbU2MagnetCopy({ bucket: t, candle }))) {
          expect(s).not.toMatch(/[–—]/);
          expect(s.replace(/\{\w+\}/g, "")).not.toMatch(/\b[A-Z]{2,}\b/);
        }
      });
    }
  }
  it('keeps the script\'s "..." exactly (never a single ellipsis character)', () => {
    const all = TOPICS.flatMap((t) => allStrings(fbU2MagnetCopy({ bucket: t, candle: true })));
    expect(all.join(" ")).not.toContain("…");
    expect(all.filter((s) => s.includes("...")).length).toBeGreaterThan(5);
  });
  it("only the four topics build arm B", () => {
    for (const t of TOPICS) expect(isMagnetBucket(t)).toBe(true);
    for (const t of [null, undefined, "", "career", "LOVE", 3]) expect(isMagnetBucket(t)).toBe(false);
  });
});

describe("today's proof lines and guarantee, carried over", () => {
  for (const t of TOPICS) {
    it(`${t}: the five proof lines match today's apart from the "..." swap`, () => {
      const c = fbU2MagnetCopy({ bucket: t, candle: false });
      // "Small things at first — a feeling…" today; the script writes "first... a feeling".
      expect(UPSELL2_WHAT_RECEIVE[2]).toContain(" — ");
      expect(c.WHAT_RECEIVE[2]).toBe(UPSELL2_WHAT_RECEIVE[2].replace(" — ", "... "));
      expect(c.SOCIAL_PROOF).toEqual(UPSELL2_SOCIAL_PROOF);
      expect(c.PRICE[2]).toBe(UPSELL2_PRICE[2]); // "I've never had anyone return one."
      expect(c.DOWNSELL[6]).toBe(UPSELL2_DOWNSELL[5]); // "…The stones alone cost me nearly that."
    });
    it(`${t}: the guarantee line matches today's`, () => {
      expect(fbU2MagnetCopy({ bucket: t, candle: true }).PRICE[1]).toBe(UPSELL2_PRICE[1]);
    });
  }
});

// ── Placeholders ──────────────────────────────────────────────────────────────
const fill = (s: string, personName?: string) => personalizeMessage(s, "Maria", personName);

describe("placeholders fill for all four topics", () => {
  for (const t of TOPICS) {
    for (const person of ["Tom", undefined]) {
      it(`${t}, personName ${person ?? "missing"}: nothing left unfilled`, () => {
        for (const candle of [true, false]) {
          for (const s of allStrings(fbU2MagnetCopy({ bucket: t, candle })).map((x) => fill(x, person))) {
            expect(s).not.toMatch(/[{}]/);
            expect(s).not.toMatch(/undefined|null/);
          }
        }
      });
    }
  }
  it('someone with no name on file reads "them", as the script says', () => {
    const c = fbU2MagnetCopy({ bucket: "someone", candle: false });
    expect(fill(c.QUESTION_2!)).toBe("Is love with them the thing you want most right now, Maria?");
    expect(fill(c.QUESTION_2!, "Tom")).toBe("Is love with Tom the thing you want most right now, Maria?");
    expect(personalizeMessage(c.QUESTION_2!, "", undefined)).toBe(
      "Is love with them the thing you want most right now, dear?",
    );
  });
  it("only someone carries {personName}, and only in Q2", () => {
    for (const t of ["love", "money", "purpose"] as Bucket[]) {
      expect(allStrings(fbU2MagnetCopy({ bucket: t, candle: true })).join(" ")).not.toContain("{personName}");
    }
    const someone = allStrings(fbU2MagnetCopy({ bucket: "someone", candle: true }));
    expect(someone.filter((s) => s.includes("{personName}"))).toEqual([
      "Is love with {personName} the thing you want most right now, {firstName}?",
    ]);
  });
});

// ── Typed answers ─────────────────────────────────────────────────────────────
describe("typed answers (NOTES FOR BUILD matching, in its order)", () => {
  it("every button tap lands on its own branch, for every topic", () => {
    for (const t of TOPICS) {
      const c = fbU2MagnetCopy({ bucket: t, candle: false });
      for (const r of c.QUESTION_1_REPLIES!) expect(detectMagnetQ1(r.text)).toBe(r.value);
      for (const r of c.QUESTION_2_REPLIES!) expect(detectMagnetQ2(r.text)).toBe(r.value);
      for (const r of c.QUESTION_3_REPLIES!) expect(detectMagnetQ3(r.text)).toBe(r.value);
    }
  });
  it('"Love and more" goes to more, not yes (more is checked before yes)', () => {
    for (const s of ["Love and more", "Money and more", "That and more", "love and more please"]) {
      expect(detectMagnetQ2(s)).toBe("more");
    }
    expect(detectMagnetQ2("love")).toBe("yes");
    expect(detectMagnetQ2("money")).toBe("yes");
  });
  it("a typed no, and anything unknown, goes to default", () => {
    for (const s of ["no", "No", "nope", "nah", "hmm", "", "ok", "never"]) {
      expect(detectMagnetQ1(s)).toBe("default");
      expect(detectMagnetQ2(s)).toBe("default");
      expect(detectMagnetQ3(s)).toBe("default");
    }
  });
  it("a no that contains a yes word never takes the yes branch", () => {
    expect(detectMagnetQ1("No, I wouldn't")).toBe("default"); // "i would"
    expect(detectMagnetQ1("I wouldn't love that")).toBe("default"); // "love that"
    expect(detectMagnetQ2("No it isn't")).toBe("default"); // "it is"
    expect(detectMagnetQ2("no, not love")).toBe("default"); // "love"
    expect(detectMagnetQ3("I'm not ready")).toBe("default"); // "ready"
    expect(detectMagnetQ3("not yet, please")).toBe("default"); // "please"
    // ...but it still reaches the branch it actually asks for.
    expect(detectMagnetQ3("No, what do I get?")).toBe("what");
    expect(detectMagnetQ1("No, I'm not sure")).toBe("unsure");
    expect(detectMagnetQ2("no, both")).toBe("more");
  });
  it("Q1 checks unsure, then maybe, then yes", () => {
    expect(detectMagnetQ1("yes but I'm not sure")).toBe("unsure");
    expect(detectMagnetQ1("maybe, yes")).toBe("maybe");
    for (const s of ["not sure", "don't know", "dont know", "no idea", "unsure"]) expect(detectMagnetQ1(s)).toBe("unsure");
    for (const s of ["I think so", "maybe", "probably", "i guess", "sort of", "kind of"]) expect(detectMagnetQ1(s)).toBe("maybe");
    for (const s of ["yes", "yeah", "love that", "I'd love it", "I would", "please", "of course", "definitely", "absolutely"]) {
      expect(detectMagnetQ1(s)).toBe("yes");
    }
  });
  it("Q2 checks unsure, then more, then yes", () => {
    expect(detectMagnetQ2("not sure, maybe both")).toBe("unsure");
    for (const s of ["and more", "more than that", "other things too", "everything", "all of it", "both", "that as well"]) {
      expect(detectMagnetQ2(s)).toBe("more");
    }
    for (const s of ["yes", "yeah", "it is", "definitely", "of course", "my path"]) expect(detectMagnetQ2(s)).toBe("yes");
  });
  it("Q3 checks yes, then maybe, then what (today's order, plus 'set it')", () => {
    for (const s of ["yes", "yeah", "set it", "please", "do it", "I'm ready", "let's"]) expect(detectMagnetQ3(s)).toBe("yes");
    for (const s of ["I think so", "maybe", "probably", "i guess"]) expect(detectMagnetQ3(s)).toBe("maybe");
    for (const s of ["what", "what do I get", "does it include a guide", "cost?", "price", "how much"]) {
      expect(detectMagnetQ3(s)).toBe("what");
    }
  });
  it("a phone's curly apostrophe does not break the matching", () => {
    expect(detectMagnetQ1("I don’t know")).toBe("unsure");
    expect(detectMagnetQ1("Yes, I’d love that")).toBe("yes");
    expect(detectMagnetQ2("I’m not sure")).toBe("unsure");
    expect(detectMagnetQ2("No it isn’t")).toBe("default");
    expect(detectMagnetQ3("Let’s do it")).toBe("yes");
  });
  it("every answer the matching can give has a branch to play", () => {
    const c = fbU2MagnetCopy({ bucket: "love", candle: false });
    for (const s of ["yes", "I think so", "not sure", "hmm", "Love and more", "what", "no"]) {
      expect(c.AFTER_Q1![detectMagnetQ1(s)]).toBeDefined();
      expect(c.AFTER_Q2![detectMagnetQ2(s)]).toBeDefined();
      expect(c.AFTER_Q3![detectMagnetQ3(s)]).toBeDefined();
    }
  });
});
