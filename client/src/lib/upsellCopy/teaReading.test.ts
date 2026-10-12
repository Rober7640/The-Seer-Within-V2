// Offer 04 — The Turn (tea-leaf reading): U1 + U2 copy.
//
//   npx vitest run client/src/lib/upsellCopy/teaReading.test.ts
//
// Spec: improve-v1/v1-one-time-BEs/copy/04/04-U-upsell-copy-v2.md.
// The last block WALKS each conversation the way useUpsellChat / useUpsell2Chat do
// (chain edges, the shared questions the hooks import directly, every reply branch,
// every CTA outcome) and fails if any string a 04 buyer can see carries a day number
// from one cup, a token nothing fills in, a V1 clearing line, or a promise about time
// the 24-hour delivery doesn't keep.

import { describe, expect, it } from 'vitest';
import type { Bucket } from '@shared/types';
import { TEA_READING_DELIVERY_HOURS } from '@shared/backendOffers';
import { TEA_READING_UPSELL1, TEA_READING_UPSELL2 } from './teaReading';
import { V1_CHAIN_1, V1_UPSELL1, V1_UPSELL2 } from './v1';
import type { Upsell1Chain, Upsell1Copy, Upsell2Chain, Upsell2Copy } from './types';
import {
  UPSELL_BUCKET_MESSAGES,
  UPSELL_OFFER,
  UPSELL_RITUAL,
  UPSELL_QUESTION_2,
  UPSELL_QUESTION_2_REPLIES,
  UPSELL_AFTER_Q2,
  UPSELL_QUESTION_3,
  UPSELL_QUESTION_3_REPLIES,
  UPSELL_AFTER_Q3,
} from '@/lib/upsellMessages';
import {
  UPSELL2_PRICE,
  UPSELL2_DOWNSELL,
  UPSELL2_RITUAL_PATH_A_EXTRA,
  UPSELL2_QUESTION_1,
  UPSELL2_QUESTION_1_REPLIES,
  UPSELL2_AFTER_Q1,
  UPSELL2_QUESTION_2,
  UPSELL2_QUESTION_2_REPLIES,
  UPSELL2_AFTER_Q2,
  UPSELL2_QUESTION_3,
  UPSELL2_QUESTION_3_REPLIES,
  UPSELL2_AFTER_Q3,
} from '@/lib/upsell2Messages';
import { upsell1CopyForOffer, upsell2CopyForOffer } from '@/lib/backendOffers';

