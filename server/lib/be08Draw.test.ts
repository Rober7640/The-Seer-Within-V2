// 08 · The lens, the draw, and the once-only store.
//
//   npx vitest run server/lib/be08Draw.test.ts
//
// What these pin down:
//  1. D7: master number 33 → 6 (the Lovers). The local draw.ts throws on 33; production
//     must not, and must say which rule it used (LENS_METHOD_VERSION).
//  2. Non-ASCII and unsplittable names FAIL CLOSED with a typed Be08LensError the caller
//     can turn into a support note — never a silent wrong card.
//  3. The known-name table from the local draw.test.ts still holds (11 and 22 stay masters).
//  4. A draw is deterministic under a fixed rng, never repeats a card, keeps the fixed cards
//     and their orientations, and the lens never consumes a position.
//  5. insertBe08DrawOnce returns the FIRST stored deal on a retry — what the table holds,
//     not what the retry computed.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── fake database: a Map keyed on order_id, ON CONFLICT DO NOTHING semantics ─────
const store = new Map<string, Record<string, unknown>>();
let pendingInsert: Record<string, unknown> | null = null;
let pendingWhereOrderId: string | null = null;

vi.mock('./db', () => ({
  db: {
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        pendingInsert = v;
        return {
          onConflictDoNothing: async () => {
            const orderId = String(pendingInsert!.orderId);
            if (!store.has(orderId)) store.set(orderId, { id: `draw-${store.size + 1}`, ...pendingInsert, createdAt: new Date() });
          },
        };
      },
    }),
    select: () => ({
      from: () => ({
        where: (cond: { queryChunks?: unknown[] }) => {
          // drizzle eq() carries the value as a Param chunk; pull it out.
          const chunks = (cond as { queryChunks: Array<{ value?: unknown }> }).queryChunks ?? [];
          // ⚠ StringChunk also has `.value` (an array) — the Param's value is the scalar.
          const param = chunks.find((c) => c && typeof c === 'object' && 'value' in c && !Array.isArray(c.value));
          pendingWhereOrderId = param ? String((param as { value: unknown }).value) : null;
          return {
            limit: async () => {
              const row = pendingWhereOrderId ? store.get(pendingWhereOrderId) : undefined;
              return row ? [row] : [];
            },
          };
        },
      }),
    }),
  },
}));

const {
  BE_08_DECK,
  Be08DrawError,
  Be08LensError,
  DRAW_METHOD_VERSION,
  LENS_METHOD_VERSION,
  be08ContextHash,
  buildDrawJson,
  drawForOrder,
  insertBe08DrawOnce,
  personalLens,
  validateEdition,
} = await import('./be08Draw');
type Be08Edition = import('./be08Editions').Be08Edition;
type Be08Card = import('./be08Editions').Be08Card;

const deck: Be08Card[] = ['five-of-cups', 'strength', 'empress', 'hermit', 'justice', 'fool']
  .map((id) => ({ id, name: id, image: `${id}.jpg` }));
const edition: Be08Edition = {
  id: 'healing-v1', version: 1, slug: 'healing', question: 'What needs healing?',
  theme: 'What needs healing and where care can begin',
  spread: { id: 'six-questions', name: 'The Six Questions', version: 1 },
  freeEmailText: 'The original email interpretation stays with this edition.', status: 'published',
  positions: [
    { id: 'hurt', number: 1, label: 'The hurt', visibility: 'free', fixedCard: { cardId: 'five-of-cups', reversed: true } },
    { id: 'care', number: 2, label: 'Your care', visibility: 'free', fixedCard: { cardId: 'strength', reversed: false } },
    { id: 'need', number: 3, label: 'Your need', visibility: 'paid' },
    { id: 'step', number: 4, label: 'Your next step', visibility: 'paid' },
  ],
};
const lens = personalLens('A', 'B'); // 1 + 2 => 3 => Empress.
/** vitest's toThrow takes no predicate — catch and check the class + code by hand. */
function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}
function expectLensCode(fn: () => unknown, code: string, label = code) {
  const e = thrown(fn);
  expect(e, label).toBeInstanceOf(Be08LensError);
  expect((e as Be08LensError).code, label).toBe(code);
}
function expectDrawCode(fn: () => unknown, code: string, label = code) {
  const e = thrown(fn);
  expect(e, label).toBeInstanceOf(Be08DrawError);
  expect((e as Be08DrawError).code, label).toBe(code);
}

