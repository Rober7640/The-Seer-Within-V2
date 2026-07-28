#!/usr/bin/env node
/**
 * fb-palm-sign-funnel-stats — read-only funnel stats for ONE fb-palm sign,
 * emitted in Joel's house reporting format (Main CR / Overall CR / $ per visitor).
 *
 *   node scripts/fb-palm-sign-funnel-stats.mjs <sign> [--visitors N] [--days N]
 *   node scripts/fb-palm-sign-funnel-stats.mjs thumb-angle --visitors 1541
 *   node scripts/fb-palm-sign-funnel-stats.mjs thumb-angle --visitors 1541 --days 30
 *
 * ── WHY --visitors COMES FROM POSTHOG ────────────────────────────────────────
 * Joel's numbers divide by VISITORS. The DB has NO visitor row until email capture
 * (a `conversations` row is created at /api/lead), so the database cannot supply a
 * visitor count. Read it off PostHog: a `lander_view` Trends insight filtered to
 * event property `sign = thumb-angle` for the same window, and pass that number here.
 * Without --visitors the script still prints the DB funnel detail, but skips the
 * CR / $-per-visitor block (it would be wrong on a leads denominator).
 *
 * ── WHY THE TRANSCRIPT ───────────────────────────────────────────────────────
 * `conversations` has NO sign column, and every palm sign shares price_variant
 * `35_palm_u47`. The only DB way to isolate a sign is its UNIQUE opener mark text,
 * which lands in the stored transcript.
 *
 * ── JOEL'S DEFINITIONS (do not guess — see [[split-test-reporting-format-joel]]) ─
 *   Main CR    = main buys ÷ visitors
 *   Overall CR = (main + downsell buys) ÷ visitors
 *   $/visitor  = buy-counts × LIST PRICE, MAIN LINE ONLY (upsells EXCLUDED)
 *   buys       = confirmed-paid: main_paid_at IS NOT NULL OR (purchased AND upsell_offered)
 *                — NOT the raw `purchased` flag (that ~doubles the counts).
 *   List price = the row's own price_amount_cents (main) / downsell_amount_cents
 *                (downsell) — i.e. counts × list, not summed actual charges.
 *
 * STRICTLY READ-ONLY — SELECT only. Safe against production.
 */
import 'dotenv/config';
import pg from 'pg';

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const pos = [];
let VISITORS = null, WINDOW_DAYS = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--visitors') VISITORS = Number(argv[++i]);
  else if (argv[i] === '--days') WINDOW_DAYS = Number(argv[++i]);
  else pos.push(argv[i]);
}
const SIGN = pos[0] || 'thumb-angle';

// Each sign's UNIQUE opener mark lines (from client/src/content/palmReads.ts).
const MARKS = {
  'thumb-angle': ['runs true with the line of your thumb', 'pulls away from your thumb'],
};
const marks = MARKS[SIGN];
if (!marks) { console.error(`No mark lines defined for sign="${SIGN}". Add them to MARKS.`); process.exit(2); }
if (VISITORS !== null && (!Number.isFinite(VISITORS) || VISITORS <= 0)) {
  console.error('--visitors must be a positive number (read it off the PostHog lander_view insight).'); process.exit(2);
}

const url = new URL(process.env.DATABASE_URL);
url.port = '5432'; // session pooler — the :6543 txn pooler serves an empty search_path
const c = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
await c.connect();
if ((await c.query('SELECT 25006 AS k')).rows[0].k !== 25006) { console.error('canary failed'); process.exit(2); }

const markPreds = marks.map((_, i) => `messages ILIKE $${i + 1}`).join(' OR ');
const params = marks.map((m) => `%${m}%`);
let where = `(${markPreds})`;
if (WINDOW_DAYS) { where += ` AND created_at >= now() - ($${params.length + 1}::int * interval '1 day')`; params.push(WINDOW_DAYS); }

const PAID = `(main_paid_at IS NOT NULL OR (purchased AND upsell_offered))`;

