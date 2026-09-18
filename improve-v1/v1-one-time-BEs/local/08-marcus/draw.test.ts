import test from 'node:test';
import assert from 'node:assert/strict';
import type { Card, Edition } from './contracts';
import { DrawValidationError, drawForOrder, personalLens, SavedDrawStore, validateEdition } from './draw';

const deck: Card[] = ['five-of-cups', 'strength', 'empress', 'hermit', 'justice', 'fool']
  .map(id => ({ id, name: id, image: `${id}.jpg` }));
const edition: Edition = {
  id: 'healing-2026-09-10', version: 1, slug: 'healing', question: 'What needs healing?',
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
const lens = personalLens('A', 'B'); // 1 + 2 => Empress.
function errorCode(code: string) {
  return (error: unknown) => error instanceof DrawValidationError && error.code === code;
}

test('fixed cards and orientations survive; personal lens can coincide without consuming a position', () => {
  const input = structuredClone(edition);
  const before = structuredClone(input);
  const result = drawForOrder('order-one', input, lens, deck, () => 0);
  assert.equal(result.editionId, edition.id);
  assert.equal(result.editionVersion, 1);
  assert.deepEqual(result.positions.slice(0, 2), [
    { positionId: 'hurt', cardId: 'five-of-cups', reversed: true },
    { positionId: 'care', cardId: 'strength', reversed: false },
  ]);
  assert.deepEqual(result.positions.slice(2).map(p => p.cardId), ['empress', 'hermit']);
  assert.equal(result.personalLens.cardId, 'empress');
  assert.equal(result.positions.length, 4);
  assert.equal(new Set(result.positions.map(p => p.cardId)).size, 4);
  assert.ok(result.positions.slice(2).every(p => !p.reversed));
  assert.deepEqual(input, before);
});

test('each order draws independently, while identical combinations remain permitted', () => {
  const store = new SavedDrawStore();
  const first = store.getOrCreate('first', edition, lens, deck, () => 0);
  const second = store.getOrCreate('second', edition, personalLens('A', 'C'), deck, () => 0.999);
  assert.deepEqual(second.positions.slice(2).map(p => p.cardId), ['fool', 'justice']);
  assert.notDeepEqual(first.positions, second.positions);
  const third = store.getOrCreate('third', edition, lens, deck, () => 0);
  assert.deepEqual(first.positions, third.positions);
});

test('order retry cannot redraw, mutate the saved result, or change edition/name context', () => {
  const store = new SavedDrawStore();
  const first = store.getOrCreate('retry', edition, lens, deck, () => 0);
  const original = structuredClone(first);
  first.positions[0].cardId = 'tampered';
  first.personalLens.firstName = 'tampered';
  const retry = store.getOrCreate('retry', structuredClone(edition), { ...lens }, deck, () => {
    throw new Error('A retry must not request randomness');
  });
  assert.deepEqual(retry, original);
  const read = store.get('retry')!;
  read.positions.pop();
  assert.deepEqual(store.get('retry'), original);
  assert.equal(store.get('missing'), undefined);
  for (const changed of [
    { ...edition, version: 2 },
    { ...edition, question: 'Changed question' },
    { ...edition, freeEmailText: 'Changed free context' },
    { ...edition, positions: edition.positions.map(p => ({ ...p, label: `${p.label}!` })) },
  ]) {
    assert.throws(() => store.getOrCreate('retry', changed, lens, deck), errorCode('ORDER_CONTEXT_CONFLICT'));
  }
  assert.throws(() => store.getOrCreate('retry', edition, personalLens('A', 'C'), deck), errorCode('ORDER_CONTEXT_CONFLICT'));
});

test('name mapping uses existing expression method including approved master numbers', () => {
  const mappings: Array<[string, string, number, string]> = [
    ['A', 'I', 1, 'magician'], ['A', 'A', 2, 'high-priestess'], ['A', 'B', 3, 'empress'],
    ['A', 'C', 4, 'emperor'], ['A', 'D', 5, 'hierophant'], ['A', 'E', 6, 'lovers'],
    ['A', 'F', 7, 'chariot'], ['A', 'G', 8, 'strength'], ['A', 'H', 9, 'hermit'],
    ['B', 'I', 11, 'justice'], ['DD', 'EI', 22, 'fool'],
  ];
  for (const [first, last, number, card] of mappings) {
    const result = personalLens(first, last);
    assert.equal(result.expressionNumber, number);
    assert.equal(result.cardId, card);
    assert.deepEqual(personalLens(first, last), result);
  }
  assert.equal(personalLens(' A ', ' B ').firstName, 'A');
  assert.throws(() => personalLens('III', 'F'), errorCode('UNMAPPED_EXPRESSION'));
  for (const name of ['Joël', '李', 'Jose\u0301', 'O’Connor']) {
    assert.throws(() => personalLens(name, 'A'), errorCode('UNSUPPORTED_NAME'));
  }
  for (const name of ['', '  ', '123', 'A!', 'A\nB']) {
    assert.throws(() => personalLens(name, 'B'), errorCode('INVALID_NAME'));
  }
});

test('invalid edition structure, fixed cards and deck fail before drawing', () => {
  const mutate = (fn: (value: Edition) => void) => { const value = structuredClone(edition); fn(value); return value; };
  const cases: Array<[Edition, string]> = [
    [null as unknown as Edition, 'INVALID_EDITION'],
    [{ ...edition, version: 0 }, 'INVALID_EDITION'],
    [{ ...edition, positions: [] }, 'INVALID_POSITIONS'],
    [mutate(e => e.positions[1].id = e.positions[0].id), 'INVALID_POSITIONS'],
    [mutate(e => e.positions[1].number = 4), 'INVALID_POSITIONS'],
    [mutate(e => delete e.positions[0].fixedCard), 'INVALID_FIXED_CARD'],
    [mutate(e => e.positions[0].fixedCard!.cardId = 'unknown'), 'INVALID_FIXED_CARD'],
    [mutate(e => e.positions[1].fixedCard = { ...e.positions[0].fixedCard! }), 'INVALID_FIXED_CARD'],
    [mutate(e => e.positions[2].fixedCard = { cardId: 'fool', reversed: false }), 'INVALID_PAID_POSITION'],
  ];
  for (const [value, code] of cases) assert.throws(() => validateEdition(value, deck), errorCode(code));
  assert.throws(() => validateEdition(edition, [...deck, deck[0]]), errorCode('INVALID_DECK'));
  assert.throws(() => validateEdition(edition, deck.slice(0, 3)), errorCode('INSUFFICIENT_DECK'));
  assert.throws(() => drawForOrder('draft', { ...edition, status: 'draft' }, lens, deck), errorCode('UNPUBLISHED_EDITION'));
  assert.throws(() => drawForOrder('', edition, lens, deck), errorCode('INVALID_ORDER'));
  assert.throws(() => drawForOrder('lens', edition, { ...lens, cardId: 'fool' }, deck), errorCode('INVALID_LENS'));
});

test('invalid random output never saves a partial draw', () => {
  const store = new SavedDrawStore();
  for (const value of [-0.1, 1, Infinity, NaN]) {
    let calls = 0;
    assert.throws(() => store.getOrCreate('failed', edition, lens, deck, () => calls++ ? value : 0), errorCode('INVALID_RANDOM'));
    assert.equal(store.get('failed'), undefined);
  }
  assert.equal(store.getOrCreate('failed', edition, lens, deck, () => 0).positions.length, 4);
});