beforeEach(() => {
  store.clear();
  pendingInsert = null;
});

describe('the lens', () => {
  it('reproduces the local test table — 11 and 22 stay master numbers', () => {
    const mappings: Array<[string, string, number, string]> = [
      ['A', 'I', 1, 'magician'], ['A', 'A', 2, 'high-priestess'], ['A', 'B', 3, 'empress'],
      ['A', 'C', 4, 'emperor'], ['A', 'D', 5, 'hierophant'], ['A', 'E', 6, 'lovers'],
      ['A', 'F', 7, 'chariot'], ['A', 'G', 8, 'strength'], ['A', 'H', 9, 'hermit'],
      ['B', 'I', 11, 'justice'], ['DD', 'EI', 22, 'fool'],
    ];
    for (const [first, last, number, card] of mappings) {
      const result = personalLens(first, last);
      expect(result.expressionNumber, `${first} ${last}`).toBe(number);
      expect(result.cardId, `${first} ${last}`).toBe(card);
      expect(result.methodVersion).toBe(LENS_METHOD_VERSION);
    }
    expect(personalLens(' A ', ' B ').firstName).toBe('A');
  });

  it('D7: reduces master number 33 to 6 — the Lovers — and keeps the raw 33 visible', () => {
    // C=3 … 'III' is 9+9+9 = 27 → 9; we need a raw letter-sum of 33: L(3)+L(3)+L(3)+... pick
    // 'F' (6) x 5 + 'C' (3) = 33 → "FFF FFC".
    const result = personalLens('FFF', 'FFC');
    expect(result.expressionRaw).toBe(33);
    expect(result.expressionNumber).toBe(6);
    expect(result.cardId).toBe('lovers');
  });

  it('the method version names the 33 rule so no old reading is re-attributed', () => {
    expect(LENS_METHOD_VERSION).toContain('33');
    expect(LENS_METHOD_VERSION).not.toBe('expression-existing-engine-v1');
  });

  it('fails closed on non-ASCII with a typed lens error (D7)', () => {
    for (const name of ['Joël', '李', 'José', 'O’Connor']) {
      expectLensCode(() => personalLens(name, 'A'), 'LENS_UNSUPPORTED_NAME', name);
    }
  });

  it('rejects digits, punctuation and blanks as invalid names', () => {
    for (const name of ['123', 'A!', 'A\nB']) {
      expectLensCode(() => personalLens(name, 'B'), 'LENS_INVALID_NAME', name);
    }
    for (const name of ['', '  ']) {
      expectLensCode(() => personalLens(name, 'B'), 'LENS_NAME_MISSING', JSON.stringify(name));
    }
  });

  it('allows apostrophes, hyphens and spaces inside a name', () => {
    expect(() => personalLens("O'Brien", 'Smith-Jones')).not.toThrow();
    expect(() => personalLens('Mary Anne', 'Smith')).not.toThrow();
  });
});

describe('the deck', () => {
  it('is the 78-card deck with the local slug ids', () => {
    expect(BE_08_DECK).toHaveLength(78);
    expect(new Set(BE_08_DECK.map((c) => c.id)).size).toBe(78);
    const ids = BE_08_DECK.map((c) => c.id);
    for (const id of ['fool', 'magician', 'high-priestess', 'wheel-of-fortune', 'five-of-cups', 'king-of-pentacles', 'ace-of-wands']) {
      expect(ids).toContain(id);
    }
    // every lens card is in the deck
    for (const card of ['magician', 'high-priestess', 'empress', 'emperor', 'hierophant', 'lovers', 'chariot', 'strength', 'hermit', 'justice', 'fool']) {
      expect(ids).toContain(card);
    }
  });
});

