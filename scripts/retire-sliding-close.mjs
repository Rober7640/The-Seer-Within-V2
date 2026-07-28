// Retire the $55/$35 sliding close on fb-palm — park `55-35_palm` at weight 0 so
// every palm visitor draws the $35 control, and nobody is shown $55 any more.
//
// ── WHY THIS IS NOW A ONE-FIELD CHANGE ───────────────────────────────────────
// An earlier draft of this script ALSO appended a `35_palm_gate` price-pool arm
// at weight 30, because the commitment gate was originally built as a price
// variant. It isn't any more: the gate is an EXPERIMENT
// (`v1_palm_commitment_gate_2026`, server/lib/experiments.ts) assigned on a hash
// of the email, and started from /admin/experiments.
//
// The reason is measurement, not tidiness. A pool arm can only ever be drawn for
// an email with NO stored variant (assignVariantIfMissing returns early once one
// exists), so every returning visitor would have kept the incumbent control id.
// On live fb-palm those returning visitors are 23% of sessions but 57% of main
// buys, converting 4.4x better (14.5% vs 3.3%) — a pool-based gate would have
// been measured against a control inflated with all of them, and would have
// looked roughly 2x worse than neutral before showing a single checkbox.
//
// So the pool change and the test are now fully independent:
//   THIS script        → retires $55. Nothing else. Reversible in 60s.
//   /admin/experiments → starts/stops the gate test. Reversible instantly.
//
// ── SAFETY (unchanged, modelled on scripts/apply-90-10.mjs) ──────────────────
//  1. DRY RUN BY DEFAULT. Prints the planned diff and writes nothing. Only
//     `RETIRE_SLIDING_CLOSE=1 … --live` writes.
//  2. SNAPSHOT FIRST — the current config_value is written to
//     improve-v1/ROLLBACK-config-before-retire-sliding-<date>.json. Abort if it
//     can't be written.
//  3. TARGETED jsonb EDIT, not a retyped blob. Only ONE `weight` field changes.
//     Every existing price key is carried across by Postgres, untouched and
//     untypeable. (Hand-retyping the whole row is what once introduced
//     `"down  sellCents"` and silently killed the root $45 test for two weeks.)
//  4. VERIFY INSIDE THE TRANSACTION, COMMIT ONLY IF CLEAN. After the UPDATE we
//     re-read and assert that EXACTLY one weight moved and NOTHING else did —
//     no dropped variant, no altered price, no mangled key. Any discrepancy ⇒
//     ROLLBACK.
//  5. updated_at = now() so the analysis window is anchorable. This ENDS the
//     sliding-close window — never read across the boundary.
//  6. Session pooler (:5432) forced. The :6543 transaction pooler serves an empty
//     search_path and 42P01s on every table (2026-07-10 prod outage).
//
// Usage:
//   node scripts/retire-sliding-close.mjs                              # dry run
//   RETIRE_SLIDING_CLOSE=1 node scripts/retire-sliding-close.mjs --live
//
// ROLLBACK: set `55-35_palm` weight back to 1, or restore the snapshot file.
import 'dotenv/config';
import pg from 'pg';
import fs from 'node:fs';

const LIVE = process.argv.includes('--live');
const KEY = 'v1_price_variants';
const CONTROL = '35_palm_u47';
const SLIDING = '55-35_palm';

// What we expect to FIND (guards against running twice, or against a pool someone
// else already changed) and what we SET.
const EXPECT_BEFORE = { control: 9, sliding: 1 }; // the live 90/10 as of 2026-07-22
const TO = { sliding: 0 };

if (LIVE && process.env.RETIRE_SLIDING_CLOSE !== '1') {
  console.error(`\n🔴 REFUSING to write without explicit confirmation.`);
  console.error(`   To apply:  RETIRE_SLIDING_CLOSE=1 node scripts/retire-sliding-close.mjs --live\n`);
  process.exit(2);
}

