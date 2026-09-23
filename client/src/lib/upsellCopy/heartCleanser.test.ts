// Offer 09 — the Heart Cleanser Love Charm: U1 + U2 copy.
//
//   npx vitest run client/src/lib/upsellCopy/heartCleanser.test.ts
//
// Spec: improve-v1/v1-one-time-BEs/docs/09/upsells/09-U1a-upsell1-opening-beats.md + 09-U2a.
// The last block WALKS each conversation the way useUpsellChat / useUpsell2Chat do
// (chain edges, the shared questions the hooks import directly, every reply branch,
// every CTA outcome) and fails if any string a 09 buyer can see names a product she
// never bought or a token nothing fills in.

import { describe, expect, it } from 'vitest';
import type { Bucket } from '@shared/types';
import { HEART_CLEANSER_UPSELL1, HEART_CLEANSER_UPSELL2 } from './heartCleanser';
import { PIXIU_UPSELL2 } from './pixiu';
import { V1_CHAIN_1, V1_UPSELL1 } from './v1';
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

describe('heart-cleanser (09) U1 copy', () => {
  it('opens on the 09 shipping-wait confirmation beats', () => {
    expect(HEART_CLEANSER_UPSELL1.CONFIRMATION.length).toBe(3);
    expect(HEART_CLEANSER_UPSELL1.CONFIRMATION[0]).toContain('Heart Cleanser Love Charm');
    // The settled times, word for word (copy-check OFFERS['09'].sla).
    expect(HEART_CLEANSER_UPSELL1.CONFIRMATION.join(' ')).toMatch(/2 business days/);
    expect(HEART_CLEANSER_UPSELL1.CONFIRMATION[1]).toContain('7–14 days');
    expect(HEART_CLEANSER_UPSELL1.CONFIRMATION[1]).toContain('2–4 weeks');
  });

  it('keeps the question and its three replies', () => {
    expect(HEART_CLEANSER_UPSELL1.QUESTION_1).toContain('someone from before');
    expect(HEART_CLEANSER_UPSELL1.QUESTION_1_REPLIES.map((r) => r.value)).toEqual(['yes', 'maybe', 'unsure']);
    expect(Object.keys(HEART_CLEANSER_UPSELL1.AFTER_Q1)).toEqual(
      expect.arrayContaining(['yes', 'maybe', 'unsure', 'default']),
    );
    // RISK routes to QUESTION_1, same as V1 / 03 / 06.
    expect(HEART_CLEANSER_UPSELL1.chain).toBe(V1_CHAIN_1);
  });

  it('bucket block is universal — V1 LOVE verbatim, non-empty with no bucket/person, carries the left-wrist mechanic', () => {
    const msgs = HEART_CLEANSER_UPSELL1.bucketMessages(undefined, null);
    expect(msgs).toEqual(UPSELL_BUCKET_MESSAGES.love);
    expect(msgs.join(' ')).toContain('LEFT wrist');
    expect(msgs.join(' ')).not.toContain('{personName}');
    // Ignores whatever bucket arrives.
    expect(HEART_CLEANSER_UPSELL1.bucketMessages('money', 'Tom')).toEqual(UPSELL_BUCKET_MESSAGES.love);
  });

  it('references V1 lines by index rather than retyping them', () => {
    expect(HEART_CLEANSER_UPSELL1.RITUAL[0]).toBe(UPSELL_RITUAL[0]);
    expect(HEART_CLEANSER_UPSELL1.RITUAL).toHaveLength(UPSELL_RITUAL.length);
    expect(HEART_CLEANSER_UPSELL1.OFFER[0]).toBe(UPSELL_OFFER[0]);
    expect(HEART_CLEANSER_UPSELL1.OFFER[0]).toContain('{upsellPrice}');
  });

  it('overrides DELIVERY too (beyond pixiu’s set) and uses 09’s accept label', () => {
    expect(HEART_CLEANSER_UPSELL1.DELIVERY[4]).toContain('your charm is travelling');
    expect(HEART_CLEANSER_UPSELL1.acceptLabel).toBe('Yes, guard who gets close');
    expect(HEART_CLEANSER_UPSELL1.placeholderNames).toEqual(['Friend']);
  });
});

