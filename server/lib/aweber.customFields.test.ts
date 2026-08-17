// Unit tests for custom-field handling in addSubscriberToList() — the plumbing
// that carries `resume_url` (the per-person recovery link) onto the V1 lead
// write.
//
// Two behaviours here are load-bearing and easy to regress silently:
//
//  1. THE WIPE GUARD. AWeber treats `custom_fields: {}` together with
//     `update_existing: true` as "clear every custom field" on that subscriber.
//     This already bit the soulmate list once — a decline-tag call carrying no
//     custom fields ran ~11s after a purchase and wiped three populated values.
//     So the key must be ABSENT, not empty, whenever there's nothing to set.
//
//  2. THE MISSING-FIELD RETRY. Custom fields are per-LIST, not per-account. A
//     field the list doesn't define is rejected for the whole request, which
//     would cost us the subscriber and not just the field — so standing up a
//     new per-lander list (AWEBER_LIST_ID_TAROT etc.) without creating
//     `resume_url` on it would otherwise silently stop that funnel's leads
//     reaching AWeber at all.
//
// No network: global fetch is stubbed. Run:
//   npx vitest run server/lib/aweber.customFields.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addSubscriberToList } from './aweber';

const ENV_KEYS = [
  'AWEBER_ACCOUNT_ID',
  'AWEBER_LIST_ID',
  'AWEBER_ACCESS_TOKEN',
  'AWEBER_REFRESH_TOKEN',
] as const;

describe('addSubscriberToList custom fields', () => {
  const saved: Record<string, string | undefined> = {};
  let realFetch: typeof globalThis.fetch;
  // Every request body the code sent, in order.
  let bodies: Array<Record<string, unknown>>;

  // Queue the responses fetch should hand back, oldest first. Anything beyond
  // the queue is a 201, so the happy path needs no setup.
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
    process.env.AWEBER_LIST_ID = 'list-test';
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

  it('omits custom_fields entirely when none are supplied (wipe guard)', async () => {
    const r = await addSubscriberToList({ email: 'a@example.com', name: 'A' });

    expect(r.success).toBe(true);
    expect(bodies).toHaveLength(1);
    expect('custom_fields' in bodies[0]).toBe(false);
    // The write must still be an update_existing upsert, as before.
    expect(bodies[0].update_existing).toBe(true);
  });

  it('omits custom_fields when an EMPTY object is supplied (wipe guard)', async () => {
    const r = await addSubscriberToList({ email: 'a@example.com', customFields: {} });

    expect(r.success).toBe(true);
    expect('custom_fields' in bodies[0]).toBe(false);
  });

  it('sends resume_url when supplied', async () => {
    const url = 'https://www.theseerwithin.com/fb-tarot/chat?resume=uuid-1&src=recovery';
    const r = await addSubscriberToList({
      email: 'a@example.com',
      customFields: { resume_url: url },
    });

    expect(r.success).toBe(true);
    expect(bodies[0].custom_fields).toEqual({ resume_url: url });
  });

  it('retries WITHOUT custom fields when the list rejects them, so the lead still lands', async () => {
    respondWith([
      { status: 400, body: JSON.stringify({ error: { message: 'unknown custom field resume_url' } }) },
    ]);

    const r = await addSubscriberToList({
      email: 'a@example.com',
      customFields: { resume_url: 'https://www.theseerwithin.com/chat?resume=uuid-1&src=recovery' },
    });

    expect(r.success).toBe(true);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].custom_fields).toBeDefined();
    // The retry drops the field but keeps the subscriber.
    expect('custom_fields' in bodies[1]).toBe(false);
    expect(bodies[1].email).toBe('a@example.com');
  });

  it('does not retry when the 400 is "already subscribed"', async () => {
    respondWith([
      { status: 400, body: JSON.stringify({ error: { message: 'Subscriber already subscribed' } }) },
    ]);

    const r = await addSubscriberToList({
      email: 'a@example.com',
      customFields: { resume_url: 'https://www.theseerwithin.com/chat?resume=uuid-1&src=recovery' },
    });

    expect(r.success).toBe(true);
    expect(bodies).toHaveLength(1);
  });

  it('reports failure when both attempts fail', async () => {
    respondWith([
      { status: 400, body: JSON.stringify({ error: { message: 'unknown custom field' } }) },
      { status: 500, body: 'server error' },
    ]);

    const r = await addSubscriberToList({
      email: 'a@example.com',
      customFields: { resume_url: 'https://www.theseerwithin.com/chat?resume=uuid-1&src=recovery' },
    });

    expect(r.success).toBe(false);
    expect(bodies).toHaveLength(2);
  });
});
