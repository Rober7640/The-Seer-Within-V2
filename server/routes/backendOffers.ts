import { Router, type Request, type Response } from 'express';
import { getStripe } from '../lib/stripeAccount';
import {
  isBackendOfferKey,
  isBookingTreatment,
  resolveBackendCharge,
  type BookingTreatment,
} from '@shared/backendOffers';
import { getBeOrderBySession, recordBackendOrder, writeToCustomerList } from '../lib/beOrders';
import logger from '../lib/logger';

// Stripe Checkout for the one-time backend offers (02 Twin Flame, 03 Judgement Day, …).
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — Phase A, assets S4/S5.
// ONE endpoint for the whole deck. Every offer's price model lives in the catalog
// (shared/backendOffers.ts), so a new offer is a catalog row, not another route.
//
// ── The one security rule ────────────────────────────────────────────────────────
// The client posts { offer, treatment, bump, amountCents?, firstName? } and NOTHING that
// sets a price. A fixed offer's price is looked up server-side; a pay-what-you-want
// amount is the only number the buyer supplies, and `resolveBackendCharge` floor-checks
// it here. If the client could send a price, anyone could buy a $35 reading for a cent.
//
// ── Why this cannot disturb the live funnels ─────────────────────────────────────
// `metadata.product` is `be_*`, a value no branch of the shared Stripe webhook knows:
//   resolveStripeEventName() → null  ⇒ no Meta CAPI Purchase
//   gadsStepForProduct()     → null  ⇒ no Google Ads conversion
//   buildPurchaseEvent()     → null  ⇒ no PostHog purchase_completed
//   markMainPaid / bump-list / soulmate / V1 branches are all name-gated on their own
//     product strings, and the bump branch additionally requires `energy_clearing_ritual`
// Six funnels share that webhook, and none of them moves. (Same trick as `bracelet_*`.)
//
// 🔴 NEVER add `trackdeskClickId` to this metadata. The webhook's Trackdesk branch
// defaults an unrecognised product to conversionType 'sale', which would book a backend
// reading as a main-funnel affiliate sale and corrupt attribution.

const router = Router();

/** Names have spaces and apostrophes; anything past this is somebody playing with the
 *  query string, not a name. Matches the client's own cap (lib/funnel.ts). */
const MAX_FIRST_NAME = 40;

function baseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.get('host');
  return `${proto}://${host}`;
}

