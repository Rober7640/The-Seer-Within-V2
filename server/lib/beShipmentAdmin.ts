import { and, desc, eq } from 'drizzle-orm';
import { db } from './db';
import { beShipments, type BeShipment, type BeShipmentStatus } from '@shared/schema';
import { isBackendOfferKey } from '@shared/backendOffers';
import { markBackendOrderShipped } from './aweber';
import logger from './logger';

// The operator's side of backend-deck shipments: list, mark shipped, cancel.
// HTTP lives in server/routes/admin/shipments.ts, behind the admin auth middleware.
//
// Kept apart from server/lib/beShipments.ts on purpose: the webhook and the receipt import
// that module, and neither needs AWeber's shipped write pulled in beside them.
//
// ── MARK SHIPPED, IN TWO STAMPS ──────────────────────────────────────────────────
//   1. status → 'shipped' + carrier / tracking; `shipped_at` stamped ONCE, on the first
//      transition out of 'pending'.
//   2. the AWeber shipped tag (her tracking email) → `shipped_list_written_at`, or
//      `shipped_list_error` on failure. A re-POST retries step 2 and never re-stamps
//      `shipped_at`.
// ⛔ Once `shipped_list_written_at` is set her tracking email has gone with that tracking,
//    so the tracking is LOCKED: the same values are a no-op, different values a refusal.

export const SHIPMENT_STATUSES: readonly BeShipmentStatus[] = ['pending', 'shipped', 'cancelled'];

export function isShipmentStatus(value: unknown): value is BeShipmentStatus {
  return typeof value === 'string' && (SHIPMENT_STATUSES as readonly string[]).includes(value);
}

export interface ShippedInput {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
}

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Validate a mark-shipped body. All three fields required; the link must be https. */
export function parseShippedInput(
  body: unknown,
): { ok: true; value: ShippedInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  const carrier = text(b.carrier);
  if (!carrier || carrier.length > 100) {
    return { ok: false, error: 'carrier is required (100 characters at most).' };
  }
  const trackingNumber = text(b.trackingNumber);
  if (!trackingNumber || trackingNumber.length > 200) {
    return { ok: false, error: 'trackingNumber is required (200 characters at most).' };
  }
  const trackingUrl = text(b.trackingUrl);
  let https = false;
  try {
    https = trackingUrl.length <= 2000 && new URL(trackingUrl).protocol === 'https:';
  } catch {
    https = false;
  }
  if (!https) {
    return { ok: false, error: 'trackingUrl must be an https:// link (2000 characters at most).' };
  }
  return { ok: true, value: { carrier, trackingNumber, trackingUrl } };
}

/** Validate a cancel body. */
export function parseCancelReason(body: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const raw = (body ?? {}) as Record<string, unknown>;
  const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
  if (!reason || reason.length > 500) {
    return { ok: false, error: 'reason is required (500 characters at most).' };
  }
  return { ok: true, value: reason };
}

export async function getShipmentById(id: string): Promise<BeShipment | null> {
  const [row] = await db.select().from(beShipments).where(eq(beShipments.id, id)).limit(1);
  return row ?? null;
}

/** Newest first. Filters are validated by the route. */
export async function listShipments(filter: {
  status?: BeShipmentStatus;
  offer?: string;
  limit?: number;
}): Promise<BeShipment[]> {
  const conditions = [];
  if (filter.status) conditions.push(eq(beShipments.status, filter.status));
  if (filter.offer) conditions.push(eq(beShipments.offer, filter.offer));
  return db
    .select()
    .from(beShipments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(beShipments.createdAt))
    .limit(filter.limit ?? 200);
}

export type MarkShippedResult =
  | { ok: true; shipment: BeShipment; listWritten: boolean; alreadyShipped: boolean; listError?: string }
  | { ok: false; code: 'not_found' | 'cancelled' | 'tracking_locked' | 'conflict'; message: string };

