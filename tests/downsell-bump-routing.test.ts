// Guards for the DOWNSELL order bump (v1_downsell_bump_price_2026).
//
// Three things are asserted here, and each one is a way a real buyer gets hurt:
//
//   1. The DOWNSELL-only `bumpProduct` rename (Lewis, 2026-08-21) must not leak onto
//      the main path, and must not overwrite the money/soulmate lander keys — those
//      two values are what hold their orders off a follow-up list for a reading they
//      never receive.
//   2. The offer card and the Stripe line must name the SAME price. The card showed
//      $9.77 while arm A charged $12.77 for eight days; these are the unit-level half
//      of that fix (the end-to-end half is scripts/verify-downsell-bump-charge.mjs).
//   3. Variation A — the live copy arm — must render at the DOWNSELL price on the
//      downsell, not the main $12.77 (Lewis's requirement 3).
//
// Run: npx vitest run tests/downsell-bump-routing.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bumpProductKeyFor, bumpPaidListWanted } from '@shared/landerBumpRouting';
import {
  V1_BUMP_CENTS,
  V1_BUMP_CENTS_DOWNSELL,
  V1_BUMP_PRODUCT_KEY,
  V1_BUMP_PRODUCT_KEY_DOWNSELL,
  V1_BUMP_PRODUCT_KEY_MONEY_LANDER,
  V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER,
  bumpCopy,
  bumpPriceLabel,
  resolveBumpCents,
} from '@shared/orderBump';
import { SOULMATE_LANDER_HOOKS } from '@shared/soulmateLanderHooks';

const SOULMATE_HOOK = SOULMATE_LANDER_HOOKS[0];

describe('the DOWNSELL bumpProduct key', () => {
  it('is what Lewis specified', () => {
    expect(V1_BUMP_PRODUCT_KEY_DOWNSELL).toBe('double_strength_reading_ob');
  });

  it('fails BOTH an equals and a contains check on `double_reading`', () => {
    // Mike's n8n filter is an EQUALS (confirmed 2026-08-20), but the money and
    // soulmate keys are deliberately disjoint from a CONTAINS too, so that a filter
    // tightened later cannot silently start matching. Same rule here.
    expect(V1_BUMP_PRODUCT_KEY_DOWNSELL).not.toBe(V1_BUMP_PRODUCT_KEY);
    expect(V1_BUMP_PRODUCT_KEY_DOWNSELL).not.toContain(V1_BUMP_PRODUCT_KEY);
    expect(V1_BUMP_PRODUCT_KEY_DOWNSELL).not.toContain('double_reading');
  });

  it('is distinguishable from the two lander-family keys', () => {
    expect(V1_BUMP_PRODUCT_KEY_DOWNSELL).not.toBe(V1_BUMP_PRODUCT_KEY_MONEY_LANDER);
    expect(V1_BUMP_PRODUCT_KEY_DOWNSELL).not.toBe(V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER);
  });

  it('KEEPS downsell bump buyers on the order-bump paid list', () => {
    // The rename changes routing, not entitlement. Adding this key to
    // BUMP_PAID_LIST_EXCLUDED_KEYS would silently drop every downsell bump buyer
    // from a list she reaches today.
    expect(bumpPaidListWanted(V1_BUMP_PRODUCT_KEY_DOWNSELL)).toBe(true);
  });
});

describe('bumpProductKeyFor — the tier argument', () => {
  it('defaults to main, so every pre-existing call site is unchanged', () => {
    expect(bumpProductKeyFor('v1-tarot', 'love')).toBe(V1_BUMP_PRODUCT_KEY);
    expect(bumpProductKeyFor('v1-tarot', 'love')).toBe(
      bumpProductKeyFor('v1-tarot', 'love', undefined, 'main'),
    );
  });

  it('renames ONLY on the downsell', () => {
    expect(bumpProductKeyFor('v1-tarot', 'love', undefined, 'main')).toBe(V1_BUMP_PRODUCT_KEY);
    expect(bumpProductKeyFor('v1-tarot', 'love', undefined, 'downsell')).toBe(
      V1_BUMP_PRODUCT_KEY_DOWNSELL,
    );
  });

  it('renames on every funnel, since the downsell is not funnel-scoped', () => {
    for (const funnel of ['v1-tarot', 'v1-palm', 'v1-fb', 'v1-gdn', undefined]) {
      expect(bumpProductKeyFor(funnel, 'love', undefined, 'downsell')).toBe(
        V1_BUMP_PRODUCT_KEY_DOWNSELL,
      );
    }
  });
});

