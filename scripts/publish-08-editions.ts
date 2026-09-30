/**
 * 08 · Publish Marcus's editions from the local editions.json into `be_08_editions`.
 *
 *   npx tsx scripts/publish-08-editions.ts --check                       # plan + diff, writes NOTHING (default)
 *   npx tsx scripts/publish-08-editions.ts --check --selection <path>    # a different launch selection
 *   BE_08_ALLOW_PUBLISH=1 npx tsx scripts/publish-08-editions.ts --apply
 *
 * Reads DATABASE_URL from the environment, so it can be pointed at a disposable Supabase
 * branch:  DATABASE_URL='postgresql://…branch…' BE_08_ALLOW_PUBLISH=1 npx tsx … --apply
 *
 * 🔴 --apply REFUSES to run without BE_08_ALLOW_PUBLISH=1. Dev and production share ONE
 *    database; the flag is the moment you say out loud which one you are pointing at.
 *
 * WHAT GETS WHICH STATUS (see publish-08-editions.lib.ts for the rules):
 *   editions.json is the LOCAL simulator's fixture — it keeps superseded editions (healing-v1
 *   next to healing-v2, …) marked `published` for simulator continuity. Production must not
 *   sell those. So the status the file carries is NOT what gets published:
 *     • every record named by the launch selection      → published
 *     • every other record (local published OR draft)   → retired
 *   The default selection is docs/08-marcus/daily-email/edition-configs/launch-selection-2026-09-14.json
 *   (`sourceSlugs[]` — letter source slugs, resolved to (id, version) through the sibling
 *   edition-config batch files). Every selection slug must resolve to exactly one record or
 *   the run stops before touching the database.
 *   --no-selection restores the old pass-through behaviour (file statuses as-is). Loud warning.
 *
 * A retired row is deliberately kept, not deleted: be_orders pins (edition_id, edition_version)
 * and getBe08Edition(id, version) ignores status when a version is given, so a paid order for a
 * since-retired edition still resolves. Only the bare-id lookup and the booking list filter on
 * `published`.
 *
 * Upserts on (id, version) in ONE transaction — a half-run can never leave an old id published
 * while its rewrite is absent. `record` is the edition object verbatim (status overridden to
 * the publish status, so record.status and the status column agree); the typed columns (slug,
 * question, status) are copied from it. A row that already matches is reported as `same` and
 * not rewritten. ⛔ Never edits editions.json — the local app owns it. Every edition is
 * validated against the production deck before anything is written; one bad edition fails the
 * whole run.
 */
import { resolve } from 'node:path';
import pg from 'pg';
import { BE_08_DECK, validateEdition } from '../server/lib/be08Draw';
import type { Be08Edition } from '../server/lib/be08Editions';
import {
  DEFAULT_SELECTION,
  SOURCE,
  formatPlan,
  keyOf,
  loadEditions,
  loadSelection,
  planPublish,
  type Be08Plan,
} from './publish-08-editions.lib';

/** Key-sorted JSON, so a record read back from jsonb (which reorders keys) compares equal. */
function canon(value: unknown): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sort)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])]))
        : v;
  return JSON.stringify(sort(value));
}

interface Args { apply: boolean; noSelection: boolean; selectionPath: string }

function parseArgs(argv: string[]): Args {
  const args = [...argv];
  let apply = false;
  let check = false;
  let noSelection = false;
  let selectionPath = DEFAULT_SELECTION;
  while (args.length) {
    const a = args.shift() as string;
    if (a === '--apply') apply = true;
    else if (a === '--check') check = true;
    else if (a === '--no-selection') noSelection = true;
    else if (a === '--selection') {
      const p = args.shift();
      if (!p || p.startsWith('--')) throw new Error('--selection needs a path');
      selectionPath = resolve(p);
    } else if (a.startsWith('--selection=')) selectionPath = resolve(a.slice('--selection='.length));
    else throw new Error(`unknown argument ${a}`);
  }
  if (apply && check) throw new Error('Pass --check OR --apply, not both.');
  if (noSelection && selectionPath !== DEFAULT_SELECTION) throw new Error('Pass --selection OR --no-selection, not both.');
  return { apply, noSelection, selectionPath };
}

function main(): Promise<number> {
  return run().catch((err) => {
    console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  });
}