describe('tea-reading (04) U1 copy', () => {
  it('opens on the 04 confirmation beats, with the 24-hour delivery', () => {
    expect(TEA_READING_UPSELL1.CONFIRMATION).toHaveLength(3);
    expect(TEA_READING_UPSELL1.CONFIRMATION[0]).toContain('turn your cup');
    expect(TEA_READING_UPSELL1.CONFIRMATION[0]).toContain(`within ${TEA_READING_DELIVERY_HOURS} hours`);
  });

  it('the risk is the well-meaning friend from 04-P1 expectation three — not a rival', () => {
    const risk = TEA_READING_UPSELL1.RISK.join(' ');
    expect(risk).toContain('Someone who loves you');
    expect(risk).toContain('just be honest with him');
    expect(risk).toMatch(/what the bridge is for/);
    expect(risk).not.toMatch(/rival|another woman|someone else/i);
  });

  it('keeps the drafted question and its three replies', () => {
    expect(TEA_READING_UPSELL1.QUESTION_1).toContain('too patient');
    expect(TEA_READING_UPSELL1.QUESTION_1_REPLIES).toEqual([
      { text: "Yes, and they've said so", value: 'yes' },
      { text: 'Probably', value: 'maybe' },
      { text: "I haven't told anyone", value: 'unsure' },
    ]);
    expect(Object.keys(TEA_READING_UPSELL1.AFTER_Q1)).toEqual(
      expect.arrayContaining(['yes', 'maybe', 'unsure', 'default']),
    );
    // RISK routes to QUESTION_1, same as V1 / 03 / 06 / 09.
    expect(TEA_READING_UPSELL1.chain).toBe(V1_CHAIN_1);
  });

  it('bucket block is identical for every buyer, non-empty, and carries the verbatim left-wrist line', () => {
    const base = TEA_READING_UPSELL1.bucketMessages(undefined, null);
    expect(base.length).toBeGreaterThan(0);
    expect(base).toContain(UPSELL_BUCKET_MESSAGES.love[1]);
    expect(base.join(' ')).toContain('LEFT wrist');
    for (const bucket of ['love', 'money', 'purpose', 'someone', undefined] as (Bucket | undefined)[]) {
      for (const person of [null, undefined, 'Tom']) {
        expect(TEA_READING_UPSELL1.bucketMessages(bucket, person)).toEqual(base);
      }
    }
  });

  it('references V1 lines by index rather than retyping them', () => {
    expect(TEA_READING_UPSELL1.RITUAL).toHaveLength(UPSELL_RITUAL.length);
    expect(TEA_READING_UPSELL1.RITUAL[0]).toBe(UPSELL_RITUAL[0]);
    expect(TEA_READING_UPSELL1.RITUAL[3]).not.toBe(UPSELL_RITUAL[3]); // "our conversation"
    expect(TEA_READING_UPSELL1.OFFER[0]).toBe(UPSELL_OFFER[0]);
    expect(TEA_READING_UPSELL1.OFFER[0]).toContain('{upsellPrice}');
  });

  it('uses 04’s accept label and treats "Friend" as no name', () => {
    expect(TEA_READING_UPSELL1.acceptLabel).toBe('Yes, guard my quiet days');
    expect(TEA_READING_UPSELL1.placeholderNames).toEqual(['Friend']);
  });
});

describe('tea-reading (04) U2 copy', () => {
  it('has both openings: took U1 (Path A) and declined U1 (Path B)', () => {
    expect(TEA_READING_UPSELL2.PATH_A_OPEN).toHaveLength(6);
    expect(TEA_READING_UPSELL2.PATH_A_OPEN[0]).toContain('Your reading and your stone');
    expect(TEA_READING_UPSELL2.PATH_B_OPEN).toHaveLength(6);
    expect(TEA_READING_UPSELL2.PATH_B_OPEN[0]).toContain("won't push the stone");
    expect(TEA_READING_UPSELL2.PATH_A_OPEN).not.toEqual(TEA_READING_UPSELL2.PATH_B_OPEN);
    for (const open of [TEA_READING_UPSELL2.PATH_A_OPEN, TEA_READING_UPSELL2.PATH_B_OPEN]) {
      expect(open.join(' ')).toContain('butterfly');
    }
  });

  it('chain skips both Claude stages so no live call fires with bucket:null', () => {
    expect(TEA_READING_UPSELL2.chain.PATH_A_OPEN).toBe('GAP');
    expect(TEA_READING_UPSELL2.chain.PATH_B_OPEN).toBe('GAP');
    expect(TEA_READING_UPSELL2.chain.AFTER_Q2).toBe('RITUAL_INSTRUCTION');
    expect(Object.values(TEA_READING_UPSELL2.chain)).not.toContain('MANIFEST_REVEAL');
    expect(Object.values(TEA_READING_UPSELL2.chain)).not.toContain('MANIFEST_PERSONALIZE');
  });

  it('the bracelet works on HER side: charged to the three good leaves, and never promises his return', () => {
    const ritual = TEA_READING_UPSELL2.RITUAL_INSTRUCTION.join(' ');
    expect(ritual).toMatch(/bridge, the lighthouse and the butterfly/);
    expect(ritual).toMatch(/right wrist/);
    expect(ritual).toContain("It won't walk him across that bridge");
    // V1's "speaking at full volume" argues against the quiet days.
    expect(ritual).not.toMatch(/full volume/);
    expect(TEA_READING_UPSELL2.INTRODUCE.join(' ')).toContain('Not for pulling him back');
  });

  it('AFTER_Q2 hands off to the wrist and never promises the skipped personalised stone read', () => {
    const lines = Object.values(TEA_READING_UPSELL2.AFTER_Q2 ?? {}).flat().join(' ');
    expect(lines).not.toMatch(/specifically what it means|speaks loudest|let me show you/i);
    expect(lines).toMatch(/wrist|charge/);
  });

  it('keeps V1’s prices by reference and uses 04’s decline label', () => {
    expect(TEA_READING_UPSELL2.PRICE[0]).toBe(UPSELL2_PRICE[0]);
    expect(TEA_READING_UPSELL2.DOWNSELL[4]).toBe(UPSELL2_DOWNSELL[4]);
    expect(TEA_READING_UPSELL2.RITUAL_PATH_A_EXTRA).toBe(UPSELL2_RITUAL_PATH_A_EXTRA);
    expect(TEA_READING_UPSELL2.downsellDeclineLabel).toBe('No thanks, just my reading');
    expect(TEA_READING_UPSELL2.placeholderNames).toEqual(['Friend']);
  });
});

