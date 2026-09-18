// 08 Marcus on the backend checkout router (server/routes/backendOffers.ts), with Stripe,
// the DB helpers and the edition lookup mocked — same style as server/lib/beOrders.test.ts.
//
//   npx vitest run server/routes/backendOffers.marcus.test.ts
//
// What these pin down:
//  1. THE EDITIONS API IS A WHITELIST. `freeEmailText` never leaves the server; the face-up
//     cards carry a name from the deck; only published editions are listed.
//  2. NO EDITION, NO CHECKOUT. A missing or unknown editionId is refused before Stripe.
//  3. THE VERSION IS PINNED SERVER-SIDE. The browser's `editionVersion` is ignored.
//  4. THE BOOKING PAGE ASKS THE THREE QUESTIONS (D5 amended 2026-09-14). Display first
//     name, full birth name and date of birth arrive in the POST body, are validated
//     before Stripe, land on the intake row, and NEVER reach Stripe (no custom_fields,
//     nothing on metadata — PII).
//  5. THE CANCEL GOES BACK TO HER EDITION, and the intake row carries edition + bump.
//  6. OTHER OFFERS ARE UNTOUCHED. 02 gets no custom fields and no edition metadata.

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Be08Edition } from '../lib/be08Editions';

const EDITION: Be08Edition = {
  id: 'blind-spots-v1',
  version: 1,
  slug: 'what-are-my-blind-spots',
  question: 'What are my blind spots?',
  theme: 'Where a blind spot is reaching into her life',
  spread: { id: 'tree-of-life', name: 'The Tree of Life', version: 1 },
  positions: [
    { id: 'p1', number: 1, label: 'How a blind spot affects you', visibility: 'free', fixedCard: { cardId: 'moon', reversed: false } },
    { id: 'p2', number: 2, label: 'What you already understand', visibility: 'free', fixedCard: { cardId: 'two-of-swords', reversed: false } },
    { id: 'p3', number: 3, label: 'What you keep excusing', visibility: 'paid' },
  ],
  freeEmailText: 'SECRET — the daily letter body must never reach the page',
  bookingCopy: { headline: 'H', intro: 'I', bridge: 'B', offer: 'O', name: 'N' },
  status: 'published',
};

const state = {
  editions: [EDITION] as Be08Edition[],
  created: null as Record<string, unknown> | null,
  intakes: [] as Record<string, unknown>[],
};

vi.mock('../lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../lib/db', () => ({ db: {} }));
vi.mock('../lib/experiments', () => ({
  resolveBeBookingTreatment: vi.fn(async () => ({ treatment: 'page' })),
}));
vi.mock('../lib/backendCustomerList', () => ({ BACKEND_UPSELLS: {} }));
vi.mock('../lib/beOrders', () => ({
  getBeOrderBySession: vi.fn(async () => null),
  recordBackendOrder: vi.fn(),
  writeToCustomerList: vi.fn(),
  saveOrderIntake: vi.fn(async (intake: Record<string, unknown>) => {
    state.intakes.push(intake);
    return true;
  }),
}));
vi.mock('../lib/be08Editions', () => ({
  listPublishedBe08Editions: vi.fn(async () => state.editions.filter((e) => e.status === 'published')),
  getBe08Edition: vi.fn(async (id: string, version?: number | null) =>
    state.editions.find(
      (e) => e.id === id && (typeof version === 'number' ? e.version === version : e.status === 'published'),
    ) ?? null,
  ),
}));
vi.mock('../lib/stripeAccount', () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: vi.fn(async (params: Record<string, unknown>) => {
          state.created = params;
          return { id: 'cs_test_marcus_1', url: 'https://checkout.stripe.test/cs_test_marcus_1' };
        }),
      },
    },
  }),
}));
// The catalog stays real; only the readiness gate is lifted so the handler's Stripe call
// can be observed (marcus-reading is `readyForMoney: false` until the launch commit).
vi.mock('@shared/backendOffers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/backendOffers')>();
  return {
    ...actual,
    resolveBackendCharge: (req: Parameters<typeof actual.resolveBackendCharge>[0]) => {
      const offer = actual.BACKEND_OFFER_CATALOG[req.offer];
      if (!offer) return actual.resolveBackendCharge(req);
      return actual.priceBackendOffer(offer, req);
    },
  };
});

async function app() {
  const { default: router } = await import('./backendOffers');
  const a = express();
  a.use(express.json());
  a.use('/api/backend', router);
  return a;
}

beforeEach(() => {
  state.editions = [EDITION];
  state.created = null;
  state.intakes = [];
});

