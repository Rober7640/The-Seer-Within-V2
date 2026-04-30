// Server-side safety net for stuck `pending` credit_purchases.
// Polls PayPal/Stripe for any row that's been pending longer than the webhook's
// reasonable response window and grants coins if the payment actually captured.
//
// Race-safe with the regular webhook flow via `WHERE status='pending'` guard.
// Feature-flagged via ENABLE_RECONCILIATION_CRON.

import Stripe from 'stripe';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from './db';
import { creditPurchases, users } from '@shared/schema';
import * as paypal from './paypal';
import logger from './logger';

const RECONCILE_OLDER_THAN_MIN = 5;
const RECONCILE_NEWER_THAN_HOURS = 24;
const ROW_LIMIT = 50;
const RATE_LIMIT_MS = 200;
const MAX_CONSECUTIVE_ERRORS = 5;

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe =
  stripeKey && stripeKey !== 'sk_test_placeholder' ? new Stripe(stripeKey) : null;

export type ReconcileStats = {
  checked: number;
  credited: number;
  notCaptured: number;
  notFound: number;
  errors: number;
  amountCreditedUsd: number;
  bailedOut: boolean;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function reconcilePendingPurchases(): Promise<ReconcileStats> {
  const stats: ReconcileStats = {
    checked: 0,
    credited: 0,
    notCaptured: 0,
    notFound: 0,
    errors: 0,
    amountCreditedUsd: 0,
    bailedOut: false,
  };

  if (!stripe && !process.env.PAYPAL_CLIENT_ID) {
    logger.warn('Reconciliation: no payment providers configured, skipping run');
    return stats;
  }

  const upperBound = new Date(Date.now() - RECONCILE_OLDER_THAN_MIN * 60_000);
  const lowerBound = new Date(Date.now() - RECONCILE_NEWER_THAN_HOURS * 60 * 60_000);

  const rows = await db
    .select({
      id: creditPurchases.id,
      userId: creditPurchases.userId,
      coinsPurchased: creditPurchases.coinsPurchased,
      bonusCoins: creditPurchases.bonusCoins,
      priceUsd: creditPurchases.priceUsd,
      paypalOrderId: creditPurchases.paypalOrderId,
      stripePaymentIntentId: creditPurchases.stripePaymentIntentId,
    })
    .from(creditPurchases)
    .where(
      and(
        eq(creditPurchases.status, 'pending'),
        lt(creditPurchases.createdAt, upperBound),
        gt(creditPurchases.createdAt, lowerBound),
      ),
    )
    .limit(ROW_LIMIT);

  if (rows.length === 0) return stats;

  let consecutiveErrors = 0;

  for (const row of rows) {
    stats.checked++;
    const isPayPal = !!row.paypalOrderId;
    const isStripe = !!row.stripePaymentIntentId;
    if (!isPayPal && !isStripe) continue;

    try {
      let isCaptured = false;
      let captureId: string | undefined;

      if (isPayPal) {
        const result = await paypal.getOrder(row.paypalOrderId!);
        if (result.status === 'COMPLETED' && result.captureId) {
          isCaptured = true;
          captureId = result.captureId;
        } else if (result.status === 'NOT_FOUND') {
          stats.notFound++;
        } else {
          stats.notCaptured++;
        }
      } else if (isStripe && stripe) {
        const intent = await stripe.paymentIntents.retrieve(row.stripePaymentIntentId!);
        if (intent.status === 'succeeded') {
          isCaptured = true;
          captureId = intent.latest_charge as string | undefined;
        } else {
          stats.notCaptured++;
        }
      }

      if (isCaptured) {
        await db.transaction(async (tx) => {
          // Race-safe: only act if still pending. If the webhook flipped it in the
          // meantime this returns 0 rows and we no-op.
          const updated = await tx
            .update(creditPurchases)
            .set({
              status: 'completed',
              ...(isPayPal && captureId ? { paypalCaptureId: captureId } : {}),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(creditPurchases.id, row.id),
                eq(creditPurchases.status, 'pending'),
              ),
            )
            .returning({ id: creditPurchases.id });

          if (updated.length === 0) return;

          const totalCoins = (row.coinsPurchased ?? 0) + (row.bonusCoins ?? 0);
          await tx
            .update(users)
            .set({
              coinBalance: sql`coin_balance + ${totalCoins}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, row.userId));

          stats.credited++;
          stats.amountCreditedUsd += row.priceUsd / 100;
          logger.info('Reconciliation: credited stuck purchase', {
            rowId: row.id,
            userId: row.userId,
            source: isPayPal ? 'paypal' : 'stripe',
            captureId,
            coinsCredited: totalCoins,
            amountUsd: row.priceUsd / 100,
          });
        });
      }
      consecutiveErrors = 0;
    } catch (err: any) {
      stats.errors++;
      consecutiveErrors++;
      logger.warn('Reconciliation: row check failed', {
        rowId: row.id,
        error: err?.message ?? String(err),
      });
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        stats.bailedOut = true;
        logger.error(
          'Reconciliation: bailing out after consecutive errors — investigate provider auth/health',
          { consecutiveErrors },
        );
        break;
      }
    }

    if (RATE_LIMIT_MS > 0) await sleep(RATE_LIMIT_MS);
  }

  return stats;
}
