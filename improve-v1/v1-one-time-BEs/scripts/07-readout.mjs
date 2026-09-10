// 07 · THE READOUT — revenue per 1,000 sends, per spread.
//
//   node improve-v1/v1-one-time-BEs/scripts/07-readout.mjs
//   node improve-v1/v1-one-time-BEs/scripts/07-readout.mjs --sends 76000   # flat denominator
//   node improve-v1/v1-one-time-BEs/scripts/07-readout.mjs --csv
//
// Plan task 0.5 (docs/07-marcus/07-30-DAY-PLAN.md). This is the number the whole 30-day
// test exists to produce: which named things earn.
//
// ⛔ RANK BY REVENUE PER 1,000 SENDS, NEVER BY BUY-RATE. Buy-rate hides upsell take and
//    ranked the V1 money sub-groups wrong. A spread that sells half as often at twice the
//    rung, with a bump attached, beats the popular one — and buy-rate says the opposite.
//
// READ-ONLY. Postgres is opened in a READ ONLY transaction behind a write canary that
// hard-exits if the connection turns out to be writable. Stripe is read with list/search
// calls only. Nothing here writes anywhere.
//
// ── WHERE EACH HALF OF THE MONEY LIVES, AND WHY THIS SCRIPT NEEDS BOTH ─────────────
// FRONT END + BUMP are on `be_orders` (reading_cents, bump_cents), keyed to the spread by
// the `spread_key` column added 2026-09-05.
//
// 🔴 THE UPSELLS ARE NOT IN THE DATABASE AT ALL. A BE upsell is a bare Stripe
// PaymentIntent — `/api/backend/upsell/charge` creates it with metadata
// { product: 'be_…', originalSession: <the booking cs_…> } and the webhook writes NO row
// for it (server/routes/webhooks.ts — `backendUpsellFor(product)`short-circuits before
// `recordBackendOrder`). So the only join from an upsell back to a spread is through
// Stripe metadata, and a DB-only readout would silently under-count exactly the revenue
// the operator said buy-rate hides. That is why this script talks to Stripe.
//
// ── SENDS: THE DENOMINATOR IS NOT IN THIS REPO ────────────────────────────────────
// A "send" is one AWeber delivery of that morning's letter. AWeber knows it (`total_sent`
// on a sent broadcast); nothing here does. So the denominator is supplied, per draw_date,
// by `scripts/07-sends.json`:
//     { "2026-09-08": 74210, "2026-09-09": 74180 }
// ⛔ A missing date is printed as "no send count" and ranked LAST — never defaulted to the
//    list size. A guessed denominator is a made-up ranking, which is worse than a gap.
//    `--sends N` applies one flat number to every date, for a quick look only.
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const SENDS_FILE = path.join(HERE, '07-sends.json');

