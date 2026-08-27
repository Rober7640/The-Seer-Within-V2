// Recording a backend-deck purchase, and the AWeber write that IS her thank-you.
//
//   npx vitest run server/lib/beOrders.test.ts
//
// The database and AWeber are both mocked — this pins the DECISIONS, not the drivers.
//
// What these pin down:
//  1. `be_*` GATING. A funnel product must never reach this module. Six funnels share
//     the Stripe webhook, and a backend write firing on an `energy_clearing_ritual`
//     session would put a V1 buyer on the backend customer list and send her an email
//     about a reading she never bought.
//  2. A FAILED CUSTOMER-LIST WRITE IS RECORDED, NOT SWALLOWED. That write is the send.
//     `customer_list_written_at` must stay NULL so the thank-you page retries it and
//     so "paid but never emailed" is one SQL query.
//  3. IT DOES NOT WRITE TWICE. A Stripe retry, and then the thank-you page, must not
//     re-tag her (which would re-fire an AWeber Campaign).
//  4. NO ENTRY LINK UNTIL THE ENTRY FORM EXISTS. Emailing a link to a 404 is worse
//     than emailing no link.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── the fake database ─────────────────────────────────────────────────────────
// Enough of drizzle's builder to record what the module asked for.

interface FakeRow extends Record<string, unknown> {
  id: string;
}

const state = {
  inserted: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  /** What the insert's .returning() hands back. */
  row: {} as FakeRow,
};

function chain(result: unknown) {
  const self: Record<string, unknown> = {};
  for (const method of ['values', 'onConflictDoUpdate', 'set', 'where', 'from', 'limit']) {
    self[method] = () => self;
  }
  self.returning = async () => result;
  return self;
}

vi.mock('./db', () => ({
  db: {
    insert: () => {
      const builder = chain([state.row]) as Record<string, unknown>;
      builder.values = (v: Record<string, unknown>) => {
        state.inserted = v;
        return builder;
      };
      return builder;
    },
    update: () => {
      const builder = chain([state.row]) as Record<string, unknown>;
      builder.set = (v: Record<string, unknown>) => {
        state.updates.push(v);
        // Mirror the write, so a caller reading the returned row sees the new state.
        state.row = { ...state.row, ...v };
        return builder;
      };
      return builder;
    },
    select: () => chain([state.row]),
  },
}));

const addBackendCustomer = vi.fn(async () => ({ success: true }) as { success: boolean; error?: string });
vi.mock('./aweber', () => ({
  addBackendCustomer: (...args: unknown[]) => addBackendCustomer(...(args as [])),
}));

const { recordBackendOrder, writeToCustomerList } = await import('./beOrders');

/** A Stripe checkout.session.completed session, as the webhook sees it. */
function session(overrides: Record<string, unknown> = {}, metadata: Record<string, string> = {}) {
  return {
    id: 'cs_test_backend_1',
    amount_total: 3500,
    currency: 'usd',
    payment_intent: 'pi_test_1',
    customer_details: { email: 'she@example.com' },
    metadata: { product: 'be_twin_flame', offer: 'twin-flame', ...metadata },
    ...overrides,
  } as never;
}

beforeEach(() => {
  state.inserted = null;
  state.updates = [];
  state.row = {
    id: 'row-1',
    stripeSessionId: 'cs_test_backend_1',
    offer: 'twin-flame',
    email: 'she@example.com',
    firstName: null,
    bumpPurchased: false,
    customerListWrittenAt: null,
    customerListError: null,
  };
  addBackendCustomer.mockReset();
  addBackendCustomer.mockResolvedValue({ success: true });
});

describe('what counts as a backend order', () => {
  it('ignores a funnel product entirely — no row, no AWeber write', async () => {
    const result = await recordBackendOrder(
      session({}, { product: 'energy_clearing_ritual' }),
    );
    expect(result).toBeNull();
    expect(state.inserted).toBeNull();
    expect(addBackendCustomer).not.toHaveBeenCalled();
  });

  it('ignores a session with no product at all', async () => {
    expect(await recordBackendOrder(session({ metadata: {} }))).toBeNull();
    expect(state.inserted).toBeNull();
  });
});

