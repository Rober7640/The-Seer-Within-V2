#!/usr/bin/env node
/**
 * verify-sign-experiment — post-go-live check for a sign-scoped V1 price experiment.
 *
 *   node scripts/verify-sign-experiment.mjs <email> [sign]
 *   node scripts/verify-sign-experiment.mjs qa+ta1@gmail.com thumb-angle
 *
 * STRICTLY READ-ONLY — every statement in this file is a SELECT. It never writes,
 * so it is safe to point at production (which is the only place it is useful: dev
 * and prod share one database).
 *
 * WHY THIS EXISTS
 * Until the experiment is RUNNING you cannot tell a working sign from an ignored
 * one — both produce the control arm. Once it is running, four things must all be
 * true, and the failure of any one is SILENT:
 *   1. the experiment is running and scoped to funnel + sign
 *   2. the visitor's conversation row exists and carries a price
 *   3. an exposure row was logged (no exposure ⇒ the dashboard denominator is 0
 *      and the test reads empty forever — the one people forget)
 *   4. the price STORED on the row matches the payload of the arm they drew
 *      (a mismatch means we measure one price and charge another)
 *
 * It also warns on the contamination hazard: if Production is missing the
 * `scope.sign` filter, EVERY v1-palm visitor enrols, not just this sign. There is
 * no `sign` column on conversations, so we detect it from the transcript instead.
 *
 * Exit 0 = all checks passed · 1 = a check failed · 2 = driver/connection error.
 */
import 'dotenv/config';
import pg from 'pg';
import crypto from 'node:crypto';

const EMAIL = process.argv[2];
const SIGN = process.argv[3] || 'thumb-angle';
const KEY = 'v1_main_price_2026';   // V1_MAIN_EXPERIMENT_KEY — the only V1 price test
const FUNNEL = 'v1-palm';

if (!EMAIL) {
  console.error('usage: node scripts/verify-sign-experiment.mjs <email> [sign]');
  process.exit(2);
}