describe('GET /api/backend/marcus/editions', () => {
  it('lists published editions as the public shape, never the letter body', async () => {
    state.editions = [EDITION, { ...EDITION, id: 'draft-v1', status: 'draft' }];
    const res = await request(await app()).get('/api/backend/marcus/editions');
    expect(res.status).toBe(200);
    expect(res.body.editions).toHaveLength(1);
    const e = res.body.editions[0];
    expect(e.id).toBe('blind-spots-v1');
    expect(e.version).toBe(1);
    expect(e.bookingCopy).toEqual(EDITION.bookingCopy);
    expect(JSON.stringify(res.body)).not.toContain('SECRET');
    expect(e.freeEmailText).toBeUndefined();
  });

  it('names the face-up cards from the deck and leaves face-down positions bare', async () => {
    const res = await request(await app()).get('/api/backend/marcus/editions/blind-spots-v1');
    expect(res.status).toBe(200);
    const [p1, p2, p3] = res.body.edition.positions;
    expect(p1.card).toEqual({ id: 'moon', name: 'The Moon', image: 'moon' });
    expect(p2.card).toEqual({ id: 'two-of-swords', name: 'Two of Swords', image: 'two-of-swords' });
    expect(p3.card).toBeUndefined();
    expect(p3).toEqual({ id: 'p3', number: 3, label: 'What you keep excusing', visibility: 'paid' });
    expect(JSON.stringify(res.body)).not.toContain('SECRET');
  });

  it('404s an unknown or malformed id', async () => {
    const a = await app();
    expect((await request(a).get('/api/backend/marcus/editions/nope-v9')).status).toBe(404);
    expect((await request(a).get('/api/backend/marcus/editions/Bad%20Id')).status).toBe(404);
  });
});