describe('offer-keyed pitch registry', () => {
  it('resolves tea-reading to its own pitch (the shared upsell pages throw without one)', () => {
    expect(upsell1CopyForOffer('tea-reading')).toBe(TEA_READING_UPSELL1);
    expect(upsell2CopyForOffer('tea-reading')).toBe(TEA_READING_UPSELL2);
  });
});

// ── Every string a 04 buyer can be shown ─────────────────────────────────────────────

const BUCKETS: (Bucket | undefined)[] = [undefined, 'love', 'money', 'purpose', 'someone'];
const values = (r: Record<string, string[]>) => Object.values(r).flat();

/** Walks U1 exactly as useUpsellChat.processStage does, from CONFIRMATION to the CTA. */
function walkU1(copy: Upsell1Copy): { strings: string[]; visited: string[] } {
  const strings: string[] = [];
  const visited: string[] = [];
  let stage: string = 'CONFIRMATION';
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
        strings.push(...copy[stage]);
        break;
      case 'QUESTION_1':
        strings.push(copy.QUESTION_1, ...copy.QUESTION_1_REPLIES.map((r) => r.text));
        stage = 'AFTER_Q1';
        continue;
      case 'AFTER_Q1':
        strings.push(...values(copy.AFTER_Q1));
        break;
      // The hook imports U1's second and third questions directly — no copy override.
      case 'QUESTION_2':
        strings.push(UPSELL_QUESTION_2, ...UPSELL_QUESTION_2_REPLIES.map((r) => r.text));
        stage = 'AFTER_Q2';
        continue;
      case 'AFTER_Q2':
        strings.push(...values(UPSELL_AFTER_Q2));
        break;
      case 'QUESTION_3':
        strings.push(UPSELL_QUESTION_3, ...UPSELL_QUESTION_3_REPLIES.map((r) => r.text));
        stage = 'AFTER_Q3';
        continue;
      case 'AFTER_Q3':
        strings.push(...values(UPSELL_AFTER_Q3));
        break;
      case 'BUCKET':
        for (const bucket of BUCKETS) strings.push(...copy.bucketMessages(bucket, null));
        break;
      case 'OFFER':
        // CTA: accept (label → SUCCESS → shipping form → SHIPPING_CONFIRMED) or decline.
        strings.push(
          ...copy.OFFER,
          copy.acceptLabel,
          ...copy.SUCCESS,
          ...copy.SHIPPING_CONFIRMED,
          ...copy.SOFT_DECLINE,
          ...Object.values(copy.pauses),
        );
        return { strings, visited };
      default:
        throw new Error(`U1 walk reached a stage the hook has no content for: ${stage}`);
    }
    stage = copy.chain[stage as keyof Upsell1Chain];
  }
  throw new Error('U1 chain never reached OFFER');
}

