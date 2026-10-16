// npx vitest run client/src/lib/upsellCopy/retargetUpsell2.test.ts
import { describe, expect, it } from 'vitest';
import {
  RETARGET_U2_PERSONALIZE,
  RETARGET_U2_REVEAL,
  retargetUpsell2Copy,
  upsell2CopyOverrideFor,
} from './retargetUpsell2';
import { V1_UPSELL2 } from './v1';

describe('U2 copy selection — retarget buyers get fixed copy, everyone else the AI path', () => {
  it('no override for a normal buyer (the hook falls back to V1_UPSELL2 ⇒ REVEAL null ⇒ AI call)', () => {
    expect(upsell2CopyOverrideFor(null)).toBeUndefined();
    expect(upsell2CopyOverrideFor({ bucket: 'love' })).toBeUndefined();
    expect(upsell2CopyOverrideFor({ retarget: false, retargetBucket: 'love' })).toBeUndefined();
    // Only a real boolean true from the server counts.
    expect(upsell2CopyOverrideFor({ retarget: 'true' as any, retargetBucket: 'love' })).toBeUndefined();
    expect(V1_UPSELL2.REVEAL).toBeNull();
    expect(V1_UPSELL2.PERSONALIZE).toBeNull();
  });

  it('retarget love → fixed love reveal + personalise; money → money', () => {
    const love = upsell2CopyOverrideFor({ retarget: true, retargetBucket: 'love' })!;
    expect(love.REVEAL).toEqual(RETARGET_U2_REVEAL.love);
    expect(love.PERSONALIZE).toEqual(RETARGET_U2_PERSONALIZE.love);
    const money = upsell2CopyOverrideFor({ retarget: true, retargetBucket: 'money' })!;
    expect(money.REVEAL).toEqual(RETARGET_U2_REVEAL.money);
    expect(money.PERSONALIZE).toEqual(RETARGET_U2_PERSONALIZE.money);
  });

  it('topic falls back to her row bucket, then love', () => {
    expect(upsell2CopyOverrideFor({ retarget: true, retargetBucket: null, bucket: 'money' })!.REVEAL).toEqual(
      RETARGET_U2_REVEAL.money,
    );
    expect(upsell2CopyOverrideFor({ retarget: true, retargetBucket: null, bucket: 'specific' })!.REVEAL).toEqual(
      RETARGET_U2_REVEAL.love,
    );
  });

  it('everything except the two AI beats is V1 live copy, by reference', () => {
    const c = retargetUpsell2Copy('money');
    for (const k of Object.keys(V1_UPSELL2) as (keyof typeof V1_UPSELL2)[]) {
      if (k === 'REVEAL' || k === 'PERSONALIZE') continue;
      expect(c[k], k).toBe(V1_UPSELL2[k]);
    }
  });

  it('fixed lines: first name only, 2-3 bubbles under 25 words, no price / guarantee / person', () => {
    for (const set of [RETARGET_U2_REVEAL, RETARGET_U2_PERSONALIZE]) {
      for (const lines of Object.values(set)) {
        expect(lines.length).toBeGreaterThanOrEqual(2);
        expect(lines.length).toBeLessThanOrEqual(3);
        for (const l of lines) {
          expect(l.split(/\s+/).length, l).toBeLessThan(25);
          expect(l).not.toMatch(/\$|guarantee|refund|money back|\{personName\}|\{concern\}|you told me/i);
        }
        expect(lines.join(' ')).toContain('{firstName}');
      }
    }
  });
});
