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
  it('U1 bucket block keeps V1 msgs 2&3 and 03 msgs 1&4 for `someone`', () => {
    const msgs = JUDGEMENT_UPSELL1.bucketMessages('someone', 'Alex');
    expect(msgs.join(' ')).toContain('Alex'); // personName merge in msg 1/4
  });
  it('U2 opens on the 03 path beats and reuses V1 for the rest', () => {
    expect(JUDGEMENT_UPSELL2.PATH_A_OPEN[0]).toContain('page and the stone');
    expect(JUDGEMENT_UPSELL2.PATH_B_OPEN.length).toBe(6);
    expect(JUDGEMENT_UPSELL2.PRICE.length).toBeGreaterThan(0); // inherited from V1
  });
});