router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      logger.error('backend/checkout: Stripe is not configured');
      return res.status(503).json({ error: 'Checkout is temporarily unavailable.' });
    }

    const offerKey = req.body?.offer;
    if (!isBackendOfferKey(offerKey)) {
      return res.status(404).json({ error: 'That offer does not exist.' });
    }

    const treatment: BookingTreatment = isBookingTreatment(req.body?.treatment)
      ? req.body.treatment
      : 'page';

    // The pay-what-you-want amount, in cents, as the screen computed it. Absent and
    // ignored on a fixed-price offer. ⚠ Absent must stay absent — `Number(null)` is 0,
    // which would come back as "give a little more" instead of "tell us the amount".
    const rawAmount = req.body?.amountCents;
    const amountCents =
      rawAmount === null || rawAmount === undefined || rawAmount === ''
        ? null
        : Number(rawAmount);

    const charge = resolveBackendCharge({
      offer: offerKey,
      bump: req.body?.bump === true,
      amountCents: amountCents !== null && Number.isFinite(amountCents) ? amountCents : null,
    });

    if (!charge.ok) {
      // 400 with her own message — a checkout that silently does nothing is worse than
      // one that says what to change. ⛔ The floor message never names the floor.
      if (charge.code === 'not_ready') {
        // Somebody has a live booking screen pointed at an offer that cannot be
        // fulfilled. That is a wiring mistake, not a buyer mistake — say so loudly.
        logger.warn('backend/checkout: offer is not open for money yet', { offer: offerKey });
      } else {
        logger.info('backend/checkout: refused', { offer: offerKey, code: charge.code });
      }
      return res.status(400).json({ error: charge.message, code: charge.code });
    }

    const { offer } = charge;

    const rawName = typeof req.body?.firstName === 'string' ? req.body.firstName : '';
    const firstName = rawName.trim().slice(0, MAX_FIRST_NAME);

    const origin = baseUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: charge.lines.map((line) => ({
        price_data: {
          currency: 'usd',
          product_data: line.description
            ? { name: line.name, description: line.description }
            : { name: line.name },
          // The price the SERVER decided, from the catalog. Never from the request.
          unit_amount: line.amountCents,
        },
        quantity: 1,
      })),
      // Digital deliverable — no address to collect. Stripe still collects the email,
      // which is the one field fulfilment cannot do without.
      success_url: `${origin}${offer.successPath}?s={CHECKOUT_SESSION_ID}`,
      // ⚠ Back to the treatment she came from, with the door the booking copy expects.
      // Its resume copy is written for exactly this round-trip, and says that nothing
      // has been taken — which is her live question at that moment.
      cancel_url: `${origin}${offer.bookingPath[treatment]}?cancelled=1`,
      metadata: {
        app: 'the-seer-within',
        // ⛔ Deliberately NOT one of the funnel's product names — see the header.
        product: offer.stripeProduct,
        offer: offer.key,
        treatment,
        readingCents: String(charge.readingCents),
        bump: charge.bumpPurchased ? '1' : '0',
        // ⛔ The bump's own code. n8n exact-matches this to decide what to fulfil, so a
        // reused code sends her the wrong thing. Absent entirely when she declined.
        ...(charge.bumpPurchased ? { bumpProduct: offer.bump.productKey } : {}),
        ...(firstName ? { firstName } : {}),
      },
      payment_intent_data: {
        // The Stripe Dashboard's Description column. The bump is named here so a
        // two-product order is identifiable at a glance instead of only by amount
        // — the same job V1's ` + Double Reading` marker does. NOT customer-facing:
        // the line items above are what her receipt shows.
        description: charge.bumpPurchased
          ? `${offer.stripeName} + ${offer.bump.stripeName.replace(/^\+\s*/, '')}`
          : offer.stripeName,
        metadata: {
          product: offer.stripeProduct,
          offer: offer.key,
        },
      },
    });

    if (!session.url) {
      // The soulmate upsell once shipped a catch that returned no url and trapped the
      // buyer on a dead button. Fail loudly instead.
      logger.error('backend/checkout: Stripe returned a session with no url', {
        offer: offer.key,
      });
      return res.status(502).json({ error: 'Checkout could not be started. Please try again.' });
    }

    logger.info('backend/checkout: session created', {
      offer: offer.key,
      treatment,
      readingCents: charge.readingCents,
      bump: charge.bumpPurchased,
      totalCents: charge.totalCents,
      session: session.id,
    });

    return res.json({ url: session.url });
  } catch (err) {
    logger.error('backend/checkout failed:', err);
    return res.status(500).json({ error: 'Checkout could not be started. Please try again.' });
  }
});

/**
 * Order lookup for the thank-you page.
 *
 * The webhook is authoritative — it writes the row and puts her on the customer list.
 * But her redirect frequently beats the webhook, so if the row isn't there yet we
 * retrieve the session from Stripe and record it ourselves. The write is an idempotent
 * upsert keyed on stripe_session_id, so whichever lands first there is exactly one row.
 *
 * ⚡ It also RETRIES the customer-list write when the webhook's attempt failed. That
 * write is her thank-you email; this is the one moment a buyer it failed for is standing
 * in front of us again, and the retry costs nothing (AWeber upserts).
 *
 * `payment_status` is verified against Stripe rather than trusted — a session id in a
 * query string proves nothing.
 */
router.get('/order/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    if (!sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid session.' });
    }

    const existing = await getBeOrderBySession(sessionId);
    if (existing) {
      const row = await writeToCustomerList(existing);
      return res.json({ order: publicOrder(row) });
    }

    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Unavailable.' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'This order has not been paid.' });
    }
    if (!session.metadata?.product?.startsWith('be_')) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const recorded = await recordBackendOrder(session);
    if (!recorded) return res.status(404).json({ error: 'Order not found.' });

    return res.json({ order: publicOrder(recorded) });
  } catch (err) {
    logger.error('backend/order lookup failed:', err);
    return res.status(500).json({ error: 'Could not load your order.' });
  }
});

/** Only what the thank-you screen needs. No payment ids, no internal columns. */
function publicOrder(row: Awaited<ReturnType<typeof getBeOrderBySession>>) {
  if (!row) return null;
  return {
    reference: row.stripeSessionId.slice(-8).toUpperCase(),
    offer: row.offer,
    offerNumber: row.offerNumber,
    firstName: row.firstName,
    email: row.email,
    amountCents: row.amountCents,
    bumpPurchased: row.bumpPurchased,
    status: row.status,
  };
}

export default router;
