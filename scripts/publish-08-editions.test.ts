// 08 · The publish plan, computed without a database.
//
//   npx vitest run scripts/publish-08-editions.test.ts
//
// What these pin down:
//  1. On the REAL files (editions.json + launch-selection-2026-09-14.json + its sibling batch
//     configs) the plan is 12 published / 6 retired, and the five superseded ids plus the local
//     draft are the six retired.
//  2. A selection slug resolves through the batch configs, not the record's `slug` field
//     (`what-part-of-me-needs-healing-v2` → healing-v2, whose slug is shared with healing-v1).
//  3. A selection slug with no record → throws, naming the slug. An ambiguous one → throws.
//  4. --no-selection (selection = null) → every local status passes through, draft included.
//  5. The edition written carries the publish status (record.status agrees with the column).

import { describe, expect, it } from 'vitest';
import type { Be08Edition } from '../server/lib/be08Editions';
import {
  DEFAULT_SELECTION,
  SOURCE,
  buildSourceMap,
  formatPlan,
  loadEditions,
  loadSelection,
  planPublish,
  resolveSourceSlug,
} from './publish-08-editions.lib';

const real = () => ({ editions: loadEditions(SOURCE).editions, selection: loadSelection(DEFAULT_SELECTION) });

function fakeEdition(id: string, version: number, slug: string, status: Be08Edition['status']): Be08Edition {
  return {
    id, version, slug, status,
    question: `Q ${slug}`, theme: 't', spread: { id: 's', name: 'S', version: 1 }, positions: [], freeEmailText: 'x',
  };
}

describe('planPublish on the real files', () => {
  it('splits 18 records into 12 published / 6 retired', () => {
    const { editions, selection } = real();
    expect(editions).toHaveLength(18);
    expect(selection.sourceSlugs).toHaveLength(12);
    const plan = planPublish(editions, selection);
    expect(plan.passThrough).toBe(false);
    expect(plan.counts).toEqual({ published: 12, retired: 6, draft: 0 });
  });

  it('retires exactly the five superseded ids and the local draft', () => {
    const { editions, selection } = real();
    const plan = planPublish(editions, selection);
    const retired = plan.rows.filter((r) => r.publishStatus === 'retired').map((r) => `${r.id}@${r.version}`).sort();
    expect(retired).toEqual([
      'blind-spots-v1@1', 'commitment-v1@1', 'healing-v1@1', 'higher-calling-v1@1', 'higher-calling-v2@2', 'quiet-v1@1',
    ]);
    const draft = plan.rows.find((r) => r.id === 'higher-calling-v2');
    expect(draft?.localStatus).toBe('draft');
    expect(draft?.publishStatus).toBe('retired');
  });

  it('publishes the rewrites, each selected by its letter source slug', () => {
    const { editions, selection } = real();
    const plan = planPublish(editions, selection);
    const by = Object.fromEntries(plan.rows.filter((r) => r.selectedBy).map((r) => [r.id, r.selectedBy]));
    expect(by['healing-v2']).toBe('what-part-of-me-needs-healing-v2');
    expect(by['commitment-v2']).toBe('why-wont-he-commit-v2');
    expect(by['higher-calling-v3']).toBe('what-is-my-higher-calling-v3');
    expect(by['quiet-v2']).toBe('why-they-go-quiet-v2');
    expect(by['blind-spots-v2']).toBe('what-are-my-blind-spots-v2');
    expect(by['is-it-time-for-a-new-chapter-v1']).toBe('is-it-time-for-a-new-chapter');
    expect(Object.keys(by)).toHaveLength(12);
  });

  it('the edition to be written carries the publish status, everything else verbatim', () => {
    const { editions, selection } = real();
    const plan = planPublish(editions, selection);
    const old = plan.rows.find((r) => r.id === 'healing-v1')!;
    const src = editions.find((e) => e.id === 'healing-v1')!;
    expect(src.status).toBe('published');
    expect(old.edition.status).toBe('retired');
    expect({ ...old.edition, status: src.status }).toEqual(src);
    const kept = plan.rows.find((r) => r.id === 'healing-v2')!;
    expect(kept.edition).toBe(editions.find((e) => e.id === 'healing-v2')); // untouched object
  });

  it('formatPlan prints one line per record plus the counts', () => {
    const { editions, selection } = real();
    const text = formatPlan(planPublish(editions, selection));
    expect(text).toContain('healing-v1');
    expect(text).toMatch(/published\s+→ retired/);
    expect(text).toContain('18 record(s): 12 published, 6 retired, 0 draft');
  });
});

