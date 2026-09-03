import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { beUpsellOrders } from './schema';

describe('be_upsell_orders schema', () => {
  it('is named be_upsell_orders and carries the attribution columns', () => {
    const cfg = getTableConfig(beUpsellOrders);
    expect(cfg.name).toBe('be_upsell_orders');
    const cols = Object.fromEntries(cfg.columns.map((c) => [c.name, c]));
    expect(cols['offer']).toBeTruthy();
    expect(cols['offer_number']).toBeTruthy();
    expect(cols['product']).toBeTruthy();
    expect(cols['tier']).toBeTruthy();
    expect(cols['amount_cents']).toBeTruthy();
    // The idempotency key must be unique.
    expect(cols['stripe_payment_intent_id'].isUnique).toBe(true);
  });
});