export async function markShipmentShipped(id: string, input: ShippedInput): Promise<MarkShippedResult> {
  const row = await getShipmentById(id);
  if (!row) return { ok: false, code: 'not_found', message: 'Shipment not found.' };

  if (row.status === 'cancelled') {
    return { ok: false, code: 'cancelled', message: 'This shipment was cancelled and cannot be marked shipped.' };
  }

  if (row.status === 'shipped' && row.shippedListWrittenAt) {
    const same =
      row.carrier === input.carrier &&
      row.trackingNumber === input.trackingNumber &&
      row.trackingUrl === input.trackingUrl;
    if (same) return { ok: true, shipment: row, listWritten: true, alreadyShipped: true };
    return {
      ok: false,
      code: 'tracking_locked',
      message: 'Her tracking email has already gone with the tracking on file, so it cannot be changed here.',
    };
  }

  // Step 1. `shipped_at` only on the first move out of 'pending' — never on a retry.
  const [updated] = await db
    .update(beShipments)
    .set({
      status: 'shipped',
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
      trackingUrl: input.trackingUrl,
      ...(row.status === 'pending' ? { shippedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(beShipments.id, id), eq(beShipments.status, row.status)))
    .returning();
  if (!updated) {
    return { ok: false, code: 'conflict', message: 'The shipment changed while saving. Reload and try again.' };
  }

  // Step 2. The AWeber shipped tag — her tracking email.
  let listError: string | undefined;
  if (!isBackendOfferKey(updated.offer)) {
    listError = `unknown offer on the shipment: ${updated.offer}`;
  } else if (!updated.email) {
    listError = 'no buyer email on the shipment';
  } else {
    const result = await markBackendOrderShipped({
      email: updated.email,
      offer: updated.offer,
      stripeOrderId: updated.stripeSessionId,
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
      trackingUrl: input.trackingUrl,
    }).catch((err) => ({ success: false as const, error: errMsg(err) }));
    if (!result.success) listError = result.error || 'unknown AWeber error';
  }

  if (!listError) {
    const [stamped] = await db
      .update(beShipments)
      .set({ shippedListWrittenAt: new Date(), shippedListError: null, updatedAt: new Date() })
      .where(eq(beShipments.id, id))
      .returning();
    logger.info('be_shipments: marked shipped, tracking email triggered', { shipment: id, offer: updated.offer });
    return { ok: true, shipment: stamped ?? updated, listWritten: true, alreadyShipped: false };
  }

  logger.error('be_shipments: SHIPPED-TAG WRITE FAILED — parcel marked shipped, her tracking email NOT triggered; POST again to retry', {
    shipment: id,
    offer: updated.offer,
    error: listError,
  });
  const [noted] = await db
    .update(beShipments)
    .set({ shippedListError: listError.slice(0, 500), updatedAt: new Date() })
    .where(eq(beShipments.id, id))
    .returning();
  return { ok: true, shipment: noted ?? updated, listWritten: false, alreadyShipped: false, listError };
}

export type CancelResult =
  | { ok: true; shipment: BeShipment }
  | { ok: false; code: 'not_found' | 'not_pending' | 'conflict'; message: string };

/** Only a PENDING shipment can be cancelled. */
export async function cancelShipment(id: string, reason: string): Promise<CancelResult> {
  const row = await getShipmentById(id);
  if (!row) return { ok: false, code: 'not_found', message: 'Shipment not found.' };
  if (row.status !== 'pending') {
    return { ok: false, code: 'not_pending', message: `Only a pending shipment can be cancelled (this one is ${row.status}).` };
  }

  const [updated] = await db
    .update(beShipments)
    .set({ status: 'cancelled', cancelledAt: new Date(), cancelReason: reason, updatedAt: new Date() })
    .where(and(eq(beShipments.id, id), eq(beShipments.status, 'pending')))
    .returning();
  if (!updated) {
    return { ok: false, code: 'conflict', message: 'The shipment changed while saving. Reload and try again.' };
  }
  logger.warn('be_shipments: shipment cancelled by an admin', { shipment: id, offer: updated.offer });
  return { ok: true, shipment: updated };
}