/** Walks U2 as useUpsell2Chat.processStage does, from one opener to the CTA. */
function walkU2(copy: Upsell2Copy, opener: 'PATH_A_OPEN' | 'PATH_B_OPEN'): { strings: string[]; visited: string[] } {
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
        strings.push(...copy[stage]);
        break;
      case 'MANIFEST_REVEAL':
      case 'MANIFEST_PERSONALIZE':
        throw new Error(`U2 walk reached ${stage} — a live Claude call with bucket:null`);
      case 'QUESTION_1':
        strings.push(UPSELL2_QUESTION_1, ...UPSELL2_QUESTION_1_REPLIES.map((r) => r.text));
        stage = 'AFTER_Q1';
        continue;
      case 'AFTER_Q1':
        strings.push(...values(copy.AFTER_Q1 ?? UPSELL2_AFTER_Q1));
        break;
      case 'QUESTION_2':
        strings.push(UPSELL2_QUESTION_2, ...UPSELL2_QUESTION_2_REPLIES.map((r) => r.text));
        stage = 'AFTER_Q2';
        continue;
      case 'AFTER_Q2':
        strings.push(...values(copy.AFTER_Q2 ?? UPSELL2_AFTER_Q2));
        break;
      case 'QUESTION_3':
        strings.push(UPSELL2_QUESTION_3, ...UPSELL2_QUESTION_3_REPLIES.map((r) => r.text));
        stage = 'AFTER_Q3';
        continue;
      case 'AFTER_Q3':
        strings.push(...values(copy.AFTER_Q3 ?? UPSELL2_AFTER_Q3));
        break;
      case 'RITUAL_INSTRUCTION':
        strings.push(...copy.RITUAL_INSTRUCTION, copy.RITUAL_PATH_A_EXTRA);
        break;
      case 'URGENCY':
        // CTA: accept (either shipping branch) · objection → downsell · decline.
        strings.push(
          ...copy.URGENCY,
          ...copy.SUCCESS,
          ...copy.SUCCESS_HAS_SHIPPING,
          ...copy.SUCCESS_NEEDS_SHIPPING,
          ...copy.SHIPPING_CONFIRMED,
          ...copy.DOWNSELL,
          copy.downsellDeclineLabel,
          ...copy.SOFT_DECLINE,
          ...Object.values(copy.pauses),
        );
        return { strings, visited };
      default:
        throw new Error(`U2 walk reached a stage the hook has no content for: ${stage}`);
    }
    stage = copy.chain[stage as keyof Upsell2Chain];
  }
  throw new Error('U2 chain never reached URGENCY');
}

// ── What no 04 string may say ──

const NUM =
  'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|' +
  'sixteen|seventeen|eighteen|nineteen|twenty(?:-one)?|\\d+';

// The cup changes the days, and the cup is her data — so no day of the sequence, no count
// of quiet days, no numbered week. "twenty-one days" (every cup) and V1's "30 days" of
// protection are the only counts allowed.
const DAY_NUMBER: RegExp[] = [
  new RegExp(`\\bdays? (?:${NUM})\\b`, 'i'), //               day five · days sixteen to eighteen
  new RegExp(`\\b(?:first|last|next) (?:${NUM}) days\\b`, 'i'), // the first nine days
  /\b(?<!twenty-)(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen) (?:quiet |silent )?days\b/i,
  /\b(?!30\b)\d+ days\b/i,
  new RegExp(`\\bweek (?:${NUM})\\b`, 'i'), //                 week two
  // ("the first week" is left alone: every cup opens quiet, and V1's bracelet line uses it.)
  /\b(?:second|third) week\b/i,
  /\b(?:sixteenth|seventeenth|eighteenth|thirteenth|fourteenth|nineteenth|twentieth)\b/i,
];

const BANNED_WORDS =
  /clearing|energy field|our conversation|open communication|seek guidance|embrace growth|by morning|tomorrow|we began talking/i;

const CALENDAR =
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|june|july|august|september|october|november|december)\b/i;

// {firstName} is the only merge about her. {upsellPrice} is the hook's price (V1's OFFER[0]
// by reference), not her data.
const UNFILLED_TOKEN = /\{(?!firstName\}|upsellPrice\})[^}]*\}/;

// "Tonight" may only ever be about the stone ritual — never about the reading or its days.
const sentences = (s: string) => s.split(/(?<=[.!?…])\s+/);
const TONIGHT_ABOUT_READING = (s: string) =>
  sentences(s).some((x) => /\btonight\b/i.test(x) && /reading|cup|twenty-one|your days|sequence|letter/i.test(x));

