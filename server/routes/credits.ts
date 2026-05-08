import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { users, creditPurchases, personas, checkoutViews } from '@shared/schema';
import { eq, and, ne, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../lib/auth';
import { getPersonaPricing } from '../lib/personaPricing';
import { DEFAULT_PRICING } from '../../shared/types';
import Stripe from 'stripe';
import logger from '../lib/logger';
import { fireWithBreaker, stripeBreaker, isCircuitOpenError } from '../lib/circuitBreaker';
import * as paypal from '../lib/paypal';
import { maybeFireFirstPurchaseEvent } from '../lib/facebook';
import { maybeSchedulePostPurchaseDrip } from '../lib/postPurchaseDripTrigger';

const router = Router();

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey && stripeKey !== 'sk_test_placeholder'
  ? new Stripe(stripeKey)
  : null;

// Special one-time welcome pack — not part of regular persona pricing
const WELCOME_TIER = {
  packageType: 'welcome',
  coins: 160,
  bonusCoins: 0,
  totalCoins: 160,
  priceUsd: 299,   // $2.99
  label: '160 coins',
};

// Aiden-only rescue hatch shown on the /aiden check-your-email screen after 60s.
// Same price, coins, and minutes as the generic starter ($9.99 / 180 coins / 3 min) —
// the distinct packageType 'aiden_rescue' exists purely so these purchases are
// directly attributable to the Aiden rescue-hatch flow in reporting, separate from
// regular in-chat starter top-ups that use packageType 'starter'.
const AIDEN_RESCUE_TIER = {
  packageType: 'aiden_rescue',
  coins: 180,
  bonusCoins: 0,
  totalCoins: 180,
  priceUsd: 999,   // $9.99
  label: '180 coins',
};

/** Resolve tier: handle special code-level packageTypes or look up from persona pricing */
function resolveTier(packageType: string, pricing: { tiers: Array<{ packageType: string; coins: number; bonusCoins: number; totalCoins: number; priceUsd: number; label: string }> }) {
  if (packageType === 'welcome') return WELCOME_TIER;
  if (packageType === 'aiden_rescue') return AIDEN_RESCUE_TIER;
  return pricing.tiers.find(t => t.packageType === packageType);
}

const checkoutSchema = z.object({
  packageType: z.string().min(1),
  personaId: z.string().min(1).optional(),
  successPath: z.string().optional(), // Optional override for post-checkout redirect (e.g. /chat/aiden-powers)
});

function getBaseUrl(req: Request): string {
  const origin = req.headers.origin;
  if (origin) return origin;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) return `${proto}://${host}`;
  return process.env.BASE_URL || 'http://localhost:5000';
}

// GET /api/credits/balance
router.get('/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.select({
      coinBalance: users.coinBalance,
      totalCoinsUsed: users.totalCoinsUsed,
    })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!result[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      coinBalance: result[0].coinBalance,
      totalCoinsUsed: result[0].totalCoinsUsed,
    });
  } catch (error) {
    logger.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// GET /api/credits/welcome-eligible — check if user can see the $2.99 welcome offer
router.get('/welcome-eligible', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await db.select({ id: creditPurchases.id })
      .from(creditPurchases)
      .where(
        and(
          eq(creditPurchases.userId, req.userId!),
          eq(creditPurchases.packageType, 'welcome'),
          eq(creditPurchases.status, 'completed'),
        ),
      )
      .limit(1);

    res.json({ eligible: existing.length === 0 });
  } catch (error) {
    logger.error('Welcome eligibility check error:', error);
    res.json({ eligible: false });
  }
});

// GET /api/credits/pricing?personaId=xxx
router.get('/pricing', async (req: Request, res: Response) => {
  try {
    const personaId = req.query.personaId as string | undefined;

    if (personaId) {
      const pricing = await getPersonaPricing(personaId);
      res.json(pricing);
    } else {
      res.json(DEFAULT_PRICING);
    }
  } catch (error) {
    logger.error('Get pricing error:', error);
    res.status(500).json({ error: 'Failed to get pricing' });
  }
});

