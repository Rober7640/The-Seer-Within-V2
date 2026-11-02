// Offer 12 — Lucky Numbers: U1 (Wish Ritual + citrine bracelet) and U2 (Manifestation Bracelet).
//
//   npx vitest run client/src/lib/upsellCopy/luckyNumbers.test.ts
//
// Spec: improve-v1/v1-one-time-BEs/docs/12/upsells/12-U1a + 12-U2a. The walks follow
// useUpsellChat and useUpsell2Chat stage by stage, and fail if any string a 12 buyer can see
// carries a banned word, a win or a sum, lava, a blank token, a stage nothing routes to, or a line
// V1 owned that changed. Path B is walked on its own, so the citrine bracelet can't leak into it.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Upsell1Chain, Upsell2Chain } from './types';
import { V1_UPSELL1, V1_UPSELL2 } from './v1';
import { LUCKY_NUMBERS_UPSELL1 as U1, LUCKY_NUMBERS_UPSELL2 as U2 } from './luckyNumbers';
import { BACKEND_UPSELL_PITCH } from '../backendOffers';
import { UPSELL_BUCKET_MESSAGES, detectQ1Intent } from '../upsellMessages';
import { UPSELL2_DOWNSELL } from '../upsell2Messages';

const file = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const flat = (s: string) =>
  s.replace(/^>\s?/gm, ' ').replace(/`/g, '').replace(/\*\*/g, '').replace(/\\"/g, '"').replace(/\s+/g, ' ');
const DOCS = '../../../../improve-v1/v1-one-time-BEs/docs/12/upsells';
const U1A = flat(file(`${DOCS}/12-U1a-opening-beats.md`));
const U2A = flat(file(`${DOCS}/12-U2a-opening-beats.md`));

const values = (r: Record<string, string[]>) => Object.values(r).flat();

function walkU1() {
  const strings: string[] = [];
  const visited: string[] = [];
  let stage = 'CONFIRMATION';
  for (let guard = 0; guard < 60; guard++) {
    visited.push(stage);
    switch (stage) {
      case 'CONFIRMATION':
      case 'GAP':
      case 'RISK':
      case 'SOLUTION':
      case 'LAVA_INTRO':
      case 'RITUAL':
      case 'FEEL':
      case 'DELIVERY':
        strings.push(...(U1[stage] as string[]));
        break;
      case 'QUESTION_1':
        strings.push(U1.QUESTION_1, ...U1.QUESTION_1_REPLIES.map((r) => r.text));
        stage = 'AFTER_Q1';
        continue;
      case 'AFTER_Q1':
        strings.push(...values(U1.AFTER_Q1));
        break;
      case 'BUCKET':
        strings.push(...U1.bucketMessages(undefined, null));
        break;
      case 'OFFER':
        strings.push(
          ...U1.OFFER,
          U1.acceptLabel,
          U1.ctaReassurance!,
          ...U1.DOWNSELL!,
          U1.downsellAcceptLabel!,
          U1.downsellDeclineLabel!,
          ...U1.SUCCESS,
          ...U1.SHIPPING_CONFIRMED,
          ...U1.SOFT_DECLINE,
          ...Object.values(U1.pauses),
        );
        return { strings, visited };
      default:
        throw new Error(`U1 reached a stage whose text can't be overridden: ${stage}`);
    }
    stage = U1.chain[stage as keyof Upsell1Chain];
  }
  throw new Error('U1 chain never reached OFFER');
}

function walkU2(opener: 'PATH_A_OPEN' | 'PATH_B_OPEN') {
  const pathA = opener === 'PATH_A_OPEN';
  const strings: string[] = [];
  const visited: string[] = [];
  let stage: string = opener;
  for (let guard = 0; guard < 60; guard++) {
    visited.push(stage);
    switch (stage) {
      case 'PATH_A_OPEN':
      case 'PATH_B_OPEN':
      case 'GAP':
      case 'INTRODUCE':
      case 'STONES':
      case 'WHAT_RECEIVE':
      case 'PRICE':
        strings.push(...(U2[stage] as string[]));
        break;
      case 'RITUAL_INSTRUCTION':
        // The hook adds the extra line on Path A only.
        strings.push(...U2.RITUAL_INSTRUCTION, ...(pathA ? [U2.RITUAL_PATH_A_EXTRA] : []));
        break;
      case 'URGENCY':
        strings.push(
          ...U2.URGENCY,
          ...U2.SUCCESS,
          // Only Path A has an address on 12 (the reading is digital).
          ...(pathA ? U2.SUCCESS_HAS_SHIPPING : []),
          ...U2.SUCCESS_NEEDS_SHIPPING,
          ...U2.SHIPPING_CONFIRMED,
          ...U2.DOWNSELL,
          U2.downsellDeclineLabel,
          ...U2.SOFT_DECLINE,
          ...Object.values(U2.pauses),
        );
        return { strings, visited };
      default:
        throw new Error(`U2 reached a stage it must not: ${stage}`);
    }
    stage = U2.chain[stage as keyof Upsell2Chain];
  }
  throw new Error('U2 chain never reached URGENCY');
}

