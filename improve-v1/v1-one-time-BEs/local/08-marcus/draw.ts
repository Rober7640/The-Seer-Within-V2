import { calculateExpression } from '../../../../server/lib/numerologyEngine';
import type { Card, Edition, OrderDraw, PersonalLens } from './contracts';

export const LENS_METHOD_VERSION = 'expression-existing-engine-v1';
export const DRAW_METHOD_VERSION = 'local-upright-without-replacement-v1';
const LENS_CARDS: Record<number, string> = {
  1: 'magician', 2: 'high-priestess', 3: 'empress', 4: 'emperor',
  5: 'hierophant', 6: 'lovers', 7: 'chariot', 8: 'strength',
  9: 'hermit', 11: 'justice', 22: 'fool',
};

export class DrawValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'DrawValidationError';
  }
}
function fail(code: string, message: string): never {
  throw new DrawValidationError(code, message);
}
function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function version(value: unknown): boolean {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

/** Validate the full edition before allowing a paid draw. Deck IDs are authoritative. */
export function validateEdition(edition: Edition, deck: readonly Card[]): void {
  if (!edition || !nonempty(edition.id) || !nonempty(edition.slug) ||
      !nonempty(edition.question) || !version(edition.version) ||
      !nonempty(edition.theme) || !edition.spread || !nonempty(edition.spread.id) ||
      !nonempty(edition.spread.name) || !version(edition.spread.version) ||
      !nonempty(edition.freeEmailText) ||
      !['draft', 'published'].includes(edition.status)) {
    fail('INVALID_EDITION', 'Edition identity, question, spread, email context and version are required.');
  }
  if (!Array.isArray(deck) || deck.length === 0) fail('INVALID_DECK', 'A card deck is required.');
  const ids = new Set<string>();
  for (const card of deck) {
    if (!card || !nonempty(card.id) || !nonempty(card.name) || !nonempty(card.image) || ids.has(card.id)) {
      fail('INVALID_DECK', 'Deck cards require unique IDs, names and images.');
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
      fail('INVALID_POSITIONS', 'Positions need unique IDs and sequential numbers in spread order.');
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

/** Preserve the existing engine; reject characters it would silently discard. */
export function personalLens(firstName: string, lastName: string): PersonalLens {
  if (!nonempty(firstName) || !nonempty(lastName)) fail('INVALID_NAME', 'First and last name are required.');
  for (const name of [firstName, lastName]) {
    if (/[^\x00-\x7F]/.test(name)) {
      fail('UNSUPPORTED_NAME', 'Non-ASCII name handling needs an approved normalization policy.');
    }
    if (!/^[A-Za-z]+(?:[ '-]+[A-Za-z]+)*$/.test(name.trim())) {
      fail('INVALID_NAME', 'Use letters with spaces, apostrophes or hyphens for this local method.');
    }
  }
  const first = firstName.trim();
  const last = lastName.trim();
  const expressionNumber = calculateExpression(`${first} ${last}`);
  const cardId = LENS_CARDS[expressionNumber];
  if (!cardId) fail('UNMAPPED_EXPRESSION', `Expression number ${expressionNumber} has no approved personal-card mapping.`);
  return { firstName: first, lastName: last, expressionNumber, cardId, methodVersion: LENS_METHOD_VERSION };
}

function validateLens(lens: PersonalLens): void {
  if (!lens) fail('INVALID_LENS', 'The personal lens is required.');
  const expected = personalLens(lens.firstName, lens.lastName);
  if (Object.keys(expected).some(key => expected[key as keyof PersonalLens] !== lens[key as keyof PersonalLens])) {
    fail('INVALID_LENS', 'The personal lens must match the names and approved method.');
  }
}

/** Pure local draw. The caller must establish payment before calling this function. */
export function drawForOrder(
  orderId: string, edition: Edition, lens: PersonalLens,
  deck: readonly Card[], rng: () => number = Math.random,
): OrderDraw {
  if (!nonempty(orderId)) fail('INVALID_ORDER', 'An order ID is required.');
  validateEdition(edition, deck);
  if (edition.status !== 'published') fail('UNPUBLISHED_EDITION', 'Paid orders require a published edition.');
  validateLens(lens);
  const fixed = new Set(edition.positions.flatMap(p => p.fixedCard ? [p.fixedCard.cardId] : []));
  const available = deck.filter(card => !fixed.has(card.id));
  const positions = edition.positions.map(position => {
    if (position.visibility === 'free') return { positionId: position.id, ...position.fixedCard! };
    const random = rng();
    if (!Number.isFinite(random) || random < 0 || random >= 1) {
      fail('INVALID_RANDOM', 'The random source must return a finite number in [0, 1).');
    }
    const [card] = available.splice(Math.floor(random * available.length), 1);
    return { positionId: position.id, cardId: card.id, reversed: false };
  });
  return {
    orderId, editionId: edition.id, editionVersion: edition.version,
    methodVersion: DRAW_METHOD_VERSION, positions, personalLens: { ...lens },
  };
}

/** Local-only retry adapter. Production needs atomic durable storage per order ID. */
export class SavedDrawStore {
  private readonly saved = new Map<string, { context: string; draw: OrderDraw }>();

  get(orderId: string): OrderDraw | undefined {
    const value = this.saved.get(orderId);
    return value ? structuredClone(value.draw) : undefined;
  }

  getOrCreate(
    orderId: string, edition: Edition, lens: PersonalLens,
    deck: readonly Card[], rng: () => number = Math.random,
  ): OrderDraw {
    validateEdition(edition, deck);
    validateLens(lens);
    // Canonical explicit fields prevent property insertion order from changing identity.
    const context = JSON.stringify([
      edition.id, edition.version, edition.slug, edition.question, edition.status,
      edition.theme, edition.spread.id, edition.spread.version, edition.spread.name, edition.freeEmailText,
      edition.positions.map(p => [p.id, p.number, p.label, p.visibility, p.fixedCard?.cardId, p.fixedCard?.reversed]),
      lens.firstName, lens.lastName, lens.expressionNumber, lens.cardId, lens.methodVersion,
    ]);
    const existing = this.saved.get(orderId);
    if (existing) {
      if (existing.context !== context) fail('ORDER_CONTEXT_CONFLICT', 'An existing order cannot change its edition or personal lens.');
      return structuredClone(existing.draw);
    }
    const draw = drawForOrder(orderId, edition, lens, deck, rng);
    this.saved.set(orderId, { context, draw: structuredClone(draw) });
    return draw;
  }
}
