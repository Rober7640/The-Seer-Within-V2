// Which funnels get the compulsory phone field on the main Stripe Checkout.
// Root, /fb and /fb-tarot do; /fb2, /gdn, /fb-palm and /fb-read must NOT.
//
// Run:
//   npx vitest run server/lib/checkoutPhone.test.ts

import { describe, it, expect } from 'vitest';
import { collectsPhoneAtCheckout } from './checkoutPhone';
import { FUNNELS } from '@shared/funnelConfig';

describe('collectsPhoneAtCheckout', () => {
  it('root (no funnel param) collects the phone', () => {
    expect(collectsPhoneAtCheckout(undefined)).toBe(true);
  });

  it('/fb and /fb-tarot collect the phone', () => {
    expect(collectsPhoneAtCheckout('v1-fb')).toBe(true);
    expect(collectsPhoneAtCheckout('v1-tarot')).toBe(true);
  });

  it('/fb2, /gdn, /fb-palm and /fb-read do NOT', () => {
    expect(collectsPhoneAtCheckout('v1-fb2')).toBe(false);
    expect(collectsPhoneAtCheckout('v1-gdn')).toBe(false);
    expect(collectsPhoneAtCheckout('v1-palm')).toBe(false);
    expect(collectsPhoneAtCheckout('v1-read')).toBe(false);
  });

  it('every registered funnel is exactly one of the two sets (no new funnel slips in)', () => {
    const withPhone = FUNNELS.filter((f) => collectsPhoneAtCheckout(f.param)).map((f) => f.param);
    expect(withPhone.sort()).toEqual(['v1-fb', 'v1-tarot']);
  });
});