async function run(): Promise<number> {
  const { apply, noSelection, selectionPath } = parseArgs(process.argv.slice(2));
  if (apply && process.env.BE_08_ALLOW_PUBLISH !== '1') {
    throw new Error('--apply refused: set BE_08_ALLOW_PUBLISH=1 to confirm which database DATABASE_URL points at.');
  }
  if (apply && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');

  const { scope, editions } = loadEditions();
  console.log(`source: ${SOURCE}`);
  console.log(`scope: ${scope ?? '(none)'} · ${editions.length} edition(s) · mode: ${apply ? 'APPLY' : 'check'}`);

  // Validate every edition first — one bad edition fails the whole run, nothing written.
  // (planPublish rejects duplicate (id, version) itself.)
  for (const edition of editions) validateEdition(edition, BE_08_DECK);

  // ── the plan: which status each (id, version) is published with ──────────────────────────
  let plan: Be08Plan;
  if (noSelection) {
    console.warn('');
    console.warn('⚠️  ⚠️  ⚠️  --no-selection: publishing EVERY record with the status editions.json carries.');
    console.warn('⚠️  editions.json keeps superseded editions marked `published` for the local simulator —');
    console.warn('⚠️  with this flag those go ON SALE in production next to their rewrites. Be sure.');
    console.warn('');
    plan = planPublish(editions, null);
  } else {
    const selection = loadSelection(selectionPath);
    console.log(`selection: ${selectionPath} · ${selection.sourceSlugs.length} source slug(s) · ${selection.sourceMap.size} mapped in edition-configs`);
    plan = planPublish(editions, selection); // throws, before any DB work, on a slug that resolves to ≠ 1 record
  }
  console.log('plan:');
  console.log(formatPlan(plan));

  // ── the diff against the database (read-only), then the write (one transaction) ─────────
  if (!process.env.DATABASE_URL) {
    console.log('(DATABASE_URL not set — plan shown, diff against the database skipped)');
    return 0;
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    const host = new URL(process.env.DATABASE_URL).hostname;
    console.log(`database host: ${host}`);
    const existing = await pool.query<{ id: string; version: number; status: string; record: unknown }>(
      'SELECT id, version, status, record FROM be_08_editions',
    );
    const current = new Map(existing.rows.map((r) => [`${r.id}@${r.version}`, { status: r.status, record: canon(r.record) }]));

    type Verdict = 'insert' | 'update' | 'same';
    const work: Array<{ verdict: Verdict; edition: Be08Edition; was: string | undefined }> = [];
    for (const row of plan.rows) {
      const was = current.get(keyOf(row));
      const verdict: Verdict =
        was === undefined ? 'insert'
          : was.record === canon(row.edition) && was.status === row.publishStatus ? 'same'
            : 'update';
      work.push({ verdict, edition: row.edition, was: was?.status });
    }
    console.log('diff:');
    for (const { verdict, edition, was } of work) {
      const change = was === undefined ? `(new) → ${edition.status}` : was === edition.status ? edition.status : `${was} → ${edition.status}`;
      console.log(`  ${verdict.padEnd(6)} ${keyOf(edition).padEnd(40)} ${change.padEnd(22)} ${edition.slug}`);
    }
    const inserts = work.filter((w) => w.verdict === 'insert').length;
    const updates = work.filter((w) => w.verdict === 'update').length;
    const same = work.filter((w) => w.verdict === 'same').length;
    const planned = new Set(plan.rows.map(keyOf));
    const inDbOnly = [...current.keys()].filter((k) => !planned.has(k));
    if (inDbOnly.length) console.log(`  (in the database but not in editions.json, left alone: ${inDbOnly.join(', ')})`);

    if (!apply) {
      console.log(`would apply: ${inserts} insert, ${updates} update, ${same} same`);
      return 0;
    }

    // ONE transaction: every insert/update commits together or not at all. A crash halfway
    // can't leave healing-v1 published while healing-v2 is still absent.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { verdict, edition } of work) {
        if (verdict === 'same') continue;
        await client.query(
          `INSERT INTO be_08_editions (id, version, slug, question, status, record)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)
           ON CONFLICT (id, version) DO UPDATE
             SET slug = EXCLUDED.slug, question = EXCLUDED.question, status = EXCLUDED.status,
                 record = EXCLUDED.record, updated_at = now()`,
          [edition.id, edition.version, edition.slug, edition.question, edition.status, JSON.stringify(edition)],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
    console.log(`applied: ${inserts} insert, ${updates} update, ${same} same (one transaction)`);
    return 0;
  } finally {
    await pool.end();
  }
}

main().then((code) => process.exit(code));
