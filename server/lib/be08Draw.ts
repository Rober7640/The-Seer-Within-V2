import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { be08Draws, type Be08Draw } from '@shared/schema';
import { calculateExpression } from './numerologyEngine';
import type { Be08Card, Be08Edition } from './be08Editions';

// 08 · The personal-card lens and the per-order draw.
//
// A production port of improve-v1/v1-one-time-BEs/local/08-marcus/draw.ts (the local
// reference app keeps its own copy and must go on working — nothing here imports from it).
// Two things differ from the local file, both on purpose:
//
//   1. D7 (Joel, 2026-09-13): MASTER NUMBER 33 REDUCES TO 6. The local personalLens has no
//      33 in its card map, and the engine preserves 33, so a 33 name throws
//      UNMAPPED_EXPRESSION there. Production follows D7 — 33 → 6 → the Lovers — and the
//      lens method version is bumped so no reading is ever attributed to the wrong rule.
//      11 and 22 stay masters (Justice, the Fool), exactly as the local file has them.
//   2. Persistence is a real table with a unique index, not an in-memory map. See
//      `insertBe08DrawOnce`: INSERT … ON CONFLICT DO NOTHING, then SELECT — a retry returns
//      the FIRST deal, and two concurrent webhook deliveries cannot deal her twice.
//
// ⚠ PII. A full birth name reaches `personalLens`; it goes nowhere else. Never log it.

/** Bumped from the local 'expression-existing-engine-v1' because of the 33 → 6 rule. */
export const LENS_METHOD_VERSION = 'expression-engine-v2-master33-to-6';
export const DRAW_METHOD_VERSION = 'upright-without-replacement-v1';
/** The shape of `draw_json`. Bump when a reader (T5's GET, n8n) would break. */
export const BE_08_DRAW_CONTRACT_VERSION = 1 as const;

const LENS_CARDS: Record<number, string> = {
  1: 'magician', 2: 'high-priestess', 3: 'empress', 4: 'emperor',
  5: 'hierophant', 6: 'lovers', 7: 'chariot', 8: 'strength',
  9: 'hermit', 11: 'justice', 22: 'fool',
};

// ─── the deck ───────────────────────────────────────────────────────────────────
// Same 78 ids as the local fixtures.ts (lower-case, "the " dropped, spaces → hyphens), so
// an edition's fixedCard ids resolve identically here and there. `image` is a relative
// asset key — the writing workflow names cards, it does not render them from this list.

const MAJORS = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit', 'Wheel of Fortune',
  'Justice', 'The Hanged Man', 'Death', 'Temperance', 'The Devil', 'The Tower', 'The Star',
  'The Moon', 'The Sun', 'Judgement', 'The World',
];
const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'];
const cardSlug = (name: string) => name.toLowerCase().replace(/^the /, '').replaceAll(' ', '-');

export const BE_08_DECK: readonly Be08Card[] = Object.freeze(
  [...MAJORS, ...SUITS.flatMap((suit) => RANKS.map((rank) => `${rank} of ${suit}`))].map((name) => ({
    id: cardSlug(name),
    name,
    image: `cards/${cardSlug(name)}.jpg`,
  })),
);

// ─── errors ─────────────────────────────────────────────────────────────────────

