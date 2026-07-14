import { Router, type Request, type Response } from 'express';
import { getStripe } from '../lib/stripeAccount';
import { getBraceletBySlug } from '@shared/braceletProducts';
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
      success_url: `${baseUrl(req)}/products/${product.slug}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
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

export default router;
