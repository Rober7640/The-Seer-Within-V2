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
import { beOrderIntake } from '@shared/schema';

// ─── the fake database ─────────────────────────────────────────────────────────
// Enough of drizzle's builder to record what the module asked for.

interface FakeRow extends Record<string, unknown> {
  id: string;
}

const state = {
  inserted: null as Record<string, unknown> | null,
  /** Every insert, in order, with the table it went to (08 writes the intake too). */
  inserts: [] as Array<{ table: unknown; values: Record<string, unknown> }>,
  updates: [] as Record<string, unknown>[],
  /** Every insert's onConflictDoUpdate({ set }) — what a retry is allowed to refresh. */
  upserts: [] as Array<{ table: unknown; set: Record<string, unknown> }>,
  /** What the insert's .returning() hands back. */
  row: {} as FakeRow,
  /** The be_order_intake row `intakeFor` finds; null = none parked. */
  intake: null as Record<string, unknown> | null,
};

function chain(result: unknown) {
  const self: Record<string, unknown> = {};
  for (const method of ['values', 'onConflictDoUpdate', 'onConflictDoNothing', 'set', 'where', 'from', 'limit', 'orderBy']) {
    self[method] = () => self;
  }
  self.returning = async () => result;
  // Awaitable without .returning() — `await db.insert(...).onConflictDoUpdate(...)`.
  self.then = (resolve: (v: unknown) => void) => resolve(result);
  return self;
}

