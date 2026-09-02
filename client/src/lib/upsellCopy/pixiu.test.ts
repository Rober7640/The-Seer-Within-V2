import { describe, expect, it } from 'vitest';
import { PIXIU_UPSELL1, PIXIU_UPSELL2 } from './pixiu';
import { UPSELL_BUCKET_MESSAGES } from '@/lib/upsellMessages';

describe('pixiu (06) upsell copy', () => {
  it('U1 opens on the 06 shipping-wait confirmation beats', () => {
    expect(PIXIU_UPSELL1.CONFIRMATION[0]).toContain("Bixie's ordered");
    expect(PIXIU_UPSELL1.CONFIRMATION.length).toBe(3);
  });
  it('U1 keeps the question and its three replies', () => {
    expect(PIXIU_UPSELL1.QUESTION_1).toContain('closed your fingers');
    expect(PIXIU_UPSELL1.QUESTION_1_REPLIES.map((r) => r.value)).toEqual(['yes', 'maybe', 'unsure']);
    expect(Object.keys(PIXIU_UPSELL1.AFTER_Q1)).toEqual(
      expect.arrayContaining(['yes', 'maybe', 'unsure', 'default']),
    );
  });
  it('U1 bucket block is universal — reuses V1 MONEY verbatim, non-empty with no bucket/person, carries the left-wrist mechanic', () => {
    // Page-only 06 supplies no bucket and no personName.
    const msgs = PIXIU_UPSELL1.bucketMessages(undefined, null);
    expect(msgs.length).toBeGreaterThan(0);
    // Verbatim reuse of V1's money block — the wealth guardian's own theme.
    expect(msgs).toEqual(UPSELL_BUCKET_MESSAGES.money);
    expect(msgs.join(' ')).toContain('LEFT wrist'); // the mechanic DELIVERY depends on
    // De-personalized: no {personName} token anywhere in the block.
    expect(msgs.join(' ')).not.toContain('{personName}');
  });
  it('U2 opens on the 06 path beats and reuses V1 for the rest', () => {
    expect(PIXIU_UPSELL2.PATH_A_OPEN[0]).toContain('both are confirmed');
    expect(PIXIU_UPSELL2.PATH_B_OPEN.length).toBe(6);
    expect(PIXIU_UPSELL2.PATH_B_OPEN.join(' ')).toContain('horns');
    expect(PIXIU_UPSELL2.PRICE.length).toBeGreaterThan(0); // inherited from V1
  });
  it('U2 chain skips the Claude reveal so no live call fires for a page-only buyer', () => {
    expect(PIXIU_UPSELL2.chain.PATH_A_OPEN).not.toBe('MANIFEST_REVEAL');
    expect(PIXIU_UPSELL2.chain.PATH_B_OPEN).not.toBe('MANIFEST_REVEAL');
    expect(PIXIU_UPSELL2.chain.AFTER_Q2).not.toBe('MANIFEST_PERSONALIZE');
  });
});
