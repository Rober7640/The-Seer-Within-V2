import { Router, type Request, type Response } from 'express';
import { getStripe } from '../lib/stripeAccount';
import {
  backendOrderDescriptor,
  isBackendOfferKey,
  isBookingTreatment,
  resolveBackendCharge,
  upsellChargeFields,
  type BookingTreatment,
} from '@shared/backendOffers';
import { getBeOrderBySession, recordBackendOrder, writeToCustomerList } from '../lib/beOrders';
import { resolveBeBookingTreatment } from '../lib/experiments';
import { BACKEND_UPSELLS } from '../lib/backendCustomerList';
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

// The attribution metadata keys we carry through Stripe. All five UTMs, because Joel
// may put his tag in any one of them, plus the browser distinct id.
const PH_UTM_KEYS = ['utm_campaign', 'utm_source', 'utm_medium', 'utm_content', 'utm_term'] as const;

/** Pull the PostHog attribution fields off a request body (checkout) into a flat,
 *  length-capped metadata patch. Only present keys are emitted, so Stripe metadata
 *  stays lean and the purchase event's props are present-or-absent cleanly. */
function posthogMetaFromBody(body: unknown): Record<string, string> {
  const b = (body ?? {}) as { posthogDistinctId?: unknown; utm?: Record<string, unknown> };
  const out: Record<string, string> = {};
  if (typeof b.posthogDistinctId === 'string' && b.posthogDistinctId)
    out.posthogDistinctId = b.posthogDistinctId.slice(0, 200);
  const utm = b.utm && typeof b.utm === 'object' ? (b.utm as Record<string, unknown>) : {};
  for (const k of PH_UTM_KEYS) {
    const v = utm[k];
    if (typeof v === 'string' && v) out[k] = v.slice(0, 200);
  }
  return out;
}

/** The same keys, copied off an existing Stripe metadata bag (the booking session),
 *  so the 1-click upsell PI carries attribution without the browser re-sending it. */
function posthogMetaFromStripe(meta: Record<string, string | undefined> | null | undefined): Record<string, string> {
  const m = meta ?? {};
  const out: Record<string, string> = {};
  for (const k of ['posthogDistinctId', ...PH_UTM_KEYS]) {
    const v = m[k];
    if (typeof v === 'string' && v) out[k] = v;
  }
  return out;
}

function baseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.get('host');
  return `${proto}://${host}`;
}

// Which booking treatment (page vs chat) to show this visitor. The browser sends a
// stable per-browser `subject` id; the A/B assignment is sticky to it and the
// exposure is logged here. Always resolves to something ('page' on any miss), so a
// booking screen never blocks on it.
router.get('/booking-treatment', async (req: Request, res: Response) => {
  const subject = typeof req.query.subject === 'string' ? req.query.subject : null;
  const result = await resolveBeBookingTreatment(subject);
  res.json(result);
});

