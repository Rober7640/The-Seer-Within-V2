import { Router, type Request, type Response } from 'express';
import { getStripe } from '../lib/stripeAccount';
import { getBraceletBySlug } from '@shared/braceletProducts';
import { recordBraceletOrder, getBraceletOrderBySession } from '../lib/braceletOrders';
import logger from '../lib/logger';

// Stripe Checkout for the Facebook-compliance product pages (/products/:slug).
//
// Facebook blocked the ad account because our product pages had no ACTIVE buy button
// with a visible price. This is that buy button.
//
// ── The one security rule ────────────────────────────────────────────────────────
// The client posts { slug, quantity } and NOTHING ELSE. The price is looked up here,
// server-side, from shared/braceletProducts.ts — the same catalog the client renders.
// If the client could send a price, anyone could buy a $99 bracelet for one cent.
//
// ── Why this cannot disturb the funnels ──────────────────────────────────────────
// The checkout metadata carries a NEW product name (`bracelet_*`). Every branch of the
// existing Stripe webhook is keyed on `metadata.product` and skips an unknown value:
//   resolveStripeEventName() -> null  => no Meta CAPI Purchase
//   gadsStepForProduct()     -> null  => no Google Ads conversion
//   buildPurchaseEvent()     -> null  => no PostHog purchase_completed
//   soulmate / protection_ritual / manifestation_bracelet blocks are name-gated
// So webhooks.ts, purchaseAnalytics.ts and the database are all left completely alone.
//
// 🔴 NEVER add `trackdeskClickId` to this metadata. The webhook's Trackdesk branch
// defaults conversionType to 'sale' for any product it doesn't recognise, which would
// book a bracelet as a main-funnel affiliate sale and corrupt attribution.
//
// Orders land in the Stripe dashboard with the shipping address attached. There is no
// bracelet_orders table by design — no schema change, no migration, no risk to the
// funnels. Revisit if volume ever justifies it.

const router = Router();

const MAX_QUANTITY = 10;

const SHIPPING_COUNTRIES = [
  'US', 'CA', 'GB', 'AU', 'NZ', 'SG', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT',
] as const;

function baseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.get('host');
  return `${proto}://${host}`;
}

router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      logger.error('products/checkout: Stripe is not configured');
      return res.status(503).json({ error: 'Checkout is temporarily unavailable.' });
    }

    const slug = typeof req.body?.slug === 'string' ? req.body.slug : '';
    const product = getBraceletBySlug(slug);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Quantity is the only other thing we accept, and it is clamped.
    const rawQty = Number(req.body?.quantity);
    const quantity = Number.isFinite(rawQty)
      ? Math.min(MAX_QUANTITY, Math.max(1, Math.floor(rawQty)))
      : 1;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.tagline,
            },
            // The price the SERVER decided, from the catalog. Never from the request.
            unit_amount: product.priceCents,
          },
          quantity,
        },
      ],
      // Physical goods — we need somewhere to send them.
      shipping_address_collection: {
        allowed_countries: [...SHIPPING_COUNTRIES],
      },
      phone_number_collection: { enabled: true },
      // A real thank-you page. The first cut sent the buyer back to the product page with
      // ?purchase=success, which the page ignored — so they'd pay $99, land on a page that
      // looked untouched, and reasonably assume it had failed.
      success_url: `${baseUrl(req)}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl(req)}/products/${product.slug}?purchase=cancelled`,
      metadata: {
        app: 'the-seer-within',
        // Deliberately NOT one of the funnel's product names — see the header.
        product: product.stripeProduct,
        slug: product.slug,
        quantity: String(quantity),
      },
      payment_intent_data: {
        description: product.name,
        metadata: {
          product: product.stripeProduct,
          slug: product.slug,
        },
      },
    });

    if (!session.url) {
      // The soulmate upsell shipped a catch that returned no url and trapped the buyer.
      // Fail loudly instead of handing back a dead button.
      logger.error('products/checkout: Stripe returned a session with no url', { slug: product.slug });
      return res.status(502).json({ error: 'Checkout could not be started. Please try again.' });
    }

    logger.info('products/checkout: session created', {
      slug: product.slug,
      quantity,
      amountCents: product.priceCents * quantity,
      session: session.id,
    });

    return res.json({ url: session.url });
  } catch (err) {
    logger.error('products/checkout failed:', err);
    return res.status(500).json({ error: 'Checkout could not be started. Please try again.' });
  }
});

/**
 * Order lookup for the thank-you page.
 *
 * The webhook is authoritative — it writes the row and sends the emails. But the buyer's
 * redirect frequently beats the webhook, so if the row isn't there yet we retrieve the
 * session from Stripe and record it ourselves. The write is an idempotent upsert keyed on
 * stripe_session_id, so whichever path lands first, there is exactly one row and one email.
 *
 * We verify `payment_status` against Stripe rather than trusting the URL — a session id in
 * a query string proves nothing.
 */
router.get('/order/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.sessionId || '');
    if (!sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid session.' });
    }

    const existing = await getBraceletOrderBySession(sessionId);
    if (existing) {
      return res.json({ order: publicOrder(existing) });
    }

    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Unavailable.' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'This order has not been paid.' });
    }
    if (!session.metadata?.product?.startsWith('bracelet_')) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const recorded = await recordBraceletOrder(session);
    if (!recorded) return res.status(404).json({ error: 'Order not found.' });

    const row = await getBraceletOrderBySession(sessionId);
    return res.json({ order: row ? publicOrder(row) : null });
  } catch (err) {
    logger.error('products/order lookup failed:', err);
    return res.status(500).json({ error: 'Could not load your order.' });
  }
});

/** Only what the thank-you page needs. No payment ids, no internal columns. */
function publicOrder(row: Awaited<ReturnType<typeof getBraceletOrderBySession>>) {
  if (!row) return null;
  return {
    reference: row.stripeSessionId.slice(-8).toUpperCase(),
    productSlug: row.productSlug,
    productName: row.productName,
    quantity: row.quantity,
    amountCents: row.amountCents,
    email: row.email,
    customerName: row.customerName,
    shipping: [
      row.shippingName, row.shippingLine1, row.shippingLine2,
      row.shippingCity, row.shippingState, row.shippingPostal, row.shippingCountry,
    ].filter(Boolean).join(', ') || null,
    status: row.status,
  };
}

export default router;
