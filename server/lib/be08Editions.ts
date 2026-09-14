import { and, desc, eq } from 'drizzle-orm';
import { db } from './db';
import { be08Editions } from '@shared/schema';

// 08 · Edition lookup. An edition is one named spread Marcus reads against — see
// shared/schema.ts on `be_08_editions`. Published by scripts/publish-08-editions.ts.
//
// ⛔ The types below are a COPY of local/08-marcus/contracts.ts, not an import. The server
//    bundle must never reach into improve-v1/ (that tree is a read-only reference and keeps
//    its own local app working). If contracts.ts changes, change this file on purpose.

export type Be08CardId = string;
export interface Be08Card { id: Be08CardId; name: string; image: string }
export interface Be08FixedCard { cardId: Be08CardId; reversed: boolean }
export interface Be08Position {
  id: string;
  number: number;
  label: string;
  visibility: 'free' | 'paid';
  fixedCard?: Be08FixedCard;
}
export interface Be08Edition {
  id: string;
  version: number;
  slug: string;
  question: string;
  /** Explicit daily theme used by the adaptive report prompt and PDF. */
  theme: string;
  spread: { id: string; name: string; version: number };
  positions: Be08Position[];
  freeEmailText: string;
  bookingCopy?: { headline: string; intro: string; bridge: string; offer: string; name: string };
  status: 'draft' | 'published' | 'retired';
}

/**
 * The edition she booked. With `version` → that exact row (any status — an order already
 * paid for must still resolve a since-retired edition). Without → the LATEST PUBLISHED
 * version of that id, which is what a booking page opened on a bare id should sell.
 * Null when nothing matches; never throws on "not found".
 */
export async function getBe08Edition(
  id: string,
  version?: number | null,
): Promise<Be08Edition | null> {
  if (!id) return null;
  const where =
    typeof version === 'number' && Number.isSafeInteger(version)
      ? and(eq(be08Editions.id, id), eq(be08Editions.version, version))
      : and(eq(be08Editions.id, id), eq(be08Editions.status, 'published'));
  const [row] = await db
    .select()
    .from(be08Editions)
    .where(where)
    .orderBy(desc(be08Editions.version))
    .limit(1);
  return row ? (row.record as Be08Edition) : null;
}

/** Every bookable edition, newest version first within an id. */
export async function listPublishedBe08Editions(): Promise<Be08Edition[]> {
  const rows = await db
    .select()
    .from(be08Editions)
    .where(eq(be08Editions.status, 'published'))
    .orderBy(be08Editions.id, desc(be08Editions.version));
  return rows.map((row) => row.record as Be08Edition);
}