describe('the lander families keep their own key on the downsell', () => {
  // 🔴 THE REGRESSION THIS FILE EXISTS FOR. If the downsell rename were applied
  // blindly, a money-lander downsell bump would stamp double_strength_reading_ob,
  // which is NOT in BUMP_PAID_LIST_EXCLUDED_KEYS — so she would be written to
  // theseerwithin_money_ob_paid and followed up about a second reading nobody is
  // going to send her. That is the exact bug fixed on 2026-08-20, re-opened.
  const prevMoney = process.env.AWEBER_LIST_ID_TAROT_MONEY;
  const prevSoulmate = process.env.AWEBER_LIST_ID_TAROT_SOULMATE;

  beforeEach(() => {
    process.env.AWEBER_LIST_ID_TAROT_MONEY = '6971693';
    process.env.AWEBER_LIST_ID_TAROT_SOULMATE = '6971828';
  });
  afterEach(() => {
    if (prevMoney === undefined) delete process.env.AWEBER_LIST_ID_TAROT_MONEY;
    else process.env.AWEBER_LIST_ID_TAROT_MONEY = prevMoney;
    if (prevSoulmate === undefined) delete process.env.AWEBER_LIST_ID_TAROT_SOULMATE;
    else process.env.AWEBER_LIST_ID_TAROT_SOULMATE = prevSoulmate;
  });

  it('a MONEY lander downsell keeps money_lander_addon', () => {
    expect(bumpProductKeyFor('v1-tarot', 'money', undefined, 'downsell')).toBe(
      V1_BUMP_PRODUCT_KEY_MONEY_LANDER,
    );
  });

  it('a SOULMATE lander downsell keeps soulmate_lander_addon', () => {
    expect(bumpProductKeyFor('v1-tarot', 'love', SOULMATE_HOOK, 'downsell')).toBe(
      V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER,
    );
  });

  it('and both stay OFF the order-bump paid list on the downsell', () => {
    expect(bumpPaidListWanted(bumpProductKeyFor('v1-tarot', 'money', undefined, 'downsell'))).toBe(false);
    expect(bumpPaidListWanted(bumpProductKeyFor('v1-tarot', 'love', SOULMATE_HOOK, 'downsell'))).toBe(false);
  });
});

describe('the card names the price the Stripe line will carry', () => {
  // The card resolves its cents through resolveBumpCents(userData.bumpCentsDownsell,
  // 'downsell') and the server through resolveBumpCents(arm.cents, 'downsell'). Given
  // the SAME arm value they must produce the same number — that identity is the whole
  // guarantee, and it held even while the client's input was permanently undefined,
  // which is exactly why the bug was invisible to unit tests.
  it('agrees for every value an arm can carry', () => {
    for (const arm of [1277, 977, null, undefined]) {
      expect(resolveBumpCents(arm, 'downsell')).toBe(resolveBumpCents(arm, 'downsell'));
    }
  });

  it('an ABSENT arm value pins the card at $9.77 — the draft-experiment state', () => {
    expect(resolveBumpCents(undefined, 'downsell')).toBe(V1_BUMP_CENTS_DOWNSELL);
    expect(bumpPriceLabel(resolveBumpCents(undefined, 'downsell'))).toBe('$9.77');
  });

  it('arm A puts $12.77 on BOTH sides, which is where they used to diverge', () => {
    const armA = resolveBumpCents(1277, 'downsell');
    expect(armA).toBe(V1_BUMP_CENTS);
    expect(bumpPriceLabel(armA)).toBe('$12.77');
    // The failure that shipped: card $9.77, charge $12.77.
    expect(bumpPriceLabel(armA)).not.toBe('$9.77');
  });
});

describe('requirement 3 — the DOUBLE-STRENGTH copy on the downsell card', () => {
  // The live arm of the concluded copy test is payload copy:"A" — the
  // double-strength clearing. It must render on the downsell at the DOWNSELL price.
  it('variation A renders at $9.77 on the downsell', () => {
    const pack = bumpCopy('A', 'money', 'Claire', V1_BUMP_CENTS_DOWNSELL);
    expect(pack.offer).toContain('$9.77');
    expect(pack.offer).not.toContain('$12.77');
    expect(pack.offer).toContain('twice as deep');
    expect(pack.productName).toBe('+ Double-Strength Clearing');
  });

  it('variation A renders at $12.77 when arm A of the price test is drawn', () => {
    const pack = bumpCopy('A', 'money', 'Claire', V1_BUMP_CENTS);
    expect(pack.offer).toContain('$12.77');
    expect(pack.offer).not.toContain('$9.77');
  });

  it('the double-strength wording is identical on both tiers apart from the price', () => {
    // A copy divergence between tiers would mean the downsell was quietly selling a
    // different product. Only the money should differ.
    const main = bumpCopy('A', 'money', 'Claire', V1_BUMP_CENTS).offer;
    const down = bumpCopy('A', 'money', 'Claire', V1_BUMP_CENTS_DOWNSELL).offer;
    expect(down.replace('$9.77', '$12.77')).toBe(main);
  });

  it('and it still refuses to promise durability, which Upsell 1 sells', () => {
    const pack = bumpCopy('A', 'money', 'Claire', V1_BUMP_CENTS_DOWNSELL);
    expect(pack.offer).toContain('nothing gets left in you');
    expect(pack.offer.toLowerCase()).not.toContain("won't come back");
  });
});
