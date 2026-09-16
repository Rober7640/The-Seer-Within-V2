import type Stripe from 'stripe';
import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import { beOrders, beOrderIntake, type BeOrder, type InsertBeOrderIntake } from '@shared/schema';
import {
  BACKEND_OFFER_CATALOG,
  backendOfferForStripeProduct,
  isBackendOfferKey,
  isBookingTreatment,
  type BackendOffer,
} from '@shared/backendOffers';
import { addBackendCustomer } from './aweber';
import { logBeBookingConversion } from './experiments';
import logger from './logger';
import { getBe08Edition } from './be08Editions';
import { parseDateOfBirth, readBe08CustomFields, splitBirthName, type Be08CustomFields } from './be08Birth';
import {
  BE_08_DECK,
  Be08DrawError,
  LENS_METHOD_VERSION,
  be08ContextHash,
  buildDrawJson,
  drawForOrder,
  insertBe08DrawOnce,
  personalLens,
} from './be08Draw';

// Persist a backend-deck purchase, then put her on the customer list.
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — asset S4, and Phase C rule 8.
//
// ── WHY THE WEBHOOK, NOT THE THANK-YOU PAGE ─────────────────────────────────────
// She can pay and close the tab before the redirect lands. V1 already has exactly that
// bug — `addPaidSubscriber` has one caller, /api/upsell/user-data — so a pay-and-close
// buyer never reaches the paid list and is never counted. We are not repeating it here,
// where the consequence is worse: on this deck the AWeber write IS the send.
//
// ── THE AWEBER WRITE IS THE THANK-YOU EMAIL ─────────────────────────────────────
// Her offer tag is the trigger on an AWeber Campaign. So this is not bookkeeping to be
// tidied up later — if it fails, a woman who paid gets no email at all. It therefore:
//   · runs on the authoritative server-side signal, not in a browser;
//   · records its own success (`customer_list_written_at`) and its own failure
//     (`customer_list_error`), so "paid but never emailed" is one SQL query;
//   · is retried by the thank-you page's own lookup, which is the one moment a real
//     buyer is standing in front of us again.
//
// IDEMPOTENT throughout. `stripe_session_id` is UNIQUE and the write is an upsert,
// because Stripe retries checkout.session.completed and the thank-you page reads the
// same session. `addBackendCustomer` upserts on AWeber's side for the same reason.

/** Stripe metadata this module reads. Written by /api/backend/checkout. */
interface BackendSessionMeta {
  product?: string;
  offer?: string;
  treatment?: string;
  firstName?: string;
  email?: string;
  readingCents?: string;
  bump?: string;
  bumpProduct?: string;
  /** The booking-treatment A/B visitor subject, for purchase attribution. */
  expSubject?: string;
  /** 08 backstop only — the intake row is the source; these are read when it is missing. */
  editionId?: string;
  editionVersion?: string;
}

/**
 * Park what she typed, keyed on the Stripe Checkout session, BEFORE she pays.
 *
 * 🔴 Why not straight onto `be_orders`: a be_orders row means she PAID, and nothing
 * downstream filters on status — an abandoned checkout with a row would render a
 * thank-you page and start a fulfilment. See shared/schema.ts on `be_order_intake`.
 *
 * ⚠ NON-FATAL BY DESIGN, and this is a real trade-off, not an oversight. If this write
 * fails she can still pay, and the order simply arrives without its intake: the
 * fulfilment endpoint then answers 409 with the missing field list rather than guessing,
 * which is recoverable by hand. Throwing here would instead deny a checkout to a woman
 * who is ready to buy, over a table nobody has read yet. Loud in the log either way.
 */
