// Isolation guard for the /fb-read bump routing (Lewis, 2026-09-01).
//
// One behaviour was added: an /fb-read bump order stamps its own `bumpProduct`
// (`read_lander_addon`) so its buyers stay OFF the order-bump paid list 6969209,
// whose follow-up promises a second reading they are not sent.
//
// The ONLY question this file exists to answer is: can that reach anything else?
// Every non-read case below is a funnel that must be left EXACTLY as it was.
//
// Run: npx vitest run tests/read-lander-bump-isolation.test.ts

import { describe, it, expect } from 'vitest';
import { bumpProductKeyFor, bumpPaidListWanted } from '@shared/landerBumpRouting';
import {
  V1_BUMP_PRODUCT_KEY,
  V1_BUMP_PRODUCT_KEY_DOWNSELL,
  V1_BUMP_PRODUCT_KEY_MONEY_LANDER,
  V1_BUMP_PRODUCT_KEY_READ_LANDER,
  V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER,
} from '@shared/orderBump';
import { FUNNELS } from '@shared/funnelConfig';

describe('/fb-read bump key — the value itself', () => {
  it('is the agreed key', () => {
    expect(V1_BUMP_PRODUCT_KEY_READ_LANDER).toBe('read_lander_addon');
  });

  // 🔴 THE POINT OF THE WHOLE CHANGE. Mike's n8n filter is an EQUALS on
  // `double_reading`, but a CONTAINS filter must fail too — `double_reading_read`
  // would satisfy a contains-check and generate the PDF anyway, silently undoing
  // this. Same rule the money, soulmate and downsell keys are held to.
  it('fails BOTH an equals and a contains check against double_reading', () => {
    expect(V1_BUMP_PRODUCT_KEY_READ_LANDER).not.toBe(V1_BUMP_PRODUCT_KEY);
    expect(V1_BUMP_PRODUCT_KEY_READ_LANDER).not.toContain(V1_BUMP_PRODUCT_KEY);
    expect(V1_BUMP_PRODUCT_KEY_READ_LANDER).not.toContain('double_reading');
  });

  it('is distinct from every other family key', () => {
    const keys = [
      V1_BUMP_PRODUCT_KEY,
      V1_BUMP_PRODUCT_KEY_MONEY_LANDER,
      V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER,
      V1_BUMP_PRODUCT_KEY_DOWNSELL,
      V1_BUMP_PRODUCT_KEY_READ_LANDER,
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('/fb-read stamps its own key', () => {
  it('on the main tier', () => {
    expect(bumpProductKeyFor('v1-read', 'love')).toBe(V1_BUMP_PRODUCT_KEY_READ_LANDER);
  });

  // Every device on the funnel, present and future — the routing is funnel-level
  // by design, so `bucket` must not be able to move it.
  it('regardless of bucket', () => {
    for (const bucket of ['love', 'money', 'purpose', 'someone', undefined, null, '']) {
      expect(bumpProductKeyFor('v1-read', bucket)).toBe(V1_BUMP_PRODUCT_KEY_READ_LANDER);
    }
  });

  // The downsell branch sits AFTER the read branch, so a read downsell keeps the
  // read key. Both are excluded from the list, so the outcome is the same either
  // way — but pin it, so a reorder is a failing test rather than a silent change.
  it('on the downsell tier too', () => {
    expect(bumpProductKeyFor('v1-read', 'love', undefined, 'downsell')).toBe(
      V1_BUMP_PRODUCT_KEY_READ_LANDER,
    );
  });
});

describe('nothing else moved', () => {
  // The isolation assertion. Every OTHER funnel must still stamp what it stamped
  // before this change existed.
  it('leaves every non-read funnel on the default key', () => {
    for (const f of FUNNELS) {
      if (f.param === 'v1-read') continue;
      expect(bumpProductKeyFor(f.param, 'love'), `${f.param} must be untouched`).toBe(
        V1_BUMP_PRODUCT_KEY,
      );
    }
    expect(bumpProductKeyFor(undefined, 'love')).toBe(V1_BUMP_PRODUCT_KEY);
    expect(bumpProductKeyFor(null, 'love')).toBe(V1_BUMP_PRODUCT_KEY);
  });

  // A near-miss must NOT be treated as read traffic.
  it('does not fire on a lookalike funnel value', () => {
    for (const near of ['v1-reading', 'read', 'V1-READ', 'v1-read ', ' v1-read']) {
      expect(bumpProductKeyFor(near, 'love'), `${JSON.stringify(near)}`).toBe(
        V1_BUMP_PRODUCT_KEY,
      );
    }
  });
});

describe('the AWeber bump-paid list', () => {
  it('refuses an /fb-read order', () => {
    expect(bumpPaidListWanted(V1_BUMP_PRODUCT_KEY_READ_LANDER)).toBe(false);
  });

  // End to end: the value a real read order stamps is the value the list check sees.
  // Asserting the constant alone would pass even if the branch never fired.
  it('refuses the key a real /fb-read order actually stamps', () => {
    expect(bumpPaidListWanted(bumpProductKeyFor('v1-read', 'love'))).toBe(false);
    expect(bumpPaidListWanted(bumpProductKeyFor('v1-read', 'love', undefined, 'downsell'))).toBe(
      false,
    );
  });

  // 🔴 The other half: tarot and palm must STILL be written. If this flips, the
  // change stopped being an addition and started being a regression.
  it('still accepts what tarot and palm stamp', () => {
    expect(bumpPaidListWanted(bumpProductKeyFor('v1-tarot', 'love'))).toBe(true);
    expect(bumpPaidListWanted(bumpProductKeyFor('v1-palm', 'love'))).toBe(true);
    expect(bumpPaidListWanted(V1_BUMP_PRODUCT_KEY)).toBe(true);
  });
});
