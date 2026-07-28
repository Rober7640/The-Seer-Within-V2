// Reduce the LIVE fb-palm sliding-close exposure from 70/30 back to 90/10.
//   Boss, 2026-07-22: "Split test for v1, reduce exposure back to 90/10"
//
// Direct descendant of scripts/apply-70-30.mjs — same safety design, inverted:
//
//  1. DRY BY DEFAULT. With no flags this READS the live config and prints the exact
//     planned diff without writing. Only `APPLY_90_10=1 … --live` writes.
//
//  2. SNAPSHOT FIRST — the current config_value is written to
//     improve-v1/ROLLBACK-config-before-90-10-2026-07-22.json before anything else.
//     Abort if the file can't be written.
//
//  3. TARGETED jsonb EDIT, not a hand-retyped blob. Only the two `weight` fields are
//     touched via jsonb_set; every price key is carried across by Postgres, untouched
//     and untypeable. (A hand-retyped blob is how `"down  sellCents"` once silently
//     killed the root $45 test for two weeks.)
//
//  4. VERIFY INSIDE THE TRANSACTION, COMMIT ONLY IF CLEAN. After the UPDATE we re-read
//     the row, diff it field-by-field against the snapshot, and assert that EXACTLY the
//     two weights changed and nothing else. Any discrepancy ⇒ ROLLBACK.
//
//  5. updated_at = now() so the next analysis window is anchorable. This flip creates a
//     THIRD window (90/10 → 70/30 → 90/10) — never read the sliding test all-time.
//
//  6. Session pooler (:5432) forced. The :6543 transaction pooler serves an empty
//     search_path and 42P01s on every table (2026-07-10 prod outage).
//
// Usage:
//   node scripts/apply-90-10.mjs                        # dry run, reads only
//   APPLY_90_10=1 node scripts/apply-90-10.mjs --live   # writes
import 'dotenv/config';
import pg from 'pg';
import fs from 'node:fs';

const LIVE = process.argv.includes('--live');
const SNAPSHOT = 'improve-v1/ROLLBACK-config-before-90-10-2026-07-22.json';

const FROM = { ctl: 7, sliding: 3 };   // what we expect to find (70/30)
const TO   = { ctl: 9, sliding: 1 };   // what we set (90/10)

if (LIVE && process.env.APPLY_90_10 !== '1') {
  console.error(`\n🔴 REFUSING to write without explicit confirmation.`);
  console.error(`   To apply:  APPLY_90_10=1 node scripts/apply-90-10.mjs --live\n`);
  process.exit(2);
}

const url = new URL(process.env.DATABASE_URL);
url.port = '5432';
const redacted = `${url.hostname}:${url.port}`;

const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
await client.connect();
console.log(`\nDB   : ${redacted}`);
console.log(`MODE : ${LIVE ? '🔴 LIVE — THIS WRITES TO THE SHARED PRODUCTION DB' : 'DRY RUN (reads only, no write)'}`);

const canary = await client.query('SELECT 25006 AS k');
if (canary.rows[0].k !== 25006) { console.error('🔴 canary failed'); await client.end(); process.exit(2); }
console.log(`canary: 25006 ✔`);

// ── 1. Read + snapshot ───────────────────────────────────────────────────────
const { rows: [before] } = await client.query(
  `SELECT config_value, to_char(updated_at,'YYYY-MM-DD HH24:MI') AS updated_at
     FROM system_config WHERE config_key = 'v1_price_variants'`);
if (!before) { console.error('🔴 no v1_price_variants row'); await client.end(); process.exit(1); }

const parseW = (raw) => Object.fromEntries(JSON.parse(raw).variants.map((v) => [v.id, v.weight]));
const wBefore = parseW(before.config_value);
const cur = { ctl: wBefore['35_palm_u47'], sliding: wBefore['55-35_palm'] };
console.log(`\nconfig as of ${before.updated_at}`);
console.log(`  before: 35_palm_u47=w${cur.ctl}  55-35_palm=w${cur.sliding}` +
  `  (${Math.round(cur.ctl / (cur.ctl + cur.sliding) * 100)}/${Math.round(cur.sliding / (cur.ctl + cur.sliding) * 100)})`);

if (cur.ctl === TO.ctl && cur.sliding === TO.sliding) {
  console.log(`\n✅ ALREADY 90/10 — nothing to do.\n`);
  await client.end(); process.exit(0);
}
if (cur.ctl !== FROM.ctl || cur.sliding !== FROM.sliding) {
  console.error(`\n🔴 ABORT: expected ${FROM.ctl}/${FROM.sliding} but found ${cur.ctl}/${cur.sliding}.`);
  console.error(`   The live config is not what this script was reviewed against. Stopping.\n`);
  await client.end(); process.exit(1);
}