const u1 = walkU1();
const a = walkU2('PATH_A_OPEN');
const b = walkU2('PATH_B_OPEN');
const every = [...new Set([...u1.strings, ...a.strings, ...b.strings])];

const V1_LINES = new Set<string>(
  [V1_UPSELL1, V1_UPSELL2].flatMap((copy) =>
    Object.values(copy).flatMap((v) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' ? [v] : [],
    ),
  ),
);
V1_LINES.add(UPSELL_BUCKET_MESSAGES.love[1]);

describe('registered', () => {
  it('both conversations hang off the offer', () => {
    expect(BACKEND_UPSELL_PITCH['lucky-numbers']).toEqual({ upsell1: U1, upsell2: U2 });
  });
});

describe('the route skips everything a copy object cannot reach', () => {
  it('U1 goes through Q1 only (as 11)', () => {
    expect(u1.visited).toEqual([
      'CONFIRMATION', 'GAP', 'RISK', 'QUESTION_1', 'AFTER_Q1', 'SOLUTION', 'LAVA_INTRO', 'RITUAL',
      'FEEL', 'BUCKET', 'DELIVERY', 'OFFER',
    ]);
  });

  it('U2 asks nothing, skips the AI stages and the social proof, on either path', () => {
    const route = ['GAP', 'INTRODUCE', 'STONES', 'RITUAL_INSTRUCTION', 'WHAT_RECEIVE', 'PRICE', 'URGENCY'];
    expect(a.visited).toEqual(['PATH_A_OPEN', ...route]);
    expect(b.visited).toEqual(['PATH_B_OPEN', ...route]);
  });

  it('the pauses are where the specs put them', () => {
    expect(U1.pauses).toEqual({ RITUAL: "I'm listening", BUCKET: 'Tell me' });
    expect(U2.pauses).toEqual({ GAP: 'Go on', STONES: "I'm listening" });
  });
});

describe('word for word', () => {
  it('every line that is not V1’s is in the spec', () => {
    const inSpec = `${U1A} ${U2A}`;
    const missing = every.filter((s) => !V1_LINES.has(s) && !inSpec.includes(flat(s)));
    expect(missing).toEqual([]);
  });

  it('V1 lines kept by reference are V1’s, unedited', () => {
    expect(U1.LAVA_INTRO[1]).toBe(V1_UPSELL1.LAVA_INTRO[1]);
    for (const i of [0, 2, 6, 7]) expect(U1.RITUAL[i]).toBe(V1_UPSELL1.RITUAL[i]);
    expect(U1.DELIVERY.slice(0, 2)).toEqual(V1_UPSELL1.DELIVERY.slice(0, 2));
    expect(U1.SUCCESS[0]).toBe(V1_UPSELL1.SUCCESS[0]);
    expect(U1.SUCCESS[4]).toBe(V1_UPSELL1.SUCCESS[4]);
    expect(U1.SHIPPING_CONFIRMED[2]).toBe(V1_UPSELL1.SHIPPING_CONFIRMED[2]);
    expect(U1.DOWNSELL![0]).toBe(UPSELL2_DOWNSELL[0]);
    expect(U1.bucketMessages(undefined, null)[1]).toBe(UPSELL_BUCKET_MESSAGES.love[1]);
    expect(U2.INTRODUCE[0]).toBe(V1_UPSELL2.INTRODUCE[0]);
    expect(U2.RITUAL_INSTRUCTION[0]).toBe(V1_UPSELL2.RITUAL_INSTRUCTION[0]);
    expect(U2.DOWNSELL[5]).toBe(V1_UPSELL2.DOWNSELL[5]);
  });

  it('the labels the specs name', () => {
    expect(U1.acceptLabel).toBe('Yes, do my Wish Ritual');
    expect(U1.downsellAcceptLabel).toBe('Yes, do my Wish Ritual for {downsellPrice}');
    expect(U1.downsellDeclineLabel).toBe('No thanks, just my reading');
    expect(U1.downsellReassurance).toBe('');
    expect(U1.ctaReassurance).toBe('Take your time.');
    expect(U2.downsellDeclineLabel).toBe('No thanks, just my numbers');
    expect(U2.downsellReassurance).toBe('');
    expect(U1.placeholderNames).toEqual(['Friend']);
    expect(U2.placeholderNames).toEqual(['Friend']);
  });

  it('each Q1 reply lands on its own branch (the hook reads the words, not the value)', () => {
    for (const reply of U1.QUESTION_1_REPLIES) {
      expect(detectQ1Intent(reply.text), reply.text).toBe(reply.value);
      expect(U1.AFTER_Q1[reply.value], reply.value).toBeDefined();
    }
  });

  it('the bracelet block ignores the bucket', () => {
    expect(U1.bucketMessages('money', 'Tom')).toEqual(U1.bucketMessages(undefined, null));
  });

  it('shows the citrine bracelet, never the lava stone', () => {
    expect(U1.stoneImage).toMatch(/citrine-wish-bracelet/);
    expect(U1.stoneImage).not.toMatch(/lava/);
  });

  it('the small print names the bracelet, not a stone', () => {
    expect(U1.priceNoteItem).toBe('charged citrine bracelet');
  });
});