// GET /api/credits/purchases
router.get('/purchases', requireAuth, async (req: Request, res: Response) => {
  try {
    const purchases = await db.select()
      .from(creditPurchases)
      .where(eq(creditPurchases.userId, req.userId!))
      .orderBy(desc(creditPurchases.createdAt))
      .limit(50);

    res.json({ purchases });
  } catch (error) {
    logger.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases' });
  }
});

// POST /api/credits/checkout-view - Log when user opens a payment modal (for conversion tracking)
router.post('/checkout-view', requireAuth, async (req: Request, res: Response) => {
  try {
    const { packageType, personaId, source } = req.body;
    if (!packageType || !source) {
      res.status(400).json({ error: 'packageType and source are required' });
      return;
    }
    await db.insert(checkoutViews).values({
      userId: req.userId!,
      packageType,
      personaId: personaId || null,
      source,
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error('Checkout view tracking error:', error);
    // Non-blocking — don't fail the user experience for tracking
    res.json({ ok: true });
  }
});

// POST /api/credits/checkout
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  const parseResult = checkoutSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.errors.map(e => e.message).join(', '),
    });
    return;
  }

  const { packageType, personaId, successPath } = parseResult.data;

  let pricing, tier, personaName: string, userResult;
  try {
    pricing = personaId ? await getPersonaPricing(personaId) : DEFAULT_PRICING;
    tier = resolveTier(packageType, pricing);
    if (!tier) {
      res.status(400).json({ error: 'Invalid package type' });
      return;
    }

    personaName = 'Chat';
    if (personaId) {
      const personaResult = await db.select({ displayName: personas.displayName })
        .from(personas)
        .where(eq(personas.id, personaId))
        .limit(1);
      personaName = personaResult[0]?.displayName || 'Chat';
    }

    userResult = await db.select({ email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!userResult[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
  } catch (error) {
    logger.error('Credits checkout setup error:', error);
    res.status(500).json({ error: 'Checkout failed' });
    return;
  }

  // Insert the pending record only now that we have all the data we need.
  // If the Stripe call below fails we delete this record so we don't leak
  // orphaned pending rows.
  const purchase = await db.insert(creditPurchases).values({
    userId: req.userId!,
    personaId: personaId || null,
    packageType: tier.packageType,
    coinsPurchased: tier.coins,
    bonusCoins: tier.bonusCoins,
    priceUsd: tier.priceUsd,
    status: 'pending',
  }).returning();

  const purchaseId = purchase[0].id;

  if (!stripe) {
    // Dev / test mode: instantly complete the purchase without a real Stripe session.
    await db.update(creditPurchases)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchaseId));

    await db.update(users)
      .set({
        coinBalance: sql`coin_balance + ${tier.totalCoins}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId!));

    res.json({ url: successPath || '/chat-service?purchased=true', devMode: true });
    return;
  }

  try {
    const bonusLabel = tier.bonusCoins > 0 ? ` (+${tier.bonusCoins} bonus)` : '';
    const session = await fireWithBreaker(stripeBreaker, () =>
      stripe!.checkout.sessions.create({
        customer_email: userResult[0].email,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${personaName} - ${tier!.coins} Coins${bonusLabel}`,
              description: `${tier!.totalCoins} coins for consultation with ${personaName}`,
            },
            unit_amount: tier!.priceUsd,
          },
          quantity: 1,
        }],
        mode: 'payment',
        metadata: {
          app: 'the-seer-within-chat',
          purchaseId,
          userId: req.userId!,
          ...(personaId ? { personaId } : {}),
          packageType: tier!.packageType,
          totalCoins: String(tier!.totalCoins),
        },
        success_url: successPath
          ? `${getBaseUrl(req)}${successPath}?purchased=true&session_id={CHECKOUT_SESSION_ID}`
          : `${getBaseUrl(req)}/chat-service?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: successPath
          ? `${getBaseUrl(req)}${successPath}?cancelled=true`
          : `${getBaseUrl(req)}/chat-service?cancelled=true`,
      }),
    );

    await db.update(creditPurchases)
      .set({ stripeSessionId: session.id, updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchaseId));

    res.json({ url: session.url });
  } catch (error) {
    // Stripe call failed — remove the orphaned pending record so it doesn't
    // accumulate and skew reporting.
    try {
      await db.delete(creditPurchases).where(eq(creditPurchases.id, purchaseId));
    } catch (cleanupError) {
      logger.error('Failed to clean up pending purchase after Stripe error:', cleanupError);
    }

    if (isCircuitOpenError(error)) {
      logger.warn('Stripe circuit open, checkout unavailable');
      res.status(503).json({ error: 'Payment service temporarily unavailable. Please try again shortly.' });
    } else {
      logger.error('Credits checkout error:', error);
      res.status(500).json({ error: 'Checkout failed' });
    }
  }
});

// POST /api/credits/create-payment-intent - Stripe inline card payment
const paymentIntentSchema = z.object({
  packageType: z.string().min(1),
  personaId: z.string().min(1).optional(),
});

router.post('/create-payment-intent', requireAuth, async (req: Request, res: Response) => {
  const parseResult = paymentIntentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors.map(e => e.message).join(', ') });
    return;
  }

  const { packageType, personaId } = parseResult.data;

  let tier;
  let userEmail: string | undefined;
  try {
    const pricing = personaId ? await getPersonaPricing(personaId) : DEFAULT_PRICING;
    tier = resolveTier(packageType, pricing);
    if (!tier) {
      res.status(400).json({ error: 'Invalid package type' });
      return;
    }

    const userResult = await db.select({ email: users.email })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);
    userEmail = userResult[0]?.email;
  } catch (error) {
    logger.error('Stripe create-payment-intent setup error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
    return;
  }

  const purchase = await db.insert(creditPurchases).values({
    userId: req.userId!,
    personaId: personaId || null,
    packageType: tier.packageType,
    coinsPurchased: tier.coins,
    bonusCoins: tier.bonusCoins,
    priceUsd: tier.priceUsd,
    status: 'pending',
  }).returning();

  const purchaseId = purchase[0].id;

  // Dev mode: auto-complete without Stripe
  if (!stripe) {
    await db.update(creditPurchases)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchaseId));

    const updatedUser = await db.update(users)
      .set({
        coinBalance: sql`coin_balance + ${tier.totalCoins}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId!))
      .returning({ coinBalance: users.coinBalance });

    res.json({ devMode: true, newBalance: updatedUser[0]?.coinBalance ?? 0 });
    return;
  }

  try {
    const paymentIntent = await fireWithBreaker(stripeBreaker, () =>
      stripe!.paymentIntents.create({
        amount: tier!.priceUsd,
        currency: 'usd',
        ...(userEmail ? { receipt_email: userEmail } : {}),
        metadata: {
          app: 'the-seer-within-chat',
          purchaseId,
          userId: req.userId!,
          ...(personaId ? { personaId } : {}),
          packageType: tier!.packageType,
          totalCoins: String(tier!.totalCoins),
        },
      }),
    );

    await db.update(creditPurchases)
      .set({ stripePaymentIntentId: paymentIntent.id, updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchaseId));

    res.json({ clientSecret: paymentIntent.client_secret, purchaseId });
  } catch (error) {
    try {
      await db.delete(creditPurchases).where(eq(creditPurchases.id, purchaseId));
    } catch (cleanupError) {
      logger.error('Failed to clean up pending purchase after Stripe error:', cleanupError);
    }

    if (isCircuitOpenError(error)) {
      logger.warn('Stripe circuit open, payment intent unavailable');
      res.status(503).json({ error: 'Payment service temporarily unavailable. Please try again shortly.' });
    } else {
      logger.error('Stripe create-payment-intent error:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }
});

// POST /api/credits/confirm-payment - Stripe payment confirmation
const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1),
});

