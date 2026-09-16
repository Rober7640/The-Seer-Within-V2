// The Stripe webhook's BACKEND wiring (server/routes/webhooks.ts): the be_ booking branch
// records the shipment beside the order, and charge.refunded reaches the backend refund
// handler. Every side-effecting module is mocked; the catalog and product maps are real.
//
//   npx vitest run server/routes/webhooks.backend.test.ts
//
// What these pin down:
//  1. A PHYSICAL be_ BOOKING RECORDS ITS SHIPMENT EVEN WHEN THE ORDER WRITE FAILED.
//  2. NOTHING NEW FIRES FOR A FUNNEL PRODUCT OR A HOSTED BE UPSELL.
//  3. charge.refunded GOES TO handleBackendRefund (which owns the be_ gate) and to nothing
//     else; a failure there never fails the acknowledgement.

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { event: null as Record<string, unknown> | null };

const piRetrieve = vi.fn(async (_id: string) => ({ metadata: { product: 'be_heart_cleanser' } }));
vi.mock('../lib/stripeAccount', () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve: vi.fn() } }, paymentIntents: { retrieve: piRetrieve } }),
  verifyStripeWebhook: () => ({ ok: true, event: state.event, account: 'A' }),
}));
vi.mock('../lib/db', () => ({ db: {}, markMainPaid: vi.fn(async () => undefined) }));
const logged = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
vi.mock('../lib/logger', () => ({ default: logged }));
const capture = vi.fn();
vi.mock('../lib/posthog', () => ({ posthog: { capture: (...a: unknown[]) => capture(...a) } }));
vi.mock('../lib/paypal', () => ({}));
const fireStripePurchaseEvent = vi.fn(async () => undefined);
vi.mock('../lib/facebook', () => ({
  fireV2PurchaseEvent: vi.fn(async () => undefined),
  fireStripePurchaseEvent: (...a: unknown[]) => fireStripePurchaseEvent(...(a as [])),
}));
vi.mock('../lib/purchaseAnalytics', () => ({ buildPurchaseEvent: vi.fn(() => null) }));
vi.mock('../lib/braceletOrders', () => ({ recordBraceletOrder: vi.fn(async () => null) }));

const recordBackendOrder = vi.fn();
vi.mock('../lib/beOrders', () => ({ recordBackendOrder: (s: unknown) => recordBackendOrder(s) }));

const addBackendUpsellCustomer = vi.fn(async () => ({ success: true }));
vi.mock('../lib/aweber', () => ({
  addBackendUpsellCustomer: (...a: unknown[]) => addBackendUpsellCustomer(...(a as [])),
  addSoulmatePaidSubscriber: vi.fn(async () => ({ success: true })),
  addSoulmateUpsell1Subscriber: vi.fn(async () => ({ success: true })),
  addSoulmateUpsell2Subscriber: vi.fn(async () => ({ success: true })),
  addBumpPaidSubscriber: vi.fn(async () => ({ success: true })),
}));
vi.mock('../lib/beUpsellOrders', () => ({ recordBackendUpsellOrder: vi.fn(async () => undefined) }));
vi.mock('../lib/funnelMigrationEmail', () => ({ migrateAndEmailFunnelUser: vi.fn(async () => undefined) }));
vi.mock('../lib/googleAds', () => ({
  fireGoogleAdsConversion: vi.fn(async () => undefined),
  gadsStepForProduct: vi.fn(() => null),
}));
vi.mock('../lib/postPurchaseDripTrigger', () => ({ maybeSchedulePostPurchaseDrip: vi.fn(async () => undefined) }));
vi.mock('../lib/soulmateOrders', () => ({
  recordSoulmatePurchase: vi.fn(async () => undefined),
  getSoulmateOrderByEmail: vi.fn(async () => null),
}));
vi.mock('@shared/funnelConfig', () => ({ funnelDefForParam: () => null }));
vi.mock('@shared/landerBumpRouting', () => ({ bumpPaidListWanted: () => false }));

const recordBackendShipment = vi.fn();
const handleBackendRefund = vi.fn();
vi.mock('../lib/beShipments', () => ({
  recordBackendShipment: (...a: unknown[]) => recordBackendShipment(...a),
  handleBackendRefund: (...a: unknown[]) => handleBackendRefund(...a),
}));

const { default: router } = await import('./webhooks');
const app = express();
app.use(express.json());
app.use('/api/webhooks', router);

const post = () => request(app).post('/api/webhooks/stripe').set('stripe-signature', 't=1,v1=x').send({});

function completed(product: string, extra: Record<string, unknown> = {}) {
  const session = {
    id: 'cs_test_webhook_1',
    payment_status: 'paid',
    amount_total: 5900,
    customer_details: { email: 'she@example.com' },
    metadata: { product, offer: 'heart-cleanser' },
    ...extra,
  };
  state.event = { type: 'checkout.session.completed', data: { object: session } };
  return session;
}