const q = await c.query(`
  SELECT
    count(*)::int                                                                  AS leads,
    count(*) FILTER (WHERE conversation_state='PITCH' OR purchased)::int            AS reached_pitch,
    -- main vs downsell split (Joel needs both)
    count(*) FILTER (WHERE ${PAID} AND purchase_type='main')::int                   AS main_buys,
    count(*) FILTER (WHERE ${PAID} AND purchase_type='downsell')::int               AS downsell_buys,
    -- $/visitor is COUNTS × LIST PRICE: sum the row's own list price per confirmed buy
    COALESCE(sum(price_amount_cents)    FILTER (WHERE ${PAID} AND purchase_type='main'),0)::int     AS main_list_c,
    COALESCE(sum(downsell_amount_cents) FILTER (WHERE ${PAID} AND purchase_type='downsell'),0)::int AS downsell_list_c,
    -- upsells (the labelled extra)
    count(*) FILTER (WHERE upsell_offered)::int                                     AS u1_offered,
    count(*) FILTER (WHERE upsell_purchased)::int                                  AS u1_buys,
    COALESCE(sum(upsell_amount) FILTER (WHERE upsell_purchased),0)::int             AS u1_rev_c,
    count(*) FILTER (WHERE upsell2_offered)::int                                    AS u2_offered,
    count(*) FILTER (WHERE upsell2_purchased)::int                                 AS u2_buys,
    COALESCE(sum(upsell2_amount) FILTER (WHERE upsell2_purchased),0)::int           AS u2_rev_c,
    min(created_at) AS first_seen, max(created_at) AS last_seen
  FROM conversations WHERE ${where}`, params);

const r = q.rows[0];
const $ = (cents) => `$${(cents / 100).toFixed(2)}`;
const pct = (n, d) => (d ? `${(n / d * 100).toFixed(1)}%` : '—');
const totalBuys = r.main_buys + r.downsell_buys;
const mainLine_c = r.main_list_c + r.downsell_list_c;        // Joel's $/visitor numerator (main line only)
const total_c = mainLine_c + r.u1_rev_c + r.u2_rev_c;        // upsell-inclusive numerator

console.log(`\n  fb-palm · sign="${SIGN}"  ${WINDOW_DAYS ? `(last ${WINDOW_DAYS}d)` : '(all-time)'}`);
console.log(`  seen: ${String(r.first_seen ?? '—').slice(0,19)} → ${String(r.last_seen ?? '—').slice(0,19)}`);

// ── Joel's format (needs the PostHog visitor count) ──────────────────────────
if (VISITORS !== null) {
  const mainCR = r.main_buys / VISITORS, overallCR = totalBuys / VISITORS;
  const gapPts = (overallCR - mainCR) * 100;
  console.log(`\n  ══ JOEL FORMAT (visitors = ${VISITORS}, from PostHog lander_view · sign=${SIGN}) ══`);
  console.log(`  ${SIGN}`);
  console.log(`  - Main CR:    ${r.main_buys} ÷ ${VISITORS} = ${(mainCR*100).toFixed(2)}%`);
  console.log(`  - Overall CR: (${r.main_buys} + ${r.downsell_buys}) ÷ ${VISITORS} = ${(overallCR*100).toFixed(2)}%`);
  console.log(`  - the downsell rescued ${r.downsell_buys} buyer(s) who declined the main` +
              ` (Overall−Main gap = ${gapPts.toFixed(2)} pts = the downsell rescue rate)`);
  console.log(`\n  $ / visitor (MAIN LINE ONLY — Joel): ${$(mainLine_c)} ÷ ${VISITORS} = ${$(mainLine_c / VISITORS)}`);
  console.log(`      = (${r.main_buys} × main-list) + (${r.downsell_buys} × downsell-list), upsells EXCLUDED`);
  console.log(`  $ / visitor (incl upsells — labelled extra): ${$(total_c / VISITORS)}`);
} else {
  console.log(`\n  (no --visitors → skipping Joel's CR / $-per-visitor block; pass --visitors N from`);
  console.log(`   the PostHog lander_view insight filtered to sign=${SIGN} to get it)`);
}

// ── DB funnel detail (always) ────────────────────────────────────────────────
console.log(`\n  ── DB funnel detail (denominator = LEADS, not visitors) ──`);
console.log(`  Leads (email captured)   ${String(r.leads).padStart(6)}`);
console.log(`  Reached pitch            ${String(r.reached_pitch).padStart(6)}   ${pct(r.reached_pitch, r.leads)} of leads`);
console.log(`  Main buys                ${String(r.main_buys).padStart(6)}   list rev ${$(r.main_list_c)}`);
console.log(`  Downsell buys            ${String(r.downsell_buys).padStart(6)}   list rev ${$(r.downsell_list_c)}`);
console.log(`  Upsell 1 (offered→bought)${String(r.u1_offered).padStart(6)}→${r.u1_buys}   take ${pct(r.u1_buys, r.u1_offered)}   rev ${$(r.u1_rev_c)}`);
console.log(`  Upsell 2 (offered→bought)${String(r.u2_offered).padStart(6)}→${r.u2_buys}   take ${pct(r.u2_buys, r.u2_offered)}   rev ${$(r.u2_rev_c)}`);
console.log(`  TOTAL revenue (incl upsells) ${$(total_c)}\n`);

await c.end();
