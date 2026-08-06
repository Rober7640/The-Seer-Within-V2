// Backfill conversations.main_paid_at from STRIPE for rows the
// checkout.session.completed webhook never stamped.
//
//   DATABASE_URL="postgresql://..." node scripts/backfill-main-paid-at.mjs
//   DATABASE_URL="postgresql://..." node scripts/backfill-main-paid-at.mjs --apply
//
//   --since=YYYY-MM-DD   only rows created on/after this date   (default 2026-06-01)
//   --limit=N            cap candidates examined                (default 500)
//   --apply              actually WRITE. Without it this is 100% read-only.
//
// ── WHY ──────────────────────────────────────────────────────────────────────
// tallyV1Main now counts a conversion only when main_paid_at >= the exposure, so
// a genuine buyer whose webhook never landed is silently dropped. On the order-bump
// cohort that is 3 of arm A's 20 real buyers and 0 of arm B's — which overstates B's
// lead as +43% when the Stripe-verified truth is +21%. Until this backfill runs, the
// corrected tally is wrong in the opposite direction to the bug it fixed.
//
// ── SAFETY ───────────────────────────────────────────────────────────────────
// * Dry run by default. --apply is the ONLY thing that writes.
// * The read phase runs in a READ ONLY transaction behind a write canary.
// * Stripe is consulted per row; we stamp ONLY where payment_status === 'paid'.
//   An unpaid/expired session is an abandoned cart and is left alone deliberately.
// * The UPDATE re-asserts `main_paid_at IS NULL`, so anything the live webhook
//   stamped between the read and the write is never clobbered.
// * Rows are matched by conversation id, never by email.
//
// 🔴 TIMEZONE: main_paid_at is `timestamp WITHOUT time zone` and this codebase
// stores UTC wall time in it (db.ts overrides pg's parsers to read it back as UTC).
// node-pg would serialise a JS Date in LOCAL time, so we send an explicit UTC ISO
// string cast to ::timestamp instead. Getting this wrong shifts every stamp by the
// machine's offset and would re-break the very comparison this exists to fix.
import pg from 'pg';
import Stripe from 'stripe';
import fs from 'node:fs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => (args.find((a) => a.startsWith(f + '=')) || `=${d}`).split('=')[1];

const APPLY = has('--apply');
const SINCE = val('--since', '2026-06-01');
const LIMIT = Number(val('--limit', '500'));
const BUMP_KEY = val('--key', 'v1_order_bump_2026');
// --cohort-only: restrict candidates to rows an exposure for --key actually points
// at, and IGNORE --since. Necessary because a cohort member can be a returning
// visitor whose conversation row was created in April but who bought during the
// test — a created_at window silently drops exactly the buyers we are trying to
// recover. Also keeps the Stripe calls to the cohort instead of all 12k candidates.
const COHORT_ONLY = has('--cohort-only');

if (!/^\d{4}-\d{2}-\d{2}$/.test(SINCE)) { console.error(`--since must be YYYY-MM-DD, got "${SINCE}"`); process.exit(1); }
if (!Number.isFinite(LIMIT) || LIMIT < 1) { console.error(`--limit must be a positive number`); process.exit(1); }

const envText = fs.readFileSync('.env', 'utf8');

