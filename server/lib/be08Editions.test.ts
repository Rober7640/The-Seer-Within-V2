// 08 · Edition lookup + the birth-field parser.
//
//   npx vitest run server/lib/be08Editions.test.ts
//
// What these pin down:
//  1. getBe08Edition(id) with no version asks for the LATEST PUBLISHED; with a version it
//     asks for that exact row whatever its status (a paid order must resolve a retired one).
//  2. The record column comes back as the edition, verbatim.
//  3. The DOB parser: what it accepts, what it refuses, and that "03/07/1971" reads as
//     US order (MM/DD/YYYY) — March 7 — because that is what the Stripe label asks for.
//  4. readBe08CustomFields reads the three exact keys and never throws on a missing one.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── fake db: records the where/orderBy chunks, returns what the test queued ───────
const state = {
  rows: [] as Array<Record<string, unknown>>,
  lastWhere: null as unknown,
  lastOrderBy: [] as unknown[],
};

vi.mock('./db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (cond: unknown) => {
          state.lastWhere = cond;
          const tail = {
            orderBy: (...cols: unknown[]) => {
              state.lastOrderBy = cols;
              return { limit: async () => state.rows.slice(0, 1), then: (r: (v: unknown) => void) => r(state.rows) };
            },
          };
          return tail;
        },
      }),
    }),
  },
}));

const { getBe08Edition, listPublishedBe08Editions } = await import('./be08Editions');
const { parseDateOfBirth, readBe08CustomFields, splitBirthName } = await import('./be08Birth');

/** Flatten a drizzle SQL condition to the literal params it carries. */
function paramsOf(cond: unknown): unknown[] {
  const out: unknown[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { queryChunks?: unknown[]; value?: unknown };
    // StringChunk has an array `.value`; only a Param's scalar value is a real filter.
    if ('value' in n && !('queryChunks' in n) && !Array.isArray(n.value)) out.push(n.value);
    if (Array.isArray(n.queryChunks)) n.queryChunks.forEach(walk);
  };
  walk(cond);
  return out;
}

beforeEach(() => {
  state.rows = [];
  state.lastWhere = null;
  state.lastOrderBy = [];
});

describe('getBe08Edition', () => {
  const record = { id: 'blind-spots-v1', version: 1, slug: 'what-are-my-blind-spots', question: 'Q', status: 'published' };

  it('returns the record column as the edition', async () => {
    state.rows = [{ id: 'blind-spots-v1', version: 1, record }];
    expect(await getBe08Edition('blind-spots-v1')).toEqual(record);
  });

  it('without a version, filters on status = published and orders newest version first', async () => {
    state.rows = [{ record }];
    await getBe08Edition('blind-spots-v1');
    const params = paramsOf(state.lastWhere);
    expect(params).toContain('blind-spots-v1');
    expect(params).toContain('published');
    expect(state.lastOrderBy).toHaveLength(1);
  });

  it('with a version, filters on that exact version and NOT on status', async () => {
    state.rows = [{ record: { ...record, status: 'retired' } }];
    const result = await getBe08Edition('blind-spots-v1', 1);
    const params = paramsOf(state.lastWhere);
    expect(params).toContain('blind-spots-v1');
    expect(params).toContain(1);
    expect(params).not.toContain('published');
    expect(result?.status).toBe('retired');
  });

  it('returns null for nothing found and for an empty id', async () => {
    expect(await getBe08Edition('nope')).toBeNull();
    expect(await getBe08Edition('')).toBeNull();
  });

  it('listPublishedBe08Editions maps every row to its record', async () => {
    state.rows = [{ record }, { record: { ...record, id: 'healing-v1' } }];
    const list = await listPublishedBe08Editions();
    expect(list.map((e) => e.id)).toEqual(['blind-spots-v1', 'healing-v1']);
    expect(paramsOf(state.lastWhere)).toContain('published');
  });
});

