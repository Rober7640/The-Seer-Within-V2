import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';
import { db } from './db';
import { beOrders } from '@shared/schema';
import { TEA_CUPS, resolveTeaCup, type TeaCup } from '@shared/backendOffers';
import { getStripe } from './stripeAccount';
import { markBackendReadingDelivered } from './aweber';
import logger from './logger';

// 04 · The Turn — delivery of the tea-leaf reading, in the app. OFF by default.
//
// Decision D7 (04-DELIVERABLES.md): there is no per-buyer PDF. There are THREE finished
// readings, one per cup, hosted at fixed links. So "delivering" a 04 order is a lookup, not a
// writing job: find her cup, pick that cup's link, and hand AWeber the `be-04-delivered` tag
// with `reading_url` set — the delivery Campaign (built by hand) merges the link and sends.
//
// ── Why a delay at all ───────────────────────────────────────────────────────────
// The booking page promises the reading WITHIN 24 HOURS, and a reading that lands the second
// she pays reads as a file, not as Evelyn turning her cup. So an order waits
// BE04_DELIVERY_DELAY_HOURS (default 12, clamped 1–23) and is then delivered on the next tick.
// Anything still undelivered at 23 hours is logged at error level: the promise is about to break.
//
// ── Where her cup comes from ─────────────────────────────────────────────────────
// The checkout DRAWS it at random (be04Draw.ts — no pick, operator 2026-10-11) and writes it to
// the Stripe session's metadata (`cup`, always a valid slug). There is no be_orders /
// be_order_intake column for it, and none is added: production may lack the 07/08 columns, and
// a migration for one short string is not worth that risk. So the job reads the session back.
// ⛔ If Stripe cannot be read, the order is SKIPPED and retried next tick — never sent the
// default cup's reading, which is the wrong reading for anyone who was drawn another.
//
// ── It refuses rather than guesses ───────────────────────────────────────────────
// A cup whose link is unset, or not https, is skipped with an error log. An empty or wrong
// `reading_url` would send her a delivery email with nothing to open.
//
// IDEMPOTENT: `delivered_at` is stamped only after AWeber said yes, and an order with
// `delivered_at` set is never selected again. The stamp is the same SQL /api/be/:offer/delivered
// writes (COALESCE: the first delivery is the truth). If AWeber succeeds and the stamp fails,
// the next tick re-tags her — AWeber upserts, and re-applying a tag she already holds is a
// no-op, so the Campaign is not triggered a second time.
//
// Runs from initializeCronJobs (server/lib/cronJobs.ts), so — like every timer — only in the
// ONE deployment that owns background jobs (server/lib/backgroundJobsGate.ts), never under
// DISABLE_CRONS, and only when BE04_DELIVERY_ENABLED is exactly 'true'.

const HOUR_MS = 60 * 60 * 1000;

/** The delay's default and bounds, in hours. Past 23 the 24-hour promise has no margin. */
export const BE04_DELIVERY_DELAY_DEFAULT_HOURS = 12;
const MIN_DELAY_HOURS = 1;
const MAX_DELAY_HOURS = 23;

/** An undelivered order older than this is logged at error level on every tick. */
export const BE04_OVERDUE_HOURS = 23;

/** Every 10 minutes. */
export const BE04_DELIVERY_CRON = '*/10 * * * *';

/** At most this many orders per tick, oldest first — the rest wait ten minutes. */
const BATCH_LIMIT = 50;

/** The env var that holds one cup's reading link: BE04_READING_URL_DIVIDED_RIM, … */
export function be04ReadingUrlEnv(cup: TeaCup): string {
  return `BE04_READING_URL_${cup.toUpperCase().replace(/-/g, '_')}`;
}

export interface Be04DeliveryConfig {
  /** How long after payment an order is delivered. 1–23. */
  delayHours: number;
  /** One link per cup. NULL when the env var is unset or not an https URL. */
  readingUrls: Record<TeaCup, string | null>;
}

/** An https URL, or null. The same rule /api/be/:offer/delivered applies. */
function httpsUrlOrNull(value: string | undefined): string | null {
  const v = (value ?? '').trim();
  if (!/^https:\/\/\S+$/i.test(v)) return null;
  try {
    return new URL(v).protocol === 'https:' ? v : null;
  } catch {
    return null;
  }
}

/** Read the job's settings from env — at call time, so a test (or a tick) sees the current values. */
export function be04DeliveryConfig(env: Record<string, string | undefined> = process.env): Be04DeliveryConfig {
  const raw = (env.BE04_DELIVERY_DELAY_HOURS ?? '').trim();
  const parsed = raw ? Number(raw) : Number.NaN;
  const delayHours = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, MIN_DELAY_HOURS), MAX_DELAY_HOURS)
    : BE04_DELIVERY_DELAY_DEFAULT_HOURS;

  const readingUrls = {} as Record<TeaCup, string | null>;
  for (const cup of TEA_CUPS) readingUrls[cup] = httpsUrlOrNull(env[be04ReadingUrlEnv(cup)]);

  return { delayHours, readingUrls };
}