describe('heart-cleanser (09) U2 copy', () => {
  it('opens on the 09 path beats and inherits V1’s price', () => {
    expect(HEART_CLEANSER_UPSELL2.PATH_A_OPEN[0]).toContain('both are confirmed');
    expect(HEART_CLEANSER_UPSELL2.PATH_B_OPEN).toHaveLength(6);
    expect(HEART_CLEANSER_UPSELL2.PATH_B_OPEN.join(' ')).toContain('other wrist');
    expect(HEART_CLEANSER_UPSELL2.PRICE).toBe(UPSELL2_PRICE);
  });

  it('chain skips both Claude stages so no live call fires for a page-only buyer', () => {
    expect(HEART_CLEANSER_UPSELL2.chain.PATH_A_OPEN).toBe('GAP');
    expect(HEART_CLEANSER_UPSELL2.chain.PATH_B_OPEN).toBe('GAP');
    expect(HEART_CLEANSER_UPSELL2.chain.AFTER_Q2).toBe('RITUAL_INSTRUCTION');
  });

  it('AFTER_Q2 hands off to the wrist and never promises the skipped personalised stone read', () => {
    const lines = Object.values(HEART_CLEANSER_UPSELL2.AFTER_Q2 ?? {}).flat().join(' ');
    expect(lines).not.toMatch(/specifically what it means|speaks loudest|let me show you/i);
    expect(lines).toMatch(/wrist/);
  });

  it('uses 09’s decline label', () => {
    expect(HEART_CLEANSER_UPSELL2.downsellDeclineLabel).toBe('No thanks, just my charm');
    expect(HEART_CLEANSER_UPSELL2.placeholderNames).toEqual(['Friend']);
  });
});

describe('offer-keyed pitch registry', () => {
  it('resolves heart-cleanser to its own pitch (the shared upsell pages throw without one)', () => {
    expect(upsell1CopyForOffer('heart-cleanser')).toBe(HEART_CLEANSER_UPSELL1);
    expect(upsell2CopyForOffer('heart-cleanser')).toBe(HEART_CLEANSER_UPSELL2);
  });
});

// ── Every string a 09 buyer can be shown ─────────────────────────────────────────────

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

const BANNED = /clearing|energy field|our conversation|\breadings?\b/i;
// {firstName} and {upsellPrice} are the only tokens the hooks fill for a page-only buyer.
const UNFILLED_TOKEN = /\{(?!firstName\}|upsellPrice\})[^}]*\}/;

function offending(strings: string[]): string[] {
  return strings.filter((s) => BANNED.test(s) || UNFILLED_TOKEN.test(s));
}

describe('every string reachable in 09’s U1 and U2', () => {
  it('the walker has teeth — it finds V1’s clearing lines and {personName}', () => {
    const v1 = offending(walkU1(V1_UPSELL1).strings);
    expect(v1.some((s) => /clearing/i.test(s))).toBe(true);
    expect(v1.some((s) => s.includes('{personName}'))).toBe(true);
    // pixiu (06) inherits V1's URGENCY onward, so its walk is not clean either.
    expect(offending(walkU2(PIXIU_UPSELL2, 'PATH_A_OPEN').strings).length).toBeGreaterThan(0);
  });

  it('U1 walks CONFIRMATION → … → OFFER through all three questions', () => {
    const { visited } = walkU1(HEART_CLEANSER_UPSELL1);
    expect(visited).toEqual([
      'CONFIRMATION', 'GAP', 'RISK', 'QUESTION_1', 'AFTER_Q1', 'SOLUTION', 'LAVA_INTRO',
      'QUESTION_2', 'AFTER_Q2', 'RITUAL', 'FEEL', 'QUESTION_3', 'AFTER_Q3', 'BUCKET',
      'DELIVERY', 'OFFER',
    ]);
  });

  it('U1 shows no clearing / energy field / our conversation / reading, and no unfilled token', () => {
    expect(offending(walkU1(HEART_CLEANSER_UPSELL1).strings)).toEqual([]);
  });

  it('U2 (both paths) never enters an AI stage and reaches the CTA', () => {
    for (const opener of ['PATH_A_OPEN', 'PATH_B_OPEN'] as const) {
      const { visited } = walkU2(HEART_CLEANSER_UPSELL2, opener);
      expect(visited[visited.length - 1]).toBe('URGENCY');
      expect(visited).not.toContain('MANIFEST_REVEAL');
      expect(visited).not.toContain('MANIFEST_PERSONALIZE');
    }
  });

  it('U2 (both paths) shows no clearing / energy field / our conversation / reading, and no unfilled token', () => {
    expect(offending(walkU2(HEART_CLEANSER_UPSELL2, 'PATH_A_OPEN').strings)).toEqual([]);
    expect(offending(walkU2(HEART_CLEANSER_UPSELL2, 'PATH_B_OPEN').strings)).toEqual([]);
  });
});