router.post('/confirm-payment', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = confirmPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors.map(e => e.message).join(', ') });
      return;
    }

    const { paymentIntentId } = parseResult.data;

    if (!stripe) {
      res.status(400).json({ error: 'Stripe not configured' });
      return;
    }

    const purchases = await db.select()
      .from(creditPurchases)
      .where(eq(creditPurchases.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    if (!purchases[0]) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const purchase = purchases[0];
    if (purchase.userId !== req.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    if (purchase.status !== 'pending') {
      res.status(400).json({ error: 'Purchase already processed' });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      res.status(400).json({ error: `Payment not completed (status: ${paymentIntent.status})` });
      return;
    }

    // Atomic flip: only the first caller (this confirm or the webhook) wins.
    // Returning row(s) tells us whether WE were the one that completed it,
    // so the FB first-purchase event fires exactly once per purchase.
    const flipped = await db.update(creditPurchases)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(and(eq(creditPurchases.id, purchase.id), eq(creditPurchases.status, 'pending')))
      .returning({ id: creditPurchases.id });

    if (flipped.length === 0) {
      // The webhook beat us to it — purchase is already credited. Return current balance.
      const currentUser = await db.select({ coinBalance: users.coinBalance })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);
      res.json({ success: true, newBalance: currentUser[0]?.coinBalance ?? 0 });
      return;
    }

    const updatedUser = await db.update(users)
      .set({
        coinBalance: sql`coin_balance + ${purchase.coinsPurchased + (purchase.bonusCoins ?? 0)}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId!))
      .returning({ coinBalance: users.coinBalance });

    // Clean up any other pending purchases for this user (e.g. abandoned PayPal orders)
    await db.delete(creditPurchases)
      .where(and(
        eq(creditPurchases.userId, req.userId!),
        eq(creditPurchases.status, 'pending'),
        ne(creditPurchases.id, purchase.id),
      ))
      .catch(err => logger.error('Failed to clean up pending purchases:', err));

    // Fire-and-forget — never block the response on FB tracking. Helper itself
    // only emits a Meta Purchase event for first-ever completed purchase.
    maybeFireFirstPurchaseEvent(purchase.id).catch(() => { /* logged inside */ });
    // Same pattern: schedules the 10-email post-purchase pastoral-care drip,
    // but only on the first-ever completed purchase. Gated behind
    // ENABLE_POST_PURCHASE_DRIP at send time (cron level).
    maybeSchedulePostPurchaseDrip(purchase.id).catch(() => { /* logged inside */ });

    const newBalance = updatedUser[0]?.coinBalance ?? 0;
    res.json({ success: true, newBalance });
  } catch (error) {
    logger.error('Stripe confirm-payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// POST /api/credits/create-order - PayPal order creation
const createOrderSchema = z.object({
  packageType: z.string().min(1),
  personaId: z.string().min(1).optional(),
});

router.post('/create-order', requireAuth, async (req: Request, res: Response) => {
  const parseResult = createOrderSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.errors.map(e => e.message).join(', '),
    });
    return;
  }

  const { packageType, personaId } = parseResult.data;

  let tier;
  try {
    const pricing = personaId ? await getPersonaPricing(personaId) : DEFAULT_PRICING;
    tier = resolveTier(packageType, pricing);
    if (!tier) {
      res.status(400).json({ error: 'Invalid package type' });
      return;
    }
  } catch (error) {
    logger.error('PayPal create-order setup error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
    return;
  }

  // Insert the pending record before calling PayPal so we have an ID to pass
  // as reference. If the PayPal call fails we delete this record immediately
  // to avoid orphaned pending rows.
  const purchase = await db.insert(creditPurchases).values({
    userId: req.userId!,
    personaId: personaId || null,
    packageType: tier.packageType,
    coinsPurchased: tier.coins,
    bonusCoins: tier.bonusCoins,
    priceUsd: tier.priceUsd,
    status: 'pending',
  }).returning();

  const purchaseId = purchase[0].id;

  try {
    const priceFormatted = (tier.priceUsd / 100).toFixed(2);
    const orderId = await paypal.createOrder(priceFormatted, purchaseId);

    await db.update(creditPurchases)
      .set({ paypalOrderId: orderId, updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchaseId));

    res.json({ orderId });
  } catch (error) {
    // PayPal call failed — remove the orphaned pending record.
    try {
      await db.delete(creditPurchases).where(eq(creditPurchases.id, purchaseId));
    } catch (cleanupError) {
      logger.error('Failed to clean up pending purchase after PayPal error:', cleanupError);
    }

    logger.error('PayPal create-order error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// POST /api/credits/capture-order - PayPal order capture
const captureOrderSchema = z.object({
  orderId: z.string().min(1),
});

router.post('/capture-order', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = captureOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { orderId } = parseResult.data;

    const purchases = await db.select()
      .from(creditPurchases)
      .where(eq(creditPurchases.paypalOrderId, orderId))
      .limit(1);

    if (!purchases[0]) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const purchase = purchases[0];
    if (purchase.userId !== req.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Idempotent path: if the webhook or reconciliation cron already credited
    // this purchase, return success with the current balance instead of 400.
    if (purchase.status === 'completed' && purchase.paypalCaptureId) {
      const currentUser = await db.select({ coinBalance: users.coinBalance })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);
      res.json({ success: true, newBalance: currentUser[0]?.coinBalance ?? 0 });
      return;
    }

    if (purchase.status !== 'pending') {
      res.status(400).json({ error: 'Purchase already processed' });
      return;
    }

    const captureResult = await paypal.captureOrder(orderId);
    if (captureResult.status !== 'COMPLETED') {
      res.status(400).json({ error: `Payment not completed (status: ${captureResult.status})` });
      return;
    }

    // Atomic flip: only the winner (this capture-order or the PayPal webhook)
    // ends up calling the FB helper, so first-purchase fires exactly once.
    const flipped = await db.update(creditPurchases)
      .set({
        status: 'completed',
        paypalCaptureId: captureResult.captureId,
        updatedAt: new Date(),
      })
      .where(and(eq(creditPurchases.id, purchase.id), eq(creditPurchases.status, 'pending')))
      .returning({ id: creditPurchases.id });

    if (flipped.length === 0) {
      // Webhook beat us. Return current balance, skip coin grant + FB event.
      const currentUser = await db.select({ coinBalance: users.coinBalance })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);
      res.json({ success: true, newBalance: currentUser[0]?.coinBalance ?? 0 });
      return;
    }

    const updatedUser = await db.update(users)
      .set({
        coinBalance: sql`coin_balance + ${purchase.coinsPurchased + (purchase.bonusCoins ?? 0)}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId!))
      .returning({ coinBalance: users.coinBalance });

    maybeFireFirstPurchaseEvent(purchase.id).catch(() => { /* logged inside */ });
    maybeSchedulePostPurchaseDrip(purchase.id).catch(() => { /* logged inside */ });

    // Clean up any other pending purchases for this user (e.g. abandoned Stripe intents)
    await db.delete(creditPurchases)
      .where(and(
        eq(creditPurchases.userId, req.userId!),
        eq(creditPurchases.status, 'pending'),
        ne(creditPurchases.id, purchase.id),
      ))
      .catch(err => logger.error('Failed to clean up pending purchases:', err));

    const newBalance = updatedUser[0]?.coinBalance ?? 0;

    res.json({ success: true, newBalance });
  } catch (error) {
    logger.error('PayPal capture-order error:', error);
    res.status(500).json({ error: 'Failed to capture PayPal order' });
  }
});