vi.mock('./db', () => ({
  db: {
    insert: (table: unknown) => {
      const builder = chain([state.row]) as Record<string, unknown>;
      builder.values = (v: Record<string, unknown>) => {
        state.inserts.push({ table, values: v });
        if (table !== beOrderIntake) state.inserted = v;
        return builder;
      };
      builder.onConflictDoUpdate = (cfg: { set: Record<string, unknown> }) => {
        state.upserts.push({ table, set: cfg.set });
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
    select: () => {
      const builder = chain([state.row]) as Record<string, unknown>;
      builder.from = (table: unknown) => {
        const result = table === beOrderIntake ? (state.intake ? [state.intake] : []) : [state.row];
        return chain(result);
      };
      return builder;
    },
  },
}));

// 08: the edition lookup and the once-only draw store are their own modules with their own
// tests; here they are stubbed so the DECISIONS in recordBackendOrder can be pinned.
const getBe08Edition = vi.fn(async (_id: string, _version?: number | null) => null as unknown);
vi.mock('./be08Editions', () => ({
  getBe08Edition: (...args: unknown[]) => getBe08Edition(...(args as [string, number | null])),
}));
const insertBe08DrawOnce = vi.fn(async (orderId: string, draw: Record<string, unknown>) => ({
  id: 'draw-1',
  orderId,
  ...draw,
}));
vi.mock('./be08Draw', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./be08Draw')>();
  return {
    ...actual,
    insertBe08DrawOnce: (...args: unknown[]) => insertBe08DrawOnce(...(args as [string, Record<string, unknown>])),
  };
});

const addBackendCustomer = vi.fn(async () => ({ success: true }) as { success: boolean; error?: string });
vi.mock('./aweber', () => ({
  addBackendCustomer: (...args: unknown[]) => addBackendCustomer(...(args as [])),
}));

const { recordBackendOrder, writeToCustomerList, saveOrderIntake } = await import('./beOrders');

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
  state.inserts = [];
  state.updates = [];
  state.upserts = [];
  state.intake = null;
  getBe08Edition.mockReset();
  getBe08Edition.mockResolvedValue(null);
  insertBe08DrawOnce.mockClear();
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

// ═══════════════════════════════════════════════════════════════════════════════
// 08 · Marcus Stone's personal reading — draw on payment
// ═══════════════════════════════════════════════════════════════════════════════

const BLIND_SPOTS = {
  id: 'blind-spots-v1', version: 1, slug: 'what-are-my-blind-spots', question: 'What are my blind spots?',
  theme: 'Blind spots', spread: { id: 'ten', name: 'The Ten', version: 1 }, status: 'published',
  freeEmailText: 'The email said this.',
  positions: [
    { id: 'p1', number: 1, label: 'One', visibility: 'free', fixedCard: { cardId: 'tower', reversed: false } },
    { id: 'p2', number: 2, label: 'Two', visibility: 'free', fixedCard: { cardId: 'moon', reversed: false } },
    { id: 'p3', number: 3, label: 'Three', visibility: 'paid' },
    { id: 'p4', number: 4, label: 'Four', visibility: 'paid' },
  ],
};

const PAID_AT = 1_789_000_000; // Stripe `created`, epoch seconds

/** An 08 session as the webhook sees it. `fields` builds Stripe's LEGACY custom_fields (a
 *  session created before 2026-09-14); pass `null` per field to leave one out, or
 *  `{ none: true }` via `overrides.custom_fields = []` for a session created after. */
function marcusSession(
  fields: { display?: string | null; birth?: string | null; dob?: string | null } = {},
  overrides: Record<string, unknown> = {},
  metadata: Record<string, string> = {},
) {
  const { display = 'Sarah', birth = 'Sarah Jane Smith', dob = '25/03/1971' } = fields;
  const custom_fields = [
    display !== null ? { key: 'display_first_name', type: 'text', text: { value: display } } : null,
    birth !== null ? { key: 'full_birth_name', type: 'text', text: { value: birth } } : null,
    dob !== null ? { key: 'date_of_birth', type: 'text', text: { value: dob } } : null,
  ].filter(Boolean);
  return session(
    {
      id: 'cs_test_marcus_1',
      created: PAID_AT,
      customer_details: { email: 'she@example.com', name: 'S Cardholder' },
      custom_fields,
      metadata: { product: 'be_marcus_reading', offer: 'marcus-reading', ...metadata },
      ...overrides,
    },
  );
}

function marcusIntake(overrides: Record<string, unknown> = {}) {
  return {
    stripeSessionId: 'cs_test_marcus_1',
    offer: 'marcus-reading',
    editionId: 'blind-spots-v1',
    editionVersion: 1,
    speedBump: false,
    ...overrides,
  };
}

const intakeWrites = () => state.inserts.filter((i) => i.table === beOrderIntake).map((i) => i.values);
const HOUR = 3_600_000;

/** The intake as POST /checkout writes it since 2026-09-14: edition, bump AND the three. */
const INTAKE_PERSON = { displayFirstName: 'Sarah', fullBirthName: 'Sarah Jane Smith', dateOfBirth: '1971-03-25' };

describe('08 · the three personal fields land on the order and the intake', () => {
  beforeEach(() => {
    state.row = { ...state.row, id: 'order-08', stripeSessionId: 'cs_test_marcus_1', offer: 'marcus-reading', lensCard: null };
    state.intake = marcusIntake();
    getBe08Edition.mockResolvedValue(BLIND_SPOTS);
  });

  describe('the intake (the booking page) is PRIMARY', () => {
    beforeEach(() => {
      state.intake = marcusIntake(INTAKE_PERSON);
    });

    it('a session with NO custom_fields (created after 2026-09-14) fulfils from the intake alone', async () => {
      await recordBackendOrder(marcusSession({ display: null, birth: null, dob: null }));
      expect(intakeWrites()[0]).toMatchObject(INTAKE_PERSON);
      expect(state.inserted).toMatchObject({ firstName: 'Sarah', editionId: 'blind-spots-v1', editionVersion: 1 });
      expect(insertBe08DrawOnce).toHaveBeenCalledTimes(1);
      const stamped = state.updates.find((u) => 'lensCard' in u);
      expect(stamped?.fulfilmentNote).toBeNull();
    });

    it('when BOTH exist, the intake wins over Stripe\'s custom_fields on every field', async () => {
      await recordBackendOrder(marcusSession({ display: 'Stripe', birth: 'Stripe Person', dob: '01/01/1990' }));
      expect(intakeWrites()[0]).toMatchObject(INTAKE_PERSON);
      expect(state.inserted).toMatchObject({ firstName: 'Sarah' });
      // The lens is cut from the INTAKE's birth name: the draw context hash would differ otherwise.
      const draw = insertBe08DrawOnce.mock.calls[0][1];
      expect(JSON.stringify(draw)).not.toContain('Stripe Person');
    });

    it('the intake\'s display first name beats the card name and the letter ?fn=', async () => {
      await recordBackendOrder(marcusSession({ display: null, birth: null, dob: null }, {}, { firstName: 'Letter' }));
      expect(state.inserted).toMatchObject({ firstName: 'Sarah' });
    });

    it('falls back PER FIELD: an intake with no date of birth still takes Stripe\'s', async () => {
      state.intake = marcusIntake({ ...INTAKE_PERSON, dateOfBirth: null });
      await recordBackendOrder(marcusSession({ display: 'Stripe', birth: 'Stripe Person', dob: '25/03/1971' }));
      expect(intakeWrites()[0]).toMatchObject({ displayFirstName: 'Sarah', fullBirthName: 'Sarah Jane Smith', dateOfBirth: '1971-03-25' });
    });

    it('reads a Date back from the date column the same as the string form', async () => {
      state.intake = marcusIntake({ ...INTAKE_PERSON, dateOfBirth: new Date(Date.UTC(1971, 2, 25)) });
      await recordBackendOrder(marcusSession({ display: null, birth: null, dob: null }));
      expect(intakeWrites()[0]).toMatchObject({ dateOfBirth: '1971-03-25' });
    });

    it('a missing DOB everywhere → DOB_MISSING note, order and draw still happen, thank-you still sent', async () => {
      state.intake = marcusIntake({ ...INTAKE_PERSON, dateOfBirth: null });
      await recordBackendOrder(marcusSession({ display: null, birth: null, dob: null }));
      expect(intakeWrites()[0]).toMatchObject({ dateOfBirth: null });
      expect(insertBe08DrawOnce).toHaveBeenCalledTimes(1);
      const stamped = state.updates.find((u) => 'lensCard' in u);
      expect(stamped?.fulfilmentNote).toBe('DOB_MISSING');
      expect(addBackendCustomer).toHaveBeenCalledTimes(1);
    });

    it('a missing birth name everywhere → BIRTH_NAME_MISSING, order recorded, thank-you still sent', async () => {
      state.intake = marcusIntake({ ...INTAKE_PERSON, fullBirthName: null });
      await recordBackendOrder(marcusSession({ display: null, birth: null, dob: null }));
      expect(insertBe08DrawOnce).not.toHaveBeenCalled();
      expect(state.updates.find((u) => typeof u.fulfilmentNote === 'string')?.fulfilmentNote).toBe('BIRTH_NAME_MISSING');
      expect(addBackendCustomer).toHaveBeenCalledTimes(1);
    });
  });

  describe('legacy fallback: a session created under the first D5 (custom_fields, intake without the three)', () => {
    it('copies the three custom_fields onto be_order_intake when the intake lacks them', async () => {
      await recordBackendOrder(marcusSession());
      const [write] = intakeWrites();
      expect(write).toMatchObject({
        stripeSessionId: 'cs_test_marcus_1',
        offer: 'marcus-reading',
        displayFirstName: 'Sarah',
        fullBirthName: 'Sarah Jane Smith',
        dateOfBirth: '1971-03-25',
      });
    });

    it('inserts the intake row itself when the pre-pay write never landed, reading the edition from metadata', async () => {
      state.intake = null;
      await recordBackendOrder(marcusSession({}, {}, { editionId: 'blind-spots-v1', editionVersion: '1' }));
      expect(intakeWrites()[0]).toMatchObject({ editionId: 'blind-spots-v1', editionVersion: 1 });
      expect(getBe08Edition).toHaveBeenCalledWith('blind-spots-v1', 1);
      expect(insertBe08DrawOnce).toHaveBeenCalledTimes(1);
    });

    it('the display first name from Checkout beats the card name and the letter ?fn=', async () => {
      await recordBackendOrder(marcusSession({}, {}, { firstName: 'Letter' }));
      expect(state.inserted).toMatchObject({ firstName: 'Sarah' });
    });

    it('falls back to the usual name chain when neither the intake nor Checkout had a display name', async () => {
      await recordBackendOrder(marcusSession({ display: null }, {}, { firstName: 'Letter' }));
      expect(state.inserted).toMatchObject({ firstName: 'Letter' });
    });

    it('a DOB Stripe let through unparsed does NOT block the order or the draw — it is noted for support', async () => {
      await recordBackendOrder(marcusSession({ dob: '7 Marzo 1971' }));
      expect(intakeWrites()[0]).toMatchObject({ dateOfBirth: null });
      expect(insertBe08DrawOnce).toHaveBeenCalledTimes(1);
      const stamped = state.updates.find((u) => 'lensCard' in u);
      expect(stamped?.fulfilmentNote).toBe('DOB_UNPARSEABLE(raw=7 Marzo 1971)');
      expect(addBackendCustomer).toHaveBeenCalledTimes(1);
    });
  });

  it('pins the edition id + version from the intake onto be_orders', async () => {
    await recordBackendOrder(marcusSession());
    expect(state.inserted).toMatchObject({ editionId: 'blind-spots-v1', editionVersion: 1 });
    expect(getBe08Edition).toHaveBeenCalledWith('blind-spots-v1', 1);
  });

  it('due_at = paid + 24h without the bump', async () => {
    await recordBackendOrder(marcusSession());
    expect((state.inserted?.dueAt as Date).getTime()).toBe(PAID_AT * 1000 + 24 * HOUR);
  });

  it('due_at = paid + 12h with the bump', async () => {
    await recordBackendOrder(marcusSession({}, { amount_total: 4777 }, { bump: '1', readingCents: '3500' }));
    expect(state.inserted).toMatchObject({ bumpPurchased: true, bumpProductKey: 'marcus_speed' });
    expect((state.inserted?.dueAt as Date).getTime()).toBe(PAID_AT * 1000 + 12 * HOUR);
  });
});

describe('saveOrderIntake — what a retried checkout POST may refresh', () => {
  it('refreshes the three personal fields with the edition and the bump: the last thing she typed wins', async () => {
    const ok = await saveOrderIntake({
      stripeSessionId: 'cs_test_marcus_1',
      offer: 'marcus-reading',
      editionId: 'blind-spots-v1',
      editionVersion: 1,
      speedBump: true,
      ...INTAKE_PERSON,
    });
    expect(ok).toBe(true);
    const upsert = state.upserts.find((u) => u.table === beOrderIntake);
    expect(upsert?.set).toMatchObject({
      editionId: 'blind-spots-v1',
      editionVersion: 1,
      speedBump: true,
      displayFirstName: 'Sarah',
      fullBirthName: 'Sarah Jane Smith',
      dateOfBirth: '1971-03-25',
    });
  });

  it('a retry WITHOUT the three (a 07 checkout) nulls them rather than keeping a stale value', async () => {
    await saveOrderIntake({ stripeSessionId: 'cs_test_backend_7', offer: 'marcus-daily', spreadKey: 'the-undertow', tier: 'spread' });
    const upsert = state.upserts.find((u) => u.table === beOrderIntake);
    expect(upsert?.set).toMatchObject({ displayFirstName: null, fullBirthName: null, dateOfBirth: null, spreadKey: 'the-undertow' });
  });
});

describe('08 · the draw', () => {
  beforeEach(() => {
    state.row = { ...state.row, id: 'order-08', stripeSessionId: 'cs_test_marcus_1', offer: 'marcus-reading', lensCard: null };
    state.intake = marcusIntake();
    getBe08Edition.mockResolvedValue(BLIND_SPOTS);
  });

  it('deals the cards once, stores the edition snapshot inside draw_json, and stamps the lens', async () => {
    await recordBackendOrder(marcusSession());
    expect(insertBe08DrawOnce).toHaveBeenCalledTimes(1);
    const [orderId, draw] = insertBe08DrawOnce.mock.calls[0];
    expect(orderId).toBe('order-08');
    const json = draw.drawJson as Record<string, unknown>;
    expect(json.contractVersion).toBe(1);
    expect(json.edition).toMatchObject({ id: 'blind-spots-v1', version: 1, slug: 'what-are-my-blind-spots' });
    expect((json.positions as unknown[]).length).toBe(4);
    expect(JSON.stringify(json)).not.toContain('Sarah');
    expect(draw.contextHash).toMatch(/^[0-9a-f]{64}$/);
    const stamped = state.updates.find((u) => 'lensCard' in u);
    expect(stamped).toBeTruthy();
    expect(typeof stamped?.lensCard).toBe('string');
    expect(stamped?.lensMethodVersion).toContain('33');
    expect(stamped?.fulfilmentNote).toBeNull();
  });

  it('stamps the edition that was ACTUALLY dealt, so a support re-point before the retry is honoured', async () => {
    // First attempt: intake points at an edition nobody published → noted, not dealt.
    getBe08Edition.mockResolvedValueOnce(null);
    await recordBackendOrder(marcusSession());
    expect(state.updates.find((u) => typeof u.fulfilmentNote === 'string')?.fulfilmentNote).toBe('EDITION_NOT_FOUND');
    // Support re-points the intake at healing-v1; the retry deals from it and must say so on
    // be_orders even though the first insert pinned blind-spots-v1 (COALESCE keeps first).
    state.updates = [];
    state.row.customerListWrittenAt = null;
    state.intake = marcusIntake({ editionId: 'healing-v1', editionVersion: 1 });
    getBe08Edition.mockResolvedValue({ ...BLIND_SPOTS, id: 'healing-v1', slug: 'what-part-of-me-needs-healing' });
    await recordBackendOrder(marcusSession());
    const stamped = state.updates.find((u) => 'lensCard' in u);
    expect(stamped).toMatchObject({ editionId: 'healing-v1', editionVersion: 1, fulfilmentNote: null });
    expect((insertBe08DrawOnce.mock.calls[0][1].drawJson as { edition: { id: string } }).edition.id).toBe('healing-v1');
  });

  it('a second call for the same session (webhook retry / thank-you page) does not deal again', async () => {
    await recordBackendOrder(marcusSession());
    expect(insertBe08DrawOnce).toHaveBeenCalledTimes(1);
    // state.row now carries lensCard (mirrored by the fake update) — exactly what the
    // upsert's .returning() gives the second caller.
    await recordBackendOrder(marcusSession());
    expect(insertBe08DrawOnce).toHaveBeenCalledTimes(1);
    expect(addBackendCustomer).toHaveBeenCalledTimes(1); // and no second thank-you either
  });

  it('a name the lens cannot read → order recorded, note written, customer list STILL written', async () => {
    await recordBackendOrder(marcusSession({ birth: 'Joël Smith' }));
    expect(state.inserted).toMatchObject({ offer: 'marcus-reading', editionId: 'blind-spots-v1' });
    expect(insertBe08DrawOnce).not.toHaveBeenCalled();
    const note = state.updates.find((u) => typeof u.fulfilmentNote === 'string');
    expect(note?.fulfilmentNote).toBe('LENS_UNSUPPORTED_NAME');
    expect(state.updates.some((u) => 'lensCard' in u)).toBe(false);
    expect(addBackendCustomer).toHaveBeenCalledTimes(1);
    expect(state.updates.some((u) => u.customerListWrittenAt)).toBe(true);
  });

  it('a one-word birth name is unsplittable → noted, not drawn', async () => {
    await recordBackendOrder(marcusSession({ birth: 'Cher' }));
    expect(insertBe08DrawOnce).not.toHaveBeenCalled();
    expect(state.updates.find((u) => typeof u.fulfilmentNote === 'string')?.fulfilmentNote).toBe('BIRTH_NAME_UNSPLITTABLE');
  });

  it('no edition anywhere → EDITION_MISSING; edition not published → EDITION_NOT_FOUND', async () => {
    state.intake = marcusIntake({ editionId: null, editionVersion: null });
    await recordBackendOrder(marcusSession());
    expect(state.updates.find((u) => typeof u.fulfilmentNote === 'string')?.fulfilmentNote).toBe('EDITION_MISSING');

    state.updates = [];
    state.row.customerListWrittenAt = null; // the fake mirrors the stamp; a new order starts blank
    state.intake = marcusIntake();
    getBe08Edition.mockResolvedValue(null);
    await recordBackendOrder(marcusSession());
    expect(state.updates.find((u) => typeof u.fulfilmentNote === 'string')?.fulfilmentNote).toBe('EDITION_NOT_FOUND');
    expect(insertBe08DrawOnce).not.toHaveBeenCalled();
    expect(addBackendCustomer).toHaveBeenCalledTimes(2);
  });

  it('a failed lens AND a bad DOB are both on the note, code first', async () => {
    await recordBackendOrder(marcusSession({ birth: '李 明', dob: 'yesterday' }));
    expect(state.updates.find((u) => typeof u.fulfilmentNote === 'string')?.fulfilmentNote)
      .toBe('LENS_UNSUPPORTED_NAME; DOB_UNPARSEABLE(raw=yesterday)');
  });

  it('a thrown draw-store failure is caught as DRAW_FAILED — the webhook never rejects', async () => {
    insertBe08DrawOnce.mockRejectedValueOnce(new Error('relation "be_08_draws" does not exist'));
    await expect(recordBackendOrder(marcusSession())).resolves.toBeTruthy();
    expect(state.updates.find((u) => typeof u.fulfilmentNote === 'string')?.fulfilmentNote).toBe('DRAW_FAILED');
    expect(addBackendCustomer).toHaveBeenCalledTimes(1);
  });

  it('does none of this for a non-08 offer', async () => {
    state.row = { ...state.row, offer: 'twin-flame' };
    await recordBackendOrder(session());
    expect(intakeWrites()).toHaveLength(0);
    expect(getBe08Edition).not.toHaveBeenCalled();
    expect(insertBe08DrawOnce).not.toHaveBeenCalled();
    expect(state.inserted).not.toHaveProperty('dueAt');
  });
});