// The 1-click upsell page loads with the BOOKING session id and asks for what it
// needs to render + charge: the buyer's name, her email, the price, and whether a
// saved card is on file. Reads the Stripe session DIRECTLY (the be_orders row may
// not be written yet on the redirect) and only answers for a PAID backend order.
//
// ⛔ Unlike V1's /api/upsell/user-data, this does NO conversations lookup and NO
// paid-list write and fires NO tracking — the backend funnel is walled off from
// V1, and the customer-list write already happened at booking.
router.get('/upsell/user-data', async (req: Request, res: Response) => {
  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : '';
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Temporarily unavailable.' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });
    const product = session.metadata?.product;
    if (!product || !product.startsWith('be_') || session.payment_status !== 'paid') {
      return res.status(404).json({ error: 'Order not found' });
    }

    const pi = typeof session.payment_intent === 'string' ? null : session.payment_intent;
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
    const paymentMethodId =
      pi && typeof pi.payment_method === 'string'
        ? pi.payment_method
        : (pi?.payment_method as { id?: string } | null | undefined)?.id ?? null;

    // Did she already buy Upsell 1 (Protection Ritual), and did she give a shipping
    // address there? If so, Upsell 2 reuses it and does NOT ask again — V1's Path A.
    // The address lives on the Upsell 1 PaymentIntent (see /upsell/shipping).
    let upsellPurchased = false;
    let shipping:
      | { name: string; line1: string; line2?: string; city: string; state: string; postal: string; country: string }
      | null = null;
    if (customerId) {
      const pis = await stripe.paymentIntents.list({ customer: customerId, limit: 10 });
      const u1 = pis.data.find(
        (p) => p.metadata?.product === 'be_protection_ritual' && p.status === 'succeeded',
      );
      if (u1) {
        upsellPurchased = true;
        const s = u1.shipping;
        if (s?.address?.line1) {
          shipping = {
            name: s.name || '',
            line1: s.address.line1,
            ...(s.address.line2 ? { line2: s.address.line2 } : {}),
            city: s.address.city || '',
            state: s.address.state || '',
            postal: s.address.postal_code || '',
            country: s.address.country || '',
          };
        }
      }
    }

    return res.json({
      firstName: session.metadata?.firstName || session.customer_details?.name || 'Friend',
      email:
        session.customer_details?.email ||
        session.customer_email ||
        session.metadata?.email ||
        null,
      offer: session.metadata?.offer ?? null,
      // 02 collects no bucket / person — the twin-flame upsell copy needs neither.
      bucket: null,
      personName: null,
      upsell1PriceCents: BACKEND_UPSELLS.be_protection_ritual.priceCents,
      upsell2PriceCents: BACKEND_UPSELLS.be_bracelet.priceCents,
      upsell2DownsellCents: BACKEND_UPSELLS.be_bracelet.downsellCents,
      // Upsell 2 (Path A): she bought U1 and has an address → reuse it, don't re-ask.
      upsellPurchased,
      hasShipping: Boolean(shipping),
      shipping,
      // The 1-click charge can only run with both. If false, the page should offer a
      // hosted checkout rather than a button that silently does nothing.
      hasSavedCard: Boolean(customerId && paymentMethodId),
    });
  } catch (err) {
    logger.error('backend/upsell/user-data failed', {
      session: sessionId,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.status(404).json({ error: 'Order not found' });
  }
});

// 1-click upsell charge — off-session, on the card saved at booking, for the BE
// upsell product. Mirrors V1's /api/upsell/charge, but the product is a `be_` key
// so it is invisible to V1's webhook branches (no Meta CAPI / Google / Trackdesk),
// and it routes to the BE lists. Any miss (no card, decline, unpaid) returns
// `{ fallback: true }` so the page can send her to a hosted checkout instead of a
// button that silently does nothing. Physical item → the shipping address rides on
// the PaymentIntent, where the manual shipper reads it.
router.post('/upsell/charge', async (req: Request, res: Response) => {
  const sessionId =
    typeof req.body?.checkoutSessionId === 'string' ? req.body.checkoutSessionId : '';
  if (!sessionId) return res.status(400).json({ success: false, error: 'Missing checkoutSessionId' });

  const email = typeof req.body?.email === 'string' ? req.body.email : null;
  // Which upsell + tier. Defaults to Protection Ritual at full price, so U1's lean
  // body ({checkoutSessionId,email}) keeps working; U2 sends product + optional
  // tier:'downsell'. An unknown product falls back to U1 rather than 500-ing.
  const productKey =
    typeof req.body?.product === 'string' && BACKEND_UPSELLS[req.body.product]
      ? (req.body.product as string)
      : 'be_protection_ritual';
  const upsell = BACKEND_UPSELLS[productKey];
  const isDownsell = req.body?.tier === 'downsell' && typeof upsell.downsellCents === 'number';
  const amountCents = isDownsell ? (upsell.downsellCents as number) : upsell.priceCents;

  const stripe = getStripe();
  if (!stripe) return res.json({ success: false, fallback: true });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'payment_intent.payment_method'],
    });

    // Must be a PAID backend order — never charge off a V1 session or an unpaid one.
    if (!session.metadata?.product?.startsWith('be_') || session.payment_status !== 'paid') {
      return res.json({ success: false, fallback: true, error: 'not a paid backend order' });
    }

    // Ownership: the email the page holds must match the one on the paid session.
    const sessionEmail = session.customer_details?.email || session.customer_email || null;
    // Same name fallback as the order recorder: the letter's ?fn=, else the name
    // Stripe collected on the card — so the upsell list write is never nameless.
    const buyerName = session.metadata?.firstName || session.customer_details?.name || '';
    if (email && sessionEmail && sessionEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'ownership check failed' });
    }

    if (!session.customer || !session.payment_intent) {
      return res.json({ success: false, fallback: true });
    }
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer.id;
    const pi = session.payment_intent as import('stripe').Stripe.PaymentIntent;
    if (pi.status !== 'succeeded') return res.json({ success: false, fallback: true });
    const paymentMethodId =
      typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id ?? null;
    if (!paymentMethodId) return res.json({ success: false, fallback: true });

    // Shipping (physical product). Collected on the page; ride it on the PI so the
    // manual shipper reads it from the payment. Optional — a missing address must
    // not block the charge; fulfilment can chase it, a failed charge cannot.
    const s = req.body?.shipping;
    const shipping =
      s && typeof s === 'object' && typeof s.line1 === 'string' && typeof s.name === 'string'
        ? {
            name: String(s.name).slice(0, 200),
            address: {
              line1: String(s.line1).slice(0, 200),
              ...(s.line2 ? { line2: String(s.line2).slice(0, 200) } : {}),
              ...(s.city ? { city: String(s.city).slice(0, 100) } : {}),
              ...(s.state ? { state: String(s.state).slice(0, 100) } : {}),
              ...(s.postal ? { postal_code: String(s.postal).slice(0, 20) } : {}),
              ...(s.country ? { country: String(s.country).slice(0, 2) } : {}),
            },
          }
        : undefined;

    // Attribute the upsell to the offer she actually booked (from the booking
    // session), not a hardcoded '02'. Defaults to twin-flame if unresolved.
    const { offer: chargeOffer, description: chargeDescription } = upsellChargeFields(
      session.metadata,
      upsell.name,
      isDownsell,
    );

    const charge = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: chargeDescription,
      ...(shipping ? { shipping } : {}),
      metadata: {
        // ⛔ The `be_` key. Unknown to every V1 webhook branch → no Meta CAPI, no
        // Google Ads, no Trackdesk. The BE webhook branch routes it to the offer's
        // own list (be_protection_ritual→6972555, be_bracelet→6972556).
        product: upsell.productKey,
        offer: chargeOffer,
        originalSession: sessionId,
        flow: '1click',
        ...(isDownsell ? { type: 'downsell' } : {}),
        // Carried so the webhook's payment_intent.succeeded can write her to the
        // upsell list without re-fetching the booking session.
        ...(sessionEmail ? { email: sessionEmail } : {}),
        ...(buyerName ? { firstName: buyerName } : {}),
        // Attribution copied off the booking session so payment_intent.succeeded can
        // fire the BE revenue event with the same distinct id + UTM as the booking.
        ...posthogMetaFromStripe(session.metadata),
      },
    });

    return res.json({ success: true, paymentIntentId: charge.id });
  } catch (err) {
    // Off-session declines (card_declined / authentication_required) throw here —
    // return fallback so the page can retry via a hosted checkout, not a dead button.
    logger.warn('backend/upsell/charge fell back', {
      session: sessionId,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.json({ success: false, fallback: true });
  }
});