const results = [];
const check = (label, ok, detail = '') => {
  results.push({ label, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? `  — ${detail}` : ''}`);
};
const warn = (label, detail) => {
  results.push({ label, ok: true, warn: true, detail });
  console.log(`⚠️  ${label}${detail ? `  — ${detail}` : ''}`);
};

// The transaction pooler (:6543) serves an EMPTY search_path and 42P01s on every
// table (2026-07-10 prod outage). Always use the session pooler.
const url = new URL(process.env.DATABASE_URL);
url.port = '5432';

const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
} catch (err) {
  console.error(`🔴 could not connect to ${url.hostname}:${url.port} — ${err.message}`);
  process.exit(2);
}

console.log(`host    : ${url.hostname}:${url.port}`);

// Canary — proves tables actually resolve. Without it, a search_path problem looks
// identical to "no rows found" and every check below would pass vacuously.
try {
  const canary = await client.query('SELECT 25006 AS k');
  if (canary.rows[0].k !== 25006) throw new Error('unexpected canary value');
  console.log('canary  : 25006 ✔');
} catch (err) {
  console.error(`🔴 canary failed (${err.message}) — likely the :6543 pooler search_path bug.`);
  await client.end();
  process.exit(2);
}
console.log(`email   : ${EMAIL}\nsign    : ${SIGN}\n`);

const asObj = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

// ── 1. Experiment configured + running ──────────────────────────────────────
const expRes = await client.query(
  `SELECT key, name, status, subject_type, variants, scope, conversion, started_at
     FROM experiments WHERE key = $1`, [KEY]);

if (!expRes.rowCount) {
  check(`experiment "${KEY}" exists`, false, 'no row — nothing is running');
  await finish();
}
const exp = expRes.rows[0];
const scope = asObj(exp.scope) ?? {};
const variants = asObj(exp.variants) ?? [];

check(`experiment "${KEY}" exists`, true, exp.name);
check('status is RUNNING', exp.status === 'running',
  exp.status === 'running' ? `started ${String(exp.started_at).slice(0, 19)}`
    : `status="${exp.status}" — draft/paused means the legacy pool is still live`);
check(`scope.funnel = ${FUNNEL}`, scope.funnel === FUNNEL, `got ${JSON.stringify(scope.funnel ?? null)}`);
check(`scope.sign = ${SIGN}`, scope.sign === SIGN,
  scope.sign === SIGN ? '' : `got ${JSON.stringify(scope.sign ?? null)} — WITHOUT this every v1-palm visitor enrols`);

console.log('\n  arms:');
for (const v of variants) {
  const p = v.payload ?? {};
  console.log(`    ${String(v.key).padEnd(3)} w=${String(v.weight).padEnd(4)} ` +
    `main=$${((p.mainCents ?? 0) / 100).toFixed(2)} downsell=$${((p.downsellCents ?? 0) / 100).toFixed(2)}`);
}
console.log('');

// ── 2. The visitor's conversation row ───────────────────────────────────────
const convRes = await client.query(
  `SELECT id, price_variant, price_amount_cents, downsell_amount_cents,
          upsell1_amount_cents, purchased, main_paid_at, messages, created_at
     FROM conversations WHERE lower(email) = lower($1)
     ORDER BY created_at DESC LIMIT 1`, [EMAIL]);

check('conversation row exists for this email', convRes.rowCount > 0,
  convRes.rowCount ? '' : 'the visitor never reached email capture');
const conv = convRes.rows[0];
if (conv) {
  console.log(`    variant=${conv.price_variant} main=$${(conv.price_amount_cents / 100).toFixed(2)} ` +
    `downsell=$${(conv.downsell_amount_cents / 100).toFixed(2)} ` +
    `purchased=${conv.purchased}${conv.main_paid_at ? ' PAID' : ''}\n`);
}

// ── 3. Exposure logged — the denominator ────────────────────────────────────
const subjectId = crypto.createHash('sha256').update(EMAIL.trim().toLowerCase()).digest('hex');
const expoRes = await client.query(
  `SELECT variant, context, created_at FROM experiment_exposures
     WHERE experiment_key = $1 AND subject_id = $2`, [KEY, subjectId]);

check('exposure row logged for this visitor', expoRes.rowCount > 0,
  expoRes.rowCount ? `arm ${expoRes.rows[0].variant}`
    : 'NO exposure ⇒ the dashboard denominator is 0 and the test reads empty forever');

// ── 4. Stored price matches the arm they actually drew ──────────────────────
if (conv && expoRes.rowCount) {
  const arm = variants.find((v) => v.key === expoRes.rows[0].variant);
  const p = arm?.payload ?? {};
  const mainOk = conv.price_amount_cents === p.mainCents;
  const downOk = conv.downsell_amount_cents === p.downsellCents;
  check(`stored MAIN price matches arm ${arm?.key} payload`, mainOk,
    `row=$${(conv.price_amount_cents / 100).toFixed(2)} vs arm=$${((p.mainCents ?? 0) / 100).toFixed(2)}`);
  check(`stored DOWNSELL price matches arm ${arm?.key} payload`, downOk,
    `row=$${(conv.downsell_amount_cents / 100).toFixed(2)} vs arm=$${((p.downsellCents ?? 0) / 100).toFixed(2)}`);
}

// ── 5. Contamination probe ──────────────────────────────────────────────────
// If Production lacks the `scope.sign` filter the key is silently ignored and
// EVERY v1-palm visitor enrols — including the live thumb lander, whose own
// legacy 70/30 test would then be overridden. conversations has no `sign`
// column, so infer it from the palm opener stored in the transcript.
if (exp.status === 'running' && exp.started_at) {
  const all = await client.query(
    `SELECT c.messages
       FROM experiment_exposures e
       JOIN conversations c ON c.id = e.context->>'conversationId'
      WHERE e.experiment_key = $1 AND e.created_at >= $2
      LIMIT 400`, [KEY, exp.started_at]);

  // thumb-angle's two mark lines — the copy is unique to this sign.
  const MARK = /(runs true with the line of your thumb|pulls away from your thumb)/i;
  let onSign = 0, offSign = 0;
  for (const r of all.rows) {
    const text = typeof r.messages === 'string' ? r.messages : JSON.stringify(r.messages ?? '');
    if (MARK.test(text)) onSign += 1; else offSign += 1;
  }
  if (all.rowCount === 0) {
    warn('contamination probe', 'no exposures joined to a conversation yet — re-run once traffic arrives');
  } else if (offSign > 0) {
    check(`only ${SIGN} traffic is enrolled`, false,
      `🔴 ${offSign}/${all.rowCount} enrolled conversations show NO ${SIGN} mark — ` +
      `scope.sign is being ignored (is the deployed code missing the filter?)`);
  } else {
    check(`only ${SIGN} traffic is enrolled`, true, `${onSign}/${all.rowCount} carry the ${SIGN} mark`);
  }
}

await finish();

async function finish() {
  await client.end();
  const failed = results.filter((r) => !r.ok);
  const warned = results.filter((r) => r.warn);
  console.log(`\n${failed.length ? '❌ FAIL' : '✅ ALL PASS'} — ` +
    `${results.length - failed.length}/${results.length} checks passed` +
    `${warned.length ? ` (${warned.length} warning)` : ''}`);
  process.exit(failed.length ? 1 : 0);
}