// DATABASE_URL: the env var wins. `--dsn-from-dotenv-comment` additionally allows
// the COMMENTED-OUT prod line in .env to be used for this one run. Opt-in and
// explicit on purpose — silently reviving a commented-out connection string is how
// you end up reading, or worse writing to, a database you did not mean to touch.
let conn = process.env.DATABASE_URL;
if (!conn && has('--dsn-from-dotenv-comment')) {
  const m = [...envText.matchAll(/^\s*#\s*DATABASE_URL\s*=\s*(\S+)\s*$/gm)].pop();
  conn = m?.[1];
  if (conn) console.log('DSN: from the commented DATABASE_URL line in .env');
}
if (!conn) {
  console.error(
    'No DATABASE_URL. Either:\n' +
    '  node scripts/backfill-main-paid-at.mjs --dsn-from-dotenv-comment\n' +
    '    (uses the commented-out prod line already in .env)\n' +
    '  or set $env:DATABASE_URL first.');
  process.exit(1);
}
// Supabase's pooler port hands out an empty search_path, which makes every query
// fail with 42P01 (relation does not exist). Direct port 5432 does not.
if (/:6543\b/.test(conn)) {
  console.warn('⚠ DSN uses pooler port 6543 — expect 42P01. Use 5432 if it fails.');
}

// Stripe clients per account — session ids only resolve against their creating
// account (schema.ts:31-35). Account B uses the _B suffix (stripeAccount.ts:30-34).
const lastLive = (name) => {
  const m = [...envText.matchAll(new RegExp(`^\\s*${name}\\s*=\\s*(sk_live_[A-Za-z0-9_]+)\\s*$`, 'gm'))];
  return m.length ? m[m.length - 1][1] : null;
};
const keyA = lastLive('STRIPE_SECRET_KEY');
const keyB = lastLive('STRIPE_SECRET_KEY_B');
if (!keyA) { console.error('No live STRIPE_SECRET_KEY in .env'); process.exit(1); }
const clients = { A: new Stripe(keyA), B: keyB ? new Stripe(keyB) : null };

const c = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await c.connect();

// ── Canary: prove we cannot write before reading anything. ──
await c.query('BEGIN TRANSACTION READ ONLY');
let canary = 'NOT RUN';
try { await c.query('UPDATE conversations SET id=id WHERE false'); canary = 'WRITE ACCEPTED'; }
catch (e) { canary = e.code === '25006' ? 'rejected (25006) ✔' : 'unexpected ' + e.code; }
finally { await c.query('ROLLBACK'); }
console.log('Read-phase canary:', canary);
if (!canary.startsWith('rejected')) { console.error('Read phase is writable — aborting.'); process.exit(1); }

// ── 0. AM I ON THE RIGHT DATABASE? ───────────────────────────────────────────
// Learned the hard way 2026-08-06: the commented-out DSN in .env points at a
// scratch project with 3 conversations and no exposures, and a dry run against it
// reported "0 rows to stamp" — a clean, confident, entirely meaningless answer.
// A backfill that finds nothing is indistinguishable from a backfill pointed
// somewhere wrong, so assert the cohort exists before believing any count.
await c.query('BEGIN TRANSACTION READ ONLY');
const { rows: [probe] } = await c.query(
  `SELECT (SELECT count(*) FROM experiment_exposures WHERE experiment_key = $1) AS exposures,
          (SELECT count(*) FROM conversations)                                  AS conversations`,
  [BUMP_KEY]);
await c.query('ROLLBACK');
console.log(`Target DB: ${probe.conversations} conversations, ${probe.exposures} ${BUMP_KEY} exposures`);
if (Number(probe.exposures) === 0) {
  console.error(
    `\n🔴 WRONG DATABASE — no exposures for ${BUMP_KEY}.\n` +
    '   A "0 rows to stamp" result here would be meaningless, so refusing to continue.\n' +
    '   Point DATABASE_URL at production and re-run.');
  await c.end();
  process.exit(1);
}

// ── 1. Candidates. `purchased` keeps this to rows that at least reached checkout. ──
// Params are built to match the branch — an unreferenced placeholder makes Postgres
// fail with 42P18 ("could not determine data type"), so only bind what is used.
const params = [BUMP_KEY, LIMIT];            // $1 key, $2 limit
let scopeSql;
if (COHORT_ONLY) {
  scopeSql = `AND EXISTS (SELECT 1 FROM experiment_exposures x
                           WHERE x.experiment_key = $1
                             AND x.context->>'conversationId' = c.id)`;
} else {
  params.push(SINCE);                        // $3
  scopeSql = 'AND c.created_at >= $3::timestamp';
}

await c.query('BEGIN TRANSACTION READ ONLY');
const { rows: candidates } = await c.query(`
  SELECT c.id, c.stripe_session_id, COALESCE(c.stripe_account,'A') AS acct,
         c.main_purchase_amount, c.bump_amount_cents, c.purchase_type,
         c.upsell_offered,
         (SELECT e.variant FROM experiment_exposures e
           WHERE e.experiment_key = $1 AND e.context->>'conversationId' = c.id) AS bump_variant,
         (SELECT e.created_at FROM experiment_exposures e
           WHERE e.experiment_key = $1 AND e.context->>'conversationId' = c.id) AS exposed_at
    FROM conversations c
   WHERE c.stripe_session_id IS NOT NULL
     AND c.purchased = true
     AND c.main_paid_at IS NULL
     ${scopeSql}
   ORDER BY c.created_at
   LIMIT $2`, params);
await c.query('ROLLBACK');

console.log(`\nCandidates ${COHORT_ONLY ? `in the ${BUMP_KEY} cohort` : `since ${SINCE}`}: ` +
  `${candidates.length}${candidates.length === LIMIT ? `  ⚠ hit --limit=${LIMIT}, there may be more` : ''}`);
if (!candidates.length) { await c.end(); process.exit(0); }

// ── 2. Ask Stripe. Small pool so we don't hammer the API. ──
const utcStamp = (unix) => new Date(unix * 1000).toISOString().replace('Z', '');
const results = [];
let done = 0;
async function classify(row) {
  const stripe = clients[row.acct];
  if (!stripe) return { row, verdict: 'NO_KEY', note: `account ${row.acct} not configured` };
  try {
    const s = await stripe.checkout.sessions.retrieve(row.stripe_session_id, { expand: ['payment_intent'] });
    if (s.payment_status !== 'paid') return { row, verdict: 'UNPAID', note: s.payment_status };
    // Deferred intents: the PI is created when she actually pays, so pi.created is
    // the closest thing to a payment timestamp. Sessions opened but paid much later
    // would otherwise be stamped at session-open time and could sort before their
    // own exposure. Fall back to session.created only when there is no PI.
    const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
    const at = pi?.created ?? s.created;
    return { row, verdict: 'STAMP', at, amount: s.amount_total, usedPi: !!pi };
  } catch (e) {
    return { row, verdict: 'ERROR', note: (e?.raw?.code || e?.code || 'error') };
  }
}
const queue = [...candidates];
await Promise.all(Array.from({ length: 5 }, async () => {
  for (let r = queue.shift(); r; r = queue.shift()) {
    results.push(await classify(r));
    if (++done % 25 === 0) process.stdout.write(`  …${done}/${candidates.length}\n`);
  }
}));

// ── 3. Report. ──
const by = (v) => results.filter((r) => r.verdict === v);
const stamp = by('STAMP');
console.log(`\n  STAMP  ${String(stamp.length).padStart(4)}  paid in Stripe — will get main_paid_at`);
console.log(`  UNPAID ${String(by('UNPAID').length).padStart(4)}  never paid (abandoned) — left alone`);
console.log(`  NO_KEY ${String(by('NO_KEY').length).padStart(4)}  account B not configured here`);
console.log(`  ERROR  ${String(by('ERROR').length).padStart(4)}  lookup failed`);
for (const r of by('ERROR').slice(0, 5)) console.log(`     ${r.row.stripe_session_id}  ${r.note}`);

// Impact on the order-bump cohort — the reason this exists.
// 🔑 A stamp only RESTORES A BUYER when the payment lands at or after the exposure.
// Most cohort stamps carry a pre-exposure date (an old purchase by someone who
// merely visited again) — stamping those changes no count, it just replaces an
// ambiguous NULL with a date that proves they are out of scope. Reporting the two
// together would badly overstate the correction.
const inCohort = stamp.filter((r) => r.row.bump_variant && r.row.exposed_at);
if (inCohort.length) {
  const perArm = {};
  for (const r of inCohort) {
    const v = r.row.bump_variant;
    const restores = r.at * 1000 >= new Date(r.row.exposed_at).getTime();
    perArm[v] ??= { restore: 0, cents: 0, dated: 0 };
    if (restores) {
      perArm[v].restore++;
      perArm[v].cents += (r.row.main_purchase_amount || 0) + (r.row.bump_amount_cents || 0);
    } else perArm[v].dated++;
  }
  console.log(`\n  ${BUMP_KEY} cohort impact:`);
  for (const [v, s] of Object.entries(perArm).sort()) {
    console.log(`    arm ${v}: +${s.restore} buyers restored (+$${(s.cents / 100).toFixed(2)})` +
                `   ${s.dated} phantom(s) merely dated — no count change`);
  }
} else {
  console.log(`\n  No candidates fall inside the ${BUMP_KEY} cohort.`);
}

console.log('\n  sample (first 10 to stamp):');
console.log('    session                                   paid at (UTC)        amount  src');
for (const r of stamp.slice(0, 10)) {
  console.log(`    ${r.row.stripe_session_id.slice(0, 38).padEnd(40)} ${utcStamp(r.at).slice(0, 19)}  ` +
              `${('$' + ((r.amount ?? 0) / 100).toFixed(2)).padStart(7)}  ${r.usedPi ? 'pi' : 'session'}`);
}

// ── 4. Write, only with --apply. ──
if (!APPLY) {
  console.log(`\nDRY RUN — nothing written. ${stamp.length} row(s) would be stamped.`);
  console.log('Re-run with --apply to write:');
  console.log('  UPDATE conversations SET main_paid_at = $1::timestamp, updated_at = now()');
  console.log('   WHERE id = $2 AND main_paid_at IS NULL;');
  await c.end();
  process.exit(0);
}

console.log(`\nAPPLYING — stamping ${stamp.length} row(s)…`);
await c.query('BEGIN');
let written = 0, skipped = 0;
try {
  for (const r of stamp) {
    const res = await c.query(
      `UPDATE conversations SET main_paid_at = $1::timestamp, updated_at = now()
        WHERE id = $2 AND main_paid_at IS NULL`,
      [utcStamp(r.at), r.row.id]);
    if (res.rowCount === 1) written++; else skipped++;
  }
  await c.query('COMMIT');
} catch (e) {
  await c.query('ROLLBACK');
  console.error('\nROLLED BACK — nothing written:', e.message);
  await c.end();
  process.exit(1);
}
console.log(`  ✔ stamped ${written}${skipped ? `, skipped ${skipped} (webhook beat us to it — correct)` : ''}`);
await c.end();
