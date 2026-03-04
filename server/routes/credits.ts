import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { users, creditPurchases, personas } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../lib/auth';
import { getPersonaPricing } from '../lib/personaPricing';
import { DEFAULT_PRICING } from '../../shared/types';
import Stripe from 'stripe';
import logger from '../lib/logger';
import { fireWithBreaker, stripeBreaker, isCircuitOpenError } from '../lib/circuitBreaker';
import * as paypal from '../lib/paypal';

const router = Router();

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey && stripeKey !== 'sk_test_placeholder'
  ? new Stripe(stripeKey)
  : null;

const checkoutSchema = z.object({
  packageType: z.string().min(1),
  personaId: z.string().min(1).optional(),
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

// POST /api/credits/checkout
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  const parseResult = checkoutSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.errors.map(e => e.message).join(', '),
    });
    return;
  }

  const { packageType, personaId } = parseResult.data;

  let pricing, tier, personaName: string, userResult;
  try {
    pricing = personaId ? await getPersonaPricing(personaId) : DEFAULT_PRICING;
    tier = pricing.tiers.find(t => t.packageType === packageType);
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
    coinsPurchased: tier.totalCoins,
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

    res.json({ url: '/chat-service?purchased=true', devMode: true });
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
        success_url: `${getBaseUrl(req)}/chat-service?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getBaseUrl(req)}/chat-service?cancelled=true`,
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
    tier = pricing.tiers.find(t => t.packageType === packageType);
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
    coinsPurchased: tier.totalCoins,
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

    if (purchase.status !== 'pending') {
      res.status(400).json({ error: 'Purchase already processed' });
      return;
    }

    const captureResult = await paypal.captureOrder(orderId);
    if (captureResult.status !== 'COMPLETED') {
      res.status(400).json({ error: `Payment not completed (status: ${captureResult.status})` });
      return;
    }

    await db.update(creditPurchases)
      .set({
        status: 'completed',
        paypalCaptureId: captureResult.captureId,
        updatedAt: new Date(),
      })
      .where(eq(creditPurchases.id, purchase.id));

    const updatedUser = await db.update(users)
      .set({
        coinBalance: sql`coin_balance + ${purchase.coinsPurchased}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId!))
      .returning({ coinBalance: users.coinBalance });

    const newBalance = updatedUser[0]?.coinBalance ?? 0;

    res.json({ success: true, newBalance });
  } catch (error) {
    logger.error('PayPal capture-order error:', error);
    res.status(500).json({ error: 'Failed to capture PayPal order' });
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
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
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
      await db.update(creditPurchases)
        .set({
          status: 'completed',
          stripePaymentIntentId: session.payment_intent as string,
          updatedAt: new Date(),
        })
        .where(eq(creditPurchases.id, purchaseId));

      await db.update(users)
        .set({
          coinBalance: sql`coin_balance + ${totalCoins}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      logger.info('Coins added', { totalCoins, userId });
    } catch (dbError) {
      logger.error('Webhook DB error:', dbError);
      res.status(500).json({ error: 'Database error' });
      return;
    }
  }

  res.json({ received: true });
});

export default router;
