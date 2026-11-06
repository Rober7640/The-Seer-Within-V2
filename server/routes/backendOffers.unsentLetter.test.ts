// 11 The Unsent Letter on the backend checkout router (server/routes/backendOffers.ts), with
// Stripe, the DB helpers and the catalog gate mocked — same style as
// backendOffers.teaReading.test.ts and backendOffers.marcus.test.ts.
//
//   npx vitest run server/routes/backendOffers.unsentLetter.test.ts
//
// What these pin down:
//  1. THE GATE REFUSES MONEY. `readyForMoney: false`, so nothing reaches Stripe, even with
//     every field right.
//  2. HER BIRTH DETAILS AND FIRST NAME NEVER REACH STRIPE. Not in metadata, not on the payment
//     intent, not in custom_fields. ?c= does ride, because fulfilment reads it there.
//  3. 10's HABITS DON'T LEAK ONTO 11. `piiOutOfStripe` is shared; `funnel:'evelyn_vsl'` is not,
//     and that key on a session fires a Meta Purchase.
//  4. INVALID FIELDS ARE REFUSED BEFORE STRIPE, with a code the page can place.
//  5. THE BUMP ARITHMETIC: $35, or $47.77 with the bump, as two Stripe lines.
//  6. THE INTAKE ROW carries what fulfilment needs, parsed and cleaned.
//  7. THE UPSELLS NEVER USE THE NAME ON THE CARD. ?fn= from the intake, or "Friend" → "dear".
//  8. THE RECEIPT IS ALWAYS 24 HOURS. Closing the Door isn't a speed bump.
//  9. THE GIFT HANDOFF ANSWERS FOR A PAID 11 ORDER ONLY, from the order's own email.

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SESSION = 'cs_test_unsent_1';

const state = {
  liftGate: true,
  created: null as Record<string, any> | null,
  order: null as Record<string, unknown> | null,
};

vi.mock('../lib/db', () => ({ db: {} }));
vi.mock('../lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../lib/experiments', () => ({
  resolveBeBookingTreatment: vi.fn(async () => ({ treatment: 'page' })),
}));
vi.mock('../lib/backendCustomerList', () => ({
  BACKEND_UPSELLS: {
    be_protection_ritual: { priceCents: 4700 },
    be_bracelet: { priceCents: 4700, downsellCents: 3000 },
  },
}));
vi.mock('../lib/be08Editions', () => ({
  getBe08Edition: vi.fn(async () => null),
  listPublishedBe08Editions: vi.fn(async () => []),
}));
vi.mock('../lib/be08Draw', () => ({ BE_08_DECK: [] }));
const giftHandoff = vi.fn(async (email: string, firstName: string | null) => ({ mode: 'signup', email, firstName }));
vi.mock('../lib/evelynThankyouGift', () => ({
  EVELYN_TY_FREE_COINS: 1495,
  resolveEvelynTyHandoff: (email: string, firstName: string | null) => giftHandoff(email, firstName),
  loadEvelynTyBrief: vi.fn(),
  buildEvelynTyBriefSection: vi.fn(),
  buildEvelynTyGreetingInstruction: vi.fn(),
}));

const saveOrderIntake = vi.fn(async (_intake: Record<string, unknown>) => true);
const intakeFirstName = vi.fn(async (_session: string) => null as string | null);
vi.mock('../lib/beOrders', () => ({
  getBeOrderBySession: vi.fn(async () => state.order),
  writeToCustomerList: vi.fn(async (row: unknown) => row),
  recordBackendOrder: vi.fn(async () => null),
  saveOrderIntake: (intake: Record<string, unknown>) => saveOrderIntake(intake),
  intakeFirstName: (session: string) => intakeFirstName(session),
}));

const create = vi.fn(async (params: Record<string, any>) => {
  state.created = params;
  return { id: SESSION, url: `https://checkout.stripe.test/${SESSION}` };
});
const retrieve = vi.fn();
vi.mock('../lib/stripeAccount', () => ({
  getStripe: () => ({ checkout: { sessions: { create, retrieve } } }),
  getActiveStripeSecretKey: () => 'sk_test_placeholder_unsent',
}));

