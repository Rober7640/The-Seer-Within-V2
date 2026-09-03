import { describe, expect, it } from 'vitest';
import { JUDGEMENT_UPSELL1, JUDGEMENT_UPSELL2 } from './judgement';

describe('judgement (03) upsell copy', () => {
  it('U1 opens on the 03 confirmation beats', () => {
    expect(JUDGEMENT_UPSELL1.CONFIRMATION[0]).toContain('page is open');
    expect(JUDGEMENT_UPSELL1.CONFIRMATION.length).toBe(3);
  });
  it('U1 keeps the strongest question and its three replies', () => {
    expect(JUDGEMENT_UPSELL1.QUESTION_1).toContain('holding a little back');
    expect(JUDGEMENT_UPSELL1.QUESTION_1_REPLIES.map((r) => r.value)).toEqual(['yes', 'maybe', 'unsure']);
    expect(Object.keys(JUDGEMENT_UPSELL1.AFTER_Q1)).toEqual(expect.arrayContaining(['yes', 'maybe', 'unsure', 'default']));
  });
  it('U1 bucket block is universal — non-empty even with no bucket/person, and carries the left-wrist mechanic', () => {
    // Page-only 03 supplies no bucket and no personName.
    const msgs = JUDGEMENT_UPSELL1.bucketMessages(undefined, null);
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs.join(' ')).toContain('LEFT wrist'); // the mechanic DELIVERY depends on
    // De-personalized: no {personName} token anywhere in the block.
    expect(msgs.join(' ')).not.toContain('{personName}');
  });
  it('U2 opens on the 03 path beats and reuses V1 for the rest', () => {
    expect(JUDGEMENT_UPSELL2.PATH_A_OPEN[0]).toContain('page and the stone');
    expect(JUDGEMENT_UPSELL2.PATH_B_OPEN.length).toBe(6);
    expect(JUDGEMENT_UPSELL2.PRICE.length).toBeGreaterThan(0); // inherited from V1
  });
  it('U2 chain skips the Claude reveal so no live call fires for a page-only buyer', () => {
    // Neither path open may route into MANIFEST_REVEAL (which would POST
    // bucket:null to /api/upsell2/reading and 400).
    expect(JUDGEMENT_UPSELL2.chain.PATH_A_OPEN).not.toBe('MANIFEST_REVEAL');
    expect(JUDGEMENT_UPSELL2.chain.PATH_B_OPEN).not.toBe('MANIFEST_REVEAL');
    // And MANIFEST_PERSONALIZE must be unreachable: its only predecessor is
    // AFTER_Q2, which must route past it.
    expect(JUDGEMENT_UPSELL2.chain.AFTER_Q2).not.toBe('MANIFEST_PERSONALIZE');
  });
});