// POST /api/credits/confirm-checkout - Confirm a Stripe Checkout Session and grant coins.
// Called by the frontend after a Stripe Checkout redirect (e.g. rescue hatch).
// This is the synchronous counterpart to the webhook — if the webhook already
// processed the purchase, this is a no-op that returns the current balance.
const confirmCheckoutSchema = z.object({
  sessionId: z.string().min(1),
});

router.post('/confirm-checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = confirmCheckoutSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors.map(e => e.message).join(', ') });
      return;
    }

    const { sessionId } = parseResult.data;

    if (!stripe) {
      res.status(400).json({ error: 'Stripe not configured' });
      return;
    }

    // Retrieve the Checkout Session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (checkoutSession.payment_status !== 'paid') {
      res.status(400).json({ error: `Payment not completed (status: ${checkoutSession.payment_status})` });
      return;
    }

    const purchaseId = checkoutSession.metadata?.purchaseId;
    const totalCoins = parseInt(checkoutSession.metadata?.totalCoins || '0', 10);

    if (!purchaseId || !totalCoins) {
      res.status(400).json({ error: 'Missing checkout metadata' });
      return;
    }

    // Idempotency: only grant coins if purchase is still pending.
    // If the webhook already processed it, this is a safe no-op.
    const updated = await db.update(creditPurchases)
      .set({
        status: 'completed',
        stripePaymentIntentId: checkoutSession.payment_intent as string,
        updatedAt: new Date(),
      })
      .where(and(eq(creditPurchases.id, purchaseId), eq(creditPurchases.status, 'pending')))
      .returning({ id: creditPurchases.id });

    if (updated.length > 0) {
      // Purchase was still pending — grant coins now
      const userRow = await db.select({ emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);

      const needsImplicitVerify = userRow[0] && !userRow[0].emailVerified;

      await db.update(users)
        .set({
          coinBalance: sql`coin_balance + ${totalCoins}`,
          ...(needsImplicitVerify ? {
            emailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
          } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.userId!));

      if (needsImplicitVerify) {
        logger.info('Rescue hatch confirm-checkout: email auto-verified via payment', { userId: req.userId, purchaseId });
      }
      logger.info('Coins added via confirm-checkout', { totalCoins, userId: req.userId, purchaseId });

      // Fire FB first-purchase event (no-op if not first ever). Includes the
      // /aiden rescue hatch path per Q1=yes — rescue purchases are real V2
      // purchases that should fire Purchase like any other.
      maybeFireFirstPurchaseEvent(purchaseId).catch(() => { /* logged inside */ });
      maybeSchedulePostPurchaseDrip(purchaseId).catch(() => { /* logged inside */ });
    } else {
      logger.info('confirm-checkout: purchase already processed (webhook beat us)', { purchaseId });
    }

    // Always return current balance regardless of who granted the coins
    const currentUser = await db.select({ coinBalance: users.coinBalance })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    res.json({ success: true, newBalance: currentUser[0]?.coinBalance ?? 0 });
  } catch (error) {
    logger.error('confirm-checkout error:', error);
    res.status(500).json({ error: 'Failed to confirm checkout' });
  }
});

