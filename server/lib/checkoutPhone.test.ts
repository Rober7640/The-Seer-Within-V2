// Which funnels get the compulsory phone field on the main Stripe Checkout.
// Since 2026-09-24 every V1 reading funnel does: root, /fb, /fb2, /gdn,
// /fb-palm, /fb-read and /fb-tarot.
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

  it('every ad funnel collects the phone', () => {
    for (const f of ['v1-fb', 'v1-fb2', 'v1-gdn', 'v1-palm', 'v1-read', 'v1-tarot'] as const) {
      expect(collectsPhoneAtCheckout(f), f).toBe(true);
    }
  });

  it('the allow-list is exactly the registered funnels (a new funnel must be placed deliberately)', () => {
    const registered = FUNNELS.map((f) => f.param).sort();
    const withPhone = FUNNELS.filter((f) => collectsPhoneAtCheckout(f.param)).map((f) => f.param).sort();
    expect(registered).toEqual(['v1-fb', 'v1-fb2', 'v1-gdn', 'v1-palm', 'v1-read', 'v1-tarot']);
    expect(withPhone).toEqual(registered);
  });
});
