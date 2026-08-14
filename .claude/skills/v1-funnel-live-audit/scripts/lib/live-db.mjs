// Shared read-only DB access for the v1-funnel-live-audit skill.
//
// WHY THIS FILE EXISTS. The skill has two scripts that read the SAME production
// table and must agree on the SAME numbers: audit-live.mjs ("is anything broken?")
// and diagnose-live.mjs ("why did the number move?"). If each carried its own copy
// of the target gate, the canary, and — most dangerously — the definition of a
// SALE, the two would drift and start reporting different revenue for the same
// window. The skill would then be worse than no skill: two sources of truth.
//
// Everything that both scripts must agree on lives here and nowhere else.
import pg from 'pg';
import fs from 'node:fs';

// Naive `timestamp` columns are stored UTC — parse as UTC (same fix as server/lib/db.ts).
pg.types.setTypeParser(1114, (s) => new Date(s.replace(' ', 'T') + 'Z'));
pg.types.setTypeParser(1184, (s) => new Date(s));

/**
 * 🔴 THE definition of a confirmed front-end sale. Do not inline a variant of this
 * anywhere else in the skill.
 *
 * NOT the raw `purchased` flag: that is set at checkout-CLICK, before payment, so
 * on its own it counts abandoned Stripe sessions as sales (the first live run
 * inflated "paid" ~2.5×). A real sale is either webhook-stamped (main_paid_at) or
 * reached the post-payment upsell page (upsell_offered) — the same definition the
 * /admin/price-test dashboard uses.
 */
export const PAID = '(main_paid_at IS NOT NULL OR (purchased AND upsell_offered))';

/**
 * The in-test purchase clause for experiment tallies, mirroring V1_IN_TEST_PURCHASE
 * in server/lib/experiments.ts. Stricter than PAID on purpose: a tally must exclude
 * purchases that PREDATE the exposure, the failure mode that reversed the order-bump
 * result in 2026-08. Assumes the conversation is aliased `c` and the exposure `e`.
 */
export const IN_TEST_PURCHASE = 'c.main_paid_at IS NOT NULL AND c.main_paid_at >= e.created_at';

/** Map a conversations.price_variant to the lander family it belongs to. */
export const FUNNEL_CASE = `CASE
  WHEN price_variant ILIKE '%tarot%' THEN 'tarot'
  WHEN price_variant ILIKE '%palm%'  THEN 'palm'
  ELSE 'other' END`;

/** SQL predicate restricting conversations to one funnel family (or all of them). */
export function funnelFilter(funnel) {
  if (!funnel || funnel === 'all') return 'TRUE';
  if (funnel === 'other') return `price_variant NOT ILIKE '%tarot%' AND price_variant NOT ILIKE '%palm%'`;
  return `price_variant ILIKE '%${funnel.replace(/[^a-z0-9_-]/gi, '')}%'`;
}

export const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');
export const money = (c) => (c == null ? 'null' : `$${(c / 100).toFixed(2)}`);
export const dollars = (c) => `$${Math.round(Number(c) / 100).toLocaleString()}`;
export const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

/** Relative change, guarding the divide-by-zero that makes a 0→n jump read as Infinity. */
export function relChange(now, before) {
  if (!before) return null;
  return (now - before) / before;
}

/**
 * Two-proportion z-test. Returned so an arm-vs-arm gap can be reported as
 * "directional" rather than "the winner", which is the mistake that costs money
 * in both directions: shipping noise, and ignoring a real loss because it has not
 * yet crossed p<0.05 while it holds most of the traffic.
 */
export function twoProportionZ(a, na, b, nb) {
  if (!na || !nb) return null;
  const p1 = a / na, p2 = b / nb;
  const p = (a + b) / (na + nb);
  const se = Math.sqrt(p * (1 - p) * (1 / na + 1 / nb));
  if (!se) return null;
  const z = (p1 - p2) / se;
  // Two-sided p via an Abramowitz & Stegun normal-CDF approximation.
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p_ = d * t * (1.330274 * t ** 4 - 1.821256 * t ** 3 + 1.781478 * t ** 2 - 0.356538 * t + 0.319381);
  return { z, p: 2 * p_ };
}

/**
 * Resolve the target, enforce the two-key gate, connect, and PROVE read-only with a
 * canary write that Postgres must reject with SQLSTATE 25006.
 *
 * A localhost/127.0.0.1 DATABASE_URL is LOCAL mode (safe, no flag). Anything else is
 * the shared production DB (dev and prod share one), so it needs BOTH `--live` and
 * LIVE_AUDIT_CONFIRM=1. Returns { client, mode, redactedHost, isLocal }.
 */
export async function connectReadOnly({ live }) {
  const envFile = live ? '.env' : '.env.sandbox';
  if (!fs.existsSync(envFile)) { console.error(`🔴 env file not found: ${envFile}`); process.exit(2); }
  const m = [...fs.readFileSync(envFile, 'utf8').matchAll(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/gm)].pop();
  if (!m) { console.error(`🔴 no DATABASE_URL in ${envFile}`); process.exit(2); }
  const url = m[1].trim().replace(/^["']|["']$/g, '');

  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /\/\/(localhost|127\.0\.0\.1)[:/]/.test(url);
  const redactedHost = url.replace(/:\/\/([^:]+):[^@]*@/, '://$1:***@').split('?')[0];

  if (!isLocal && (!live || process.env.LIVE_AUDIT_CONFIRM !== '1')) {
    console.error(`\n🔴 REFUSING to touch a non-local DB without explicit confirmation.`);
    console.error(`   Target would be: ${redactedHost}`);
    console.error(`   This is the LIVE / SHARED production DB. To run it:`);
    console.error(`     LIVE_AUDIT_CONFIRM=1 node <script> --live [--days 30]`);
    console.error(`   (Strictly read-only — READ ONLY transaction + canary — but it reads real`);
    console.error(`    customer data, so it must be run deliberately.)\n`);
    process.exit(2);
  }

  const client = new pg.Client({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });
  await client.connect();

  // CANARY — a write inside READ ONLY must be rejected, or we refuse to read at all.
  let canary = 'NOT RUN';
  await client.query('BEGIN TRANSACTION READ ONLY');
  try {
    await client.query('UPDATE conversations SET id = id WHERE false');
    canary = 'WRITE ACCEPTED — READ ONLY NOT ENFORCED';
  } catch (e) {
    canary = e?.code === '25006' ? 'rejected (SQLSTATE 25006) ✔' : `rejected (unexpected: ${e?.code} ${e?.message})`;
  } finally {
    await client.query('ROLLBACK');
  }
  if (!canary.startsWith('rejected')) {
    console.error(`🔴 ABORT: canary write was not rejected (${canary}) — refusing to run.`);
    await client.end();
    process.exit(1);
  }

  return { client, canary, isLocal, redactedHost, mode: isLocal ? 'LOCAL SANDBOX' : 'LIVE / SHARED PRODUCTION DB' };
}

/** Open the single READ ONLY transaction every read runs inside. */
export async function beginReads(client, timeoutMs = 90000) {
  await client.query('BEGIN TRANSACTION READ ONLY');
  await client.query("SET LOCAL timezone = 'UTC'");
  await client.query(`SET LOCAL statement_timeout = ${Number(timeoutMs)}`);
}
