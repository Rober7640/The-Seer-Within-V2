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
const marcusAudioContentFields = vi.fn(async () => ({}));
vi.mock('../lib/beOrders', () => ({
  recordBackendOrder: (s: unknown) => recordBackendOrder(s),
  marcusAudioContentFields: (...a: unknown[]) => marcusAudioContentFields(...(a as [])),
}));

const addBackendUpsellCustomer = vi.fn(async () => ({ success: true }));
vi.mock('../lib/aweber', () => ({
  addBackendUpsellCustomer: (...a: unknown[]) => addBackendUpsellCustomer(...(a as [])),
  addSoulmatePaidSubscriber: vi.fn(async () => ({ success: true })),
  addSoulmateUpsell1Subscriber: vi.fn(async () => ({ success: true })),
  addSoulmateUpsell2Subscriber: vi.fn(async () => ({ success: true })),
  addBumpPaidSubscriber: vi.fn(async () => ({ success: true })),
}));
const recordBackendUpsellOrder = vi.fn(async () => undefined);
vi.mock('../lib/beUpsellOrders', () => ({ recordBackendUpsellOrder: (...a: unknown[]) => recordBackendUpsellOrder(...(a as [])) }));
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

// 04's price test: the upsell conversion write has its own tests (experiments.be04Price.test.ts);
// here it is a spy, so WHICH payment reaches it, with what amount, can be pinned.
const logBe04UpsellConversion = vi.fn(async (..._a: unknown[]) => undefined);
vi.mock('../lib/experiments', () => ({
  logBe04UpsellConversion: (...a: unknown[]) => logBe04UpsellConversion(...a),
}));

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
  for (const fn of [recordBackendOrder, recordBackendShipment, handleBackendRefund, addBackendUpsellCustomer, capture, fireStripePurchaseEvent, piRetrieve, recordBackendUpsellOrder, marcusAudioContentFields, logBe04UpsellConversion]) {
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

  it('a fallback (hosted-checkout) 08 audio upsell ALSO records the be_upsell_orders entitlement row', async () => {
    completed('be_08_marcus_audio', {
      amount_total: 1700,
      payment_intent: 'pi_fallback_audio_1',
      metadata: { product: 'be_08_marcus_audio', offer: 'marcus-reading', originalSession: 'cs_reading_1' },
    });
    await post();
    expect(recordBackendUpsellOrder).toHaveBeenCalledTimes(1);
    expect(recordBackendUpsellOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pi_fallback_audio_1',
        amount_received: 1700,
        metadata: expect.objectContaining({
          product: 'be_08_marcus_audio',
          offer: 'marcus-reading',
          originalSession: 'cs_reading_1',
        }),
      }),
    );
  });

  it('SCOPE: a fallback bracelet/protection upsell does NOT record be_upsell_orders (08-audio only)', async () => {
    completed('be_bracelet', {
      amount_total: 4700,
      payment_intent: 'pi_fallback_bracelet_1',
      metadata: { product: 'be_bracelet', offer: 'twin-flame', originalSession: 'cs_tf_1' },
    });
    await post();
    expect(recordBackendUpsellOrder).not.toHaveBeenCalled();
  });
});

// ─── 04's price split test: upsell revenue lands on the arm she booked under ─────────────
describe('04 price test — attribution', () => {
  const ARM_META = { expSubject: 'visitor-04', priceExp: 'be_04_price_2026', priceArm: 'B' };

  function oneClick(metadata: Record<string, string>, amount = 4700) {
    const pi = { id: 'pi_test_04_u1', amount, metadata };
    state.event = { type: 'payment_intent.succeeded', data: { object: pi } };
    return pi;
  }

  it('a 1-click upsell hands its metadata, product and charged amount to the conversion logger', async () => {
    const pi = oneClick({ product: 'be_protection_ritual', offer: 'tea-reading', flow: '1click', email: 'she@example.com', ...ARM_META });
    const res = await post();
    expect(res.status).toBe(200);
    expect(logBe04UpsellConversion).toHaveBeenCalledTimes(1);
    expect(logBe04UpsellConversion).toHaveBeenCalledWith(pi.metadata, 'be_protection_ritual', 4700);
  });

  it('a hosted (fallback) upsell does too, with the session\'s amount_total', async () => {
    const session = completed('be_bracelet', {
      amount_total: 3000,
      metadata: { product: 'be_bracelet', offer: 'tea-reading', originalSession: 'cs_booking', ...ARM_META },
    });
    await post();
    expect(logBe04UpsellConversion).toHaveBeenCalledTimes(1);
    expect(logBe04UpsellConversion).toHaveBeenCalledWith(session.metadata, 'be_bracelet', 3000);
  });

  it('a booking never reaches the UPSELL logger (its conversion is recordBackendOrder\'s)', async () => {
    completed('be_tea_reading', { metadata: { product: 'be_tea_reading', offer: 'tea-reading', ...ARM_META } });
    await post();
    expect(logBe04UpsellConversion).not.toHaveBeenCalled();
    expect(recordBackendOrder).toHaveBeenCalledTimes(1);
  });

  it('PostHog purchase_completed carries price_arm on the booking and on both upsell paths', async () => {
    completed('be_tea_reading', { amount_total: 4500, metadata: { product: 'be_tea_reading', offer: 'tea-reading', ...ARM_META } });
    await post();
    oneClick({ product: 'be_protection_ritual', offer: 'tea-reading', flow: '1click', email: 'she@example.com', ...ARM_META });
    await post();
    completed('be_bracelet', { amount_total: 4700, metadata: { product: 'be_bracelet', offer: 'tea-reading', ...ARM_META } });
    await post();
    const props = capture.mock.calls.map((c) => (c[0] as { properties: Record<string, unknown> }).properties);
    expect(props.map((p) => [p.product, p.price_arm])).toEqual([
      ['be_tea_reading', 'B'],
      ['be_protection_ritual', 'B'],
      ['be_bracelet', 'B'],
    ]);
  });

  it('every other offer\'s purchase event says price_arm: null', async () => {
    completed('be_heart_cleanser');
    await post();
    expect((capture.mock.calls[0][0] as { properties: Record<string, unknown> }).properties.price_arm).toBeNull();
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