function offending(strings: string[]): string[] {
  return strings.filter(
    (s) =>
      BANNED_WORDS.test(s) ||
      CALENDAR.test(s) ||
      UNFILLED_TOKEN.test(s) ||
      DAY_NUMBER.some((re) => re.test(s)) ||
      TONIGHT_ABOUT_READING(s),
  );
}

describe('every string reachable in 04’s U1 and U2', () => {
  it('the checks have teeth — the drafted 04-U lines and V1 all fail them', () => {
    const drafted = [
      'The sequence works because of the quiet. The first nine days are the ones that do it.',
      "They'll say it around day five. They always do.",
      'being honest with him is days sixteen to eighteen.',
      "That's the piece that's still missing, and it's the piece that decides day sixteen.",
      'You will have the whole sequence by morning — which week to be quiet.',
      "This one broadcasts the way across is open without you having to say it in week two.",
      "It's done, {firstName}. Your cup goes on the table tonight and your twenty-one days come with it.",
      'What they are actually proposing is that you do it eleven days early.',
    ];
    expect(offending(drafted)).toEqual(drafted);
    expect(offending(walkU1(V1_UPSELL1).strings).some((s) => /clearing/i.test(s))).toBe(true);
    // V1's own chain enters the Claude stages, so walk its copy on 04's chain.
    const v1OnOurChain = { ...V1_UPSELL2, chain: TEA_READING_UPSELL2.chain };
    expect(offending(walkU2(v1OnOurChain, 'PATH_A_OPEN').strings).length).toBeGreaterThan(0);
    // …and they let the universal counts through.
    expect(offending(['Your twenty-one days.', 'At least 30 days.', 'Over three weeks.'])).toEqual([]);
  });

  it('U1 walks CONFIRMATION → … → OFFER through all three questions', () => {
    expect(walkU1(TEA_READING_UPSELL1).visited).toEqual([
      'CONFIRMATION', 'GAP', 'RISK', 'QUESTION_1', 'AFTER_Q1', 'SOLUTION', 'LAVA_INTRO',
      'QUESTION_2', 'AFTER_Q2', 'RITUAL', 'FEEL', 'QUESTION_3', 'AFTER_Q3', 'BUCKET',
      'DELIVERY', 'OFFER',
    ]);
  });

  it('U1: no day number, no banned word, no weekday/date, no stray token, no "tonight" on the reading', () => {
    expect(offending(walkU1(TEA_READING_UPSELL1).strings)).toEqual([]);
  });

  it('U2 (both paths) never enters an AI stage and reaches the CTA', () => {
    for (const opener of ['PATH_A_OPEN', 'PATH_B_OPEN'] as const) {
      const { visited } = walkU2(TEA_READING_UPSELL2, opener);
      expect(visited[0]).toBe(opener);
      expect(visited[1]).toBe('GAP');
      expect(visited[visited.length - 1]).toBe('URGENCY');
      expect(visited).not.toContain('MANIFEST_REVEAL');
      expect(visited).not.toContain('MANIFEST_PERSONALIZE');
    }
  });

  it('U2 (both paths): no day number, no banned word, no weekday/date, no stray token, no "tonight" on the reading', () => {
    expect(offending(walkU2(TEA_READING_UPSELL2, 'PATH_A_OPEN').strings)).toEqual([]);
    expect(offending(walkU2(TEA_READING_UPSELL2, 'PATH_B_OPEN').strings)).toEqual([]);
  });

  it('nothing promises he comes back', () => {
    const all = [
      ...walkU1(TEA_READING_UPSELL1).strings,
      ...walkU2(TEA_READING_UPSELL2, 'PATH_A_OPEN').strings,
      ...walkU2(TEA_READING_UPSELL2, 'PATH_B_OPEN').strings,
    ].join(' ');
    expect(all).not.toMatch(/draws? him|bring(?:s)? him back|him back to you|he(?:'ll| will) come back|I want him to cross/i);
  });
});