console.log(`  after : 35_palm_u47=w${TO.ctl}  55-35_palm=w${TO.sliding}  (90/10)`);
console.log(`\n  planned changes:`);
console.log(`    35_palm_u47.weight: ${FROM.ctl} → ${TO.ctl}`);
console.log(`    55-35_palm.weight: ${FROM.sliding} → ${TO.sliding}`);
console.log(`  (no price, sign or variant-count change)`);

if (!LIVE) {
  console.log(`\nDRY RUN — nothing written. To apply:`);
  console.log(`  APPLY_90_10=1 node scripts/apply-90-10.mjs --live\n`);
  await client.end(); process.exit(0);
}

fs.writeFileSync(SNAPSHOT, before.config_value);
if (!fs.existsSync(SNAPSHOT) || fs.readFileSync(SNAPSHOT, 'utf8') !== before.config_value) {
  console.error(`🔴 ABORT: snapshot did not write cleanly to ${SNAPSHOT}`);
  await client.end(); process.exit(1);
}
console.log(`\n✔ snapshot written: ${SNAPSHOT}`);

// ── 2 + 3. Transactional edit, verified before commit ────────────────────────
await client.query('BEGIN');
try {
  await client.query(`
    UPDATE system_config
    SET config_value = (
          SELECT jsonb_build_object('variants', jsonb_agg(
                   CASE v->>'id'
                     WHEN '35_palm_u47' THEN jsonb_set(v, '{weight}', '${TO.ctl}'::jsonb)
                     WHEN '55-35_palm'  THEN jsonb_set(v, '{weight}', '${TO.sliding}'::jsonb)
                     ELSE v
                   END ORDER BY ord))::text
          FROM jsonb_array_elements((config_value::jsonb)->'variants') WITH ORDINALITY AS t(v, ord)
        ),
        updated_at = now()
    WHERE config_key = 'v1_price_variants'`);

  const { rows: [after] } = await client.query(
    `SELECT config_value FROM system_config WHERE config_key = 'v1_price_variants'`);

  const a = JSON.parse(before.config_value).variants;
  const b = JSON.parse(after.config_value).variants;
  const problems = [];
  if (a.length !== b.length) problems.push(`variant COUNT changed: ${a.length} → ${b.length}`);

  const changed = [];
  for (const av of a) {
    const bv = b.find((x) => x.id === av.id);
    if (!bv) { problems.push(`variant ${av.id} DISAPPEARED`); continue; }
    for (const k of new Set([...Object.keys(av), ...Object.keys(bv)])) {
      const x = JSON.stringify(av[k]), y = JSON.stringify(bv[k]);
      if (x !== y) changed.push(`${av.id}.${k}: ${x} → ${y}`);
    }
  }
  const expected = new Set([
    `35_palm_u47.weight: ${FROM.ctl} → ${TO.ctl}`,
    `55-35_palm.weight: ${FROM.sliding} → ${TO.sliding}`,
  ]);
  for (const c of changed) if (!expected.has(c)) problems.push(`UNEXPECTED change: ${c}`);
  for (const e of expected) if (!changed.includes(e)) problems.push(`MISSING expected change: ${e}`);

  // The sliding arm must still be thumb-scoped — this flip must not widen exposure.
  const sliding = b.find((v) => v.id === '55-35_palm');
  if (JSON.stringify(sliding?.signs) !== JSON.stringify(['thumb'])) {
    problems.push(`55-35_palm.signs is ${JSON.stringify(sliding?.signs)} — MUST be ["thumb"]`);
  }
  // Prices must be intact on both arms.
  const ctl = b.find((v) => v.id === '35_palm_u47');
  if (ctl?.priceCents !== 3500 || ctl?.downsellCents !== 2500 || ctl?.upsell1Cents !== 4700) {
    problems.push(`control prices drifted: ${JSON.stringify(ctl)}`);
  }
  if (sliding?.priceCents !== 5500 || sliding?.downsellCents !== 3500 || sliding?.upsell1Cents !== 4700) {
    problems.push(`sliding prices drifted: ${JSON.stringify(sliding)}`);
  }

  console.log(`\n  changes detected:`);
  for (const c of changed) console.log(`    ${c}`);

  if (problems.length) {
    console.error(`\n🔴 ROLLING BACK — verification failed:`);
    for (const p of problems) console.error(`    ${p}`);
    await client.query('ROLLBACK');
    await client.end();
    process.exit(1);
  }

  await client.query('COMMIT');
  console.log(`\n✅ COMMITTED — sliding-close exposure is now 90/10.`);
  console.log(`   Existing visitors are unaffected (assignment is sticky per email).`);
  console.log(`   Anchor the next analysis window to this flip, not to all-time.`);
  console.log(`   To undo: restore ${SNAPSHOT}\n`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error(`\n🔴 ROLLED BACK — ${err.message}\n`);
  await client.end();
  process.exit(1);
}

await client.end();
