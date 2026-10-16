// soulmate-initials (Evelyn VSL, 10) checkout intake — server/routes/backendOffers.ts,
// POST /api/backend/checkout — with Stripe, the catalog gate and the order helpers mocked,
// same style as backendOffers.heartCleanser.test.ts (the readiness-gate lift) and
// backendOffers.order.test.ts (the saveOrderIntake mock).
//
//   npx vitest run server/routes/backendOffers.soulmateIntake.test.ts
//
// What these pin down:
//  1. PII STAYS OFF STRIPE for a `piiOutOfStripe` offer: metadata gets funnel:'evelyn_vsl'
//     and stone, never firstName; payment_intent_data.metadata is PII-free too.
//  2. saveOrderIntake IS CALLED with the offer, stone, dateOfBirth, firstName, email.
//  3. A DOB THAT MAKES HER <18 IS REFUSED BEFORE STRIPE — 400, sessions.create not called.
//  4. AN INVALID STONE IS REFUSED — 400.
//  5. AN INTAKE WRITE FAILURE IS NON-FATAL — checkout still answers 200 with a url.

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  liftGate: true,
  created: null as Record<string, unknown> | null,
  stripeSecretKey: 'sk_test_placeholder_soulmate' as string | undefined,
  saveOrderIntakeResult: true,
};

vi.mock('../lib/db', () => ({ db: {} }));
vi.mock('../lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../lib/experiments', () => ({
  resolveBeBookingTreatment: vi.fn(async () => ({ treatment: 'page' })),
}));
vi.mock('../lib/backendCustomerList', () => ({ BACKEND_UPSELLS: {} }));
vi.mock('../lib/be08Editions', () => ({
  getBe08Edition: vi.fn(async () => null),
  listPublishedBe08Editions: vi.fn(async () => []),
}));
vi.mock('../lib/be08Draw', () => ({ BE_08_DECK: [] }));

const getBeOrderBySession = vi.fn(async () => null);
const writeToCustomerList = vi.fn(async (row: unknown) => row);
const recordBackendOrder = vi.fn(async () => null);
const saveOrderIntake = vi.fn(async () => state.saveOrderIntakeResult);
vi.mock('../lib/beOrders', () => ({
  getBeOrderBySession: (s: string) => getBeOrderBySession(s),
  writeToCustomerList: (r: unknown) => writeToCustomerList(r),
  recordBackendOrder: (s: unknown) => recordBackendOrder(s),
  saveOrderIntake: (intake: unknown) => saveOrderIntake(intake),
}));

const create = vi.fn(async (params: Record<string, unknown>) => {
  state.created = params;
  return { id: 'cs_test_soulmate_created', url: 'https://checkout.stripe.test/cs_test_soulmate_created' };
});
const retrieve = vi.fn();
vi.mock('../lib/stripeAccount', () => ({
  getStripe: () => ({ checkout: { sessions: { create, retrieve } } }),
  getActiveStripeSecretKey: () => state.stripeSecretKey,
}));

// The catalog stays real. soulmate-initials is `readyForMoney: false` in committed code,
// so the gate is lifted per test (same pattern as the 09 heart-cleanser suite) so the
// Stripe call itself can be observed.
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

const { default: router } = await import('./backendOffers');
const app = express();
app.use(express.json());
app.use('/api/backend', router);

beforeEach(() => {
  state.liftGate = true;
  state.created = null;
  state.stripeSecretKey = 'sk_test_placeholder_soulmate';
  state.saveOrderIntakeResult = true;
  for (const fn of [getBeOrderBySession, writeToCustomerList, recordBackendOrder, saveOrderIntake, create, retrieve]) {
    fn.mockClear();
  }
  retrieve.mockReset();
});

function checkoutBody(overrides: Record<string, unknown> = {}) {
  return {
    offer: 'soulmate-initials',
    treatment: 'page',
    firstName: 'Sarah',
    email: 'sarah@example.com',
    dateOfBirth: '1990-05-15',
    stone: 'jade',
    ...overrides,
  };
}

describe('POST /api/backend/checkout — soulmate-initials keeps PII off Stripe', () => {
  it('creates a session whose metadata carries funnel + stone but no firstName, and a PII-free payment_intent_data', async () => {
    const res = await request(app).post('/api/backend/checkout').send(checkoutBody());
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);

    const p = state.created as any;
    expect(p.metadata).toMatchObject({ funnel: 'evelyn_vsl', stone: 'jade' });
    expect(p.metadata).not.toHaveProperty('firstName');
    expect(p.payment_intent_data.metadata).not.toHaveProperty('firstName');
    expect(p.payment_intent_data.metadata).not.toHaveProperty('dateOfBirth');
    expect(p.payment_intent_data.metadata).not.toHaveProperty('stone');
    const flatMetadata = JSON.stringify(p.metadata) + JSON.stringify(p.payment_intent_data.metadata);
    expect(flatMetadata).not.toContain('Sarah');
    expect(flatMetadata).not.toContain('1990-05-15');
  });

  it('calls saveOrderIntake once with the offer, stone, dateOfBirth, firstName and email', async () => {
    const res = await request(app).post('/api/backend/checkout').send(checkoutBody());
    expect(res.status).toBe(200);
    expect(saveOrderIntake).toHaveBeenCalledTimes(1);
    expect(saveOrderIntake).toHaveBeenCalledWith(
      expect.objectContaining({
        offer: 'soulmate-initials',
        stone: 'jade',
        dateOfBirth: '1990-05-15',
        firstName: 'Sarah',
        email: 'sarah@example.com',
      }),
    );
  });

  it('refuses a DOB that makes her 17 — 400, before any Stripe session is created', async () => {
    const seventeenYearsAgoish = new Date();
    seventeenYearsAgoish.setUTCFullYear(seventeenYearsAgoish.getUTCFullYear() - 17);
    const dob = seventeenYearsAgoish.toISOString().slice(0, 10);

    const res = await request(app).post('/api/backend/checkout').send(checkoutBody({ dateOfBirth: dob }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
    expect(saveOrderIntake).not.toHaveBeenCalled();
  });

  it('refuses an invalid stone — 400', async () => {
    const res = await request(app).post('/api/backend/checkout').send(checkoutBody({ stone: 'amethyst' }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('allows an absent stone — the funnel tolerates a stone-less checkout', async () => {
    const body = checkoutBody();
    delete (body as Record<string, unknown>).stone;
    const res = await request(app).post('/api/backend/checkout').send(body);
    expect(res.status).toBe(200);
    const p = state.created as any;
    expect(p.metadata).not.toHaveProperty('stone');
  });

  it('a missing dateOfBirth is refused — 400', async () => {
    const body = checkoutBody();
    delete (body as Record<string, unknown>).dateOfBirth;
    const res = await request(app).post('/api/backend/checkout').send(body);
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('an unparseable dateOfBirth is refused — 400', async () => {
    const res = await request(app).post('/api/backend/checkout').send(checkoutBody({ dateOfBirth: 'not-a-date' }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('an intake write failure is non-fatal — checkout still answers 200 with a url', async () => {
    state.saveOrderIntakeResult = false;
    const res = await request(app).post('/api/backend/checkout').send(checkoutBody());
    expect(res.status).toBe(200);
    expect(res.body.url).toContain('checkout.stripe.test');
    expect(saveOrderIntake).toHaveBeenCalledTimes(1);
  });
});
