/**
 * 08 · The publish PLAN — pure, no database. scripts/publish-08-editions.ts wraps it.
 *
 *   plan = planPublish(records, selection)         → what each (id, version) will be published AS
 *   plan = planPublish(records, null)              → --no-selection: local statuses pass through
 *
 * Why a selection at all: editions.json is the LOCAL simulator's fixture. It keeps superseded
 * editions (healing-v1 next to healing-v2, …) marked `published` so the local app keeps working.
 * Production must not sell those. The launch set is the explicit list in
 * docs/08-marcus/daily-email/edition-configs/launch-selection-*.json → `sourceSlugs[]`.
 *
 * ⚠️ A `sourceSlug` is the LETTER's slug (the key in the edition-config batch files and the
 *    LETTERS dict of build-08-daily.py), e.g. `what-part-of-me-needs-healing-v2`. It is NOT the
 *    edition record's `slug` field — that one is the URL question slug and is SHARED across
 *    versions (`healing-v1` and `healing-v2` both carry `what-part-of-me-needs-healing`). So a
 *    source slug resolves through the batch configs (`{ [sourceSlug]: { funnel: { id, version } } }`)
 *    first, and only falls back to a record's `slug`/`id` when that names exactly ONE record.
 *
 * Statuses in the plan:
 *   selected                       → 'published'
 *   not selected (local published) → 'retired'   the row stays, so a paid order pinned to
 *                                                 (id, version) still resolves — see
 *                                                 getBe08Edition(id, version) in
 *                                                 server/lib/be08Editions.ts, which ignores
 *                                                 status when a version is given.
 *   not selected (local draft)     → 'retired'   draft means "not for sale" either way; in
 *                                                 production a row that exists but is not for
 *                                                 sale is `retired`, whatever the local app
 *                                                 called it. (The local sim only knows
 *                                                 draft|published; production knows retired.)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Be08Edition } from '../server/lib/be08Editions';

const HERE = dirname(fileURLToPath(import.meta.url));
const BE_DIR = resolve(HERE, '../improve-v1/v1-one-time-BEs');
/** The local simulator's fixture. ⛔ Read-only from here — the local app owns it. */
export const SOURCE = resolve(BE_DIR, 'local/08-marcus/editions.json');
/** The explicit launch set. */
export const DEFAULT_SELECTION = resolve(BE_DIR, 'docs/08-marcus/daily-email/edition-configs/launch-selection-2026-09-14.json');

export type Be08Status = Be08Edition['status'];

/** One edition-config batch file: `{ [sourceSlug]: { funnel: { id, version, … }, … } }`. */
export type Be08BatchConfig = Record<string, { funnel?: { id?: unknown; version?: unknown } }>;

export interface Be08Selection {
  /** Letter source slugs, from launch-selection-*.json `sourceSlugs[]`. */
  sourceSlugs: string[];
  /** sourceSlug → the edition it was authored for, merged from the batch config files. */
  sourceMap: Map<string, { id: string; version: number }>;
}

export interface Be08PlanRow {
  id: string;
  version: number;
  slug: string;
  localStatus: Be08Status;
  publishStatus: Be08Status;
  /** The source slug that selected it, or null when retired / passed through. */
  selectedBy: string | null;
  /** The edition as it will be written: the record verbatim, with `status` = publishStatus. */
  edition: Be08Edition;
}

export interface Be08Plan {
  rows: Be08PlanRow[];
  counts: { published: number; retired: number; draft: number };
  /** True when no selection was applied (--no-selection). */
  passThrough: boolean;
}

export const keyOf = (e: { id: string; version: number }): string => `${e.id}@${e.version}`;

/** Merge batch config files into sourceSlug → (id, version). A slug in two files is an error. */
export function buildSourceMap(batches: Be08BatchConfig[]): Map<string, { id: string; version: number }> {
  const map = new Map<string, { id: string; version: number }>();
  for (const batch of batches) {
    for (const [sourceSlug, config] of Object.entries(batch)) {
      const id = config?.funnel?.id;
      const version = config?.funnel?.version;
      if (typeof id !== 'string' || !Number.isSafeInteger(version)) continue; // not an edition entry
      const prior = map.get(sourceSlug);
      if (prior && (prior.id !== id || prior.version !== version)) {
        throw new Error(`source slug "${sourceSlug}" maps to both ${keyOf(prior)} and ${id}@${version as number}`);
      }
      map.set(sourceSlug, { id, version: version as number });
    }
  }
  return map;
}

/**
 * Resolve one source slug to exactly one record. Order: the batch config map, then a record
 * whose `slug` equals it, then a record whose `id` equals it. Every candidate found must be the
 * same (id, version); zero → "no record"; several → "ambiguous", both fatal.
 */