export async function saveOrderIntake(intake: InsertBeOrderIntake): Promise<boolean> {
  try {
    await db
      .insert(beOrderIntake)
      .values(intake)
      // Idempotent: a retried checkout POST for the same session overwrites its own
      // intake. She is still on the booking page, so the LAST thing she typed wins.
      .onConflictDoUpdate({
        target: beOrderIntake.stripeSessionId,
        set: {
          spreadKey: intake.spreadKey ?? null,
          drawDate: intake.drawDate ?? null,
          tier: intake.tier ?? null,
          topic: intake.topic ?? null,
          question: intake.question ?? null,
          question2: intake.question2 ?? null,
          question3: intake.question3 ?? null,
          // 08: written by POST /checkout before Stripe. Since 2026-09-14 (D5 amended) the
          // three personal fields come from the booking page too, so a retry refreshes them
          // — the last thing she typed wins, same as the questions above.
          editionId: intake.editionId ?? null,
          editionVersion: intake.editionVersion ?? null,
          speedBump: intake.speedBump ?? false,
          displayFirstName: intake.displayFirstName ?? null,
          fullBirthName: intake.fullBirthName ?? null,
          dateOfBirth: intake.dateOfBirth ?? null,
        },
      });
    return true;
  } catch (err) {
    logger.error('be_order_intake: WRITE FAILED — she can still pay, but the order will ' +
      'arrive with no question and fulfilment will 409', {
      session: intake.stripeSessionId,
      offer: intake.offer,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Read back what she typed. Null when there is none — every 02/03 order, and any 07
 *  order whose intake write failed. */
async function intakeFor(sessionId: string) {
  try {
    const [row] = await db
      .select()
      .from(beOrderIntake)
      .where(eq(beOrderIntake.stripeSessionId, sessionId))
      .limit(1);
    return row ?? null;
  } catch (err) {
    logger.error('be_order_intake: READ FAILED — order will be recorded without it', {
      session: sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function centsFrom(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Record the order and put her on the customer list.
 *
 * Returns null when the session is not a backend order — the webhook is gated on the
 * `be_` prefix already, so that only happens if something changed underneath us, and
 * a warn is the right answer rather than a throw that would make Stripe retry forever.
 */
export async function recordBackendOrder(
  session: Stripe.Checkout.Session,
): Promise<BeOrder | null> {
  const metadata = (session.metadata || {}) as BackendSessionMeta;
  const offer = backendOfferForStripeProduct(metadata.product);
  if (!offer) {
    logger.warn('recordBackendOrder: not a backend product, ignoring', {
      product: metadata.product,
      session: session.id,
    });
    return null;
  }

  const email =
    session.customer_details?.email || session.customer_email || metadata.email || null;
  // Prefer the letter's ?fn= (metadata.firstName); fall back to the name Stripe
  // Checkout collected on the card, so a buyer who arrived without ?fn= still gets
  // her name on the AWeber list instead of a blank "Friend".
  const treatment = isBookingTreatment(metadata.treatment) ? metadata.treatment : null;

  const amountCents = session.amount_total ?? 0;
  // ⛔ An offer with no bump cannot have sold one, whatever the metadata says —
  //    checkout refuses `bump: true` for it, so a '1' here is tampering or a bug.
  const bump = metadata.bump === '1' ? offer.bump : undefined;
  const bumpPurchased = Boolean(bump);
  const bumpCents = bump ? bump.cents : 0;
  // Prefer what checkout recorded; fall back to the arithmetic Stripe can prove. The
  // two agree unless a coupon was applied, and then Stripe's total is the truth.
  const readingCents = centsFrom(metadata.readingCents) ?? Math.max(0, amountCents - bumpCents);

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // ⭐ What she typed on the booking page, parked at checkout. Read BEFORE the insert so
  //    the order lands complete in one write — an order that exists for a moment without
  //    its question is an order the fulfilment poller can pick up and 409 on.
  const intake = await intakeFor(session.id);

  // ⭐ 08 only: the three personal fields (the intake the booking page parked, else what
  //    Stripe Checkout collected on an older session), the edition she booked, and her
  //    delivery deadline. Pure; nothing here can throw on her input. NULL for every other offer.
  const be08 = offer.key === 'marcus-reading' ? prepareBe08(session, metadata, intake, bumpPurchased) : null;

  // 08: what Marcus calls her, typed on the booking page, beats everything. Otherwise prefer the
  // letter's ?fn= (metadata.firstName); fall back to the name Stripe Checkout collected on
  // the card, so a buyer who arrived without ?fn= still gets her name on the AWeber list
  // instead of a blank "Friend".
  const firstName =
    be08?.fields.displayFirstName || metadata.firstName || session.customer_details?.name || null;

  let row: BeOrder | undefined;
  try {
    [row] = await db
      .insert(beOrders)
      .values({
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        offer: offer.key,
        offerNumber: offer.number,
        treatment,
        readingCents,
        bumpPurchased,
        bumpCents,
        bumpProductKey: bump ? bump.productKey : null,
        amountCents,
        currency: session.currency ?? 'usd',
        email,
        firstName,
        status: 'paid',
        // ⛔ 07 only. NULL on every offer that sells one fixed thing, which is all of
        //    them except this one. `tier` is what the SERVER priced, not what the
        //    browser asked for — see resolveBackendCharge.
        ...(intake
          ? {
              spreadKey: intake.spreadKey,
              drawDate: intake.drawDate,
              tier: intake.tier,
              topic: intake.topic,
              question: intake.question,
              question2: intake.question2,
              question3: intake.question3,
            }
          : {}),
        // ⛔ 08 only. The edition is pinned by id + version; due_at is the SLA clock.
        ...(be08
          ? {
              editionId: be08.editionId,
              editionVersion: be08.editionVersion,
              dueAt: be08.dueAt,
            }
          : {}),
      })
      // Idempotent: a Stripe retry, or the thank-you page arriving first, updates the
      // same row. ⛔ Deliberately does NOT touch the fulfilment or customer-list columns
      // — a second write must never un-stamp work that already happened.
      .onConflictDoUpdate({
        target: beOrders.stripeSessionId,
        // ⛔ Deliberately does NOT touch the intake columns. They were written on the
        //    first insert from the same intake row, so a retry has nothing new to say —
        //    and re-setting them from a failed intake read would blank her question.
        set: {
          stripePaymentIntentId: paymentIntentId,
          email,
          firstName,
          amountCents,
          updatedAt: new Date(),
          // 08: deterministic from the same session, so a retry says the same thing —
          // but COALESCE keeps the first write if THIS retry's intake read failed.
          ...(be08
            ? {
                editionId: sql`COALESCE(${beOrders.editionId}, ${be08.editionId})`,
                editionVersion: sql`COALESCE(${beOrders.editionVersion}, ${be08.editionVersion})`,
                dueAt: sql`COALESCE(${beOrders.dueAt}, ${be08.dueAt})`,
              }
            : {}),
        },
      })
      .returning();
  } catch (err) {
    // 🔴 THE ROW IS NOT THE PRODUCT. If the table is missing (the migration was never
    // run) or the database is down, she has still paid — so bookkeeping failing must
    // not also cost her the email. Write her to the customer list straight from the
    // session and let the tag fire her thank-you. The order is then reconstructable
    // from Stripe, which is the system of record for money anyway.
    logger.error('be_order: DB WRITE FAILED — falling back to a list-only write', {
      session: session.id,
      offer: offer.key,
      error: err instanceof Error ? err.message : String(err),
    });
    if (email) {
      await addBackendCustomer({
        email,
        firstName: firstName || undefined,
        offer: offer.key,
        stripeOrderId: session.id,
        bumpPurchased,
      }).catch((awErr) =>
        logger.error('be_order: fallback customer-list write ALSO failed — buyer paid, ' +
          'no row and no email', {
          session: session.id,
          error: awErr instanceof Error ? awErr.message : String(awErr),
        }),
      );
    }
    return null;
  }

  logger.info('be_order recorded', {
    session: session.id,
    offer: offer.key,
    treatment,
    amountCents,
    bump: bumpPurchased,
  });

  // Attribute the sale to the booking-treatment A/B arm she saw (02 only, and only
  // if she was enrolled). Non-blocking and self-guarding — a measurement miss must
  // never cost her the order or her email.
  if (offer.key === 'twin-flame' && metadata.expSubject) {
    await logBeBookingConversion(metadata.expSubject, amountCents).catch((err) =>
      logger.error('be_order: booking-conversion log failed (order still recorded)', {
        session: session.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  // ⭐ 08: copy Stripe's birth fields onto the intake, resolve the edition, cut the lens,
  //    deal the cards ONCE. Every failure inside is caught and written to
  //    be_orders.fulfilment_note — the order is recorded and she is emailed regardless.
  if (be08) row = await fulfilBe08OnPayment(row, session.id, be08);

  return writeToCustomerList(row, offer);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 08 · Marcus Stone's personal reading — draw on payment
// ═══════════════════════════════════════════════════════════════════════════════
//
// PARALLEL-PLAN.md D1/D5/D7 (2026-09-13), D5 amended 2026-09-14: the BOOKING PAGE collects
// her display first name, full birth name and date of birth and POST /checkout parks them
// on be_order_intake with the edition and the bump. The intake is PRIMARY. Stripe's
// `session.custom_fields` are read only as a FALLBACK, per field, for sessions created
// before the change (Stripe forbids personal data in custom fields). On the paid signal we:
//   1. make sure be_order_intake holds the three values we resolved (if the pre-pay write
//      failed, insert the row now from the fallback);
//   2. pin edition id + version and stamp due_at on be_orders (done in the insert above);
//   3. cut the lens from her birth name, deal the paid positions, store the draw ONCE;
//   4. stamp lens_card + lens_method_version.
//
// 🔴 NOTHING HERE FAILS THE ORDER. A birth date Stripe let through unvalidated, a name the
//    lens cannot read, an edition nobody published — each is a reason code on
//    be_orders.fulfilment_note for support, logged with the session id only, and the
//    customer-list write (her thank-you email) still runs. ⚠ Never log the name or DOB.
//
// IDEMPOTENT: `lens_card` is stamped only after the draw row exists, so a stamped row is
// skipped outright; a row whose first attempt failed is retried by the next caller (the
// webhook redelivery, or the thank-you page's backstop).

interface Be08Prepared {
  /** The three personal fields as RESOLVED: intake first, Stripe custom_fields as fallback. */
  fields: ReturnType<typeof readBe08CustomFields>;
  /** ISO date, or null when missing / unparseable (then `dobNote` says why). */
  dateOfBirth: string | null;
  /** e.g. 'DOB_UNPARSEABLE(raw=…)'. Null when the date was fine. */
  dobNote: string | null;
  editionId: string | null;
  editionVersion: number | null;
  dueAt: Date;
  /** Only when the pre-pay intake row was missing; used to insert it now. */
  speedBump: boolean;
}

/** Pure. Everything the 08 hook needs, computed before the order insert. */
function prepareBe08(
  session: Stripe.Checkout.Session,
  metadata: BackendSessionMeta,
  intake: Awaited<ReturnType<typeof intakeFor>>,
  bumpPurchased: boolean,
): Be08Prepared {
  // Intake (the booking page, validated at checkout) beats Stripe's custom_fields (older
  // sessions), field by field — a value the intake lacks still falls through to Stripe.
  const stripeFields = readBe08CustomFields(session);
  const text = (v: unknown): string | null => {
    if (typeof v !== 'string') return null;
    const trimmed = v.replace(/\s+/g, ' ').trim();
    return trimmed || null;
  };
  // drizzle's `date` column reads back as 'YYYY-MM-DD' (a Date only if the mode changes) —
  // both go through the parser below, so the range rules apply either way.
  const rawIntakeDob: unknown = intake?.dateOfBirth;
  const intakeDob = rawIntakeDob instanceof Date
    ? rawIntakeDob.toISOString().slice(0, 10)
    : text(rawIntakeDob);
  const fields: Be08CustomFields = {
    displayFirstName: text(intake?.displayFirstName) ?? stripeFields.displayFirstName,
    fullBirthName: text(intake?.fullBirthName) ?? stripeFields.fullBirthName,
    dateOfBirthRaw: intakeDob ?? stripeFields.dateOfBirthRaw,
  };
  const dob = parseDateOfBirth(fields.dateOfBirthRaw);
  const dobNote = dob.ok
    ? null
    : dob.reason === 'missing'
      ? 'DOB_MISSING'
      : `DOB_${dob.reason.toUpperCase()}(raw=${fields.dateOfBirthRaw})`;

  const metaVersion = Number(metadata.editionVersion);
  const editionId = intake?.editionId || metadata.editionId || null;
  const editionVersion =
    intake?.editionVersion ?? (Number.isSafeInteger(metaVersion) && metaVersion > 0 ? metaVersion : null);

  // Paid time = the session's own clock (Stripe epoch seconds), else now. 12h with the
  // '+ 12-hour delivery' bump, 24h without — the promise on the booking page.
  const paidAt = typeof session.created === 'number' && session.created > 0
    ? new Date(session.created * 1000)
    : new Date();
  const hours = bumpPurchased ? 12 : 24;
  const dueAt = new Date(paidAt.getTime() + hours * 3_600_000);

  return {
    fields,
    dateOfBirth: dob.ok ? dob.iso : null,
    dobNote,
    editionId,
    editionVersion,
    dueAt,
    speedBump: intake?.speedBump ?? bumpPurchased,
  };
}

/** Steps 1, 3 and 4 above. Returns the row as it stands afterwards. */
async function fulfilBe08OnPayment(row: BeOrder, sessionId: string, be08: Be08Prepared): Promise<BeOrder> {
  // 1 · The resolved values onto the intake (a no-op when the booking page's write landed;
  //     the Stripe fallback fills an older session). Insert if the pre-pay write never landed.
  try {
    await db
      .insert(beOrderIntake)
      .values({
        stripeSessionId: sessionId,
        offer: 'marcus-reading',
        editionId: be08.editionId,
        editionVersion: be08.editionVersion,
        speedBump: be08.speedBump,
        displayFirstName: be08.fields.displayFirstName,
        fullBirthName: be08.fields.fullBirthName,
        dateOfBirth: be08.dateOfBirth,
      })
      .onConflictDoUpdate({
        target: beOrderIntake.stripeSessionId,
        // The three personal fields are what prepareBe08 resolved (intake first, so this
        // rewrites the intake's own values; Stripe's only where the intake had none). The
        // edition and bump were the checkout's to write and are left alone unless missing.
        set: {
          displayFirstName: be08.fields.displayFirstName,
          fullBirthName: be08.fields.fullBirthName,
          dateOfBirth: be08.dateOfBirth,
          editionId: sql`COALESCE(${beOrderIntake.editionId}, ${be08.editionId})`,
          editionVersion: sql`COALESCE(${beOrderIntake.editionVersion}, ${be08.editionVersion})`,
        },
      });
  } catch (err) {
    logger.error('be_08: intake write on payment FAILED (order still recorded)', {
      session: sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Already dealt (the lens is stamped only after the draw row exists) — nothing to do.
  if (row.lensCard) return row;

  const notes: string[] = [];
  if (be08.dobNote) notes.push(be08.dobNote);

  try {
    if (!be08.editionId) throw new Be08DrawError('EDITION_MISSING', 'No edition on the intake or the session.');
    const edition = await getBe08Edition(be08.editionId, be08.editionVersion);
    if (!edition) throw new Be08DrawError('EDITION_NOT_FOUND', 'No such edition/version.');

    if (!be08.fields.fullBirthName) throw new Be08DrawError('BIRTH_NAME_MISSING', 'No full birth name on the intake or the session.');
    const name = splitBirthName(be08.fields.fullBirthName);
    if (!name) throw new Be08DrawError('BIRTH_NAME_UNSPLITTABLE', 'The birth name has no last name to split off.');

    const lens = personalLens(name.first, name.last);
    const draw = drawForOrder(row.id, edition, lens, BE_08_DECK);
    const stored = await insertBe08DrawOnce(row.id, {
      drawJson: buildDrawJson(edition, draw),
      drawMethodVersion: draw.methodVersion,
      contextHash: be08ContextHash({
        editionId: edition.id,
        editionVersion: edition.version,
        fullBirthName: be08.fields.fullBirthName,
        dateOfBirth: be08.dateOfBirth,
        lensCard: lens.cardId,
      }),
    });

    // 4 · Stamp the lens AND the edition FROM THE STORED ROW, so a retry that lost the race
    //     records the deal that actually exists, not the one it computed — and so a support
    //     fix that re-pointed the intake at a different edition before the retry leaves
    //     be_orders agreeing with draw_json (the first insert's COALESCE would otherwise
    //     keep the edition that failed).
    const storedJson = stored.drawJson as {
      lens?: { cardId?: string; methodVersion?: string };
      edition?: { id?: string; version?: number };
    };
    const [updated] = await db
      .update(beOrders)
      .set({
        editionId: storedJson.edition?.id ?? edition.id,
        editionVersion: storedJson.edition?.version ?? edition.version,
        lensCard: storedJson.lens?.cardId ?? lens.cardId,
        lensMethodVersion: storedJson.lens?.methodVersion ?? LENS_METHOD_VERSION,
        fulfilmentNote: notes.length ? notes.join('; ') : null,
        updatedAt: new Date(),
      })
      .where(eq(beOrders.id, row.id))
      .returning();
    logger.info('be_08: draw stored', {
      session: sessionId,
      edition: `${edition.id}@${edition.version}`,
      lens: storedJson.lens?.cardId ?? lens.cardId,
      ...(notes.length ? { note: notes.join('; ') } : {}),
    });
    return updated ?? row;
  } catch (err) {
    const code = err instanceof Be08DrawError ? err.code : 'DRAW_FAILED';
    logger.error('be_08: FULFILMENT NOT STARTED — order recorded, support must look', {
      session: sessionId,
      code,
      ...(code === 'DRAW_FAILED' ? { error: err instanceof Error ? err.message : String(err) } : {}),
    });
    notes.unshift(code);
    try {
      const [updated] = await db
        .update(beOrders)
        .set({ fulfilmentNote: notes.join('; ').slice(0, 1000), updatedAt: new Date() })
        .where(eq(beOrders.id, row.id))
        .returning();
      return updated ?? row;
    } catch (noteErr) {
      logger.error('be_08: could not even record the fulfilment note', {
        session: sessionId,
        error: noteErr instanceof Error ? noteErr.message : String(noteErr),
      });
      return row;
    }
  }
}

/**
 * Put her on the backend customer list, unless that already happened.
 *
 * Split out so the thank-you page can retry it: that page is the one moment a buyer
 * whose write failed is in front of us again, and a second attempt costs nothing
 * (AWeber upserts, and the row is only stamped on success).
 */
export async function writeToCustomerList(
  row: BeOrder,
  offer?: BackendOffer,
): Promise<BeOrder> {
  if (row.customerListWrittenAt) return row;

  const listing = offer ?? offerFor(row.offer);
  if (!listing) {
    logger.error('be_order: unknown offer on the row, cannot reach the customer list', {
      session: row.stripeSessionId,
      offer: row.offer,
    });
    return row;
  }

  if (!row.email) {
    // Nothing to write to. Stripe collects an email on every hosted Checkout, so this
    // is a shape we should never see — record it as the failure it is rather than
    // silently doing nothing.
    return stamp(row, 'no email on the session');
  }

  const result = await addBackendCustomer({
    email: row.email,
    firstName: row.firstName || undefined,
    offer: listing.key,
    // 🔴 The CHECKOUT SESSION id (cs_…), not the PaymentIntent — it is what joins back
    // to Stripe and to n8n, whose filter reads the session as `body.data.object`.
    stripeOrderId: row.stripeSessionId,
    bumpPurchased: row.bumpPurchased,
    // ⚠ Sent only when that screen exists — see `entryPath` in shared/backendOffers.ts.
    entryUrl: entryUrlFor(listing, row),
  }).catch((err) => ({
    success: false as const,
    error: err instanceof Error ? err.message : 'unknown error',
  }));

  if (result.success) {
    const [updated] = await db
      .update(beOrders)
      .set({ customerListWrittenAt: new Date(), customerListError: null, updatedAt: new Date() })
      .where(eq(beOrders.id, row.id))
      .returning();
    logger.info('be_order: on the customer list, thank-you tag applied', {
      session: row.stripeSessionId,
      offer: listing.key,
    });
    return updated ?? row;
  }

  // 🔴 Rule 8: the write is the send. Loud, and recorded, because this is a woman who
  // has paid and has not been emailed.
  logger.error('be_order: CUSTOMER LIST WRITE FAILED — buyer paid and was not emailed', {
    session: row.stripeSessionId,
    offer: listing.key,
    email: row.email,
    error: result.error,
  });
  return stamp(row, result.error || 'unknown error');
}

async function stamp(row: BeOrder, error: string): Promise<BeOrder> {
  const [updated] = await db
    .update(beOrders)
    .set({ customerListError: error.slice(0, 500), updatedAt: new Date() })
    .where(eq(beOrders.id, row.id))
    .returning();
  return updated ?? row;
}

function offerFor(key: string): BackendOffer | null {
  return isBackendOfferKey(key) ? BACKEND_OFFER_CATALOG[key] : null;
}

/** ACT offers only, and only once their Entry form exists. */
function entryUrlFor(offer: BackendOffer, row: BeOrder): string | undefined {
  if (!offer.entryPath) return undefined;
  const base = (process.env.BASE_URL || 'https://www.theseerwithin.com').replace(/\/$/, '');
  return `${base}${offer.entryPath}?s=${encodeURIComponent(row.stripeSessionId)}`;
}

/** Read an order back — for the thank-you page, and for support. */
export async function getBeOrderBySession(sessionId: string): Promise<BeOrder | null> {
  const [row] = await db
    .select()
    .from(beOrders)
    .where(eq(beOrders.stripeSessionId, sessionId))
    .limit(1);
  return row ?? null;
}