// The catalog stays real. unsent-letter is `readyForMoney: false`, so the gate is lifted per test
// so the Stripe call itself can be observed.
vi.mock('@shared/backendOffers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/backendOffers')>();
  return {
    ...actual,
    resolveBackendCharge: (req: Parameters<typeof actual.resolveBackendCharge>[0]) => {
      const offer = actual.BACKEND_OFFER_CATALOG[req.offer];
      if (!state.liftGate || !offer) return actual.resolveBackendCharge(req);
      return actual.priceBackendOffer(offer, req);
    },
  };
});

const { BACKEND_OFFER_CATALOG } = await import('@shared/backendOffers');
const { default: router } = await import('./backendOffers');
const app = express();
app.use(express.json());
app.use('/api/backend', router);

beforeEach(() => {
  state.liftGate = true;
  state.created = null;
  state.order = null;
  for (const fn of [saveOrderIntake, intakeFirstName, create, retrieve]) fn.mockClear();
  retrieve.mockReset();
  intakeFirstName.mockResolvedValue(null);
});

const checkoutBody = (overrides: Record<string, unknown> = {}) => ({
  offer: 'unsent-letter',
  treatment: 'page',
  bump: false,
  firstName: 'Sarah',
  letterCode: '3',
  fullBirthName: 'Sarah Jane Miller',
  dateOfBirth: '1961-03-14',
  ...overrides,
});

const post = (overrides?: Record<string, unknown>) =>
  request(app).post('/api/backend/checkout').send(checkoutBody(overrides));

describe('1 · the gate', () => {
  it('11 is not ready for money, in the real catalog', () => {
    expect(BACKEND_OFFER_CATALOG['unsent-letter'].readyForMoney).toBe(false);
  });

  it('refuses a perfect checkout, and nothing reaches Stripe or the intake', async () => {
    state.liftGate = false;
    const res = await post();
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.url).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
    expect(saveOrderIntake).not.toHaveBeenCalled();
  });
});

describe('2 · her details stay off Stripe', () => {
  it('nothing she typed, and not her ?fn= name, is anywhere in what Stripe receives', async () => {
    const res = await post({ bump: true });
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
    const sent = JSON.stringify(state.created);
    for (const secret of ['Sarah', 'Miller', '1961', '03-14']) expect(sent).not.toContain(secret);
  });

  it('no personal key on the metadata, the payment intent, or custom_fields', async () => {
    await post();
    const p = state.created!;
    for (const meta of [p.metadata, p.payment_intent_data?.metadata]) {
      for (const key of ['firstName', 'dateOfBirth', 'fullBirthName', 'displayFirstName', 'stone']) {
        expect(meta, key).not.toHaveProperty(key);
      }
    }
    expect(p.custom_fields).toBeUndefined();
  });

  it('?c= does ride on the metadata, and marks her order as 11', async () => {
    await post();
    expect(state.created!.metadata).toMatchObject({ product: 'be_unsent_letter', offer: 'unsent-letter', c: '3' });
  });

  it('asks Stripe for no address: a digital reading', async () => {
    await post();
    expect(state.created!.shipping_address_collection).toBeUndefined();
  });
});

describe("3 · 10's rules stay 10's", () => {
  it('no evelyn_vsl funnel key, so no Meta Purchase, and no stone is asked for', async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(state.created!.metadata).not.toHaveProperty('funnel');
    expect(state.created!.payment_intent_data?.metadata ?? {}).not.toHaveProperty('funnel');
  });

  it('the intake carries no stone or email for 11', async () => {
    await post({ stone: 'jade', email: 'she@example.com' });
    const intake = saveOrderIntake.mock.calls[0][0];
    expect(intake.stone ?? null).toBeNull();
    expect(intake.email ?? null).toBeNull();
  });
});

