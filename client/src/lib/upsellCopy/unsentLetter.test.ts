// Offer 11 — The Unsent Letter: U1 + U2 copy.
//
//   npx vitest run client/src/lib/upsellCopy/unsentLetter.test.ts
//
// Spec: improve-v1/v1-one-time-BEs/docs/11/upsells/11-U1a + 11-U2a. The walks follow useUpsellChat
// and useUpsell2Chat stage by stage, and fail if any string an 11 buyer can see carries a banned
// word, a reveal word, a blank token, a stage nothing routes to, or a line V1 owned that changed.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Upsell1Chain, Upsell2Chain } from './types';
import { V1_UPSELL1, V1_UPSELL2 } from './v1';
import { UNSENT_LETTER_UPSELL1 as U1, UNSENT_LETTER_UPSELL2 as U2 } from './unsentLetter';
import { BACKEND_UPSELL_PITCH } from '../backendOffers';
import { UPSELL_BUCKET_MESSAGES } from '../upsellMessages';

const file = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const flat = (s: string) =>
  s.replace(/^>\s?/gm, ' ').replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ');
const DOCS = '../../../../improve-v1/v1-one-time-BEs/docs/11/upsells';
const U1A = flat(file(`${DOCS}/11-U1a-opening-beats.md`));
const U2A = flat(file(`${DOCS}/11-U2a-opening-beats.md`));

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
      case 'SOCIAL_PROOF':
      case 'PRICE':
        strings.push(...(U2[stage] as string[]));
        break;
      case 'RITUAL_INSTRUCTION':
        strings.push(...U2.RITUAL_INSTRUCTION, U2.RITUAL_PATH_A_EXTRA);
        break;
      case 'URGENCY':
        strings.push(
          ...U2.URGENCY,
          ...U2.SUCCESS,
          ...U2.SUCCESS_HAS_SHIPPING,
          ...U2.SUCCESS_NEEDS_SHIPPING,
          ...U2.SHIPPING_CONFIRMED,
          ...U2.DOWNSELL,
          U2.downsellDeclineLabel,
          U2.downsellReassurance!,
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
    Object.values(copy).flatMap((v) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' ? [v] : [])),
  ),
);
V1_LINES.add(UPSELL_BUCKET_MESSAGES.love[1]);

describe('registered', () => {
  it('both conversations hang off the offer', () => {
    expect(BACKEND_UPSELL_PITCH['unsent-letter']).toEqual({ upsell1: U1, upsell2: U2 });
  });
});

describe('the route skips everything a copy object cannot reach', () => {
  it('U1 goes through Q1 only', () => {
    expect(u1.visited).toEqual([
      'CONFIRMATION', 'GAP', 'RISK', 'QUESTION_1', 'AFTER_Q1', 'SOLUTION', 'LAVA_INTRO', 'RITUAL',
      'FEEL', 'BUCKET', 'DELIVERY', 'OFFER',
    ]);
  });

  it('U2 asks nothing, and never reaches the AI stages, on either path', () => {
    const route = ['GAP', 'INTRODUCE', 'STONES', 'RITUAL_INSTRUCTION', 'WHAT_RECEIVE', 'SOCIAL_PROOF', 'PRICE', 'URGENCY'];
    expect(a.visited).toEqual(['PATH_A_OPEN', ...route]);
    expect(b.visited).toEqual(['PATH_B_OPEN', ...route]);
  });

  it('the pauses are where the specs put them', () => {
    expect(U1.pauses).toEqual({ RITUAL: "I'm listening", BUCKET: 'Tell me' });
    expect(U2.pauses).toEqual({ GAP: 'Go on', STONES: "I'm listening", WHAT_RECEIVE: 'Tell me' });
  });
});

describe('word for word', () => {
  it('every line that is not V1’s is in the spec', () => {
    const inSpec = `${U1A} ${U2A}`;
    const missing = every.filter((s) => !V1_LINES.has(s) && !inSpec.includes(flat(s)));
    expect(missing).toEqual([]);
  });

  it('V1 lines kept by reference are V1’s, unedited', () => {
    expect(U1.RITUAL[0]).toBe(V1_UPSELL1.RITUAL[0]);
    expect(U1.RITUAL[7]).toBe(V1_UPSELL1.RITUAL[7]);
    expect(U1.DELIVERY.slice(0, 4)).toEqual(V1_UPSELL1.DELIVERY.slice(0, 4));
    expect(U2.STONES[2]).toBe(V1_UPSELL2.STONES[2]);
    expect(U2.STONES[5]).toBe(V1_UPSELL2.STONES[5]);
    expect(U2.DOWNSELL[5]).toBe(V1_UPSELL2.DOWNSELL[5]);
    expect(U1.bucketMessages(undefined, null)[1]).toBe(UPSELL_BUCKET_MESSAGES.love[1]);
  });

  it('one reply set, and the labels the specs name', () => {
    expect(U1.QUESTION_1_REPLIES.map((r) => r.value)).toEqual(['yes', 'maybe', 'unsure']);
    expect(U1.acceptLabel).toBe("Yes, protect what's coming back");
    expect(U2.downsellDeclineLabel).toBe('No thanks, just my letter');
    expect(U1.placeholderNames).toEqual(['Friend']);
    expect(U2.placeholderNames).toEqual(['Friend']);
  });

  it('the bucket block ignores the bucket', () => {
    expect(U1.bucketMessages('money', 'Tom')).toEqual(U1.bucketMessages(undefined, null));
  });
});