const raw = process.env.DATABASE_URL;
if (!raw) { console.error('No DATABASE_URL'); process.exit(2); }
// Force the SESSION pooler — :6543 serves an empty search_path (2026-07-10 outage).
const url = raw.replace(':6543/', ':5432/');
const pool = new pg.Pool({ connectionString: url, max: 2, statement_timeout: 30000 });

const host = (url.match(/@([^/:]+)/) || [])[1] || '?';
console.log(`\n  target: ${host.slice(0, 10)}…${host.slice(-12)}  port=${(url.match(/:(\d+)\//) || [])[1]}`);
console.log(`  mode  : ${LIVE ? '🔴 LIVE WRITE' : '✅ DRY RUN (nothing will be written)'}`);

const canary = await pool.query('SELECT 25006 AS c');
if (canary.rows[0].c !== 25006) { console.error('canary failed'); process.exit(2); }
console.log(`  canary: 25006 ✅\n`);

const { rows: [row] } = await pool.query(
  `SELECT config_value, to_char(updated_at,'YYYY-MM-DD HH24:MI') AS updated_at FROM system_config WHERE config_key=$1`, [KEY]);
if (!row) { console.error(`🔴 no system_config row for '${KEY}'`); process.exit(2); }

const before = typeof row.config_value === 'string' ? JSON.parse(row.config_value) : row.config_value;
const beforeVariants = before.variants ?? [];
const find = (vs, id) => vs.find((v) => v.id === id);

// ── Preconditions ───────────────────────────────────────────────────────────
const problems = [];
const ctlBefore = find(beforeVariants, CONTROL);
const sliBefore = find(beforeVariants, SLIDING);
if (!ctlBefore) problems.push(`'${CONTROL}' is missing from the pool`);
if (!sliBefore) problems.push(`'${SLIDING}' is missing from the pool`);
if (sliBefore && Number(sliBefore.weight) === 0)
  problems.push(`'${SLIDING}' is ALREADY at weight 0 — the sliding close is already retired`);
if (ctlBefore && Number(ctlBefore.weight) !== EXPECT_BEFORE.control)
  problems.push(`'${CONTROL}' weight is ${ctlBefore.weight}, expected ${EXPECT_BEFORE.control} — the pool changed since this was written`);
if (sliBefore && Number(sliBefore.weight) !== EXPECT_BEFORE.sliding)
  problems.push(`'${SLIDING}' weight is ${sliBefore.weight}, expected ${EXPECT_BEFORE.sliding} — the pool changed since this was written`);

console.log(`  pool last updated: ${row.updated_at}`);
console.log(`  palm arms BEFORE:`);
for (const v of beforeVariants.filter((v) => v.funnel === 'v1-palm'))
  console.log(`    ${String(v.id).padEnd(14)} w=${String(v.weight).padEnd(3)} $${v.priceCents / 100}/$${v.downsellCents / 100}${v.signs ? `  signs=${JSON.stringify(v.signs)}` : ''}`);

if (problems.length) {
  console.error(`\n  🔴 PRECONDITIONS FAILED — refusing to touch the pool:`);
  for (const p of problems) console.error(`     • ${p}`);
  console.error('');
  await pool.end();
  process.exit(1);
}

console.log(`\n  PLANNED CHANGE:`);
console.log(`    ${SLIDING}.weight : ${EXPECT_BEFORE.sliding} → ${TO.sliding}   (sliding close RETIRED, parked not deleted)`);
console.log(`    ${CONTROL}.weight : ${EXPECT_BEFORE.control} → ${EXPECT_BEFORE.control}   (unchanged — now the only drawing palm arm)`);
console.log(`\n    ⇒ every palm sign: 100% $35/$25 control`);
console.log(`    ⇒ nobody sees $55 any more`);
console.log(`\n    The commitment-gate test is NOT affected by this script — it is the`);
console.log(`    'v1_palm_commitment_gate_2026' experiment, started from /admin/experiments.`);