export function resolveSourceSlug(
  sourceSlug: string,
  records: readonly Be08Edition[],
  sourceMap: Be08Selection['sourceMap'],
): Be08Edition {
  const candidates = new Map<string, Be08Edition>();
  const mapped = sourceMap.get(sourceSlug);
  if (mapped) {
    const hit = records.find((r) => r.id === mapped.id && r.version === mapped.version);
    if (!hit) {
      throw new Error(
        `selection slug "${sourceSlug}" maps to ${keyOf(mapped)} (edition-configs) but editions.json has no such record`,
      );
    }
    candidates.set(keyOf(hit), hit);
  } else {
    for (const r of records) if (r.slug === sourceSlug || r.id === sourceSlug) candidates.set(keyOf(r), r);
  }
  if (candidates.size === 0) {
    throw new Error(`selection slug "${sourceSlug}" matches no record in editions.json (not in edition-configs, no record slug or id equals it)`);
  }
  if (candidates.size > 1) {
    throw new Error(
      `selection slug "${sourceSlug}" is ambiguous: ${[...candidates.keys()].join(', ')} all carry it — name it in an edition-config batch file`,
    );
  }
  return [...candidates.values()][0];
}

/**
 * Compute the plan. `selection === null` is --no-selection: every record keeps its local status.
 * Throws (nothing partial) on: duplicate (id, version), a selection slug that matches no record
 * or more than one, or two selection slugs landing on the same record.
 */
export function planPublish(records: readonly Be08Edition[], selection: Be08Selection | null): Be08Plan {
  const seen = new Set<string>();
  for (const r of records) {
    const key = keyOf(r);
    if (seen.has(key)) throw new Error(`duplicate edition ${key} in editions.json`);
    seen.add(key);
  }

  const selectedBy = new Map<string, string>(); // key → sourceSlug
  if (selection) {
    if (!selection.sourceSlugs.length) throw new Error('selection has no sourceSlugs[] — refusing to retire everything');
    for (const sourceSlug of selection.sourceSlugs) {
      const hit = resolveSourceSlug(sourceSlug, records, selection.sourceMap);
      const key = keyOf(hit);
      const prior = selectedBy.get(key);
      if (prior && prior !== sourceSlug) throw new Error(`selection slugs "${prior}" and "${sourceSlug}" both resolve to ${key}`);
      selectedBy.set(key, sourceSlug);
    }
  }

  const rows: Be08PlanRow[] = records.map((r) => {
    const key = keyOf(r);
    const by = selectedBy.get(key) ?? null;
    const publishStatus: Be08Status = selection ? (by ? 'published' : 'retired') : r.status;
    return {
      id: r.id,
      version: r.version,
      slug: r.slug,
      localStatus: r.status,
      publishStatus,
      selectedBy: by,
      edition: publishStatus === r.status ? r : { ...r, status: publishStatus },
    };
  });

  const counts = { published: 0, retired: 0, draft: 0 };
  for (const row of rows) counts[row.publishStatus]++;
  return { rows, counts, passThrough: selection === null };
}

/** The --check table: id · version · local status → publish status. */
export function formatPlan(plan: Be08Plan): string {
  const idW = Math.max(2, ...plan.rows.map((r) => r.id.length));
  const lines = [
    `  ${'id'.padEnd(idW)}  ver  local      → publish    selected by`,
    `  ${'-'.repeat(idW)}  ---  ---------    ---------  -----------`,
    ...plan.rows.map(
      (r) =>
        `  ${r.id.padEnd(idW)}  ${String(r.version).padStart(3)}  ${r.localStatus.padEnd(9)}  → ${r.publishStatus.padEnd(9)}  ${r.selectedBy ?? (plan.passThrough ? '(pass-through)' : '—')}`,
    ),
    `  ${plan.rows.length} record(s): ${plan.counts.published} published, ${plan.counts.retired} retired, ${plan.counts.draft} draft`,
  ];
  return lines.join('\n');
}

// ─── loaders (files only, no database) ──────────────────────────────────────────────────

export function loadEditions(path: string = SOURCE): { scope: string | undefined; editions: Be08Edition[] } {
  const file = JSON.parse(readFileSync(path, 'utf8')) as {
    schemaVersion?: number;
    publicationScope?: string;
    editions: Be08Edition[];
  };
  if (!Array.isArray(file.editions) || !file.editions.length) throw new Error(`${path} has no editions[].`);
  return { scope: file.publicationScope, editions: file.editions };
}

/**
 * Load a launch selection. `sourceSlugs[]` come from the file; the sourceSlug → (id, version)
 * map is merged from every *.json (other than the selection itself) in the canonical
 * edition-configs directory AND in the selection file's own directory, whichever have the
 * batch-config shape (`{ [sourceSlug]: { funnel: { id, version } } }`). Files without that
 * shape contribute nothing, so a --selection file kept elsewhere still resolves.
 */
export function loadSelection(path: string = DEFAULT_SELECTION): Be08Selection {
  const file = JSON.parse(readFileSync(path, 'utf8')) as { sourceSlugs?: unknown };
  if (!Array.isArray(file.sourceSlugs) || !file.sourceSlugs.every((s) => typeof s === 'string' && s.length)) {
    throw new Error(`${path}: sourceSlugs[] must be a non-empty list of strings`);
  }
  const self = resolve(path);
  const dirs = [...new Set([dirname(DEFAULT_SELECTION), dirname(self)])];
  const batches: Be08BatchConfig[] = dirs
    .flatMap((dir) => readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => resolve(dir, f)))
    .filter((full) => full !== self)
    .map((full) => JSON.parse(readFileSync(full, 'utf8')) as unknown)
    .filter((j): j is Be08BatchConfig => !!j && typeof j === 'object' && !Array.isArray(j));
  return { sourceSlugs: file.sourceSlugs as string[], sourceMap: buildSourceMap(batches) };
}