describe('parseDateOfBirth', () => {
  const now = new Date('2026-09-13T12:00:00Z');
  const good: Array<[string, string]> = [
    ['1971-03-07', '1971-03-07'],
    ['1971/03/07', '1971-03-07'],
    ['25/03/1971', '1971-03-25'],      // day > 12 → day first
    ['03/25/1971', '1971-03-25'],      // month/day US
    ['25-03-1971', '1971-03-25'],
    ['25.03.1971', '1971-03-25'],
    ['07/07/1971', '1971-07-07'],      // equal → unambiguous
    ['03/07/1971', '1971-03-07'],      // both ≤ 12 → US order (MM/DD): March 7
    ['12/11/2000', '2000-12-11'],      // both ≤ 12 → US order (MM/DD): December 11
    ['25/12/1980', '1980-12-25'],      // day > 12 → day first regardless of order
    ['7 March 1971', '1971-03-07'],
    ['7th March 1971', '1971-03-07'],
    ['March 7, 1971', '1971-03-07'],
    ['March 7th 1971', '1971-03-07'],
    ['Sept 7 1971', '1971-09-07'],
    ['  1971-03-07  ', '1971-03-07'],
    ['2013-09-13', '2013-09-13'],      // exactly 13 today
  ];
  it.each(good)('accepts %s → %s', (raw, iso) => {
    expect(parseDateOfBirth(raw, now)).toEqual({ ok: true, iso });
  });

  const bad: Array<[string | null, string]> = [
    [null, 'missing'],
    ['', 'missing'],
    ['   ', 'missing'],
    ['31/02/1970', 'not_a_date'],
    ['1971-02-30', 'not_a_date'],
    ['13/13/1971', 'not_a_date'],
    ['2030-01-01', 'in_future'],
    ['2026-09-14', 'in_future'],
    ['2013-09-14', 'too_young'],       // 13 tomorrow
    ['2020-01-01', 'too_young'],
    ['1900-01-01', 'too_old'],
    ['7 March 71', 'unparseable'],     // two-digit year
    ['03/07/71', 'unparseable'],
    ['7 Marzo 1971', 'unparseable'],
    ['seventh of march', 'unparseable'],
    ['1971', 'unparseable'],
    ['07-03', 'unparseable'],
  ];
  it.each(bad)('refuses %s as %s', (raw, reason) => {
    expect(parseDateOfBirth(raw, now)).toEqual({ ok: false, reason });
  });
});

describe('readBe08CustomFields', () => {
  it('reads the three exact keys and trims', () => {
    const fields = readBe08CustomFields({
      custom_fields: [
        { key: 'display_first_name', type: 'text', text: { value: '  Sarah ' } },
        { key: 'full_birth_name', type: 'text', text: { value: 'Sarah   Jane Smith' } },
        { key: 'date_of_birth', type: 'text', text: { value: '25/03/1971' } },
      ],
    } as never);
    expect(fields).toEqual({ displayFirstName: 'Sarah', fullBirthName: 'Sarah Jane Smith', dateOfBirthRaw: '25/03/1971' });
  });

  it('never throws — missing array, missing keys, empty values all read as null', () => {
    expect(readBe08CustomFields({} as never)).toEqual({ displayFirstName: null, fullBirthName: null, dateOfBirthRaw: null });
    expect(readBe08CustomFields({ custom_fields: [{ key: 'full_birth_name', type: 'text', text: { value: '   ' } }] } as never).fullBirthName).toBeNull();
    expect(readBe08CustomFields({ custom_fields: [{ key: 'other', type: 'text', text: { value: 'x' } }] } as never).displayFirstName).toBeNull();
  });
});

describe('splitBirthName', () => {
  it('splits on the LAST space so a two-word first name survives', () => {
    expect(splitBirthName('Mary Anne Smith')).toEqual({ first: 'Mary Anne', last: 'Smith' });
    expect(splitBirthName('  Sarah   Smith ')).toEqual({ first: 'Sarah', last: 'Smith' });
  });
  it('returns null when there is no last name', () => {
    expect(splitBirthName('Cher')).toBeNull();
    expect(splitBirthName('')).toBeNull();
    expect(splitBirthName(null)).toBeNull();
  });
});