beforeEach(() => {
  state.event = null;
  for (const fn of [recordBackendOrder, recordBackendShipment, handleBackendRefund, addBackendUpsellCustomer, capture, fireStripePurchaseEvent, piRetrieve]) {
    fn.mockClear();
  }
  recordBackendOrder.mockReset();
  recordBackendOrder.mockResolvedValue({ id: 'order-09' });
  recordBackendShipment.mockReset();
  recordBackendShipment.mockResolvedValue(null);
  handleBackendRefund.mockReset();
  handleBackendRefund.mockResolvedValue(undefined);
  for (const fn of Object.values(logged)) fn.mockClear();
});

describe('checkout.session.completed — the be_ booking branch', () => {
  it('records the order, then the shipment with that order id', async () => {
    const session = completed('be_heart_cleanser');
    const res = await post();
    expect(res.status).toBe(200);
    expect(recordBackendOrder).toHaveBeenCalledWith(session);
    expect(recordBackendShipment).toHaveBeenCalledTimes(1);
    expect(recordBackendShipment).toHaveBeenCalledWith(session, { beOrderId: 'order-09' });
  });

  it('still records the shipment when the order write REJECTS', async () => {
    const session = completed('be_heart_cleanser');
    recordBackendOrder.mockRejectedValue(new Error('column "edition_id" does not exist'));
    const res = await post();
    expect(res.status).toBe(200);
    expect(recordBackendShipment).toHaveBeenCalledWith(session, { beOrderId: null });
  });

  it('still records the shipment when the order write returns nothing', async () => {
    const session = completed('be_heart_cleanser');
    recordBackendOrder.mockResolvedValue(null);
    await post();
    expect(recordBackendShipment).toHaveBeenCalledWith(session, { beOrderId: null });
  });

  it('a shipment failure never fails the acknowledgement', async () => {
    completed('be_heart_cleanser');
    recordBackendShipment.mockRejectedValue(new Error('boom'));
    const res = await post();
    expect(res.status).toBe(200);
    expect(logged.error).toHaveBeenCalled();
  });

  it('a funnel product never reaches the backend order or shipment code', async () => {
    completed('energy_clearing_ritual');
    await post();
    expect(recordBackendOrder).not.toHaveBeenCalled();
    expect(recordBackendShipment).not.toHaveBeenCalled();
    expect(handleBackendRefund).not.toHaveBeenCalled();
  });

  it('a hosted BE upsell is written to its list and records no shipment here', async () => {
    completed('be_bracelet');
    await post();
    expect(addBackendUpsellCustomer).toHaveBeenCalledTimes(1);
    expect(recordBackendOrder).not.toHaveBeenCalled();
    expect(recordBackendShipment).not.toHaveBeenCalled();
  });
});

describe('charge.refunded', () => {
  const charge = (metadata: Record<string, string>) => ({
    id: 'ch_test_1',
    object: 'charge',
    refunded: true,
    amount: 5900,
    amount_refunded: 5900,
    payment_intent: 'pi_test_09',
    metadata,
  });

  it('hands the charge to handleBackendRefund with a PaymentIntent reader', async () => {
    const c = charge({ product: 'be_heart_cleanser' });
    state.event = { type: 'charge.refunded', data: { object: c } };
    const res = await post();
    expect(res.status).toBe(200);
    expect(handleBackendRefund).toHaveBeenCalledTimes(1);
    const [passed, deps] = handleBackendRefund.mock.calls[0] as [unknown, { retrievePaymentIntent: (id: string) => Promise<unknown> }];
    expect(passed).toEqual(c);
    await deps.retrievePaymentIntent('pi_test_09');
    expect(piRetrieve).toHaveBeenCalledWith('pi_test_09');
  });

  it('fires nothing else — no order write, no analytics, no ad events', async () => {
    state.event = { type: 'charge.refunded', data: { object: charge({ product: 'energy_clearing_ritual' }) } };
    await post();
    expect(recordBackendOrder).not.toHaveBeenCalled();
    expect(recordBackendShipment).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
    expect(fireStripePurchaseEvent).not.toHaveBeenCalled();
  });

  it('a refund-handler failure never fails the acknowledgement', async () => {
    state.event = { type: 'charge.refunded', data: { object: charge({ product: 'be_heart_cleanser' }) } };
    handleBackendRefund.mockRejectedValue(new Error('boom'));
    const res = await post();
    expect(res.status).toBe(200);
  });

  it('is not called for other event types', async () => {
    completed('be_heart_cleanser');
    await post();
    expect(handleBackendRefund).not.toHaveBeenCalled();
  });
});