describe('the draw', () => {
  it('keeps fixed cards and orientations, deals the rest upright without repeats, and the lens takes no position', () => {
    const input = structuredClone(edition);
    const before = structuredClone(input);
    const result = drawForOrder('order-one', input, lens, deck, () => 0);
    expect(result.editionId).toBe('healing-v1');
    expect(result.editionVersion).toBe(1);
    expect(result.methodVersion).toBe(DRAW_METHOD_VERSION);
    expect(result.positions.slice(0, 2)).toEqual([
      { positionId: 'hurt', cardId: 'five-of-cups', cardName: 'five-of-cups', reversed: true },
      { positionId: 'care', cardId: 'strength', cardName: 'strength', reversed: false },
    ]);
    expect(result.positions.slice(2).map((p) => p.cardId)).toEqual(['empress', 'hermit']);
    expect(result.personalLens.cardId).toBe('empress'); // coincides with a dealt card, fine
    expect(new Set(result.positions.map((p) => p.cardId)).size).toBe(4);
    expect(result.positions.slice(2).every((p) => !p.reversed)).toBe(true);
    expect(input).toEqual(before);
  });

  it('is deterministic for the same rng and differs for a different rng', () => {
    const a = drawForOrder('x', edition, lens, deck, () => 0);
    const b = drawForOrder('x', edition, lens, deck, () => 0);
    const c = drawForOrder('x', edition, lens, deck, () => 0.999);
    expect(a.positions).toEqual(b.positions);
    expect(c.positions.slice(2).map((p) => p.cardId)).toEqual(['fool', 'justice']);
  });

  it('never repeats a card across a real 10-position edition on the full deck', () => {
    const big: Be08Edition = {
      ...edition,
      positions: [
        { id: 'p1', number: 1, label: 'a', visibility: 'free', fixedCard: { cardId: 'tower', reversed: false } },
        { id: 'p2', number: 2, label: 'b', visibility: 'free', fixedCard: { cardId: 'moon', reversed: false } },
        { id: 'p3', number: 3, label: 'c', visibility: 'free', fixedCard: { cardId: 'star', reversed: false } },
        ...Array.from({ length: 7 }, (_, i) => ({ id: `p${i + 4}`, number: i + 4, label: `q${i}`, visibility: 'paid' as const })),
      ],
    };
    for (let run = 0; run < 50; run++) {
      const result = drawForOrder('o', big, lens, BE_08_DECK);
      expect(result.positions).toHaveLength(10);
      expect(new Set(result.positions.map((p) => p.cardId)).size).toBe(10);
      expect(result.positions.every((p) => typeof p.cardName === 'string' && p.cardName)).toBe(true);
    }
  });

  it('refuses a draft edition, an empty order id, a tampered lens and a bad rng', () => {
    expectDrawCode(() => drawForOrder('d', { ...edition, status: 'draft' }, lens, deck), 'UNPUBLISHED_EDITION');
    expectDrawCode(() => drawForOrder('', edition, lens, deck), 'INVALID_ORDER');
    expectDrawCode(() => drawForOrder('l', edition, { ...lens, cardId: 'fool' }, deck), 'INVALID_LENS');
    expectDrawCode(() => drawForOrder('r', edition, lens, deck, () => 1), 'INVALID_RANDOM');
  });

  it('validates edition structure before dealing', () => {
    const mutate = (fn: (v: Be08Edition) => void) => { const v = structuredClone(edition); fn(v); return v; };
    const cases: Array<[Be08Edition, string]> = [
      [null as unknown as Be08Edition, 'INVALID_EDITION'],
      [{ ...edition, version: 0 }, 'INVALID_EDITION'],
      [{ ...edition, positions: [] }, 'INVALID_POSITIONS'],
      [mutate((e) => { e.positions[1].id = e.positions[0].id; }), 'INVALID_POSITIONS'],
      [mutate((e) => { e.positions[1].number = 4; }), 'INVALID_POSITIONS'],
      [mutate((e) => { delete e.positions[0].fixedCard; }), 'INVALID_FIXED_CARD'],
      [mutate((e) => { e.positions[0].fixedCard!.cardId = 'unknown'; }), 'INVALID_FIXED_CARD'],
      [mutate((e) => { e.positions[2].fixedCard = { cardId: 'fool', reversed: false }; }), 'INVALID_PAID_POSITION'],
    ];
    for (const [value, code] of cases) expectDrawCode(() => validateEdition(value, deck), code);
    expectDrawCode(() => validateEdition(edition, [...deck, deck[0]]), 'INVALID_DECK');
    expectDrawCode(() => validateEdition(edition, deck.slice(0, 3)), 'INSUFFICIENT_DECK');
  });
});