describe('every string an 11 buyer can be shown', () => {
  it('the walk really covers the flow', () => {
    expect(every.length).toBeGreaterThan(100);
  });

  it('no banned word', () => {
    const banned = /\bnumerolog|\bjourney|\benergy|\benergies|\bclearing|\bcleared\b|our conversation|the universe|\bveil\b|\bblock\b/i;
    expect(every.filter((s) => banned.test(s))).toEqual([]);
  });

  it('no reveal word: nothing hints at what was taken', () => {
    const reveal = /\bnerve\b|\btrust|\blaugh|\bsafe\b|\bfreedom\b|looked after|\bjudgement\b(?! and the Devil)|\bworth\b|\bsoftness\b/i;
    // "Judgement" the card is named in RITUAL[3]; the card is not the answer.
    expect(every.filter((s) => reveal.test(s.replace('The Hermit, Judgement and the Devil', '')))).toEqual([]);
  });

  it('no token nothing fills in', () => {
    expect(every.filter((s) => /\{(?!firstName\}|upsellPrice\})[^}]*\}/.test(s))).toEqual([]);
  });

  it('"tonight" is never about the reading, the letter or the twelve', () => {
    const sentences = every.flatMap((s) => s.split(/(?<=[.!?…])\s+/));
    const wrong = sentences.filter((s) => /\btonight\b/i.test(s) && /reading|letter|twelve/i.test(s));
    expect(wrong).toEqual([]);
  });

  it('the reading is always 24 hours, never a day or a morning', () => {
    expect(every.filter((s) => /\btomorrow\b|by morning/i.test(s))).toEqual([]);
    expect(every.some((s) => s.includes('within 24 hours'))).toBe(true);
  });

  it('no line says the reading needs help, or that they are coming', () => {
    const wrong = /reading needs|won't work without|they'll come back|they're coming|he's coming back/i;
    expect(every.filter((s) => wrong.test(s))).toEqual([]);
  });

  it('U2 says out loud that it brings nobody', () => {
    expect(U2.RITUAL_INSTRUCTION[4]).toContain("It won't bring them back");
  });

  it('prices: U2’s downsell types $30, and that is what V1 charges', () => {
    expect(U2.DOWNSELL[4]).toContain('$30');
    expect(V1_UPSELL2.DOWNSELL[4]).toContain('$30');
  });
});

describe('the shared CTAs keep V1’s words for everyone else', () => {
  it('the downsell line shows once: in the bubble, not repeated above the button', () => {
    expect(U2.downsellReassurance).toBe('');
    expect(U2.DOWNSELL.join(' ')).toContain('Same eight stones. Just prepared differently.');
  });

  it('neither override leaks: V1 sets no reassurance line', () => {
    expect(V1_UPSELL1.ctaReassurance).toBeUndefined();
    expect(V1_UPSELL2.downsellReassurance).toBeUndefined();
  });

  it('the components default to the exact old lines', () => {
    const cta = file('../../components/upsell/UpsellCTA.tsx');
    const down = file('../../components/upsell/Upsell2DownsellCTA.tsx');
    expect(cta).toContain("reassurance = 'Take your time. This is your journey.'");
    expect(down).toContain("reassurance = 'Same eight stones. Same manifestation energy.'");
  });

  it('only 11 and 12 override them', () => {
    for (const [offer, pitch] of Object.entries(BACKEND_UPSELL_PITCH)) {
      // 12 copied 11's pattern (12-U1a, 12-U2a): "Take your time." and an empty downsell line.
      if (offer === 'unsent-letter' || offer === 'lucky-numbers') continue;
      expect(pitch?.upsell1.ctaReassurance, offer).toBeUndefined();
      expect(pitch?.upsell2.downsellReassurance, offer).toBeUndefined();
    }
  });
});
