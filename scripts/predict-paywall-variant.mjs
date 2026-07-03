// Predict which paywall A/B variant a user will get — WITHOUT touching anything.
//
// READ-ONLY. Mirrors production's assignment exactly: the subject is the user's
// DB id (assign(PAYWALL_EXPERIMENT_KEY, user.id, {personaId})), the bucket is
// sha256(user.id + key) % 100, and the arm is picked by walking the LIVE
// experiment's real variant weights (control listed first). So this tells you,
// before you even log in, whether an account lands on A or B once the paywall
// test is running (or force-run on dev via EXPERIMENT_FORCE_RUNNING).
//
// The paywall test is Evelyn-scoped, so this prediction applies when the user is
// out of minutes WITH the Evelyn persona (the bucket itself is persona-independent;
// scope only decides in/out — an out-of-scope persona always shows control 'A').
//
// Usage:
//   node scripts/predict-paywall-variant.mjs a@x.com b@x.com   # specific emails
//   node scripts/predict-paywall-variant.mjs <user-uuid> ...   # or raw user ids
//   node scripts/predict-paywall-variant.mjs                   # no args: whole-DB
//                                                              # A/B split + 20 newest
//
// The bucket/pickVariant formulas below are copied verbatim from
// server/lib/experiments.ts (guarded there by unit tests) so this stays a
// dependency-free .mjs like the other report scripts.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const KEY = 'paywall_copy_2026';

// --- exact copies of the production pure primitives (server/lib/experiments.ts) ---
function experimentBucket(subjectId, experimentKey) {
  const hex = crypto.createHash('sha256').update(subjectId + experimentKey).digest('hex').slice(0, 8);
  return parseInt(hex, 16) % 100;
}
function pickVariant(bucket, variants) {
  if (!variants.length) return 'A';
  const total = variants.reduce((s, v) => s + (v.weight > 0 ? v.weight : 0), 0);
  if (total <= 0) return variants[0].key;
  const threshold = (bucket / 100) * total;
  let cum = 0;
  for (const v of variants) {
    cum += Math.max(0, v.weight);
    if (threshold < cum) return v.key;
  }
  return variants[variants.length - 1].key;
}

// --- DATABASE_URL from .env (first uncommented line — same as the other scripts) ---
const line = fs.readFileSync(path.resolve('.env'), 'utf8').split(/\r?\n/)
  .find((l) => /^\s*DATABASE_URL\s*=/.test(l) && !/^\s*#/.test(l));
if (!line) { console.error('No uncommented DATABASE_URL in .env'); process.exit(1); }
const DATABASE_URL = line.replace(/^\s*DATABASE_URL\s*=/, '').trim();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function variantOf(userId, variants) {
  return pickVariant(experimentBucket(userId, KEY), variants);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  // Live experiment definition (real weights + status), so the prediction tracks
  // whatever the arms are today. Fall back to plain 50/50 A/B if the row is absent.
  const expRes = await client.query(
    `SELECT status, variants, scope FROM experiments WHERE key = $1 LIMIT 1`, [KEY],
  );
  const exp = expRes.rows[0];
  const variants = Array.isArray(exp?.variants) && exp.variants.length
    ? exp.variants
    : [{ key: 'A', weight: 50 }, { key: 'B', weight: 50 }];

  const armSummary = variants.map((v) => `${v.key}:${v.weight}`).join('  ');
  console.log(`\nExperiment  ${KEY}`);
  console.log(`Status      ${exp ? exp.status : '(row not found — assuming 50/50 A/B)'}`);
  console.log(`Arms        ${armSummary}   (control = ${variants[0].key})`);
  if (exp?.scope?.personaId) console.log(`Scope       personaId=${exp.scope.personaId} (Evelyn) — prediction applies to the Evelyn funnel`);
  console.log('');

  const args = process.argv.slice(2);

  if (args.length > 0) {
    const emails = args.filter((a) => !UUID_RE.test(a)).map((a) => a.toLowerCase());
    const ids = args.filter((a) => UUID_RE.test(a));
    const rows = [];
    if (emails.length) {
      const r = await client.query(
        `SELECT id, email FROM users WHERE lower(email) = ANY($1)`, [emails],
      );
      rows.push(...r.rows);
    }
    if (ids.length) {
      const r = await client.query(
        `SELECT id, email FROM users WHERE id = ANY($1)`, [ids],
      );
      rows.push(...r.rows);
    }
    const found = new Set(rows.map((r) => r.email?.toLowerCase()));
    const foundIds = new Set(rows.map((r) => r.id));
    for (const e of emails) if (!found.has(e)) console.log(`  (not found)   ${e}`);
    for (const id of ids) if (!foundIds.has(id)) console.log(`  (not found)   ${id}`);

    console.log('VARIANT  BUCKET  EMAIL                                   USER ID');
    for (const r of rows.sort((a, b) => (a.email || '').localeCompare(b.email || ''))) {
      const bucket = experimentBucket(r.id, KEY);
      const v = pickVariant(bucket, variants);
      console.log(`  ${v}      ${String(bucket).padStart(2)}     ${String(r.email || '').padEnd(38)}  ${r.id}`);
    }
    console.log('');
  } else {
    // No args → whole-DB distribution (sanity: should be ~50/50) + 20 newest users.
    const all = await client.query(`SELECT id FROM users`);
    const counts = {};
    for (const r of all.rows) {
      const v = variantOf(r.id, variants);
      counts[v] = (counts[v] || 0) + 1;
    }
    const total = all.rows.length || 1;
    console.log(`Split across all ${all.rows.length} users:`);
    for (const v of variants.map((x) => x.key)) {
      const n = counts[v] || 0;
      console.log(`  ${v}: ${String(n).padStart(6)}  (${((n / total) * 100).toFixed(1)}%)`);
    }
    console.log('');

    const recent = await client.query(
      `SELECT id, email FROM users ORDER BY created_at DESC LIMIT 20`,
    );
    console.log('20 newest accounts (handy for picking test logins):');
    console.log('VARIANT  BUCKET  EMAIL                                   USER ID');
    for (const r of recent.rows) {
      const bucket = experimentBucket(r.id, KEY);
      const v = pickVariant(bucket, variants);
      console.log(`  ${v}      ${String(bucket).padStart(2)}     ${String(r.email || '').padEnd(38)}  ${r.id}`);
    }
    console.log('\nTip: pass specific emails to check just your test accounts, e.g.');
    console.log('  node scripts/predict-paywall-variant.mjs you+a@gmail.com you+b@gmail.com\n');
  }
} finally {
  await client.end();
}
