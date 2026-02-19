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
  try {
    const parseResult = checkoutSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { packageType, personaId } = parseResult.data;

    const pricing = personaId
      ? await getPersonaPricing(personaId)
      : DEFAULT_PRICING;
    const tier = pricing.tiers.find(t => t.packageType === packageType);
    if (!tier) {
      res.status(400).json({ error: 'Invalid package type' });
      return;
    }

    let personaName = 'Chat';
    if (personaId) {
      const personaResult = await db.select({ displayName: personas.displayName })
        .from(personas)
        .where(eq(personas.id, personaId))
        .limit(1);
      personaName = personaResult[0]?.displayName || 'Chat';
    }

    const userResult = await db.select({ email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!userResult[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const purchase = await db.insert(creditPurchases).values({
      userId: req.userId!,
      personaId: personaId || null,
      packageType: tier.packageType,
      coinsPurchased: tier.totalCoins,
      bonusCoins: tier.bonusCoins,
      priceUsd: tier.priceUsd,
      status: 'pending',
    }).returning();

    if (!stripe) {
      await db.update(creditPurchases)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(creditPurchases.id, purchase[0].id));

      await db.update(users)
        .set({
          coinBalance: sql`coin_balance + ${tier.totalCoins}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.userId!));

      res.json({ url: '/chat-service?purchased=true', devMode: true });
      return;
    }

    const bonusLabel = tier.bonusCoins > 0 ? ` (+${tier.bonusCoins} bonus)` : '';
    const session = await fireWithBreaker(stripeBreaker, () =>
      stripe!.checkout.sessions.create({
        customer_email: userResult[0].email,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${personaName} - ${tier.coins} Coins${bonusLabel}`,
              description: `${tier.totalCoins} coins for consultation with ${personaName}`,
            },
            unit_amount: tier.priceUsd,
          },
          quantity: 1,
        }],
        mode: 'payment',
        metadata: {
          app: 'the-seer-within-chat',
          purchaseId: purchase[0].id,
          userId: req.userId!,
          ...(personaId ? { personaId } : {}),
          packageType: tier.packageType,
          totalCoins: String(tier.totalCoins),
        },
        success_url: `${getBaseUrl(req)}/chat-service?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getBaseUrl(req)}/chat-service?cancelled=true`,
      }),
    );

    await db.update(creditPurchases)
      .set({ stripeSessionId: session.id, updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchase[0].id));

    res.json({ url: session.url });
  } catch (error) {
    if (isCircuitOpenError(error)) {
      logger.warn('Stripe circuit open, checkout unavailable');
      res.status(503).json({ error: 'Payment service temporarily unavailable. Please try again shortly.' });
    } else {
      logger.error('Credits checkout error:', error);
      res.status(500).json({ error: 'Checkout failed' });
    }
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
