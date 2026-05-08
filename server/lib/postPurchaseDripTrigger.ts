// Post-purchase drip trigger — schedules a 10-email pastoral-care nurture for
// a user's FIRST completed credit purchase. Only fires for Evelyn-Cross or
// Aiden-Powers purchases (the two personas with post-purchase drips built).
//
// Called from every atomic-flip winner that marks a credit_purchases row as
// completed (Stripe confirm-payment, PayPal capture-order, Stripe checkout
// confirm, Stripe webhook, PayPal webhook). The first-purchase gate
// (completedCount === 1) ensures exactly one drip enrollment per user
// regardless of how many call sites fire.
//
// Never throws — purchase completion must never be blocked by drip scheduling.

import { db } from './db';
import { creditPurchases, users, personas } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import logger from './logger';
import { scheduleEvelynPostPurchaseDrip } from './evelynPostPurchaseDripGenerator';
import { scheduleAidenPostPurchaseDrip } from './aidenPostPurchaseDripGenerator';

const EVELYN_SLUG = 'evelyn-cross';
const AIDEN_SLUG = 'aiden-powers';

export async function maybeSchedulePostPurchaseDrip(purchaseId: string): Promise<void> {
  try {
    // (1) Load the purchase row + user data.
    const purchaseRows = await db
      .select({
        userId: creditPurchases.userId,
        personaId: creditPurchases.personaId,
      })
      .from(creditPurchases)
      .where(eq(creditPurchases.id, purchaseId))
      .limit(1);

    const purchase = purchaseRows[0];
    if (!purchase) {
      logger.warn('maybeSchedulePostPurchaseDrip: purchase not found', { purchaseId });
      return;
    }

    // (2) First-purchase gate — same logic as maybeFireFirstPurchaseEvent.
    // Counts ALL completed purchases for this user (not filtered by persona,
    // because we want a single post-purchase drip per user lifetime, not one
    // per persona). The atomic-flip winner pattern at every call site means
    // this counter incremented to exactly 1 the moment THIS purchase flipped
    // to completed; subsequent purchases will see count > 1 and silently no-op.
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(creditPurchases)
      .where(
        and(
          eq(creditPurchases.userId, purchase.userId),
          eq(creditPurchases.status, 'completed'),
        ),
      );
    const completedCount = countRows[0]?.count ?? 0;

    if (completedCount !== 1) {
      // 0 = race / rolled back; >1 = subsequent purchase. Either way, no drip.
      return;
    }

    // (3) Resolve the user and the persona this purchase belongs to.
    // Prefer the persona on the purchase row itself; fall back to the user's
    // defaultPersonaId so users who bought via a generic flow still get a drip.
    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        defaultPersonaId: users.defaultPersonaId,
      })
      .from(users)
      .where(eq(users.id, purchase.userId))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      logger.warn('maybeSchedulePostPurchaseDrip: user not found', {
        purchaseId,
        userId: purchase.userId,
      });
      return;
    }

    const resolvedPersonaId = purchase.personaId ?? user.defaultPersonaId;
    if (!resolvedPersonaId) {
      logger.info('maybeSchedulePostPurchaseDrip: no persona resolved — skipping', {
        purchaseId,
        userId: user.id,
      });
      return;
    }

    // (4) Look up the persona slug to route to the right generator.
    const personaRows = await db
      .select({ slug: personas.slug })
      .from(personas)
      .where(eq(personas.id, resolvedPersonaId))
      .limit(1);

    const slug = personaRows[0]?.slug;
    if (!slug) {
      logger.info('maybeSchedulePostPurchaseDrip: persona slug not found — skipping', {
        purchaseId,
        userId: user.id,
        resolvedPersonaId,
      });
      return;
    }

    // (5) Route to the correct generator. Only Evelyn and Aiden have
    // post-purchase drips; other personas silently no-op (this is intentional
    // — we'll add their drips later if/when they're built).
    if (slug === EVELYN_SLUG) {
      await scheduleEvelynPostPurchaseDrip({
        userId: user.id,
        email: user.email,
        firstName: user.firstName || 'there',
        baseTime: new Date(),
      });
      logger.info('Post-purchase drip scheduled (Evelyn)', {
        purchaseId,
        userId: user.id,
      });
    } else if (slug === AIDEN_SLUG) {
      await scheduleAidenPostPurchaseDrip({
        userId: user.id,
        email: user.email,
        firstName: user.firstName || 'there',
        baseTime: new Date(),
      });
      logger.info('Post-purchase drip scheduled (Aiden)', {
        purchaseId,
        userId: user.id,
      });
    } else {
      logger.info('Post-purchase drip skipped — persona not enrolled', {
        purchaseId,
        userId: user.id,
        slug,
      });
    }
  } catch (err) {
    logger.error('maybeSchedulePostPurchaseDrip failed', {
      purchaseId,
      err: String(err),
    });
  }
}