describe('draw_json and the context hash', () => {
  it('snapshots the edition inside, carries the lens WITHOUT her name, and is contract v1', () => {
    const draw = drawForOrder('o1', edition, lens, deck, () => 0);
    const json = buildDrawJson(edition, draw, new Date('2026-09-13T10:00:00Z'));
    expect(json.contractVersion).toBe(1);
    expect(json.edition).toEqual({
      id: 'healing-v1', version: 1, slug: 'healing', question: 'What needs healing?',
      theme: edition.theme, spread: edition.spread, positions: edition.positions,
    });
    expect(json.lens).toEqual({ cardId: 'empress', expressionNumber: 3, expressionRaw: 3, methodVersion: LENS_METHOD_VERSION });
    expect(JSON.stringify(json)).not.toContain('"firstName"');
    expect(json.positions).toEqual(draw.positions);
    expect(json.drawnAt).toBe('2026-09-13T10:00:00.000Z');
    expect(json.drawMethodVersion).toBe(DRAW_METHOD_VERSION);
  });

  it('hashes the inputs, never the raw values', () => {
    const h = be08ContextHash({ editionId: 'healing-v1', editionVersion: 1, fullBirthName: 'Mary Smith', dateOfBirth: '1971-03-07', lensCard: 'empress' });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain('Mary');
    expect(be08ContextHash({ editionId: 'healing-v1', editionVersion: 1, fullBirthName: 'Mary  Smith ', dateOfBirth: '1971-03-07', lensCard: 'empress' })).toBe(h);
    expect(be08ContextHash({ editionId: 'healing-v1', editionVersion: 2, fullBirthName: 'Mary Smith', dateOfBirth: '1971-03-07', lensCard: 'empress' })).not.toBe(h);
    expect(be08ContextHash({ editionId: 'healing-v1', editionVersion: 1, fullBirthName: 'Mary Smith', dateOfBirth: null, lensCard: 'empress' })).not.toBe(h);
  });
});

describe('insertBe08DrawOnce', () => {
  const payload = (seed: number) => {
    const draw = drawForOrder('order-9', edition, lens, deck, () => seed);
    return { drawJson: buildDrawJson(edition, draw), drawMethodVersion: draw.methodVersion, contextHash: 'h' };
  };

  it('stores the first deal and hands it back', async () => {
    const first = await insertBe08DrawOnce('order-9', payload(0));
    expect(first.orderId).toBe('order-9');
    expect((first.drawJson as { positions: { cardId: string }[] }).positions.slice(2).map((p) => p.cardId)).toEqual(['empress', 'hermit']);
  });

  it('a retry returns the FIRST stored deal, not the one it just computed', async () => {
    const first = await insertBe08DrawOnce('order-9', payload(0));
    const retry = await insertBe08DrawOnce('order-9', payload(0.999));
    expect(retry.id).toBe(first.id);
    expect(retry.drawJson).toEqual(first.drawJson);
    expect(store.size).toBe(1);
  });

  it('different orders get their own rows', async () => {
    await insertBe08DrawOnce('order-9', payload(0));
    const other = await insertBe08DrawOnce('order-10', { ...payload(0.999), contextHash: 'h2' });
    expect(other.orderId).toBe('order-10');
    expect(store.size).toBe(2);
  });
});
