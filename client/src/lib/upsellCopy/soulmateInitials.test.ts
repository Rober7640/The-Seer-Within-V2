// Offer 10 — the Soulmate Initials Reading (Evelyn VSL funnel): U1 + U2 copy test.
//
//   npx vitest run client/src/lib/upsellCopy/soulmateInitials.test.ts
//
// Spec: docs/superpowers/specs/2026-10-12-evelyn-video-funnel-design.md §5.
// Modelled on heartCleanser.test.ts's walker: proves the registry wiring AND
// walks every reachable string in both U1 and U2, failing on "tarot" (copy
// rule: "cards", never "tarot") and on any "clearing ritual" leftover from
// V1/heartCleanser, which would promise a product this buyer never bought.

import { describe, expect, it } from 'vitest';
import { SOULMATE_INITIALS_UPSELL1, SOULMATE_INITIALS_UPSELL2 } from './soulmateInitials';
import { V1_UPSELL1 } from './v1';
import type { Upsell1Chain, Upsell1Copy, Upsell2Chain, Upsell2Copy } from './types';
import {
  UPSELL_QUESTION_2,
  UPSELL_QUESTION_2_REPLIES,
  UPSELL_AFTER_Q2,
  UPSELL_QUESTION_3,
  UPSELL_QUESTION_3_REPLIES,
  UPSELL_AFTER_Q3,
} from '@/lib/upsellMessages';
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
} from '@/lib/upsell2Messages';
import { upsell1CopyForOffer, upsell2CopyForOffer, BACKEND_UPSELL_PITCH } from '@/lib/backendOffers';

describe('offer-keyed pitch registry', () => {
  it('resolves soulmate-initials to its own pitch (the shared upsell pages throw without one)', () => {
    expect(BACKEND_UPSELL_PITCH['soulmate-initials']?.upsell1).toBe(SOULMATE_INITIALS_UPSELL1);
    expect(BACKEND_UPSELL_PITCH['soulmate-initials']?.upsell2).toBe(SOULMATE_INITIALS_UPSELL2);
    expect(upsell1CopyForOffer('soulmate-initials')).toBe(SOULMATE_INITIALS_UPSELL1);
    expect(upsell2CopyForOffer('soulmate-initials')).toBe(SOULMATE_INITIALS_UPSELL2);
  });
});

describe('soulmate-initials (10) U2 chain skips both Claude stages', () => {
  it('never enters MANIFEST_REVEAL / MANIFEST_PERSONALIZE for a page-only buyer', () => {
    expect(SOULMATE_INITIALS_UPSELL2.chain.PATH_A_OPEN).not.toBe('MANIFEST_REVEAL');
    expect(SOULMATE_INITIALS_UPSELL2.chain.PATH_B_OPEN).not.toBe('MANIFEST_REVEAL');
    expect(SOULMATE_INITIALS_UPSELL2.chain.AFTER_Q2).not.toBe('MANIFEST_PERSONALIZE');
  });
});

// ── Every string a 10 buyer can be shown ─────────────────────────────────────

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
        for (const bucket of [undefined, 'love', 'money', 'purpose', 'someone'] as const) {
          strings.push(...copy.bucketMessages(bucket, null));
        }
        break;
      case 'OFFER':
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

// Copy rule: "cards", never "tarot" (brief, verbatim). "clearing ritual" / "energy
// field" / "our conversation" are V1/heartCleanser leftovers that name a product or
// premise this buyer never bought. {firstName} is the only token the hooks fill for
// a page-only buyer.
const BANNED = /tarot|clearing ritual|energy field|our conversation/i;
const UNFILLED_TOKEN = /\{(?!firstName\}|upsellPrice\})[^}]*\}/;

function offending(strings: string[]): string[] {
  return strings.filter((s) => BANNED.test(s) || UNFILLED_TOKEN.test(s));
}

describe('every string reachable in 10’s U1 and U2', () => {
  it('the walker has teeth — it finds V1’s clearing lines', () => {
    const v1 = offending(walkU1(V1_UPSELL1).strings);
    expect(v1.some((s) => /clearing ritual/i.test(s))).toBe(true);
  });

  it('U1 walks CONFIRMATION → … → OFFER through all three questions', () => {
    const { visited } = walkU1(SOULMATE_INITIALS_UPSELL1);
    expect(visited).toEqual([
      'CONFIRMATION', 'GAP', 'RISK', 'QUESTION_1', 'AFTER_Q1', 'SOLUTION', 'LAVA_INTRO',
      'QUESTION_2', 'AFTER_Q2', 'RITUAL', 'FEEL', 'QUESTION_3', 'AFTER_Q3', 'BUCKET',
      'DELIVERY', 'OFFER',
    ]);
  });

  it('U1 shows no "tarot" and no clearing-ritual/energy-field leftovers, and no unfilled token', () => {
    expect(offending(walkU1(SOULMATE_INITIALS_UPSELL1).strings)).toEqual([]);
  });

  it('U2 (both paths) never enters an AI stage and reaches the CTA', () => {
    for (const opener of ['PATH_A_OPEN', 'PATH_B_OPEN'] as const) {
      const { visited } = walkU2(SOULMATE_INITIALS_UPSELL2, opener);
      expect(visited[visited.length - 1]).toBe('URGENCY');
      expect(visited).not.toContain('MANIFEST_REVEAL');
      expect(visited).not.toContain('MANIFEST_PERSONALIZE');
    }
  });

  it('U2 (both paths) shows no "tarot" and no clearing-ritual/energy-field leftovers, and no unfilled token', () => {
    expect(offending(walkU2(SOULMATE_INITIALS_UPSELL2, 'PATH_A_OPEN').strings)).toEqual([]);
    expect(offending(walkU2(SOULMATE_INITIALS_UPSELL2, 'PATH_B_OPEN').strings)).toEqual([]);
  });
});
