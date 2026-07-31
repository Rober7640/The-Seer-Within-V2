#!/usr/bin/env node
/**
 * palm-gate-by-sign — the commitment-gate A/B, BROKEN DOWN BY fb-palm SIGN,
 * in Joel's house reporting format as far as an A/B test legitimately allows.
 *
 *   node scripts/palm-gate-by-sign.mjs
 *   node scripts/palm-gate-by-sign.mjs --visitors thumb=4200,hand-size=1800
 *   node scripts/palm-gate-by-sign.mjs --min 40      # hide signs under 40 leads
 *
 * ── 🔴 READ THIS FIRST: WHY THE PER-ARM DENOMINATOR IS LEADS, NOT VISITORS ───
 * Joel's format divides by VISITORS (see [[split-test-reporting-format-joel]]):
 *   Main CR    = main buys ÷ visitors
 *   Overall CR = (main + downsell buys) ÷ visitors
 *   $/visitor  = buy-counts × LIST PRICE, MAIN LINE ONLY (upsells excluded)
 *
 * That works for comparing LANDERS. It cannot work for comparing ARMS, because
 * of WHEN randomisation happens: a visitor is assigned an arm at EMAIL CAPTURE
 * (/api/lead → resolvePalmGate). Someone who lands on the quiz and leaves without
 * entering an email is never assigned to anything. There is no arm to attribute
 * their visit to — not in the DB, and not in PostHog either, which sees the
 * lander view but cannot know an arm that does not yet exist.
 *
 * So the honest per-arm denominator is EXPOSURES (= leads, email captured), and
 * every per-arm CR below is buys ÷ leads. It is a valid A/B comparison — both
 * arms are drawn from the same population by an email hash — it is simply not
 * the same ratio as Joel's visitor CR, and the two must never be quoted as if
 * they were.
 *
 * Pass --visitors to ALSO get true Joel-format numbers per LANDER (both arms
 * combined), which is the level at which visitor counts are meaningful. Read
 * those off a PostHog `lander_view` Trends insight filtered to `sign`.
 *
 * ── BUY DEFINITION ───────────────────────────────────────────────────────────
 * Joel's confirmed-paid: main_paid_at IS NOT NULL OR (purchased AND
 * upsell_offered) — `purchased` alone is set optimistically at checkout. Verified
 * 2026-07-28 against live palm data: identical to the dashboard's stricter
 * (purchased AND upsell_offered) — 151 vs 151, 0 missed. The script prints a
 * warning if that ever stops being true, so a divergence surfaces instead of
 * silently splitting the two reports.
 *
 * Revenue is COUNTS × LIST PRICE (the row's own price_amount_cents /
 * downsell_amount_cents), main line only, upsells excluded — Joel's definition,
 * not the sum of actual charges.
 *
 * ── SCOPE ────────────────────────────────────────────────────────────────────
 * Per-sign rows are a DIAGNOSTIC. Decide the test on the pooled row: with ~11
 * signs the best-looking one will show a large lift by chance alone.
 *
 * STRICTLY READ-ONLY — SELECT only. Safe against production.
 */
import 'dotenv/config';
import pg from 'pg';

const KEY = 'v1_palm_commitment_gate_2026';
const CONTROL = 'A';
const TREATMENT = 'B';

const argv = process.argv.slice(2);
let MIN = 0;
const VISITORS = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--min') MIN = Number(argv[++i]) || 0;
  else if (argv[i] === '--visitors') {
    for (const pair of String(argv[++i] ?? '').split(',')) {
      const [s, n] = pair.split('=');
      if (s && Number(n) > 0) VISITORS[s.trim()] = Number(n);
    }
  }
}

const raw = process.env.DATABASE_URL;
if (!raw) { console.error('No DATABASE_URL'); process.exit(2); }
const url = raw.replace(':6543/', ':5432/'); // session pooler — :6543 serves an empty search_path
const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(url);
const pool = new pg.Pool({ connectionString: url, ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }) });

if ((await pool.query('SELECT 25006 AS k')).rows[0].k !== 25006) { console.error('canary failed'); process.exit(2); }

const { rows: [exp] } = await pool.query(
  `SELECT status, to_char(started_at,'YYYY-MM-DD HH24:MI') AS started, conversion
     FROM experiments WHERE key = $1`, [KEY]);
if (!exp) { console.error(`no experiment '${KEY}' — has migrateExperiments been run?`); process.exit(2); }
if (!exp.started) {
  console.log(`\n  '${KEY}' is ${exp.status} and has never been started — no exposures yet.\n`);
  await pool.end(); process.exit(0);
}
const targetN = Number(exp.conversion?.targetN ?? 0);

