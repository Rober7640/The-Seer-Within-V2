// Integration test for Task 3: no-optin buyers join V2 after purchase.
//
// Mounts the REAL Stripe webhook router (server/routes/webhooks.ts) on a throwaway
// Express app, mocks every external boundary (DB, Stripe signature, AWeber, FB,
// Google Ads, PostHog, the migration fn), and POSTs synthetic
// `checkout.session.completed` events to assert the gating:
//
//   metadata.noemail==='1' AND product==='energy_clearing_ritual' AND an email
//   on the session  ->  migrateAndEmailFunnelUser is called (V2 account created)
//
// Nothing here touches a real DB / Stripe / AWeber / Resend.
//
// Run with: npm run test:vitest

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';

// Shared mocks (hoisted so the vi.mock factories can close over them).
const { constructEvent, migrateMock } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  migrateMock: vi.fn(() => Promise.resolve()),
}));

// Stripe: bypass signature verification — constructEvent returns our event.
vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent };
    checkout = { sessions: { retrieve: vi.fn(() => Promise.resolve({})) } };
  },
}));

// The assertion target.
vi.mock('../../server/lib/funnelMigrationEmail', () => ({
  migrateAndEmailFunnelUser: migrateMock,
  isTier1State: vi.fn(() => false),
}));

// External boundaries — stubbed so the handler runs end-to-end with no real I/O.
vi.mock('../../server/lib/db', () => ({ db: {} }));
vi.mock('../../server/lib/facebook', () => ({
  fireV2PurchaseEvent: vi.fn(() => Promise.resolve()),
  fireStripePurchaseEvent: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../server/lib/googleAds', () => ({
  fireGoogleAdsConversion: vi.fn(() => Promise.resolve()),
  gadsStepForProduct: vi.fn(() => null),
}));
vi.mock('../../server/lib/posthog', () => ({ posthog: { capture: vi.fn() } }));
vi.mock('../../server/lib/paypal', () => ({}));
vi.mock('../../server/lib/soulmateOrders', () => ({
  recordSoulmatePurchase: vi.fn(() => Promise.resolve()),
  getSoulmateOrderByEmail: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('../../server/lib/postPurchaseDripTrigger', () => ({
  maybeSchedulePostPurchaseDrip: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../server/lib/aweber', () => ({
  addSoulmatePaidSubscriber: vi.fn(() => Promise.resolve()),
  addSoulmateUpsell1Subscriber: vi.fn(() => Promise.resolve()),
  addSoulmateUpsell2Subscriber: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../server/lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  // stripeClient is only created when a real-looking key is present.
  process.env.STRIPE_SECRET_KEY = 'sk_live_dummy_for_test';
  process.env.STRIPE_TRACKDESK_WEBHOOK_SECRET = 'whsec_dummy';

  const router = (await import('../../server/routes/webhooks')).default;
  const app = express();
  // The handler reads (req as any).rawBody; constructEvent is mocked so its
  // value is irrelevant — it just needs to exist.
  app.use((req, _res, next) => { (req as any).rawBody = '{}'; next(); });
  app.use('/api/webhooks', router);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://localhost:${(server.address() as any).port}`;
});

afterAll(() => { server?.close(); });
beforeEach(() => { migrateMock.mockClear(); constructEvent.mockReset(); });

function makeEvent(metadata: Record<string, unknown>, customerEmail?: string) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_noopt',
        metadata,
        amount_total: 3700,
        customer_email: null,
        customer_details: customerEmail ? { email: customerEmail } : undefined,
        payment_intent: 'pi_test_noopt',
      },
    },
  };
}

async function postEvent(event: unknown) {
  constructEvent.mockReturnValue(event);
  return fetch(`${baseUrl}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'stripe-signature': 'test', 'content-type': 'application/json' },
    body: '{}',
  });
}

describe('Task 3 — no-optin buyer joins V2 on purchase', () => {
  it('creates a V2 account for a no-optin front-end purchase that has an email', async () => {
    const res = await postEvent(
      makeEvent(
        { noemail: '1', product: 'energy_clearing_ritual', firstName: 'Tess', bucket: 'love' },
        'noopt+test@example.com',
      ),
    );
    expect(res.status).toBe(200);
    expect(migrateMock).toHaveBeenCalledTimes(1);
    expect(migrateMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'noopt+test@example.com', firstName: 'Tess' }),
    );
  });

  it('does NOT create a V2 account when the noemail flag is absent (normal buyer)', async () => {
    const res = await postEvent(
      makeEvent({ product: 'energy_clearing_ritual', firstName: 'Norm' }, 'normal@example.com'),
    );
    expect(res.status).toBe(200);
    expect(migrateMock).not.toHaveBeenCalled();
  });

  it('does NOT create a V2 account for an upsell product (only the front-end offer)', async () => {
    const res = await postEvent(
      makeEvent({ noemail: '1', product: 'protection_ritual' }, 'upsell@example.com'),
    );
    expect(res.status).toBe(200);
    expect(migrateMock).not.toHaveBeenCalled();
  });

  it('does NOT create a V2 account when no email is present on the session', async () => {
    const res = await postEvent(
      makeEvent({ noemail: '1', product: 'energy_clearing_ritual' }, undefined),
    );
    expect(res.status).toBe(200);
    expect(migrateMock).not.toHaveBeenCalled();
  });
});