describe('every string a 12 buyer can be shown', () => {
  it('the walk really covers the flow', () => {
    expect(every.length).toBeGreaterThan(100);
  });

  it('no banned word', () => {
    const banned =
      /\bjourney|\benergy|\benergies|\bclearing|\bcleared\b|our conversation|the universe|\bveil\b|\btarot\b|testimonial|most of my clients/i;
    expect(every.filter((s) => banned.test(s))).toEqual([]);
  });

  it('no lava, volcano or protection: U1 is the citrine now', () => {
    expect(every.filter((s) => /\blava\b|volcan|\bprotection\b|\bprotected\b|protection stone/i.test(s))).toEqual([]);
  });

  it('no win, no sum, no wealth', () => {
    expect(every.filter((s) => /jackpot|lottery|cheque|\bwealth|abundance|\brich\b|\bmillion/i.test(s))).toEqual([]);
    // "win" only ever in a denial.
    const wins = every.filter((s) => /\bwin\b/i.test(s));
    expect(wins.length).toBeGreaterThan(0);
    for (const s of wins) expect(s, s).toMatch(/won't win|Not to win/);
    // "money" only where the wish is steered off it.
    for (const s of every.filter((x) => /\bmoney\b/i.test(x))) expect(s).toContain('not the money for it');
  });

  it('prices: U1 types none; U2 types only V1’s $47 line and its $30 downsell', () => {
    const u1Typed = u1.strings.filter((s) => /\$\d/.test(s));
    expect(u1Typed).toEqual([]);
    const u2Typed = [...new Set([...a.strings, ...b.strings])].filter((s) => /\$\d/.test(s));
    expect(u2Typed.sort()).toEqual([U2.DOWNSELL[4], V1_UPSELL2.PRICE[0]].sort());
  });

  it('no token nothing fills in', () => {
    expect(every.filter((s) => /\{(?!firstName\}|upsellPrice\}|downsellPrice\})[^}]*\}/.test(s))).toEqual([]);
  });

  it('the reading is always within 24 hours, never tomorrow or tonight', () => {
    expect(every.filter((s) => /\btomorrow\b|by morning/i.test(s))).toEqual([]);
    const sentences = every.flatMap((s) => s.split(/(?<=[.!?…])\s+/));
    expect(sentences.filter((s) => /\btonight\b/i.test(s) && /reading|numbers/i.test(s))).toEqual([]);
    expect(every.some((s) => s.includes('within 24 hours'))).toBe(true);
  });

  it('no line says the reading needs the ritual or the bracelet', () => {
    expect(every.filter((s) => /reading needs|won't work without|weaker without/i.test(s))).toEqual([]);
  });

  it('January lives in U1 only, never in U2', () => {
    expect([...a.strings, ...b.strings].filter((s) => /January|every month/i.test(s))).toEqual([]);
  });
});

describe('two bracelets', () => {
  it('Path A names the second bracelet, and what the citrine does, before anything else is sold', () => {
    expect(U2.PATH_A_OPEN[1]).toContain('second bracelet');
    expect(U2.PATH_A_OPEN.join(' ')).toMatch(/citrine.*left wrist.*one wish/);
  });

  it('Path A says what each one does', () => {
    expect(U2.RITUAL_PATH_A_EXTRA).toMatch(/citrine on your left holds your one wish/);
    expect(U2.RITUAL_PATH_A_EXTRA).toMatch(/this one on your right/);
    expect(U2.SUCCESS_HAS_SHIPPING.join(' ')).toContain('your citrine bracelet');
  });

  it('Path B never names the citrine bracelet', () => {
    expect(b.strings.filter((s) => /your citrine|citrine bracelet|second bracelet|one wish/i.test(s))).toEqual([]);
  });

  it('U2 says out loud that it wins nothing', () => {
    expect(U2.RITUAL_INSTRUCTION[4]).toContain("It won't win you anything");
  });
});