const argv = process.argv.slice(2);
const flat = (() => {
  const i = argv.indexOf('--sends');
  if (i === -1) return null;
  const n = Number(argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : null;
})();
const asCsv = argv.includes('--csv');

// ── Credentials. env first, then an ACTIVE (uncommented) .env line at the repo root.
// Commented-out lines are deliberately ignored — silently reviving one is how you end up
// pointed at a database you did not mean to read.
function fromDotEnv(key) {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return undefined;
  const m = [...fs.readFileSync(p, 'utf8')
    .matchAll(new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, 'gm'))].pop();
  return m?.[1]?.trim().replace(/^["']|["']$/g, '');
}
const conn = process.env.DATABASE_URL ?? fromDotEnv('DATABASE_URL');
if (!conn) {
  console.error(
    'No DATABASE_URL.\n' +
    '  Pass it explicitly for this one command:\n' +
    '    DATABASE_URL="postgresql://..." node improve-v1/v1-one-time-BEs/scripts/07-readout.mjs\n' +
    '  (read-only — the canary below aborts if the connection can write)');
  process.exit(1);
}
const stripeKey = process.env.STRIPE_SECRET_KEY ?? fromDotEnv('STRIPE_SECRET_KEY');

const c = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await c.connect();

// ── Canary: prove the connection cannot write before reading anything. ──
await c.query('BEGIN TRANSACTION READ ONLY');
let canary = 'NOT RUN';
try { await c.query('UPDATE be_orders SET id=id WHERE false'); canary = 'WRITE ACCEPTED'; }
catch (e) { canary = e.code === '25006' ? 'rejected (25006) ✔' : 'unexpected ' + e.code; }
finally { await c.query('ROLLBACK'); }
console.log('Canary:', canary);
if (!canary.startsWith('rejected')) { await c.end(); process.exit(1); }

await c.query('BEGIN TRANSACTION READ ONLY');

// ── The orders. `spread_key IS NOT NULL` is the 07 filter — 02 and 03 leave it NULL.
// ⛔ Refunded and cancelled rows are excluded from revenue but COUNTED, because a spread
//    that sells and then refunds is not a winner and the raw table would call it one.
let orders;
try {
  ({ rows: orders } = await c.query(`
    SELECT id, stripe_session_id, spread_key, draw_date, tier, topic, status,
           reading_cents, bump_cents, bump_purchased
      FROM be_orders
     WHERE spread_key IS NOT NULL
     ORDER BY draw_date, created_at
  `));
} catch (err) {
  await c.query('ROLLBACK').catch(() => {});
  await c.end().catch(() => {});
  if (err.code === '42703') {
    // The intake columns are not on the table yet. Say which file adds them rather than
    // printing a Postgres stack trace at somebody trying to read a revenue table.
    console.error('\nbe_orders has no `spread_key` column, so no order can say which ' +
                  'morning sold it.');
    console.error('Run the migration first, and NOT `npm run db:push` (dev and prod share ' +
                  'one database):');
    console.error('  psql "$DATABASE_URL" -f migrations/2026-09-03-be-07-daily.sql\n');
    process.exit(1);
  }
  throw err;
}
await c.query('ROLLBACK');
await c.end();

if (orders.length === 0) {
  console.log('\nNo 07 orders yet — be_orders has no row with a spread_key.');
  console.log('Nothing has sent, so this is the expected reading today. The script is ' +
              'ready for the first one.\n');
  process.exit(0);
}

// ── The upsells, from Stripe. See the header: they exist nowhere else. ──
const upsellByOrder = new Map();   // stripe_session_id → { cents, products[] }
let upsellNote = '';
if (!stripeKey) {
  upsellNote = '⚠ No STRIPE_SECRET_KEY — UPSELLS ARE MISSING from every figure below. ' +
               'The ranking is front end + bump only, and that is the ranking the plan ' +
               'says not to trust.';
} else {
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeKey);
  for (const o of orders) {
    try {
      // Stripe's search index is the only way to reach a PI by its metadata. It lags
      // writes by up to a minute, which does not matter for a readout run over past days.
      const q = `metadata['originalSession']:'${o.stripe_session_id}'`;
      const found = await stripe.paymentIntents.search({ query: q, limit: 100 });
      let cents = 0;
      const products = [];
      for (const pi of found.data) {
        if (pi.status !== 'succeeded') continue;
        if (!pi.metadata?.product?.startsWith('be_')) continue;
        cents += pi.amount_received ?? pi.amount ?? 0;
        products.push(pi.metadata.product);
      }
      upsellByOrder.set(o.stripe_session_id, { cents, products });
    } catch (err) {
      upsellNote = `⚠ Stripe search failed on at least one order (${err.message}). ` +
                   'Upsell figures are incomplete.';
    }
  }
}

// ── The denominator. ──
let sendsByDate = {};
if (flat === null && fs.existsSync(SENDS_FILE)) {
  try { sendsByDate = JSON.parse(fs.readFileSync(SENDS_FILE, 'utf8')); }
  catch (e) { console.error(`Could not read ${SENDS_FILE}: ${e.message}`); process.exit(1); }
}
// Comment keys (anything starting '_') are documentation, not dates.
for (const k of Object.keys(sendsByDate)) if (k.startsWith('_')) delete sendsByDate[k];

// ── Roll up per spread. A spread may run on more than one date; sends add up across them.
const bySpread = new Map();
for (const o of orders) {
  let s = bySpread.get(o.spread_key);
  if (!s) {
    s = { key: o.spread_key, dates: new Set(), orders: 0, refunded: 0,
          front: 0, bump: 0, bumps: 0, upsell: 0, upsellOrders: 0, tiers: {} };
    bySpread.set(o.spread_key, s);
  }
  if (o.draw_date) s.dates.add(o.draw_date);
  s.orders += 1;
  const live = o.status === 'paid';
  if (!live) { s.refunded += 1; continue; }
  s.front += Number(o.reading_cents) || 0;
  s.bump += Number(o.bump_cents) || 0;
  if (o.bump_purchased) s.bumps += 1;
  if (o.tier) s.tiers[o.tier] = (s.tiers[o.tier] || 0) + 1;
  const up = upsellByOrder.get(o.stripe_session_id);
  if (up && up.cents > 0) { s.upsell += up.cents; s.upsellOrders += 1; }
}

const missingSends = new Set();
const rows = [...bySpread.values()].map((s) => {
  const total = s.front + s.bump + s.upsell;
  let sends = 0;
  let known = true;
  for (const d of s.dates) {
    const n = flat ?? sendsByDate[d];
    if (typeof n === 'number' && n > 0) sends += n;
    else { known = false; missingSends.add(d); }
  }
  return {
    ...s,
    total,
    sends: known ? sends : null,
    per1k: known && sends > 0 ? (total / sends) * 1000 : null,
  };
});

// ⛔ The ranking. Revenue per 1,000 sends, descending. Rows with no send count cannot be
//    ranked and go to the bottom rather than being given a made-up denominator.
rows.sort((a, b) => (b.per1k ?? -1) - (a.per1k ?? -1));

const usd = (cents) => '$' + (cents / 100).toFixed(2);
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

if (asCsv) {
  console.log('rank,spread_key,dates,sends,orders,refunded,front_cents,bump_cents,' +
              'upsell_cents,total_cents,revenue_per_1000_usd');
  rows.forEach((r, i) => console.log([
    r.per1k === null ? '' : i + 1, r.key, [...r.dates].join('|'), r.sends ?? '',
    r.orders, r.refunded, r.front, r.bump, r.upsell, r.total,
    r.per1k === null ? '' : (r.per1k / 100).toFixed(2),
  ].join(',')));
} else {
  const w = Math.max(18, ...rows.map((r) => r.key.length));
  console.log('\n07 · REVENUE PER 1,000 SENDS, BY SPREAD');
  console.log('⛔ Ranked by revenue per 1,000 — never by buy-rate.\n');
  console.log(pad('spread', w), lpad('rev/1k', 10), lpad('sends', 8), lpad('orders', 7),
              lpad('front', 10), lpad('bump', 9), lpad('upsell', 10), lpad('total', 10));
  console.log('─'.repeat(w + 66));
  for (const r of rows) {
    console.log(
      pad(r.key, w),
      lpad(r.per1k === null ? 'no sends' : usd(r.per1k), 10),
      lpad(r.sends === null ? '—' : r.sends.toLocaleString(), 8),
      lpad(r.refunded ? `${r.orders}(-${r.refunded})` : r.orders, 7),
      lpad(usd(r.front), 10), lpad(usd(r.bump), 9),
      lpad(usd(r.upsell), 10), lpad(usd(r.total), 10),
    );
  }
  const t = rows.reduce((a, r) => ({
    front: a.front + r.front, bump: a.bump + r.bump,
    upsell: a.upsell + r.upsell, total: a.total + r.total, orders: a.orders + r.orders,
  }), { front: 0, bump: 0, upsell: 0, total: 0, orders: 0 });
  console.log('─'.repeat(w + 66));
  console.log(pad('ALL', w), lpad('', 10), lpad('', 8), lpad(t.orders, 7),
              lpad(usd(t.front), 10), lpad(usd(t.bump), 9),
              lpad(usd(t.upsell), 10), lpad(usd(t.total), 10));

  // The tier mix, because 07-C5's whole bet is that she buys more than one question.
  console.log('\nTier mix (paid orders):');
  for (const r of rows) {
    const parts = ['spread', 'pattern', 'table']
      .map((k) => `${k} ${r.tiers[k] || 0}`).join('  ·  ');
    console.log(` ${pad(r.key, w)} ${parts}   bump ${r.bumps}   upsold ${r.upsellOrders}`);
  }
}

if (upsellNote) console.log('\n' + upsellNote);
if (missingSends.size) {
  console.log(`\n⚠ No send count for: ${[...missingSends].sort().join(', ')}`);
  console.log(`  Add them to ${path.relative(ROOT, SENDS_FILE)} (AWeber's total_sent for ` +
              `that morning's broadcast). Those spreads cannot be ranked until you do.`);
}
console.log('');