describe('4 · invalid fields are refused before Stripe', () => {
  const NAME = 'Please enter your first and last name as it is on your birth certificate.';
  const DOB = 'That is not a real date of birth, so please look at the month, day and year again.';
  const yearsAgo = (n: number) => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - n);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const UNDER_18 = 'You need to be 18 or over to book this reading.';

  it.each([
    ['no birth name', { fullBirthName: undefined }, 'birth_name_missing', NAME],
    ['blank birth name', { fullBirthName: '   ' }, 'birth_name_missing', NAME],
    ['one word', { fullBirthName: 'Sarah' }, 'birth_name_invalid', NAME],
    ['no date', { dateOfBirth: undefined }, 'dob_missing', 'Please enter your date of birth.'],
    ['garbage date', { dateOfBirth: 'not-a-date' }, 'dob_invalid', DOB],
    ['31 February', { dateOfBirth: '1961-02-31' }, 'dob_invalid', DOB],
    ['in the future', { dateOfBirth: '2099-01-01' }, 'dob_invalid', DOB],
    ['under 18 (the terms)', { dateOfBirth: yearsAgo(18) }, 'dob_underage', UNDER_18],
    ['under 13', { dateOfBirth: yearsAgo(10) }, 'dob_underage', UNDER_18],
  ])('%s', async (_name, overrides, code, error) => {
    const res = await post(overrides);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error, code });
    expect(create).not.toHaveBeenCalled();
    expect(saveOrderIntake).not.toHaveBeenCalled();
  });

  it('a day past 18 is old enough', async () => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - 18);
    d.setUTCDate(d.getUTCDate() - 1);
    const res = await post({ dateOfBirth: d.toISOString().slice(0, 10) });
    expect(res.status).toBe(200);
  });

  it('checks neither field on any other offer', async () => {
    const res = await post({ offer: 'twin-flame', fullBirthName: undefined, dateOfBirth: undefined });
    expect(res.body.code ?? '').not.toMatch(/^(birth_name|dob)/);
  });
});

describe('5 · the money', () => {
  const lines = () =>
    state.created!.line_items.map((l: any) => ({
      name: l.price_data.product_data.name,
      cents: l.price_data.unit_amount,
    }));
  const cents = (r: { cents: number }[]) => r.reduce((sum, l) => sum + l.cents, 0);

  it('$35 with no bump, one line', async () => {
    await post({ bump: false });
    expect(lines()).toEqual([{ name: 'The Unsent Letter — tarot reading by Evelyn Cross', cents: 3500 }]);
    expect(state.created!.metadata).toMatchObject({ bump: '0', readingCents: '3500' });
  });

  it('$47.77 with the bump, Closing the Door on its own line and its own product key', async () => {
    await post({ bump: true });
    expect(lines()).toEqual([
      { name: 'The Unsent Letter — tarot reading by Evelyn Cross', cents: 3500 },
      { name: 'Closing the Door', cents: 1277 },
    ]);
    expect(cents(lines())).toBe(4777);
    expect(state.created!.metadata).toMatchObject({ bump: '1', bumpProduct: 'closing_the_door' });
  });

  it('a price from the browser changes nothing', async () => {
    await post({ amountCents: 1, priceCents: 1 });
    expect(cents(lines())).toBe(3500);
  });

  it('a Stripe cancel goes back to the booking page, flagged', async () => {
    await post();
    expect(state.created!.cancel_url).toMatch(/\/tarot\/unsent-letter\?cancelled=1$/);
  });

  it('after payment she goes to the shared upsell chain', async () => {
    await post();
    expect(state.created!.success_url).toContain('/offers/upsell/welcome1');
  });
});

describe('6 · the intake row', () => {
  it('parks her birth name, her date and the ?fn= name, keyed to the session', async () => {
    await post();
    expect(saveOrderIntake).toHaveBeenCalledTimes(1);
    expect(saveOrderIntake.mock.calls[0][0]).toMatchObject({
      stripeSessionId: SESSION,
      offer: 'unsent-letter',
      fullBirthName: 'Sarah Jane Miller',
      dateOfBirth: '1961-03-14',
      firstName: 'Sarah',
    });
  });

  it('tidies the spaces in the name', async () => {
    await post({ fullBirthName: '  Sarah   Jane\tMiller ' });
    expect(saveOrderIntake.mock.calls[0][0].fullBirthName).toBe('Sarah Jane Miller');
  });

  it('with no ?fn= the stored intake first name is null (the display name derives from the birth name on read)', async () => {
    // Checkout does not fabricate a ?fn= — the raw value stays null. The display first name is
    // derived later from the birth name (firstNameFromBirthName / intakeFirstName), not here.
    await post({ firstName: undefined });
    expect(saveOrderIntake.mock.calls[0][0].firstName).toBeNull();
  });
});