// Joel's confirmed-paid, plus the dashboard's stricter definition so a divergence
// between this report and /admin/experiments can never hide.
const PAID = `(c.main_paid_at IS NOT NULL OR (c.purchased AND c.upsell_offered))`;
const PAID_DASH = `(c.purchased AND c.upsell_offered)`;

const { rows } = await pool.query(`
  SELECT CASE
           -- /fb-tarot rows carry no sign (normalizeSign is palm-only), so without this
           -- every tarot lander would collapse into '(unrecorded)' and read as
           -- unattributed PALM traffic. Labelled by facing/angle, the same four landers
           -- the dashboard's "By fb-tarot lander" table shows.
           WHEN e.context->>'facing' IS NOT NULL THEN
             'T:' || (CASE e.context->>'facing' WHEN 'up' THEN 'FaceUp' WHEN 'down' THEN 'FaceDown'
                                                ELSE e.context->>'facing' END)
                  || '/' || COALESCE(e.context->>'angle', '?')
           -- Any other sign-less row is labelled with the funnel it DID carry, so the
           -- catch-all bucket can never silently masquerade as fb-palm.
           ELSE COALESCE(e.context->>'sign',
                  CASE WHEN e.context->>'funnel' IS NOT NULL
                       THEN '(unrecorded: ' || (e.context->>'funnel') || ')'
                       ELSE '(unrecorded)' END)
         END                                                                       AS sign,
         e.variant                                                                 AS variant,
         count(*)::int                                                             AS leads,
         count(*) FILTER (WHERE ${PAID} AND c.purchase_type='main')::int           AS main_buys,
         count(*) FILTER (WHERE ${PAID} AND c.purchase_type='downsell')::int       AS ds_buys,
         COALESCE(sum(c.price_amount_cents)
                  FILTER (WHERE ${PAID} AND c.purchase_type='main'), 0)::int       AS main_list_c,
         COALESCE(sum(c.downsell_amount_cents)
                  FILTER (WHERE ${PAID} AND c.purchase_type='downsell'), 0)::int   AS ds_list_c,
         count(*) FILTER (WHERE ${PAID})::int                                      AS paid_joel,
         count(*) FILTER (WHERE ${PAID_DASH})::int                                 AS paid_dash
    FROM experiment_exposures e
    LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
   WHERE e.experiment_key = $1
   GROUP BY 1, 2`, [KEY]);

const blank = () => ({ leads: 0, main_buys: 0, ds_buys: 0, main_list_c: 0, ds_list_c: 0, paid_joel: 0, paid_dash: 0 });
const bySign = new Map();
for (const r of rows) {
  if (!bySign.has(r.sign)) bySign.set(r.sign, { [CONTROL]: blank(), [TREATMENT]: blank() });
  bySign.get(r.sign)[r.variant] = r;
}

const $ = (c) => `$${(c / 100).toFixed(2)}`;
const pctS = (n, d) => (d ? `${(n / d * 100).toFixed(2)}%` : '—');
const add = (t, r) => { for (const k of Object.keys(t)) t[k] += r[k] ?? 0; return t; };

const zTest = (a, b, key) => {
  const [na, nb] = [a.leads, b.leads];
  if (!na || !nb) return null;
  const [xa, xb] = [a[key], b[key]];
  const p = (xa + xb) / (na + nb);
  const se = Math.sqrt(p * (1 - p) * (1 / na + 1 / nb));
  return se > 0 ? (xb / nb - xa / na) / se : null;
};

function armLine(label, arm, r) {
  const overall = r.main_buys + r.ds_buys;
  const mainLine = r.main_list_c + r.ds_list_c; // Joel: main line only, upsells excluded
  return `  ${label.padEnd(22)} ${arm.padEnd(3)} ${String(r.leads).padStart(6)} ` +
         `${String(r.main_buys).padStart(5)} ${pctS(r.main_buys, r.leads).padStart(8)} ` +
         `${String(overall).padStart(6)} ${pctS(overall, r.leads).padStart(8)} ` +
         `${$(mainLine).padStart(10)} ${$(r.leads ? mainLine / r.leads : 0).padStart(9)}`;
}

console.log(`\n  ${KEY}  ·  status=${exp.status}  ·  started ${exp.started}`);
console.log(`  A = control (plain button)   B = commitment gate`);
console.log(`\n  🔴 DENOMINATOR = LEADS (email captured), NOT visitors. An arm is assigned AT`);
console.log(`     email capture, so a visitor who never enters an email belongs to no arm and`);
console.log(`     cannot be counted here. Per-arm "visitor CR" does not exist. See --visitors`);
console.log(`     for true Joel-format numbers at the LANDER level (both arms combined).\n`);
console.log(`  ${'lander'.padEnd(22)} ${'arm'.padEnd(3)} ${'leads'.padStart(6)} ${'main'.padStart(5)} ${'MainCR'.padStart(8)} ${'ovr'.padStart(6)} ${'OvrCR'.padStart(8)} ${'$ main-line'.padStart(10)} ${'$/lead'.padStart(9)}`);
console.log(`  ${'-'.repeat(88)}`);

