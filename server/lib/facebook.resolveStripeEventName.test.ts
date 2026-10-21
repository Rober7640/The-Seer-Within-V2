// The money-wall: resolveStripeEventName gates EVERY be_* backend product behind
// `metadata.funnel === 'evelyn_vsl'`. Every other backend offer (02, 03, 06, 07,
// 08, 09) has no `metadata.funnel` key at all, so if this gate ever regressed to
// something looser (e.g. `product.startsWith('be_')` alone), a Meta Purchase
// would silently fire for every backend offer's checkout, not just Evelyn VSL's.
//
//   npx vitest run server/lib/facebook.resolveStripeEventName.test.ts
//
// This test PINS existing behavior — it is not new behavior. If it fails against
// current code, the gate has already changed; fix the regression, not this test.

import { describe, expect, it } from 'vitest';
import { resolveStripeEventName } from './facebook';

describe('resolveStripeEventName — the evelyn_vsl money wall', () => {
  it('fires Purchase for be_soulmate_initials ONLY when funnel=evelyn_vsl', () => {
    expect(resolveStripeEventName('be_soulmate_initials', 'evelyn_vsl')).toBe('Purchase');
  });

  it('walls off be_soulmate_initials when funnel is undefined', () => {
    expect(resolveStripeEventName('be_soulmate_initials', undefined)).toBeNull();
  });

  it('walls off be_soulmate_initials when funnel is some other string', () => {
    expect(resolveStripeEventName('be_soulmate_initials', 'something-else')).toBeNull();
  });

  it('walls off another backend product (be_twin_flame) with no funnel', () => {
    expect(resolveStripeEventName('be_twin_flame', undefined)).toBeNull();
  });

  it('walls off be_twin_flame even if someone mistakenly passed evelyn_vsl', () => {
    // be_twin_flame is not in the evelyn_vsl switch at all — the gate is
    // per-product, not just per-funnel. Confirms the wall is a real allowlist,
    // not just a funnel flag that would let ANY be_* through once set.
    expect(resolveStripeEventName('be_twin_flame', 'evelyn_vsl')).toBeNull();
  });

  it('gates the evelyn_vsl bump (be_protection_ritual) the same way', () => {
    expect(resolveStripeEventName('be_protection_ritual', 'evelyn_vsl')).toBe('Upsell');
    expect(resolveStripeEventName('be_protection_ritual', undefined)).toBeNull();
  });

  it('gates the evelyn_vsl U2 product (be_bracelet) the same way', () => {
    expect(resolveStripeEventName('be_bracelet', 'evelyn_vsl')).toBe('Upsell2');
    expect(resolveStripeEventName('be_bracelet', undefined)).toBeNull();
  });

  it('leaves a non-be_ / frontend product path unaffected by the wall', () => {
    // manifestation_bracelet is V1's own product, resolved by funnelDefForParam
    // (not the evelyn_vsl gate) — asserting existing behavior, not changing it.
    expect(resolveStripeEventName('manifestation_bracelet', undefined)).toBe('Upsell');
    expect(resolveStripeEventName('energy_clearing_ritual', undefined)).toBe('Purchase');
  });
});
