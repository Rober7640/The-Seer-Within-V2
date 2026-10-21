// Evelyn VSL (soulmate-initials): stone + firstName + email land on be_order_intake.
//
//   npx vitest run server/lib/beOrders.soulmateInitials.test.ts
//
// WHY THESE COLUMNS EXIST: birth date, first name and the chosen stone are her PII, and
// spec §5 keeps PII out of Stripe metadata. So POST /checkout parks them here BEFORE she
// pays, and Job B (fulfilment) reads them back from this row rather than from Stripe.
// This pins two things:
//  1. saveOrderIntake WRITES stone/firstName/email on the insert.
//  2. A RETRY (she re-POSTs the same checkout session) OVERWRITES them — the last thing
//     she typed wins, same as every other intake field — so the onConflictDoUpdate `set`
//     must carry all three.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beOrderIntake } from '@shared/schema';

// ─── the fake database — mirrors server/lib/beOrders.test.ts exactly ──────────────

interface FakeRow extends Record<string, unknown> {
  id: string;
}

const state = {
  inserts: [] as Array<{ table: unknown; values: Record<string, unknown> }>,
  upserts: [] as Array<{ table: unknown; set: Record<string, unknown> }>,
  row: {} as FakeRow,
};

function chain(result: unknown) {
  const self: Record<string, unknown> = {};
  for (const method of ['values', 'onConflictDoUpdate', 'onConflictDoNothing', 'set', 'where', 'from', 'limit', 'orderBy']) {
    self[method] = () => self;
  }
  self.returning = async () => result;
  self.then = (resolve: (v: unknown) => void) => resolve(result);
  return self;
}

vi.mock('./db', () => ({
  db: {
    insert: (table: unknown) => {
      const builder = chain([state.row]) as Record<string, unknown>;
      builder.values = (v: Record<string, unknown>) => {
        state.inserts.push({ table, values: v });
        return builder;
      };
      builder.onConflictDoUpdate = (cfg: { set: Record<string, unknown> }) => {
        state.upserts.push({ table, set: cfg.set });
        return builder;
      };
      return builder;
    },
  },
}));

const { saveOrderIntake } = await import('./beOrders');

beforeEach(() => {
  state.inserts = [];
  state.upserts = [];
  state.row = { id: 'row-1' };
});

describe('saveOrderIntake — Evelyn VSL (soulmate-initials): stone, firstName, email', () => {
  it('writes stone, dateOfBirth, firstName and email on the insert', async () => {
    const ok = await saveOrderIntake({
      stripeSessionId: 'cs_test_soulmate_1',
      offer: 'soulmate-initials',
      stone: 'jade',
      dateOfBirth: '1990-05-15',
      firstName: 'Sarah',
      email: 's@x.com',
    });
    expect(ok).toBe(true);
    const [write] = state.inserts.filter((i) => i.table === beOrderIntake).map((i) => i.values);
    expect(write).toMatchObject({
      stripeSessionId: 'cs_test_soulmate_1',
      offer: 'soulmate-initials',
      stone: 'jade',
      dateOfBirth: '1990-05-15',
      firstName: 'Sarah',
      email: 's@x.com',
    });
  });

  it('a retried same-session POST overwrites the stone — the last thing she typed wins', async () => {
    await saveOrderIntake({
      stripeSessionId: 'cs_test_soulmate_1',
      offer: 'soulmate-initials',
      stone: 'jade',
      dateOfBirth: '1990-05-15',
      firstName: 'Sarah',
      email: 's@x.com',
    });
    await saveOrderIntake({
      stripeSessionId: 'cs_test_soulmate_1',
      offer: 'soulmate-initials',
      stone: 'amethyst',
      dateOfBirth: '1990-05-15',
      firstName: 'Sarah',
      email: 's@x.com',
    });
    const upsert = state.upserts.filter((u) => u.table === beOrderIntake).at(-1);
    expect(upsert?.set).toMatchObject({
      stone: 'amethyst',
      firstName: 'Sarah',
      email: 's@x.com',
    });
  });
});