export function be04DeliveryEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.BE04_DELIVERY_ENABLED === 'true';
}

/** The columns the job needs. ⛔ Base be_orders columns only — production may lack 07/08's. */
export interface Be04DueOrder {
  id: string;
  stripeSessionId: string;
  email: string | null;
  createdAt: Date;
}

export interface Be04DeliveryDeps {
  /** Paid (not refunded), undelivered 04 orders created at or before `paidBefore`, oldest first. */
  findUndelivered(paidBefore: Date): Promise<Be04DueOrder[]>;
  /** The raw `cup` off the order's Stripe session metadata. Throws when Stripe cannot be read. */
  lookupCup(stripeSessionId: string): Promise<unknown>;
  /** markBackendReadingDelivered — the AWeber tag + `reading_url` that sends the email. */
  markDelivered(params: {
    email: string;
    offer: 'tea-reading';
    stripeOrderId: string;
    readingUrl: string;
  }): Promise<{ success: boolean; error?: string }>;
  /** Stamp reading_url + delivered_at (COALESCE). Returns the delivered_at now on the row. */
  stampDelivered(orderId: string, readingUrl: string): Promise<Date | null>;
  /** Epoch milliseconds. */
  now(): number;
  config: Be04DeliveryConfig;
}

export interface Be04DeliveryResult {
  /** Orders past the delay and still undelivered when the tick started. */
  due: number;
  delivered: number;
  /** Not attempted this tick (no email, no link for her cup). Retried next tick. */
  skipped: number;
  /** Attempted and failed (Stripe, AWeber, or the stamp). Retried next tick. */
  failed: number;
  /** Still undelivered past BE04_OVERDUE_HOURS after this tick. */
  overdue: number;
}

type Outcome =
  | { status: 'delivered'; cup: TeaCup }
  | { status: 'skipped' | 'failed'; reason: string; cup?: TeaCup; emailSent?: boolean };

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** One order, start to finish. Never throws — every failure is an Outcome. */
async function deliverOne(order: Be04DueOrder, deps: Be04DeliveryDeps): Promise<Outcome> {
  const session = order.stripeSessionId;

  if (!order.email) {
    logger.error('be_04 delivery: SKIPPED — the order has no email, nothing to send to', { session });
    return { status: 'skipped', reason: 'no_email' };
  }

  let cup: TeaCup;
  try {
    cup = resolveTeaCup(await deps.lookupCup(session));
  } catch (err) {
    // ⛔ Not the default cup. A guessed cup is the wrong reading for anyone drawn another.
    logger.error('be_04 delivery: cup lookup FAILED — not delivered, retried next tick', {
      session,
      err: errMessage(err),
    });
    return { status: 'failed', reason: 'cup_lookup_failed' };
  }

  const readingUrl = deps.config.readingUrls[cup];
  if (!readingUrl) {
    logger.error('be_04 delivery: SKIPPED — no https reading link for this cup. Set it and the ' +
      'next tick delivers', { session, cup, env: be04ReadingUrlEnv(cup) });
    return { status: 'skipped', reason: 'no_reading_url', cup };
  }

  let sent: { success: boolean; error?: string };
  try {
    sent = await deps.markDelivered({
      email: order.email,
      offer: 'tea-reading',
      stripeOrderId: session,
      readingUrl,
    });
  } catch (err) {
    sent = { success: false, error: errMessage(err) };
  }
  if (!sent.success) {
    logger.error('be_04 delivery: AWeber write FAILED — she paid and has no reading yet, ' +
      'retried next tick', { session, cup, error: sent.error });
    return { status: 'failed', reason: 'aweber_failed', cup };
  }

  try {
    await deps.stampDelivered(order.id, readingUrl);
  } catch (err) {
    logger.error('be_04 delivery: the email WAS triggered but the row is NOT stamped — the next ' +
      'tick re-tags her (AWeber upserts; a tag she already holds is a no-op)', {
      session,
      cup,
      err: errMessage(err),
    });
    return { status: 'failed', reason: 'stamp_failed', cup, emailSent: true };
  }

  logger.info('be_04 delivery: delivered', { session, cup });
  return { status: 'delivered', cup };
}

/**
 * Deliver every 04 reading that is due. One failure never stops the others.
 *
 * Pure apart from its deps — the database, Stripe and AWeber all arrive injected, so the
 * whole job is testable with fakes. `defaultBe04DeliveryDeps()` wires the real ones.
 */
