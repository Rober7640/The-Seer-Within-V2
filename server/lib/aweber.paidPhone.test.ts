// Unit tests for the `phone` custom field on the V1 PAID list write
// (addPaidSubscriber). Only root-funnel buyers have a phone — Stripe Checkout
// collects it there and nowhere else — so two things must hold:
//
//  1. NO PHONE ⇒ THE BODY IS UNCHANGED. Every other funnel's paid-list write must
//     be byte-identical to before: custom_fields carries stripe_order_id only.
//
//  2. THE MISSING-FIELD RETRY. AWeber rejects the whole request for a custom field
//     the list doesn't define. If `phone` isn't created on the paid list, a root
//     buyer must still land — retried without the phone, but KEEPING
//     stripe_order_id (unlike addSubscriberToList, which drops every field).
//
// No network: global fetch is stubbed. Run:
//   npx vitest run server/lib/aweber.paidPhone.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addPaidSubscriber } from './aweber';

const ENV_KEYS = [
  'AWEBER_ACCOUNT_ID',
  'AWEBER_PAID_LIST_ID',
  'AWEBER_ACCESS_TOKEN',
  'AWEBER_REFRESH_TOKEN',
] as const;

describe('addPaidSubscriber phone', () => {
  const saved: Record<string, string | undefined> = {};
  let realFetch: typeof globalThis.fetch;
  let bodies: Array<Record<string, unknown>>;

  function respondWith(queue: Array<{ status: number; body?: string }>) {
    let i = 0;
    globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body ?? '{}')));
      const next = queue[i++] ?? { status: 201 };
      return new Response(next.body ?? '{}', { status: next.status });
    }) as unknown as typeof globalThis.fetch;
  }

  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    process.env.AWEBER_ACCOUNT_ID = 'acct-test';
    process.env.AWEBER_PAID_LIST_ID = 'paid-test';
    process.env.AWEBER_ACCESS_TOKEN = 'token-test';
    process.env.AWEBER_REFRESH_TOKEN = 'refresh-test';
    realFetch = globalThis.fetch;
    bodies = [];
    respondWith([]);
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const base = { email: 'a@example.com', name: 'A', stripeOrderId: 'pi_123', tags: ['love', 'paid'] };

  it('without a phone, sends stripe_order_id only (every non-root funnel)', async () => {
    const r = await addPaidSubscriber(base);

    expect(r.success).toBe(true);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toEqual({
      email: 'a@example.com',
      update_existing: true,
      custom_fields: { stripe_order_id: 'pi_123' },
      name: 'A',
      tags: ['love', 'paid'],
    });
  });

  it('with a phone, sends it beside stripe_order_id', async () => {
    const r = await addPaidSubscriber({ ...base, phone: '+15555550123' });

    expect(r.success).toBe(true);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].custom_fields).toEqual({ stripe_order_id: 'pi_123', phone: '+15555550123' });
  });

  it('retries WITHOUT the phone (keeping stripe_order_id) when the list rejects it', async () => {
    respondWith([
      { status: 400, body: JSON.stringify({ error: { message: 'unknown custom field phone' } }) },
    ]);

    const r = await addPaidSubscriber({ ...base, phone: '+15555550123' });

    expect(r.success).toBe(true);
    expect(bodies).toHaveLength(2);
    expect(bodies[1].custom_fields).toEqual({ stripe_order_id: 'pi_123' });
    expect(bodies[1].tags).toEqual(['love', 'paid']);
  });

  it('does not retry a no-phone 400 (unchanged behaviour)', async () => {
    respondWith([{ status: 400, body: JSON.stringify({ error: { message: 'bad request' } }) }]);

    const r = await addPaidSubscriber(base);

    expect(r.success).toBe(false);
    expect(bodies).toHaveLength(1);
  });

  it('does not retry when the 400 is "already subscribed"', async () => {
    respondWith([
      { status: 400, body: JSON.stringify({ error: { message: 'Subscriber already subscribed' } }) },
    ]);

    const r = await addPaidSubscriber({ ...base, phone: '+15555550123' });

    expect(r.success).toBe(true);
    expect(bodies).toHaveLength(1);
  });

  it('reports failure when both attempts fail', async () => {
    respondWith([
      { status: 400, body: JSON.stringify({ error: { message: 'unknown custom field phone' } }) },
      { status: 500, body: 'server error' },
    ]);

    const r = await addPaidSubscriber({ ...base, phone: '+15555550123' });

    expect(r.success).toBe(false);
    expect(bodies).toHaveLength(2);
  });
});