// The shipping address for a 1-click upsell, collected AFTER the charge (like V1's
// flow). We stamp it onto the PaymentIntent so the manual shipper reads it straight
// off the Stripe payment — no DB table, no n8n. Non-fatal: she has already paid, so
// a save failure returns success:false but the client still completes; the address
// can be chased. Verifies the PI is a `be_` order before touching it.
router.post('/upsell/shipping', async (req: Request, res: Response) => {
  const paymentIntentId =
    typeof req.body?.paymentIntentId === 'string' ? req.body.paymentIntentId : '';
  const a = req.body?.address;
  if (!paymentIntentId || !a || typeof a !== 'object' || typeof a.line1 !== 'string') {
    return res.status(400).json({ error: 'Missing paymentIntentId or address' });
  }

  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Temporarily unavailable.' });

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!pi.metadata?.product?.startsWith('be_')) {
      return res.status(404).json({ error: 'not a backend order' });
    }

    await stripe.paymentIntents.update(paymentIntentId, {
      shipping: {
        name: String(a.name || '').slice(0, 200),
        address: {
          line1: String(a.line1).slice(0, 200),
          ...(a.line2 ? { line2: String(a.line2).slice(0, 200) } : {}),
          city: String(a.city || '').slice(0, 100),
          state: String(a.state || '').slice(0, 100),
          postal_code: String(a.postal || '').slice(0, 20),
          // Stripe wants ISO alpha-2. Include only when it looks like one, so a full
          // country name never rejects the whole update and loses the address.
          ...(typeof a.country === 'string' && a.country.trim().length === 2
            ? { country: a.country.trim().toUpperCase() }
            : {}),
        },
      },
    });

    return res.json({ success: true });
  } catch (err) {
    logger.error('backend/upsell/shipping failed (buyer paid; address can be chased)', {
      pi: paymentIntentId,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.json({ success: false });
  }
});

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
      // Create a Customer and save the card for OFF-SESSION reuse, exactly as V1's
      // main checkout does — this is what lets the post-purchase upsells charge in
      // one click. No email is known before Stripe (she enters it here), so we let
      // Checkout mint the customer rather than looking one up.
      customer_creation: 'always',
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
      //
      // If the offer has an upsell chain, land her on Upsell 1 with `?session_id=`
      // (the param the upsell + thank-you pages read) — she then flows welcome1 →
      // welcome2 → success. Otherwise straight to the receipt.
      success_url: offer.upsellEntryPath
        ? `${origin}${offer.upsellEntryPath}?session_id={CHECKOUT_SESSION_ID}`
        : `${origin}${offer.successPath}?s={CHECKOUT_SESSION_ID}`,
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
        // The booking-treatment A/B visitor subject, echoed back on the webhook so the
        // purchase can be attributed to the arm she saw. ⚠ Not a funnel product key —
        // nothing keys behaviour on it; it is read only by logBeBookingConversion.
        ...(typeof req.body?.expSubject === 'string' && req.body.expSubject
          ? { expSubject: req.body.expSubject.slice(0, 64) }
          : {}),
        // PostHog attribution — distinct id + link UTM, read back by the webhook's
        // BE revenue event. NOT a product/behaviour key; nothing branches on these.
        ...posthogMetaFromBody(req.body),
      },
      payment_intent_data: {
        // The Stripe Dashboard's Description column, prefixed `BE <nn>` so a backend
        // order is unmistakable among the six V1 funnels. The bump is named here too
        // so a two-product order reads at a glance instead of only by amount. NOT
        // customer-facing: the line items above are what her receipt shows.
        description: backendOrderDescriptor(offer.key, charge.bumpPurchased),
        // Save the card against the new Customer so the 1-click upsell can charge it
        // off-session. Same setting V1's main checkout uses (server/routes.ts).
        setup_future_usage: 'off_session',
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