describe('7 · the upsells never use the name on the card', () => {
  const paidSession = {
    id: SESSION,
    payment_status: 'paid',
    customer_details: { name: 'Robert Q Cardholder', email: 'she@example.com' },
    metadata: { product: 'be_unsent_letter', offer: 'unsent-letter' },
  };

  it('uses the ?fn= name from the intake', async () => {
    retrieve.mockResolvedValue(paidSession);
    intakeFirstName.mockResolvedValue('Sarah');
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ offer: 'unsent-letter', firstName: 'Sarah' });
  });

  it('no ?fn=: the placeholder the copy turns into "dear", never the card', async () => {
    retrieve.mockResolvedValue(paidSession);
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${SESSION}`);
    expect(res.body.firstName).toBe('Friend');
    expect(JSON.stringify(res.body)).not.toContain('Cardholder');
  });

  it("another offer never asks the intake", async () => {
    retrieve.mockResolvedValue({
      ...paidSession,
      metadata: { product: 'be_tea_reading', offer: 'tea-reading', firstName: 'Ann' },
    });
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${SESSION}`);
    expect(res.body.firstName).toBe('Ann');
    expect(intakeFirstName).not.toHaveBeenCalled();
  });
});

describe('8 · the receipt', () => {
  const paidRow = (overrides: Record<string, unknown> = {}) => ({
    stripeSessionId: SESSION,
    offer: 'unsent-letter',
    offerNumber: '11',
    status: 'paid',
    firstName: 'Sarah',
    bumpPurchased: false,
    bumpCents: 0,
    bumpProductKey: null,
    amountCents: 3500,
    readingCents: 3500,
    deliveredAt: null,
    createdAt: new Date(),
    ...overrides,
  });

  it('is 24 hours with the bump', async () => {
    state.order = paidRow({ bumpPurchased: true, bumpCents: 1277, bumpProductKey: 'closing_the_door', amountCents: 4777 });
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=unsent-letter`);
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({
      offer: 'unsent-letter',
      offerNumber: '11',
      bumpPurchased: true,
      bumpProductKey: 'closing_the_door',
      deliveryHours: 24,
      firstName: 'Sarah',
    });
  });

  it('is 24 hours without it', async () => {
    state.order = paidRow();
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=unsent-letter`);
    expect(res.body.order.deliveryHours).toBe(24);
  });

  it("another offer's order cannot be read through ?offer=unsent-letter", async () => {
    state.order = paidRow({ offer: 'twin-flame', offerNumber: '02' });
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=unsent-letter`);
    expect(res.status).toBe(404);
  });
});

describe('9 · the gift handoff', () => {
  const paidOrder = { offer: 'unsent-letter', status: 'paid', email: 'sarah@example.com', firstName: 'Sarah' };
  const post = (body: unknown) => request(app).post('/api/backend/unsent-letter/gift-handoff').send(body as object);

  beforeEach(() => giftHandoff.mockClear());

  it('a paid 11 order gets its handoff, from the order’s own email', async () => {
    state.order = paidOrder;
    const res = await post({ sessionId: SESSION, email: 'someone-else@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mode: 'signup', email: 'sarah@example.com', firstName: 'Sarah' });
  });

  it('no session id: 400', async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ sessionId: 7 })).status).toBe(400);
  });

  it.each([
    ['no order', null],
    ['another offer', { ...paidOrder, offer: 'tea-reading' }],
    ['refunded', { ...paidOrder, status: 'refunded' }],
  ])('%s: 404, and no login token is minted', async (_name, row) => {
    state.order = row;
    expect((await post({ sessionId: SESSION })).status).toBe(404);
    expect(giftHandoff).not.toHaveBeenCalled();
  });

  it('a failure is a 500, not a crash', async () => {
    state.order = paidOrder;
    giftHandoff.mockRejectedValueOnce(new Error('db down'));
    expect((await post({ sessionId: SESSION })).status).toBe(500);
  });
});