export async function deliverDueTeaReadings(deps: Be04DeliveryDeps): Promise<Be04DeliveryResult> {
  const nowMs = deps.now();
  const paidBefore = new Date(nowMs - deps.config.delayHours * HOUR_MS);
  const due = await deps.findUndelivered(paidBefore);

  const result: Be04DeliveryResult = { due: due.length, delivered: 0, skipped: 0, failed: 0, overdue: 0 };

  for (const order of due) {
    const outcome = await deliverOne(order, deps).catch(
      (err): Outcome => ({ status: 'failed', reason: `unexpected: ${errMessage(err)}` }),
    );
    if (outcome.status === 'delivered') {
      result.delivered += 1;
      continue;
    }
    result[outcome.status] += 1;

    // 🔴 The 24-hour promise is about to break (or has). Loud on every tick until it is fixed.
    const ageHours = (nowMs - new Date(order.createdAt).getTime()) / HOUR_MS;
    if (ageHours >= BE04_OVERDUE_HOURS && !outcome.emailSent) {
      result.overdue += 1;
      logger.error('be_04 delivery: OVERDUE — paid 23+ hours ago and still undelivered; the ' +
        'booking page promised 24', {
        session: order.stripeSessionId,
        ageHours: Math.round(ageHours * 10) / 10,
        reason: outcome.reason,
      });
    }
  }

  if (result.due > 0) logger.info('be_04 delivery: tick complete', { ...result });
  return result;
}

/** The real database, Stripe and AWeber. Config is read from env when this is called. */
export function defaultBe04DeliveryDeps(env: Record<string, string | undefined> = process.env): Be04DeliveryDeps {
  return {
    findUndelivered: (paidBefore) =>
      db
        .select({
          id: beOrders.id,
          stripeSessionId: beOrders.stripeSessionId,
          email: beOrders.email,
          createdAt: beOrders.createdAt,
        })
        .from(beOrders)
        .where(
          and(
            eq(beOrders.offer, 'tea-reading'),
            // 'paid' only: a refunded (or cancelled) order is money back AND no reading.
            eq(beOrders.status, 'paid'),
            isNull(beOrders.deliveredAt),
            lte(beOrders.createdAt, paidBefore),
          ),
        )
        .orderBy(asc(beOrders.createdAt))
        .limit(BATCH_LIMIT),

    lookupCup: async (stripeSessionId) => {
      const stripe = getStripe();
      if (!stripe) throw new Error('Stripe is not configured');
      const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
      return session.metadata?.cup ?? null;
    },

    markDelivered: (params) => markBackendReadingDelivered(params),

    // ⛔ The same write as POST /api/be/:offer/delivered: reading_url replaced, delivered_at
    //    COALESCEd so a retry never moves the first delivery's timestamp. Explicit `returning`
    //    columns — a bare `.returning()` would read the 07/08 columns production may lack.
    stampDelivered: async (orderId, readingUrl) => {
      const [row] = await db
        .update(beOrders)
        .set({
          readingUrl,
          deliveredAt: sql`COALESCE(${beOrders.deliveredAt}, now())`,
          updatedAt: new Date(),
        })
        .where(eq(beOrders.id, orderId))
        .returning({ deliveredAt: beOrders.deliveredAt });
      return row?.deliveredAt ?? null;
    },

    now: () => Date.now(),
    config: be04DeliveryConfig(env),
  };
}

/**
 * Register the job on a scheduler — ONLY when BE04_DELIVERY_ENABLED is 'true'. Returns whether
 * it was registered. `schedule` is node-cron's, passed in by initializeCronJobs; `makeDeps` is
 * called on every tick so each run reads the current env.
 *
 * Overlap-guarded: a tick that finds the previous one still running does nothing.
 */
export function startBe04DeliveryJob(
  schedule: (expression: string, task: () => Promise<void>) => unknown,
  env: Record<string, string | undefined> = process.env,
  makeDeps: () => Be04DeliveryDeps = () => defaultBe04DeliveryDeps(env),
): boolean {
  if (!be04DeliveryEnabled(env)) {
    logger.info('be_04 delivery: job OFF (BE04_DELIVERY_ENABLED is not "true")');
    return false;
  }

  let running = false;
  schedule(BE04_DELIVERY_CRON, async () => {
    if (running) {
      logger.info('be_04 delivery: previous tick still running, skipping');
      return;
    }
    running = true;
    try {
      await deliverDueTeaReadings(makeDeps());
    } catch (err) {
      logger.error('be_04 delivery: tick FAILED — nothing was delivered this run', { err: errMessage(err) });
    } finally {
      running = false;
    }
  });
  logger.info('be_04 delivery: job ON', { cron: BE04_DELIVERY_CRON });
  return true;
}