const totals = { [CONTROL]: blank(), [TREATMENT]: blank() };
const hidden = [];
let dashMismatch = 0;

for (const [sign, arms] of [...bySign.entries()].sort()) {
  const a = arms[CONTROL], b = arms[TREATMENT];
  add(totals[CONTROL], a); add(totals[TREATMENT], b);
  dashMismatch += (a.paid_joel - a.paid_dash) + (b.paid_joel - b.paid_dash);

  if (a.leads + b.leads < MIN) { hidden.push(sign); continue; }

  console.log(armLine(sign, CONTROL, a));
  console.log(armLine('', TREATMENT, b));

  const zMain = zTest(a, b, 'main_buys');
  const liftMain = a.main_buys && a.leads && b.leads
    ? ((b.main_buys / b.leads) / (a.main_buys / a.leads) - 1) * 100 : null;
  console.log(`  ${''.padEnd(22)} →   gate Main-CR lift ${liftMain === null ? '—' : `${liftMain >= 0 ? '+' : ''}${liftMain.toFixed(1)}%`}` +
              `${zMain === null ? '' : `  z=${zMain.toFixed(2)}`}   · observed split B=${((b.leads / (a.leads + b.leads)) * 100 || 0).toFixed(1)}% (target 30%)`);

  if (VISITORS[sign]) {
    const v = VISITORS[sign];
    const mb = a.main_buys + b.main_buys, ob = mb + a.ds_buys + b.ds_buys;
    const ml = a.main_list_c + b.main_list_c + a.ds_list_c + b.ds_list_c;
    console.log(`  ${''.padEnd(22)} ══  JOEL FORMAT · lander total, both arms · visitors=${v} (PostHog)`);
    console.log(`  ${''.padEnd(22)}     Main CR ${mb}÷${v} = ${pctS(mb, v)}  ·  Overall CR ${ob}÷${v} = ${pctS(ob, v)}  ·  $/visitor ${$(ml / v)}`);
  }
  console.log('');
}

console.log(`  ${'-'.repeat(88)}`);
console.log(armLine('ALL LANDERS (pooled)', CONTROL, totals[CONTROL]));
console.log(armLine('', TREATMENT, totals[TREATMENT]));
const zAll = zTest(totals[CONTROL], totals[TREATMENT], 'main_buys');
const liftAll = totals[CONTROL].main_buys && totals[CONTROL].leads && totals[TREATMENT].leads
  ? ((totals[TREATMENT].main_buys / totals[TREATMENT].leads) / (totals[CONTROL].main_buys / totals[CONTROL].leads) - 1) * 100 : null;
console.log(`  ${''.padEnd(22)} →   gate Main-CR lift ${liftAll === null ? '—' : `${liftAll >= 0 ? '+' : ''}${liftAll.toFixed(1)}%`}` +
            `${zAll === null ? '' : `  z=${zAll.toFixed(2)}`}   ⟵ THIS is the decision number`);

if (hidden.length) console.log(`\n  (hidden, under --min ${MIN}: ${hidden.join(', ')})`);

if (dashMismatch !== 0) {
  console.log(`\n  ⚠ ${dashMismatch} buyer(s) counted by Joel's confirmed-paid definition but NOT by the`);
  console.log(`    dashboard's (purchased AND upsell_offered). This report and /admin/experiments`);
  console.log(`    will now disagree by that amount — worth reconciling before quoting both.`);
}

if (targetN) {
  const minArm = Math.min(totals[CONTROL].leads, totals[TREATMENT].leads);
  console.log(`\n  pre-registered targetN: ${minArm}/${targetN} on the smaller arm` +
              `${minArm >= targetN ? '  ✅ reached — the verdict is unlocked' : '  ⏳ NOT reached — do not call the test yet'}`);
}

if (!Object.keys(VISITORS).length) {
  console.log(`\n  ⓘ For true Joel-format (visitor-denominated) numbers per lander, pass visitor`);
  console.log(`    counts from the PostHog lander_view insight filtered by sign, e.g.`);
  console.log(`      node scripts/palm-gate-by-sign.mjs --visitors thumb=4200,hand-size=1800`);
  console.log(`    Those are LANDER totals (both arms) — per-arm visitor counts do not exist.`);
}

console.log(`\n  ⚠ Per-sign rows are a DIAGNOSTIC, not a decision tool. With ~11 signs the`);
console.log(`    best-looking one will show a large "lift" by chance alone. Decide on the`);
console.log(`    pooled row, and only once targetN is reached.\n`);

await pool.end();