if (!LIVE) {
  console.log(`\n  ✅ DRY RUN complete — nothing was written.`);
  console.log(`     To apply:  RETIRE_SLIDING_CLOSE=1 node scripts/retire-sliding-close.mjs --live\n`);
  await pool.end();
  process.exit(0);
}

// ── 2. Snapshot BEFORE anything else ────────────────────────────────────────
const stamp = row.updated_at.slice(0, 10);
const SNAPSHOT = `improve-v1/ROLLBACK-config-before-retire-sliding-${stamp}.json`;
try {
  fs.writeFileSync(SNAPSHOT, JSON.stringify(before), 'utf8');
  console.log(`\n  📸 snapshot written: ${SNAPSHOT}`);
} catch (e) {
  console.error(`\n  🔴 could not write the snapshot (${e.message}) — ABORTING before any write.\n`);
  await pool.end();
  process.exit(2);
}

// ── 3-4. Targeted edit inside a transaction, verified before commit ─────────
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(
    `UPDATE system_config
        SET config_value = (
              SELECT jsonb_build_object('variants',
                       jsonb_agg(
                         CASE v->>'id'
                           WHEN $2 THEN jsonb_set(v, '{weight}', to_jsonb($3::int))
                           ELSE v
                         END ORDER BY ord)
                       || '[]'::jsonb)
              FROM jsonb_array_elements(config_value::jsonb->'variants') WITH ORDINALITY AS t(v, ord)
            )::text,
            updated_at = now()
      WHERE config_key = $1`,
    [KEY, SLIDING, TO.sliding],
  );

  const { rows: [after] } = await client.query(`SELECT config_value FROM system_config WHERE config_key=$1`, [KEY]);
  const av = (typeof after.config_value === 'string' ? JSON.parse(after.config_value) : after.config_value).variants ?? [];

  const bad = [];
  if (av.length !== beforeVariants.length) bad.push(`variant count ${beforeVariants.length} → ${av.length}, expected unchanged`);
  if (Number(find(av, SLIDING)?.weight) !== TO.sliding) bad.push(`${SLIDING}.weight is ${find(av, SLIDING)?.weight}`);
  if (Number(find(av, CONTROL)?.weight) !== EXPECT_BEFORE.control) bad.push(`${CONTROL}.weight moved to ${find(av, CONTROL)?.weight}`);

  // Nothing else may have moved — every pre-existing variant must be byte-identical
  // apart from the ONE intended weight.
  for (const b of beforeVariants) {
    const a = find(av, b.id);
    if (!a) { bad.push(`variant '${b.id}' DISAPPEARED`); continue; }
    const bb = { ...b }, aa = { ...a };
    if (b.id === SLIDING) { delete bb.weight; delete aa.weight; }
    if (JSON.stringify(bb) !== JSON.stringify(aa)) bad.push(`variant '${b.id}' changed beyond its weight`);
  }

  if (bad.length) {
    await client.query('ROLLBACK');
    console.error(`\n  🔴 VERIFY FAILED — rolled back, the pool is UNCHANGED:`);
    for (const b of bad) console.error(`     • ${b}`);
    console.error('');
    process.exitCode = 1;
  } else {
    await client.query('COMMIT');
    console.log(`\n  ✅ COMMITTED. Palm arms AFTER:`);
    for (const v of av.filter((v) => v.funnel === 'v1-palm'))
      console.log(`    ${String(v.id).padEnd(14)} w=${String(v.weight).padEnd(3)} $${v.priceCents / 100}/$${v.downsellCents / 100}${v.signs ? `  signs=${JSON.stringify(v.signs)}` : ''}`);
    console.log(`\n  Next: within ~60s (config cache) all palm traffic is 100% $35/$25 control.`);
    console.log(`  VERIFY:   npx tsx scripts/price-test-correctness-check.mjs`);
    console.log(`  ROLLBACK: set '${SLIDING}' weight → 1, or restore ${SNAPSHOT}\n`);
  }
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(`\n  🔴 ERROR — rolled back, the pool is UNCHANGED: ${e.message}\n`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