describe('planPublish errors', () => {
  it('a selection slug with no record names the miss', () => {
    const { editions, selection } = real();
    const bad = { ...selection, sourceSlugs: [...selection.sourceSlugs, 'the-risk-i-wont-regret'] };
    expect(() => planPublish(editions, bad)).toThrow(/"the-risk-i-wont-regret" matches no record/);
  });

  it('a mapped slug whose (id, version) is missing from editions.json names both', () => {
    const { editions, selection } = real();
    const map = new Map(selection.sourceMap);
    map.set('ghost-letter', { id: 'ghost-v9', version: 9 });
    expect(() => planPublish(editions, { sourceSlugs: ['ghost-letter'], sourceMap: map })).toThrow(/"ghost-letter" maps to ghost-v9@9 .* no such record/);
  });

  it('a record slug shared by two versions is ambiguous without a batch config', () => {
    const { editions } = real();
    expect(() => planPublish(editions, { sourceSlugs: ['why-they-go-quiet'], sourceMap: new Map() })).toThrow(/ambiguous: quiet-v1@1, quiet-v2@2/);
  });

  it('two selection slugs landing on one record is an error', () => {
    const records = [fakeEdition('a-v1', 1, 'a', 'published')];
    const map = new Map([['letter-a', { id: 'a-v1', version: 1 }]]);
    expect(() => planPublish(records, { sourceSlugs: ['letter-a', 'a-v1'], sourceMap: map })).toThrow(/both resolve to a-v1@1/);
  });

  it('an empty selection refuses rather than retiring everything', () => {
    const records = [fakeEdition('a-v1', 1, 'a', 'published')];
    expect(() => planPublish(records, { sourceSlugs: [], sourceMap: new Map() })).toThrow(/refusing to retire everything/);
  });

  it('duplicate (id, version) in the records is fatal', () => {
    const records = [fakeEdition('a-v1', 1, 'a', 'published'), fakeEdition('a-v1', 1, 'a', 'draft')];
    expect(() => planPublish(records, null)).toThrow(/duplicate edition a-v1@1/);
  });

  it('nothing in the throwing paths touches the real files: the real plan still validates after', () => {
    const { editions, selection } = real();
    expect(planPublish(editions, selection).counts.published).toBe(12);
  });
});

describe('--no-selection pass-through', () => {
  it('keeps every local status, draft included', () => {
    const { editions } = real();
    const plan = planPublish(editions, null);
    expect(plan.passThrough).toBe(true);
    expect(plan.counts).toEqual({ published: 17, retired: 0, draft: 1 });
    for (const row of plan.rows) {
      expect(row.publishStatus).toBe(row.localStatus);
      expect(row.selectedBy).toBeNull();
    }
  });
});

describe('resolveSourceSlug / buildSourceMap', () => {
  const records = [
    fakeEdition('healing-v1', 1, 'what-part-of-me-needs-healing', 'published'),
    fakeEdition('healing-v2', 2, 'what-part-of-me-needs-healing', 'published'),
    fakeEdition('solo-v1', 1, 'solo-question', 'published'),
  ];

  it('prefers the batch-config map over a record slug match', () => {
    const map = buildSourceMap([{ 'what-part-of-me-needs-healing-v2': { funnel: { id: 'healing-v2', version: 2 } } }]);
    expect(resolveSourceSlug('what-part-of-me-needs-healing-v2', records, map).id).toBe('healing-v2');
  });

  it('falls back to a UNIQUE record slug, then a UNIQUE record id', () => {
    expect(resolveSourceSlug('solo-question', records, new Map()).id).toBe('solo-v1');
    expect(resolveSourceSlug('healing-v2', records, new Map()).version).toBe(2);
  });

  it('buildSourceMap skips non-edition entries and rejects a slug mapped two ways', () => {
    expect(buildSourceMap([{ notes: {} } as never]).size).toBe(0);
    expect(() => buildSourceMap([
      { x: { funnel: { id: 'a', version: 1 } } },
      { x: { funnel: { id: 'b', version: 1 } } },
    ])).toThrow(/"x" maps to both a@1 and b@1/);
  });

  it('the real edition-configs map all 12 launch slugs', () => {
    const { selection } = real();
    for (const slug of selection.sourceSlugs) expect(selection.sourceMap.has(slug), slug).toBe(true);
  });
});