/** Anything the draw refuses. `code` is safe to log and to store on the order. */
export class Be08DrawError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'Be08DrawError';
  }
}
/** The lens could not read her name. The caller turns this into a support note. */
export class Be08LensError extends Be08DrawError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = 'Be08LensError';
  }
}
function fail(code: string, message: string): never {
  throw new Be08DrawError(code, message);
}
function failLens(code: string, message: string): never {
  throw new Be08LensError(code, message);
}
function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function version(value: unknown): boolean {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

// ─── types ──────────────────────────────────────────────────────────────────────

export interface Be08PersonalLens {
  firstName: string;
  lastName: string;
  expressionNumber: number;
  /** The raw reduced number BEFORE the D7 rule, so a 33 is still visible to the writer. */
  expressionRaw: number;
  cardId: string;
  methodVersion: string;
}

export interface Be08DealtPosition {
  positionId: string;
  cardId: string;
  cardName: string;
  reversed: boolean;
}

export interface Be08OrderDraw {
  orderId: string;
  editionId: string;
  editionVersion: number;
  methodVersion: string;
  positions: Be08DealtPosition[];
  personalLens: Be08PersonalLens;
}

/**
 * What `be_08_draws.draw_json` holds. ⛔ T5's GET and n8n read this shape. The edition
 * snapshot is INSIDE it so a reading never depends on the editions table still holding
 * that version. `lens` carries no name — the birth name stays on be_order_intake.
 */
export interface Be08DrawJson {
  contractVersion: typeof BE_08_DRAW_CONTRACT_VERSION;
  edition: Pick<Be08Edition, 'id' | 'version' | 'slug' | 'question' | 'theme' | 'spread' | 'positions'>;
  lens: { cardId: string; expressionNumber: number; expressionRaw: number; methodVersion: string };
  positions: Be08DealtPosition[];
  drawMethodVersion: string;
  drawnAt: string;
}

// ─── validation (port) ──────────────────────────────────────────────────────────

/** Validate the full edition before allowing a paid draw. Deck ids are authoritative. */
export function validateEdition(edition: Be08Edition, deck: readonly Be08Card[] = BE_08_DECK): void {
  if (!edition || !nonempty(edition.id) || !nonempty(edition.slug) ||
      !nonempty(edition.question) || !version(edition.version) ||
      !nonempty(edition.theme) || !edition.spread || !nonempty(edition.spread.id) ||
      !nonempty(edition.spread.name) || !version(edition.spread.version) ||
      !nonempty(edition.freeEmailText) ||
      !['draft', 'published', 'retired'].includes(edition.status)) {
    fail('INVALID_EDITION', 'Edition identity, question, spread, email context and version are required.');
  }
  if (!Array.isArray(deck) || deck.length === 0) fail('INVALID_DECK', 'A card deck is required.');
  const ids = new Set<string>();
  for (const card of deck) {
    if (!card || !nonempty(card.id) || !nonempty(card.name) || !nonempty(card.image) || ids.has(card.id)) {
      fail('INVALID_DECK', 'Deck cards require unique ids, names and images.');
    }
    ids.add(card.id);
  }
  if (!Array.isArray(edition.positions) || edition.positions.length < 2) {
    fail('INVALID_POSITIONS', 'The spread needs free and paid positions.');
  }
  const positions = new Set<string>();
  const fixed = new Set<string>();
  let paid = 0;
  edition.positions.forEach((position, index) => {
    if (!position || !nonempty(position.id) || positions.has(position.id) ||
        !nonempty(position.label) || position.number !== index + 1 ||
        !['free', 'paid'].includes(position.visibility)) {
      fail('INVALID_POSITIONS', 'Positions need unique ids and sequential numbers in spread order.');
    }
    positions.add(position.id);
    if (position.visibility === 'free') {
      const card = position.fixedCard;
      if (!card || !ids.has(card.cardId) || typeof card.reversed !== 'boolean' || fixed.has(card.cardId)) {
        fail('INVALID_FIXED_CARD', 'Free positions need distinct fixed cards from the deck with an orientation.');
      }
      fixed.add(card.cardId);
    } else {
      if (position.fixedCard !== undefined) fail('INVALID_PAID_POSITION', 'Paid positions cannot fix a card in the edition.');
      paid++;
    }
  });
  if (!fixed.size || !paid) fail('INVALID_POSITIONS', 'The spread needs both free and paid positions.');
  if (deck.length - fixed.size < paid) fail('INSUFFICIENT_DECK', 'Not enough cards remain for the paid positions.');
}

// ─── the lens ───────────────────────────────────────────────────────────────────

/**
 * Her personal card, from her birth name through the existing numerology engine.
 * Rejects (Be08LensError) what the engine would silently discard: non-ASCII letters
 * (D7: fail closed to support, no normalisation policy is approved), digits, punctuation
 * other than space / apostrophe / hyphen. 33 → 6 per D7; 11 and 22 stay masters.
 */
export function personalLens(firstName: string, lastName: string): Be08PersonalLens {
  if (!nonempty(firstName) || !nonempty(lastName)) {
    failLens('LENS_NAME_MISSING', 'First and last name are required.');
  }
  for (const name of [firstName, lastName]) {
    if (/[^\x00-\x7F]/.test(name)) {
      failLens('LENS_UNSUPPORTED_NAME', 'Non-ASCII name handling needs an approved normalisation policy.');
    }
    if (!/^[A-Za-z]+(?:[ '-]+[A-Za-z]+)*$/.test(name.trim())) {
      failLens('LENS_INVALID_NAME', 'Use letters with spaces, apostrophes or hyphens.');
    }
  }
  const first = firstName.trim();
  const last = lastName.trim();
  const expressionRaw = calculateExpression(`${first} ${last}`);
  const expressionNumber = expressionRaw === 33 ? 6 : expressionRaw;
  const cardId = LENS_CARDS[expressionNumber];
  if (!cardId) {
    failLens('LENS_UNMAPPED_EXPRESSION', `Expression number ${expressionNumber} has no approved personal-card mapping.`);
  }
  return { firstName: first, lastName: last, expressionNumber, expressionRaw, cardId, methodVersion: LENS_METHOD_VERSION };
}

function validateLens(lens: Be08PersonalLens): void {
  if (!lens) fail('INVALID_LENS', 'The personal lens is required.');
  const expected = personalLens(lens.firstName, lens.lastName);
  if ((Object.keys(expected) as (keyof Be08PersonalLens)[]).some((key) => expected[key] !== lens[key])) {
    fail('INVALID_LENS', 'The personal lens must match the names and approved method.');
  }
}

// ─── the draw ───────────────────────────────────────────────────────────────────

/**
 * Pure. Deals the paid positions from the deck minus the edition's fixed cards, upright,
 * without replacement. The caller must have established payment. The lens can coincide
 * with a dealt card — it never consumes a position (same as the local rule).
 */
export function drawForOrder(
  orderId: string,
  edition: Be08Edition,
  lens: Be08PersonalLens,
  deck: readonly Be08Card[] = BE_08_DECK,
  rng: () => number = Math.random,
): Be08OrderDraw {
  if (!nonempty(orderId)) fail('INVALID_ORDER', 'An order id is required.');
  validateEdition(edition, deck);
  if (edition.status !== 'published') fail('UNPUBLISHED_EDITION', 'Paid orders require a published edition.');
  validateLens(lens);
  const byId = new Map(deck.map((card) => [card.id, card]));
  const fixed = new Set(edition.positions.flatMap((p) => (p.fixedCard ? [p.fixedCard.cardId] : [])));
  const available = deck.filter((card) => !fixed.has(card.id));
  const positions = edition.positions.map((position): Be08DealtPosition => {
    if (position.visibility === 'free') {
      const card = byId.get(position.fixedCard!.cardId)!;
      return { positionId: position.id, cardId: card.id, cardName: card.name, reversed: position.fixedCard!.reversed };
    }
    const random = rng();
    if (!Number.isFinite(random) || random < 0 || random >= 1) {
      fail('INVALID_RANDOM', 'The random source must return a finite number in [0, 1).');
    }
    const [card] = available.splice(Math.floor(random * available.length), 1);
    return { positionId: position.id, cardId: card.id, cardName: card.name, reversed: false };
  });
  return {
    orderId,
    editionId: edition.id,
    editionVersion: edition.version,
    methodVersion: DRAW_METHOD_VERSION,
    positions,
    personalLens: { ...lens },
  };
}

/** The stored shape. Snapshot of the edition inside; the lens without her name. */
export function buildDrawJson(edition: Be08Edition, draw: Be08OrderDraw, drawnAt: Date = new Date()): Be08DrawJson {
  return {
    contractVersion: BE_08_DRAW_CONTRACT_VERSION,
    edition: {
      id: edition.id,
      version: edition.version,
      slug: edition.slug,
      question: edition.question,
      theme: edition.theme,
      spread: { ...edition.spread },
      positions: structuredClone(edition.positions),
    },
    lens: {
      cardId: draw.personalLens.cardId,
      expressionNumber: draw.personalLens.expressionNumber,
      expressionRaw: draw.personalLens.expressionRaw,
      methodVersion: draw.personalLens.methodVersion,
    },
    positions: structuredClone(draw.positions),
    drawMethodVersion: draw.methodVersion,
    drawnAt: drawnAt.toISOString(),
  };
}

/**
 * sha256 of `editionId|editionVersion|fullBirthName|dateOfBirth|lensCard`. Lets fulfilment
 * prove a stored draw belongs to this order's inputs without re-reading PII. `dateOfBirth`
 * is the ISO date, or the literal 'none' when it was not usable at draw time — a later DOB
 * correction by support therefore changes the hash, which is the honest answer: the draw
 * was dealt before the date was known.
 */
export function be08ContextHash(input: {
  editionId: string;
  editionVersion: number;
  fullBirthName: string;
  dateOfBirth: string | null;
  lensCard: string;
}): string {
  const parts = [
    input.editionId,
    String(input.editionVersion),
    input.fullBirthName.replace(/\s+/g, ' ').trim(),
    input.dateOfBirth ?? 'none',
    input.lensCard,
  ];
  return createHash('sha256').update(parts.join('|'), 'utf8').digest('hex');
}

// ─── persistence ────────────────────────────────────────────────────────────────

/**
 * Store the draw ONCE per order. INSERT … ON CONFLICT (order_id) DO NOTHING, then SELECT:
 * the row handed back is whatever the table holds, which on a retry is the FIRST deal,
 * not the one this call computed. Two concurrent callers race on the unique index
 * `uq_be_08_draws_order`; exactly one insert lands and both read it back.
 * ⛔ Never UPDATE this table.
 */
export async function insertBe08DrawOnce(
  orderId: string,
  draw: { drawJson: Be08DrawJson; drawMethodVersion: string; contextHash: string },
): Promise<Be08Draw> {
  await db
    .insert(be08Draws)
    .values({
      orderId,
      drawJson: draw.drawJson,
      drawMethodVersion: draw.drawMethodVersion,
      contextHash: draw.contextHash,
    })
    .onConflictDoNothing({ target: be08Draws.orderId });
  const [row] = await db.select().from(be08Draws).where(eq(be08Draws.orderId, orderId)).limit(1);
  if (!row) fail('DRAW_NOT_STORED', 'The draw insert reported no conflict but no row exists.');
  return row;
}

/** Read a stored draw. Null when the order has not been dealt. */
export async function getBe08Draw(orderId: string): Promise<Be08Draw | null> {
  const [row] = await db.select().from(be08Draws).where(eq(be08Draws.orderId, orderId)).limit(1);
  return row ?? null;
}