describe('POST /api/backend/checkout — marcus-reading', () => {
  const PERSON = { displayFirstName: 'Sarah', fullBirthName: 'Sarah Jane Smith', dateOfBirth: '1971-03-25' };
  const body = (extra: Record<string, unknown> = {}) => ({
    offer: 'marcus-reading',
    treatment: 'page',
    bump: false,
    ...PERSON,
    ...extra,
  });
  const post = async (b: Record<string, unknown>) =>
    request(await app()).post('/api/backend/checkout').set('Host', 'example.test').set('X-Forwarded-Proto', 'https').send(b);

  it('refuses a checkout with no editionId before Stripe is touched', async () => {
    const res = await post(body({ editionId: undefined }));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Choose a valid reading.', code: 'edition_unknown' });
    expect(state.created).toBeNull();
    expect(state.intakes).toHaveLength(0);
  });

  it('refuses an unknown edition', async () => {
    const res = await post(body({ editionId: 'soulmate-v1' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Choose a valid reading.');
    expect(state.created).toBeNull();
  });

  it('refuses an unpublished edition (bare id resolves only the latest PUBLISHED version)', async () => {
    state.editions = [{ ...EDITION, status: 'draft' }];
    const res = await post(body({ editionId: 'blind-spots-v1' }));
    expect(res.status).toBe(400);
    expect(state.created).toBeNull();
  });

  describe('the three personal fields are required, before Stripe', () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ['no first name', { displayFirstName: undefined }, 'first_name_missing'],
      ['a blank first name', { displayFirstName: '   ' }, 'first_name_missing'],
      ['a non-string first name', { displayFirstName: 42 }, 'first_name_missing'],
      ['no birth name', { fullBirthName: undefined }, 'birth_name_missing'],
      ['a blank birth name', { fullBirthName: ' \n ' }, 'birth_name_missing'],
      ['no date of birth', { dateOfBirth: undefined }, 'dob_missing'],
      ['a blank date of birth', { dateOfBirth: '' }, 'dob_missing'],
      ['a date that is not a date', { dateOfBirth: 'yesterday' }, 'dob_invalid'],
      ['an impossible calendar date', { dateOfBirth: '1971-02-31' }, 'dob_invalid'],
      ['a two-digit year', { dateOfBirth: '03/25/71' }, 'dob_invalid'],
      ['a date in the future', { dateOfBirth: '2999-01-01' }, 'dob_invalid'],
      ['someone under 13', { dateOfBirth: new Date().toISOString().slice(0, 10) }, 'dob_invalid'],
      ['someone over 110', { dateOfBirth: '1800-01-01' }, 'dob_invalid'],
    ];
    for (const [name, extra, code] of cases) {
      it(`${name} → 400 ${code}, no session, no intake`, async () => {
        const res = await post(body({ editionId: 'blind-spots-v1', ...extra }));
        expect(res.status).toBe(400);
        expect(res.body.code).toBe(code);
        expect(typeof res.body.error).toBe('string');
        expect(res.body.error.length).toBeGreaterThan(0);
        // Customer-safe: the message never echoes what she typed.
        expect(res.body.error).not.toContain('Sarah');
        expect(state.created).toBeNull();
        expect(state.intakes).toHaveLength(0);
      });
    }

    it('a non-ASCII birth name is NOT refused — the lens stage routes it to support', async () => {
      const res = await post(body({ editionId: 'blind-spots-v1', fullBirthName: '  Joël   Smith ' }));
      expect(res.status).toBe(200);
      expect(state.intakes[0]).toMatchObject({ fullBirthName: 'Joël Smith' });
    });

    it('a US-order slash date still passes the parser (the client sends ISO; the range rules are what matter)', async () => {
      const res = await post(body({ editionId: 'blind-spots-v1', dateOfBirth: '03/25/1971' }));
      expect(res.status).toBe(200);
      expect(state.intakes[0]).toMatchObject({ dateOfBirth: '1971-03-25' });
    });
  });

  it('creates the session with NO custom fields, the edition cancel url and pinned version', async () => {
    // The browser claims a different version — it must be ignored.
    const res = await post(body({ editionId: 'blind-spots-v1', editionVersion: 99, bump: true }));
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://checkout.stripe.test/cs_test_marcus_1');

    const p = state.created as {
      custom_fields?: unknown;
      cancel_url: string;
      success_url: string;
      metadata: Record<string, string>;
      line_items: unknown[];
    };
    // D5 amended 2026-09-14: Stripe forbids personal data in custom fields — none are emitted.
    expect(p.custom_fields).toBeUndefined();

    expect(p.cancel_url).toBe('https://example.test/marcus/reading/blind-spots-v1?cancelled=1');
    expect(p.success_url).toBe('https://example.test/marcus/reading/bridge?session_id={CHECKOUT_SESSION_ID}');

    expect(p.metadata.product).toBe('be_marcus_reading');
    expect(p.metadata.editionId).toBe('blind-spots-v1');
    expect(p.metadata.editionVersion).toBe('1');
    expect(p.metadata.bump).toBe('1');
    expect(p.line_items).toHaveLength(2);
  });

  it('⛔ none of the three personal values reach Stripe metadata — only the first name, as every offer sends it', async () => {
    await post(body({ editionId: 'blind-spots-v1' }));
    const p = state.created as { metadata: Record<string, string>; payment_intent_data: { metadata: Record<string, string> } };
    expect(p.metadata.firstName).toBe('Sarah');
    const flat = JSON.stringify(p);
    expect(flat).not.toContain('Sarah Jane Smith');
    expect(flat).not.toContain('1971');
    expect(Object.keys(p.metadata)).not.toEqual(
      expect.arrayContaining(['fullBirthName', 'dateOfBirth', 'displayFirstName']),
    );
  });

  it('the display first name is the metadata firstName source for 08, not a letter ?fn=', async () => {
    await post(body({ editionId: 'blind-spots-v1', firstName: 'Letter', displayFirstName: '  Sarah  ' }));
    expect((state.created as { metadata: Record<string, string> }).metadata.firstName).toBe('Sarah');
  });

  it('parks the edition, the bump AND the three personal fields on the intake row, keyed on the session', async () => {
    await post(body({ editionId: 'blind-spots-v1', bump: true, displayFirstName: ' Sarah ', fullBirthName: 'Sarah  Jane\tSmith' }));
    expect(state.intakes).toHaveLength(1);
    expect(state.intakes[0]).toEqual(
      expect.objectContaining({
        stripeSessionId: 'cs_test_marcus_1',
        offer: 'marcus-reading',
        editionId: 'blind-spots-v1',
        editionVersion: 1,
        speedBump: true,
        displayFirstName: 'Sarah',
        fullBirthName: 'Sarah Jane Smith',
        dateOfBirth: '1971-03-25',
      }),
    );
  });

  it('caps the first name at 60 and the birth name at 200 characters', async () => {
    await post(body({ editionId: 'blind-spots-v1', displayFirstName: 'a'.repeat(80), fullBirthName: 'b'.repeat(300) }));
    expect((state.intakes[0].displayFirstName as string).length).toBe(60);
    expect((state.intakes[0].fullBirthName as string).length).toBe(200);
  });

  it('writes speedBump false when she declined the bump', async () => {
    await post(body({ editionId: 'blind-spots-v1', bump: false }));
    expect(state.intakes[0]).toMatchObject({ speedBump: false, editionId: 'blind-spots-v1' });
    expect((state.created as { line_items: unknown[] }).line_items).toHaveLength(1);
  });
});

describe('POST /api/backend/checkout — other offers are untouched', () => {
  it('02 gets no custom fields, no edition metadata, no intake row, and its own cancel url — and needs none of 08\'s fields', async () => {
    const res = await request(await app())
      .post('/api/backend/checkout')
      .set('Host', 'example.test')
      .set('X-Forwarded-Proto', 'https')
      // No displayFirstName / fullBirthName / dateOfBirth: 08's requirement must not leak.
      .send({ offer: 'twin-flame', treatment: 'page', bump: false, editionId: 'blind-spots-v1', firstName: 'Letter' });
    expect(res.status).toBe(200);
    const p = state.created as { custom_fields?: unknown; cancel_url: string; metadata: Record<string, string> };
    expect(p.custom_fields).toBeUndefined();
    expect(p.metadata.editionId).toBeUndefined();
    expect(p.metadata.editionVersion).toBeUndefined();
    expect(p.metadata.firstName).toBe('Letter');
    expect(p.cancel_url).toMatch(/\?cancelled=1$/);
    expect(p.cancel_url).not.toContain('blind-spots');
    expect(state.intakes).toHaveLength(0);
  });
});
