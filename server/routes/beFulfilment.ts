import { Router, type NextFunction, type Request, type Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import {
  be07ReadingGrades,
  be08Draws,
  beOrderIntake,
  beOrders,
  beSendAttempts,
  type BeOrder,
  type BeSendMessageType,
} from '@shared/schema';
import { BACKEND_OFFER_CATALOG, isBackendOfferKey, type BackendOffer } from '@shared/backendOffers';
import { getBeOrderBySession, recordBackendOrder } from '../lib/beOrders';
import { getStripe } from '../lib/stripeAccount';
import logger from '../lib/logger';

// n8n's door into backend-deck fulfilment. Four endpoints, one caller: the workflow
// that writes her reading after she pays. Offer-generic — `/api/be/:offer/…` where
// `:offer` is a catalog key (shared/backendOffers.ts), e.g. `marcus-reading` for 08.
//
// Ported from improve-v1/v1-one-time-BEs/docs/07-marcus/07-server-spec.md §4, which
// specced exactly these calls for 07 and was never built. The decisions carry over:
//
// ── Why this is not on /api/backend ──────────────────────────────────────────────
// /api/backend is the BROWSER's door — booking, thank-you, 1-click upsell, no auth.
// This is a MACHINE's door: shared-secret only, no browser ever touches it. Mounting
// them together would mean one router where half the routes need a token and half
// must not have one.
//
// ── It refuses rather than guesses ───────────────────────────────────────────────
// A missing intake field or a missing draw is a 409 with every missing item NAMED,
// which surfaces in the n8n execution log. The alternative — defaulting a name, or
// fulfilling against no draw — sends her a reading she did not buy. Every failure
// here stops the workflow BEFORE any model call: nothing is charged, nothing is sent.
//
// ── PII ──────────────────────────────────────────────────────────────────────────
// ⛔ `full_birth_name` and `date_of_birth` go in the response body (n8n needs them to
// cut the numerology) and NOWHERE else: never in a log line, an error message, or a
// URL. Log only the session id, the offer, and which fields are missing BY NAME.

const router = Router();

// ─── auth ─────────────────────────────────────────────────────────────────────

/**
 * The shared secret n8n sends on every call.
 *
 * 503, never 200, when the variable is unset: an unconfigured server is OUR bug, and
 * the error-level log line is what the person debugging it needs to find. Not a 401 —
 * that would send them looking for a wrong token.
 */
function requireFulfilmentToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.BE_FULFILMENT_TOKEN;
  if (!expected) {
    logger.error('be-fulfilment: BE_FULFILMENT_TOKEN is not configured — refusing every call');
    return res.status(503).json({ error: 'Fulfilment token not configured on server' });
  }

  const header = req.headers.authorization;
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !safeEqual(token, expected)) {
    logger.warn('be-fulfilment: unauthorized call', { path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

/** Constant-time. Length is compared first because timingSafeEqual throws on a mismatch. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

router.use(requireFulfilmentToken);

// ─── :offer ───────────────────────────────────────────────────────────────────

/** Resolves `:offer` to its catalog row, or 404s. Runs after auth on every route below. */
router.param('offer', (req: Request, res: Response, next: NextFunction, value: string) => {
  if (!isBackendOfferKey(value)) {
    return res.status(404).json({ error: 'Unknown offer.' });
  }
  res.locals.offer = BACKEND_OFFER_CATALOG[value];
  next();
});

function offerOf(res: Response): BackendOffer {
  return res.locals.offer as BackendOffer;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('cs_');
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** drizzle's `date()` column reads back as 'YYYY-MM-DD'; tolerate a Date in case the mode changes. */
function dateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * The order for a POST body's `sessionId`, or the response already sent.
 *
 * No Stripe backstop here — by the time anything grades or delivers, the fulfilment GET
 * has already recorded the row. ⛔ An offer mismatch is a 404, not a 403: an 08 token
 * must not learn that a 07 order exists.
 */
async function resolveOrder(
  sessionId: string,
  offer: BackendOffer,
  res: Response,
): Promise<BeOrder | null> {
  const order = await getBeOrderBySession(sessionId);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return null;
  }
  if (order.offer !== offer.key) {
    logger.warn('be-fulfilment: order belongs to another offer', {
      session: sessionId, asked: offer.key, actual: order.offer,
    });
    res.status(404).json({ error: 'Order not found.' });
    return null;
  }
  return order;
}

// ─── GET /:offer/fulfilment/:sessionId ─────────────────────────────────────────

/**
 * The order joined to her intake and her draw, in the shape the workflow expects.
 *
 * ⚡ It records the order if the row is not there yet. n8n is started by the SAME Stripe
 * event as our own webhook, so its GET regularly wins the race — exactly the case
 * /api/backend/order/:sessionId already handles for the thank-you page, and the same
 * backstop: read the session from Stripe, record it, carry on. `recordBackendOrder`
 * upserts on the unique stripe_session_id, so whoever lands first there is one row.
 *
 * The edition snapshot lives INSIDE `draw.drawJson` — the draw agent stores
 * `{ contractVersion, edition: {…}, lens, positions, drawnAt }`. It is passed through
 * untouched; there is no editions table to join.
 */
router.get('/:offer/fulfilment/:sessionId', async (req: Request, res: Response) => {
  const offer = offerOf(res);
  const sessionId = String(req.params.sessionId || '');
  if (!isSessionId(sessionId)) {
    return res.status(400).json({ error: 'Invalid session.' });
  }

  try {
    let order = await getBeOrderBySession(sessionId);

    if (!order) {
      const stripe = getStripe();
      if (!stripe) return res.status(503).json({ error: 'Unavailable.' });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        // 402, not 404 — this is "not yet", and n8n's retries may still catch it.
        return res.status(402).json({ error: 'This order has not been paid.' });
      }
      if (session.metadata?.product !== offer.stripeProduct) {
        return res.status(404).json({ error: 'Order not found.' });
      }
      order = await recordBackendOrder(session);
    }

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // ⛔ Never fulfil another offer's order off this endpoint, and never fulfil a
    // refunded one — a refund that still posts a reading is money out and product out.
    if (order.offer !== offer.key) {
      logger.warn('be-fulfilment: fulfilment asked for another offer\'s order', {
        session: sessionId, asked: offer.key, actual: order.offer,
      });
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.status !== 'paid') {
      return res.status(409).json({ error: 'Order is not paid', status: order.status });
    }

    const [intake] = await db
      .select()
      .from(beOrderIntake)
      .where(eq(beOrderIntake.stripeSessionId, sessionId))
      .limit(1);

    const is08 = offer.number === '08';
    const draw = is08
      ? (await db.select().from(be08Draws).where(eq(be08Draws.orderId, order.id)).limit(1))[0] ?? null
      : null;

    if (is08) {
      // Refuse rather than guess. Name every missing item in ONE response so the
      // n8n log shows the whole gap, not the first hole.
      const missing: string[] = [];
      if (!intake) missing.push('intake');
      if (!intake?.fullBirthName) missing.push('full_birth_name');
      if (!intake?.dateOfBirth) missing.push('date_of_birth');
      if (!draw) missing.push('draw');
      if (missing.length) {
        // Field NAMES only — never the values.
        logger.error('be-fulfilment: order is not ready to fulfil', {
          session: sessionId, offer: offer.key, order: order.id, missing,
        });
        return res.status(409).json({ error: 'Order is not ready to fulfil', missing });
      }
    }

    return res.json({
      offer: offer.key,
      offerNumber: offer.number,
      order: {
        id: order.id,
        stripeSessionId: order.stripeSessionId,
        email: order.email,
        firstName: order.firstName,
        // What Marcus calls her. The intake's own field wins; the ?fn= name is the fallback.
        displayFirstName: intake?.displayFirstName ?? order.firstName ?? null,
        amountCents: order.amountCents,
        readingCents: order.readingCents,
        bumpPurchased: order.bumpPurchased,
        bumpProductKey: order.bumpProductKey,
        editionId: order.editionId,
        editionVersion: order.editionVersion,
        dueAt: iso(order.dueAt),
        // The row is written by the paid webhook, so created_at is the payment moment
        // to within seconds. ISO-8601 — n8n's Wait node parses it.
        paidAt: iso(order.createdAt),
        lensCard: order.lensCard,
        lensMethodVersion: order.lensMethodVersion,
        deliveredAt: iso(order.deliveredAt),
        readingUrl: order.readingUrl,
      },
      intake: intake
        ? {
            fullBirthName: intake.fullBirthName,
            dateOfBirth: dateOnly(intake.dateOfBirth),
            speedBump: intake.speedBump,
          }
        : null,
      draw: draw
        ? {
            drawJson: draw.drawJson,
            drawMethodVersion: draw.drawMethodVersion,
            contextHash: draw.contextHash,
            createdAt: iso(draw.createdAt),
          }
        : null,
    });
  } catch (err) {
    logger.error('be-fulfilment: fulfilment lookup failed', {
      session: sessionId, offer: offer.key, err: errMessage(err),
    });
    return res.status(500).json({ error: 'Could not load the order.' });
  }
});

// ─── POST /:offer/grade-log ────────────────────────────────────────────────────

/**
 * 🔴 THE MITIGATION. The workflow's rule is: on a failed grade, regenerate ONCE, then
 * send anyway. So a row here with pass=false is a reading that FAILED ITS RUBRIC AND WAS
 * DELIVERED TO A PAYING CUSTOMER. Nothing alerts. This row and the error log line below
 * are the only trace, and they only work if somebody reads them.
 *
 * Stored in be_07_reading_grades for EVERY offer. Despite its name the table is
 * offer-agnostic — (order_id → be_orders.id, attempt, pass, failed, why, reading) — and
 * a second identical table would split "find the bad sends" into two queries.
 *
 * Idempotent on (order_id, attempt): a retried POST updates its own row rather than
 * double-logging, and attempt 2 can never overwrite attempt 1.
 */
router.post('/:offer/grade-log', async (req: Request, res: Response) => {
  const offer = offerOf(res);
  const body = (req.body ?? {}) as Record<string, unknown>;

  const sessionId = body.sessionId;
  if (!isSessionId(sessionId)) return res.status(400).json({ error: 'Missing or invalid sessionId' });
  const attempt = Number.isInteger(body.attempt) && (body.attempt as number) >= 1
    ? (body.attempt as number)
    : null;
  if (attempt === null) return res.status(400).json({ error: 'Missing attempt' });
  if (typeof body.pass !== 'boolean') return res.status(400).json({ error: 'Missing pass' });

  const pass = body.pass;
  // Tolerant on purpose. The grader's JSON is model output; a malformed `failed` must
  // not cost us the whole log entry, which is the one thing that makes a bad send findable.
  const failed = Array.isArray(body.failed)
    ? (body.failed as unknown[]).filter((n): n is number => Number.isInteger(n))
    : [];
  const why = typeof body.why === 'string' ? body.why.slice(0, 4000) : null;
  const reading = typeof body.reading === 'string' ? body.reading : null;

  try {
    const order = await resolveOrder(sessionId, offer, res);
    if (!order) return;

    await db
      .insert(be07ReadingGrades)
      .values({ orderId: order.id, attempt, pass, failed, why, reading })
      .onConflictDoUpdate({
        target: [be07ReadingGrades.orderId, be07ReadingGrades.attempt],
        set: { pass, failed, why, reading },
      });

    if (!pass) {
      // ⛔ The one line an operator must be able to grep for. Deliberately error-level:
      // a customer is about to receive a reading that failed its own quality gate.
      logger.error('be-fulfilment: FAILED GRADE, SENDING ANYWAY — read this', {
        session: sessionId, offer: offer.key, order: order.id, attempt, failed, why,
      });
    } else {
      logger.info('be-fulfilment: grade logged', {
        session: sessionId, offer: offer.key, order: order.id, attempt, pass,
      });
    }

    return res.json({ ok: true, attempt });
  } catch (err) {
    logger.error('be-fulfilment: grade-log failed — a reading may be sent with NO audit record', {
      session: sessionId, offer: offer.key, attempt, err: errMessage(err),
    });
    return res.status(500).json({ error: 'Could not write the grade log' });
  }
});

// ─── POST /:offer/delivered ────────────────────────────────────────────────────

/**
 * Stamp the order once the reading is hosted.
 *
 * ⛔ delivered_at is COALESCEd in SQL, never overwritten. The FIRST delivery is the
 * truth; a retried POST must not move the timestamp and make a re-send look like the
 * original. `reading_url` IS replaced every time — a re-signed link is still her reading.
 *
 * The email is NOT sent here. T10 owns the send helper.
 */
router.post('/:offer/delivered', async (req: Request, res: Response) => {
  const offer = offerOf(res);
  const body = (req.body ?? {}) as Record<string, unknown>;

  const sessionId = body.sessionId;
  if (!isSessionId(sessionId)) return res.status(400).json({ error: 'Missing or invalid sessionId' });
  const readingUrl = typeof body.readingUrl === 'string' ? body.readingUrl.trim() : '';
  if (!/^https:\/\/\S+$/i.test(readingUrl)) {
    return res.status(400).json({ error: 'readingUrl must be an https URL' });
  }
  const readingBody = typeof body.readingBody === 'string' && body.readingBody.length > 0
    ? body.readingBody
    : null;

  try {
    const order = await resolveOrder(sessionId, offer, res);
    if (!order) return;

    const alreadyDelivered = order.deliveredAt != null;

    const [row] = await db
      .update(beOrders)
      .set({
        readingUrl,
        // Only when sent — never blank prose we already hold.
        ...(readingBody ? { readingBody } : {}),
        deliveredAt: sql`COALESCE(${beOrders.deliveredAt}, now())`,
        updatedAt: new Date(),
      })
      .where(eq(beOrders.id, order.id))
      .returning();

    if (!row) return res.status(404).json({ error: 'Order not found.' });

    // T10: fire written_delivery send here

    logger.info('be-fulfilment: delivered', {
      session: sessionId, offer: offer.key, order: order.id,
      deliveredAt: iso(row.deliveredAt), alreadyDelivered,
    });
    return res.json({ ok: true, deliveredAt: iso(row.deliveredAt), alreadyDelivered });
  } catch (err) {
    logger.error('be-fulfilment: delivered failed — she HAS the reading, the row is not stamped', {
      session: sessionId, offer: offer.key, err: errMessage(err),
    });
    return res.status(500).json({ error: 'Could not stamp the order' });
  }
});

// ─── POST /:offer/send-attempt ─────────────────────────────────────────────────

const SEND_MESSAGE_TYPES: readonly BeSendMessageType[] = [
  'order_confirmation',
  'audio_confirmation',
  'written_delivery',
  'audio_delivery',
];
const SEND_STATUSES = ['sent', 'failed', 'skipped'] as const;
type SendStatus = (typeof SEND_STATUSES)[number];

function isSendMessageType(value: unknown): value is BeSendMessageType {
  return typeof value === 'string' && (SEND_MESSAGE_TYPES as readonly string[]).includes(value);
}
function isSendStatus(value: unknown): value is SendStatus {
  return typeof value === 'string' && (SEND_STATUSES as readonly string[]).includes(value);
}

/**
 * Every transactional send, once. UNIQUE (stripe_session_id, message_type) — a retry
 * UPDATES that row (status / error / provider id / attempted_at); it never inserts a
 * second. That is what stops a replay sending her the same confirmation twice.
 */
router.post('/:offer/send-attempt', async (req: Request, res: Response) => {
  const offer = offerOf(res);
  const body = (req.body ?? {}) as Record<string, unknown>;

  const sessionId = body.sessionId;
  if (!isSessionId(sessionId)) return res.status(400).json({ error: 'Missing or invalid sessionId' });
  if (!isSendMessageType(body.messageType)) {
    return res.status(400).json({ error: 'Invalid messageType', allowed: SEND_MESSAGE_TYPES });
  }
  if (!isSendStatus(body.status)) {
    return res.status(400).json({ error: 'Invalid status', allowed: SEND_STATUSES });
  }
  const provider = typeof body.provider === 'string' ? body.provider.trim() : '';
  if (!provider) return res.status(400).json({ error: 'Missing provider' });

  const messageType = body.messageType;
  const status = body.status;
  const providerMessageId = typeof body.providerMessageId === 'string' ? body.providerMessageId : null;
  const error = typeof body.error === 'string' ? body.error.slice(0, 4000) : null;

  try {
    const order = await resolveOrder(sessionId, offer, res);
    if (!order) return;

    const attemptedAt = new Date();
    await db
      .insert(beSendAttempts)
      .values({
        offer: offer.key,
        stripeSessionId: sessionId,
        messageType,
        provider,
        providerMessageId,
        status,
        error,
        attemptedAt,
      })
      .onConflictDoUpdate({
        target: [beSendAttempts.stripeSessionId, beSendAttempts.messageType],
        set: { provider, providerMessageId, status, error, attemptedAt },
      });

    if (status === 'failed') {
      logger.error('be-fulfilment: send FAILED — she paid and may not have been emailed', {
        session: sessionId, offer: offer.key, messageType, provider, error,
      });
    } else {
      logger.info('be-fulfilment: send attempt logged', {
        session: sessionId, offer: offer.key, messageType, provider, status,
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    logger.error('be-fulfilment: send-attempt log failed', {
      session: sessionId, offer: offer.key, messageType, err: errMessage(err),
    });
    return res.status(500).json({ error: 'Could not record the send attempt' });
  }
});

export default router;
