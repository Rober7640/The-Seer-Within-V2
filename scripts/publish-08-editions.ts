/**
 * 08 · Publish Marcus's editions from the local editions.json into `be_08_editions`.
 *
 *   npx tsx scripts/publish-08-editions.ts --check     # diff only, writes NOTHING (default)
 *   BE_08_ALLOW_PUBLISH=1 npx tsx scripts/publish-08-editions.ts --apply
 *
 * Reads DATABASE_URL from the environment, so it can be pointed at a disposable Supabase
 * branch:  DATABASE_URL='postgresql://…branch…' BE_08_ALLOW_PUBLISH=1 npx tsx … --apply
 *
 * 🔴 --apply REFUSES to run without BE_08_ALLOW_PUBLISH=1. Dev and production share ONE
 *    database; the flag is the moment you say out loud which one you are pointing at.
 *
 * Upserts on (id, version). `record` is the edition object verbatim; the typed columns
 * (slug, question, status) are copied from it. A row whose record already matches is
 * reported as `same` and not rewritten. ⛔ Never edits editions.json — the local app owns it.
 * Every edition is validated against the production deck before anything is written; one
 * bad edition fails the whole run.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { BE_08_DECK, validateEdition } from '../server/lib/be08Draw';
import type { Be08Edition } from '../server/lib/be08Editions';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Key-sorted JSON, so a record read back from jsonb (which reorders keys) compares equal. */
function canon(value: unknown): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sort)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])]))
        : v;
  return JSON.stringify(sort(value));
}
const SOURCE = resolve(HERE, '../improve-v1/v1-one-time-BEs/local/08-marcus/editions.json');

function main(): Promise<number> {
  return run().catch((err) => {
    console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  });
}

async function run(): Promise<number> {
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply');
  if (apply && args.has('--check')) throw new Error('Pass --check OR --apply, not both.');
  if (apply && process.env.BE_08_ALLOW_PUBLISH !== '1') {
    throw new Error('--apply refused: set BE_08_ALLOW_PUBLISH=1 to confirm which database DATABASE_URL points at.');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');

  const file = JSON.parse(readFileSync(SOURCE, 'utf8')) as {
    schemaVersion?: number;
    publicationScope?: string;
    editions: Be08Edition[];
  };
  if (!Array.isArray(file.editions) || !file.editions.length) throw new Error('editions.json has no editions[].');
  console.log(`source: ${SOURCE}`);
  console.log(`scope: ${file.publicationScope ?? '(none)'} · ${file.editions.length} edition(s) · mode: ${apply ? 'APPLY' : 'check'}`);

  // Validate every edition first — one bad edition fails the whole run, nothing written.
  const seen = new Set<string>();
  for (const edition of file.editions) {
    const key = `${edition.id}@${edition.version}`;
    if (seen.has(key)) throw new Error(`duplicate edition ${key} in editions.json`);
    seen.add(key);
    validateEdition(edition, BE_08_DECK);
    if (!['published', 'draft', 'retired'].includes(edition.status)) throw new Error(`${key}: bad status ${edition.status}`);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    const host = new URL(process.env.DATABASE_URL).hostname;
    console.log(`database host: ${host}`);
    const existing = await pool.query<{ id: string; version: number; record: unknown }>(
      'SELECT id, version, record FROM be_08_editions',
    );
    const current = new Map(existing.rows.map((r) => [`${r.id}@${r.version}`, canon(r.record)]));

    let inserts = 0;
    let updates = 0;
    let same = 0;
    for (const edition of file.editions) {
      const key = `${edition.id}@${edition.version}`;
      const next = JSON.stringify(edition);
      const was = current.get(key);
      const verdict = was === undefined ? 'insert' : was === canon(edition) ? 'same' : 'update';
      if (verdict === 'insert') inserts++;
      else if (verdict === 'update') updates++;
      else same++;
      console.log(`  ${verdict.padEnd(6)} ${key.padEnd(24)} ${edition.status.padEnd(9)} ${edition.slug}`);
      if (!apply || verdict === 'same') continue;
      await pool.query(
        `INSERT INTO be_08_editions (id, version, slug, question, status, record)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (id, version) DO UPDATE
           SET slug = EXCLUDED.slug, question = EXCLUDED.question, status = EXCLUDED.status,
               record = EXCLUDED.record, updated_at = now()`,
        [edition.id, edition.version, edition.slug, edition.question, edition.status, next],
      );
    }
    const inDbOnly = [...current.keys()].filter((k) => !seen.has(k));
    if (inDbOnly.length) console.log(`  (in the database but not in editions.json, left alone: ${inDbOnly.join(', ')})`);
    console.log(`${apply ? 'applied' : 'would apply'}: ${inserts} insert, ${updates} update, ${same} same`);
    return 0;
  } finally {
    await pool.end();
  }
}

main().then((code) => process.exit(code));