// POST /api/credits/webhook - Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(400).json({ error: 'Stripe not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_CREDITS_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('Missing STRIPE_CREDITS_WEBHOOK_SECRET');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  let event: Stripe.Event;
  try {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      logger.error('Webhook: req.rawBody not available — check express.json verify middleware');
      res.status(400).json({ error: 'Missing raw body' });
      return;
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    logger.error('Webhook signature verification failed:', err.message);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.metadata?.app !== 'the-seer-within-chat') {
      res.json({ received: true });
      return;
    }

    const purchaseId = session.metadata?.purchaseId;
    const userId = session.metadata?.userId;
    const totalCoins = parseInt(session.metadata?.totalCoins || '0', 10);

    if (!purchaseId || !userId || !totalCoins) {
      logger.error('Missing webhook metadata:', session.metadata);
      res.status(400).json({ error: 'Missing metadata' });
      return;
    }

    try {
      // Idempotency: only grant coins if purchase is still pending.
      // Stripe may retry webhooks — this prevents double-granting.
      const updated = await db.update(creditPurchases)
        .set({
          status: 'completed',
          stripePaymentIntentId: session.payment_intent as string,
          updatedAt: new Date(),
        })
        .where(and(eq(creditPurchases.id, purchaseId), eq(creditPurchases.status, 'pending')))
        .returning({ id: creditPurchases.id });

      if (updated.length === 0) {
        logger.warn('Webhook: purchase already processed, skipping coin grant', { purchaseId });
        res.json({ received: true });
        return;
      }

      // Rescue hatch: if user hasn't verified their email, a successful payment
      // implicitly verifies them. No bonus coins — the purchase itself is the 3 minutes.
      const userRow = await db.select({ emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const needsImplicitVerify = userRow[0] && !userRow[0].emailVerified;

      await db.update(users)
        .set({
          coinBalance: sql`coin_balance + ${totalCoins}`,
          ...(needsImplicitVerify ? {
            emailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
          } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      if (needsImplicitVerify) {
        logger.info('Rescue hatch: email auto-verified via payment', { userId, purchaseId });
      }
      logger.info('Coins added', { totalCoins, userId, purchaseId });

      // Fire FB first-purchase event (no-op if not first ever).
      maybeFireFirstPurchaseEvent(purchaseId).catch(() => { /* logged inside */ });
      maybeSchedulePostPurchaseDrip(purchaseId).catch(() => { /* logged inside */ });
    } catch (dbError) {
      logger.error('Webhook DB error:', dbError);
      res.status(500).json({ error: 'Database error' });
      return;
    }
  }

  res.json({ received: true });
});

export default router;
