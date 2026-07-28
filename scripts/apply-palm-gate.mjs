// Go live with the fb-palm COMMITMENT GATE — retire the $55/$35 sliding close and
// start the 3-checkbox test at 70/30 across EVERY palm sign.
//
// This is the safe alternative to hand-running improve-v1/go-live-palm-gate-config.sql.
// That file retypes the ENTIRE pool row as one literal blob — the exact pattern that
// once introduced `"down  sellCents"` and silently killed the root $45 test for two
// weeks, invisible to every test because the key simply vanished. Built on the same
// guarantees as scripts/apply-90-10.mjs:
//
//  1. DRY RUN BY DEFAULT. Prints the planned diff and writes nothing. Only
//     `APPLY_PALM_GATE=1 … --live` writes.
//
//  2. SNAPSHOT FIRST — the current config_value is written to
//     improve-v1/ROLLBACK-config-before-palm-gate-<date>.json before anything else.
//     Abort if the file can't be written.
//
//  3. TARGETED jsonb EDIT, not a retyped blob. Only the two `weight` fields change,
//     and the new arm is APPENDED. Every existing price key is carried across by
//     Postgres, untouched and untypeable.
//
//  4. VERIFY INSIDE THE TRANSACTION, COMMIT ONLY IF CLEAN. After the UPDATE we re-read
//     the row and assert that EXACTLY the intended changes happened — the two weights,
//     one appended variant, and NOTHING else (no dropped variant, no altered price, no
//     mangled key). Any discrepancy ⇒ ROLLBACK.
//
//  5. updated_at = now() so the analysis window is anchorable. This ENDS the sliding
//     window and OPENS the gate window — never read across the boundary.
//
//  6. Session pooler (:5432) forced. The :6543 transaction pooler serves an empty
//     search_path and 42P01s on every table (2026-07-10 prod outage).
//
// Usage:
//   node scripts/apply-palm-gate.mjs                          # dry run, reads only
//   APPLY_PALM_GATE=1 node scripts/apply-palm-gate.mjs --live # writes
//
// ROLLBACK: set 35_palm_gate weight → 0 (new traffic reverts within the 60s config
// cache; already-assigned visitors keep what they were shown, by design), or restore
// the snapshot file wholesale.
import 'dotenv/config';
import pg from 'pg';
import fs from 'node:fs';

const LIVE = process.argv.includes('--live');
const KEY = 'v1_price_variants';
const CONTROL = '35_palm_u47';
const SLIDING = '55-35_palm';
const GATE = '35_palm_gate';

// What we expect to FIND (guards against running twice, or against a pool someone
// else already changed) and what we SET.
const EXPECT_BEFORE = { control: 9, sliding: 1 };   // the live 90/10 as of 2026-07-22
const TO = { control: 70, sliding: 0, gate: 30 };

const GATE_ROW = {
  id: GATE,
  funnel: 'v1-palm',
  weight: TO.gate,
  priceCents: 3500,      // identical economics to the control — this is a UI test,
  downsellCents: 2500,   // NOT a price test. Any drift here silently makes it one.
  upsell1Cents: 4700,
};

if (LIVE && process.env.APPLY_PALM_GATE !== '1') {
  console.error(`\n🔴 REFUSING to write without explicit confirmation.`);
  console.error(`   To apply:  APPLY_PALM_GATE=1 node scripts/apply-palm-gate.mjs --live\n`);
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
if (find(beforeVariants, GATE)) problems.push(`'${GATE}' is ALREADY in the pool — has this been run before?`);
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
console.log(`    ${CONTROL}.weight : ${EXPECT_BEFORE.control} → ${TO.control}`);
console.log(`    ${SLIDING}.weight : ${EXPECT_BEFORE.sliding} → ${TO.sliding}   (sliding close RETIRED, parked not deleted)`);
console.log(`    ${GATE}           : APPEND w=${TO.gate}, $35/$25/$47, unscoped (every sign)`);
console.log(`\n    ⇒ every palm sign: ${TO.control}% control / ${TO.gate}% commitment gate, SAME price on both arms`);
console.log(`    ⇒ nobody sees $55 any more`);

if (!LIVE) {
  console.log(`\n  ✅ DRY RUN complete — nothing was written.`);
  console.log(`     To apply:  APPLY_PALM_GATE=1 node scripts/apply-palm-gate.mjs --live\n`);
  await pool.end();
  process.exit(0);
}

// ── 2. Snapshot BEFORE anything else ────────────────────────────────────────
const stamp = row.updated_at.slice(0, 10);
const SNAPSHOT = `improve-v1/ROLLBACK-config-before-palm-gate-${stamp}.json`;
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
                           WHEN $4 THEN jsonb_set(v, '{weight}', to_jsonb($5::int))
                           ELSE v
                         END ORDER BY ord)
                       || '[]'::jsonb)
              FROM jsonb_array_elements(config_value::jsonb->'variants') WITH ORDINALITY AS t(v, ord)
            )::text,
            updated_at = now()
      WHERE config_key = $1`,
    [KEY, CONTROL, TO.control, SLIDING, TO.sliding],
  );
  // Append the new arm separately so it can never disturb the existing rows.
  await client.query(
    `UPDATE system_config
        SET config_value = jsonb_set(config_value::jsonb, '{variants}',
              (config_value::jsonb->'variants') || $2::jsonb)::text
      WHERE config_key = $1`,
    [KEY, JSON.stringify([GATE_ROW])],
  );

  const { rows: [after] } = await client.query(`SELECT config_value FROM system_config WHERE config_key=$1`, [KEY]);
  const av = (typeof after.config_value === 'string' ? JSON.parse(after.config_value) : after.config_value).variants ?? [];

  const bad = [];
  if (av.length !== beforeVariants.length + 1) bad.push(`variant count ${beforeVariants.length} → ${av.length}, expected +1`);
  if (Number(find(av, CONTROL)?.weight) !== TO.control) bad.push(`${CONTROL}.weight is ${find(av, CONTROL)?.weight}`);
  if (Number(find(av, SLIDING)?.weight) !== TO.sliding) bad.push(`${SLIDING}.weight is ${find(av, SLIDING)?.weight}`);
  const g = find(av, GATE);
  if (!g) bad.push(`${GATE} was not appended`);
  else for (const [k, want] of Object.entries(GATE_ROW))
    if (JSON.stringify(g[k]) !== JSON.stringify(want)) bad.push(`${GATE}.${k} is ${JSON.stringify(g[k])}, expected ${JSON.stringify(want)}`);

  // Nothing else may have moved — every pre-existing variant must be byte-identical
  // apart from the two intended weights.
  for (const b of beforeVariants) {
    const a = find(av, b.id);
    if (!a) { bad.push(`variant '${b.id}' DISAPPEARED`); continue; }
    const bb = { ...b }, aa = { ...a };
    if (b.id === CONTROL || b.id === SLIDING) { delete bb.weight; delete aa.weight; }
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
    console.log(`\n  Next: within ~60s (config cache) new palm traffic splits ${TO.control}/${TO.gate}.`);
    console.log(`  VERIFY: npx tsx scripts/price-test-correctness-check.mjs`);
    console.log(`  ROLLBACK: set '${GATE}' weight → 0, or restore ${SNAPSHOT}\n`);
  }
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(`\n  🔴 ERROR — rolled back, the pool is UNCHANGED: ${e.message}\n`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