describe('the row it writes', () => {
  it('records the offer, its number and the treatment that sold it', async () => {
    await recordBackendOrder(session({}, { treatment: 'chat' }));
    expect(state.inserted).toMatchObject({
      stripeSessionId: 'cs_test_backend_1',
      offer: 'twin-flame',
      offerNumber: '02',
      treatment: 'chat',
      amountCents: 3500,
    });
  });

  it('keeps an unrecognised treatment out of the column rather than storing junk', async () => {
    await recordBackendOrder(session({}, { treatment: 'sideways' }));
    expect(state.inserted).toMatchObject({ treatment: null });
  });

  it('falls back to the name Stripe collected on the card when the letter had no ?fn=', async () => {
    await recordBackendOrder(
      session({ customer_details: { email: 'she@example.com', name: 'Sarah Card' } }),
    );
    expect(state.inserted).toMatchObject({ firstName: 'Sarah Card' });
  });

  it('prefers the letter\'s ?fn= name over the card name', async () => {
    await recordBackendOrder(
      session(
        { customer_details: { email: 'she@example.com', name: 'Card Name' } },
        { firstName: 'Sarah' },
      ),
    );
    expect(state.inserted).toMatchObject({ firstName: 'Sarah' });
  });

  it('is null only when neither ?fn= nor a card name exists', async () => {
    await recordBackendOrder(session());
    expect(state.inserted).toMatchObject({ firstName: null });
  });

  it('prices the bump from the CATALOG, and only when checkout said she took it', async () => {
    await recordBackendOrder(
      session({ amount_total: 4777 }, { bump: '1', readingCents: '3500' }),
    );
    expect(state.inserted).toMatchObject({
      bumpPurchased: true,
      bumpCents: 1277,
      bumpProductKey: 'astro_force',
      readingCents: 3500,
    });
  });

  it('leaves no bump key on the row when she declined', async () => {
    await recordBackendOrder(session({}, { bump: '0' }));
    expect(state.inserted).toMatchObject({ bumpPurchased: false, bumpCents: 0, bumpProductKey: null });
  });

  it('derives the reading price from Stripe when the metadata is missing', async () => {
    // A pay-what-you-want session whose readingCents did not survive. Stripe's total
    // is the number that can be proved, so back the bump out of it.
    await recordBackendOrder(
      session({ amount_total: 4777, metadata: { product: 'be_judgement_day', bump: '1' } }),
    );
    expect(state.inserted).toMatchObject({ readingCents: 3500, bumpCents: 1277 });
  });

  it('carries her first name down from the letter', async () => {
    await recordBackendOrder(session({}, { firstName: 'Sarah' }));
    expect(state.inserted).toMatchObject({ firstName: 'Sarah' });
  });
});

describe('the customer-list write — which IS her thank-you email', () => {
  it('sends the CHECKOUT SESSION id, not the payment intent', async () => {
    await recordBackendOrder(session());
    expect(addBackendCustomer).toHaveBeenCalledTimes(1);
    expect(addBackendCustomer.mock.calls[0][0]).toMatchObject({
      email: 'she@example.com',
      offer: 'twin-flame',
      stripeOrderId: 'cs_test_backend_1',
    });
  });

  it('sends NO entry link while the Entry form does not exist', async () => {
    // 03 is the ACT offer, and its `entryPath` is deliberately unset until A6 ships.
    state.row.offer = 'judgement-day';
    await recordBackendOrder(session({ metadata: { product: 'be_judgement_day' } }));
    expect(addBackendCustomer.mock.calls[0][0].entryUrl).toBeUndefined();
  });

  it('stamps the row when the write succeeds', async () => {
    await recordBackendOrder(session());
    const stamped = state.updates.find((u) => u.customerListWrittenAt);
    expect(stamped).toBeTruthy();
    expect(stamped?.customerListError).toBeNull();
  });

  it('records a failure and leaves the row UNSTAMPED, so it can be retried', async () => {
    addBackendCustomer.mockResolvedValue({ success: false, error: 'AWeber API error: 401' });
    await recordBackendOrder(session());
    const update = state.updates.at(-1);
    expect(update?.customerListError).toContain('401');
    expect(update?.customerListWrittenAt).toBeUndefined();
  });

  it('records a THROWN failure the same way — the webhook must never reject', async () => {
    addBackendCustomer.mockRejectedValue(new Error('socket hang up'));
    await expect(recordBackendOrder(session())).resolves.toBeTruthy();
    expect(state.updates.at(-1)?.customerListError).toContain('socket hang up');
  });

  it('does not write twice — a Stripe retry must not re-fire her thank-you Campaign', async () => {
    const alreadyDone = { ...state.row, customerListWrittenAt: new Date() } as never;
    await writeToCustomerList(alreadyDone);
    expect(addBackendCustomer).not.toHaveBeenCalled();
  });

  it('still emails her when the DATABASE write fails — the row is not the product', async () => {
    // The migration was never run, or the database is down. She has paid either way, and
    // the AWeber tag is what sends her thank-you.
    const boom = new Error('relation "be_orders" does not exist');
    const db = (await import('./db')).db as unknown as { insert: () => unknown };
    const original = db.insert;
    db.insert = () => {
      throw boom;
    };
    try {
      await recordBackendOrder(session({}, { firstName: 'Sarah' }));
    } finally {
      db.insert = original;
    }
    expect(addBackendCustomer).toHaveBeenCalledTimes(1);
    expect(addBackendCustomer.mock.calls[0][0]).toMatchObject({
      email: 'she@example.com',
      firstName: 'Sarah',
      stripeOrderId: 'cs_test_backend_1',
    });
  });

  it('records "no email" as the failure it is rather than silently doing nothing', async () => {
    state.row.email = null;
    await recordBackendOrder(
      session({ customer_details: null, customer_email: null, metadata: { product: 'be_twin_flame' } }),
    );
    expect(addBackendCustomer).not.toHaveBeenCalled();
    expect(state.updates.at(-1)?.customerListError).toContain('no email');
  });
});
