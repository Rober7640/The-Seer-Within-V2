#!/usr/bin/env node
/**
 * tarot-version-report — the /fb-tarot Version B (smart template) vs C (LLM) split,
 * in Joel's house reporting format, pooled AND broken down per ad URL.
 *
 *   node scripts/tarot-version-report.mjs
 *   node scripts/tarot-version-report.mjs --min 50     # hide ad URLs under 50 chats
 *   node scripts/tarot-version-report.mjs --since 2026-08-15
 *
 * ── 🔑 WHY THIS ONE CAN DO WHAT palm-gate-by-sign.mjs CANNOT ─────────────────
 * That script carries a long apology for dividing by LEADS instead of visitors:
 * the commitment gate assigns an arm at EMAIL CAPTURE, so a visitor who lands and
 * leaves without an email was never assigned to anything and there is no arm to
 * attribute her visit to.
 *
 * This test is assigned as the CHAT OPENS, before any email. So every arm has a
 * genuine pre-email denominator — chats started — and Main CR / Overall CR /
 * $ per visitor are computed on it directly. This is the first V1 arm-level test
 * where those ratios are honest per arm rather than a lead-level stand-in.
 *
 * ⚠️ Still not identical to Joel's LANDER numbers: his denominator is lander
 * views, and this one starts one step later, at the chat. Anyone who bounces on
 * the lander is in neither arm — correctly, since the lander is byte-identical in
 * B and C, so those bounces would be pure noise added equally to both sides. Quote
 * these as "per chat", never as "per visitor to the lander".
 *
 * ── JOEL'S DEFINITIONS (do not guess — see [[split-test-reporting-format-joel]]) ─
 *   Main CR    = main buys ÷ chats
 *   Overall CR = (main + downsell buys) ÷ chats
 *   $/chat     = buy-counts × LIST PRICE, MAIN LINE ONLY (upsells EXCLUDED),
 *                from the row's own price_amount_cents / downsell_amount_cents —
 *                NOT the sum of actual charges.
 * "Overall CR is always ≥ Main CR — the gap between them is your downsell rescue
 * rate." The upsell-inclusive number is printed separately and clearly labelled,
 * because it does NOT match his post and must never be quoted as if it did.
 *
 * ── BUY DEFINITION ──────────────────────────────────────────────────────────
 * main_paid_at IS NOT NULL AND main_paid_at >= exposure.created_at — the SAME
 * in-test definition the dashboard uses (V1_IN_TEST_PURCHASE), so this report and
 * /admin/experiments can never disagree. The date constraint is load-bearing: on
 * the order-bump cohort, counting purchases that PREDATED the exposure inflated
 * one arm 35% and REVERSED the result (2026-08-06, verified against Stripe).
 *
 * ── PER-AD-URL ROWS ─────────────────────────────────────────────────────────
 * This is the "which hook is B winning on" table. Read it as a DIAGNOSTIC unless a
 * URL was pre-registered: with several ad URLs the best-looking one shows a large
 * lift by chance alone. It IS the honest read when landers were appended mid-test,
 * because the pooled row then blends cohorts with different runtimes.
 *
 * STRICTLY READ-ONLY — SELECT only, behind a read-only session + a proven canary.
 * Safe against production.
 */
import 'dotenv/config';
import pg from 'pg';

const KEY = 'v1_tarot_version_bc_2026';
const CONTROL = 'C';    // incumbent — must be variants[0]
const TREATMENT = 'B';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const MIN = parseInt(flag('min', '0'), 10) || 0;
const SINCE = flag('since', null);

const raw = process.env.DATABASE_URL;
if (!raw) { console.error('No DATABASE_URL'); process.exit(2); }
// 🔴 Never the transaction pooler (:6543) — empty search_path, unqualified table
// names fail with 42P01. See the 2026-07-10 prod outage.
const url = new URL(raw);
url.port = '5432';
const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });

const pct = (n, d) => (d > 0 ? (100 * n) / d : 0);
const f2 = (x) => x.toFixed(2);
const usd = (cents) => `$${(cents / 100).toFixed(2)}`;

// Two-proportion z-test (same maths as finalizeStats in server/lib/experiments.ts).
function ztest(xa, na, xb, nb) {
  if (!na || !nb) return null;
  const pa = xa / na, pb = xb / nb, p = (xa + xb) / (na + nb);
  const se = Math.sqrt(p * (1 - p) * (1 / na + 1 / nb));
  if (!se) return null;
  const z = (pb - pa) / se;
  const pv = 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2)));
  return { z, p: pv };
}
function erf(x) {
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return y;
}

function armBlock(label, r, priceNote) {
  const mainCR = pct(r.main_buys, r.chats);
  const overallCR = pct(r.main_buys + r.ds_buys, r.chats);
  const mainLine = r.main_list_c + r.ds_list_c;   // Joel: main line only
  console.log(`\n${label}${priceNote ? ` (${priceNote})` : ''}`);
  console.log(`- Main CR: ${r.main_buys} ÷ ${r.chats} = ${f2(mainCR)}%`);
  console.log(`- Overall CR: (${r.main_buys} + ${r.ds_buys}) ÷ ${r.chats} = ${f2(overallCR)}%`);
  console.log(`- $ per chat: ${usd(mainLine)} ÷ ${r.chats} = ${usd(r.chats ? mainLine / r.chats : 0)}`);
  const rescue = overallCR - mainCR;
  console.log(`- downsell rescued ${r.ds_buys} more (${f2(rescue)}pp on top of Main CR)`);
  // perChat is CENTS per chat — usd() does the /100. Do not scale it again.
  return { mainCR, overallCR, perChat: r.chats ? mainLine / r.chats : 0 };
}

const blank = () => ({ chats: 0, main_buys: 0, ds_buys: 0, main_list_c: 0, ds_list_c: 0, buyers: 0, ups_c: 0 });

try {
  await client.connect();
  await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
  const ro = (await client.query(`SELECT current_setting('transaction_read_only') AS ro`)).rows[0].ro;
  if (ro !== 'on') { console.error('REFUSING: read-only guard not in force'); process.exit(2); }
  // Canary: WHERE false touches nothing even if the guard were off, so it is safe
  // either way — but it MUST be rejected, or the guard is protecting nothing.
  let blocked = false;
  try { await client.query('UPDATE conversations SET id = id WHERE false'); }
  catch (e) { blocked = /read-only|read only/i.test(e.message); }
  if (!blocked) { console.error('REFUSING: canary write was not rejected'); process.exit(2); }

  // 🔴 started_at AS TEXT, deliberately. It is `timestamp without time zone`, and this
  // script uses raw pg — which has none of the type-parser overrides server/lib/db.ts
  // installs, so the driver would read the naive string in the LOCAL zone. On an IST
  // machine against a UTC database that shifts the cohort anchor 5.5 HOURS EARLIER.
  // The same class of mistake once made a working 30/70 split read as 50/50. Reading
  // the raw text and appending 'Z' keeps the anchor on the DB's clock — the clock the
  // exposure rows are stamped on, which is the only one that matters here.
  const { rows: [exp] } = await client.query(
    `SELECT status, variants::text AS variants, scope::text AS scope,
            started_at::text AS started_at_raw,
            current_setting('TimeZone') AS db_tz
     FROM experiments WHERE key = $1`, [KEY]);
  if (!exp) { console.error(`experiment ${KEY} not found on this database`); process.exit(2); }
  if (exp.db_tz !== 'UTC') {
    console.log(`⚠️  database TimeZone is '${exp.db_tz}', not UTC — check the cohort anchor by hand.`);
  }

  const variants = JSON.parse(exp.variants);
  const scope = JSON.parse(exp.scope ?? '{}');
  const start = SINCE ?? (exp.started_at_raw ? exp.started_at_raw.replace(' ', 'T') + 'Z' : null);

  console.log('═'.repeat(74));
  console.log('  /fb-tarot — Version B (smart template) vs C (LLM)');
  console.log('═'.repeat(74));
  console.log(`status      : ${exp.status}${exp.status !== 'running' ? '   ⚠️ not running' : ''}`);
  console.log(`split       : ${variants.map((v) => `${v.key}=${v.weight}`).join(' / ')}  (C = control)`);
  console.log(`ad URLs     : ${(scope.landers ?? []).length} enrolled`);
  console.log(`cohort from : ${start ?? '(never started)'}`);
  if (!start) { console.log('\nNothing to report — the test has not been started.'); process.exit(0); }

  // 🔴 LATERAL, not a plain join: one visitor can produce several conversations
  // (she returns, or uses a second email). A plain join would count her as several
  // chats AND several buyers, inflating whichever arm holds the repeat visitors —
  // and on this funnel repeat visitors are ~23% of sessions but ~57% of main buys.
  const { rows } = await client.query(`
    SELECT e.variant                                    AS variant,
           COALESCE(e.context->>'hook','(unrecorded)')  AS hook,
           COALESCE(e.context->>'deck','(unrecorded)')  AS deck,
           count(*)::int                                AS chats,
           COALESCE(sum(p.main_buys),0)::int            AS main_buys,
           COALESCE(sum(p.ds_buys),0)::int              AS ds_buys,
           COALESCE(sum(p.main_list_c),0)::int          AS main_list_c,
           COALESCE(sum(p.ds_list_c),0)::int            AS ds_list_c,
           count(*) FILTER (WHERE p.main_buys + p.ds_buys > 0)::int AS buyers,
           COALESCE(sum(p.ups_c),0)::int                AS ups_c
    FROM experiment_exposures e
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE c.purchase_type='main')::int      AS main_buys,
             count(*) FILTER (WHERE c.purchase_type='downsell')::int  AS ds_buys,
             COALESCE(sum(c.price_amount_cents)    FILTER (WHERE c.purchase_type='main'),0)::int     AS main_list_c,
             COALESCE(sum(c.downsell_amount_cents) FILTER (WHERE c.purchase_type='downsell'),0)::int AS ds_list_c,
             COALESCE(sum(COALESCE(c.upsell_amount,0) + COALESCE(c.upsell2_amount,0)),0)::int        AS ups_c
      FROM conversations c
      WHERE c.ab_visitor_id = e.subject_id
        AND c.main_paid_at IS NOT NULL
        AND c.main_paid_at >= e.created_at
    ) p ON true
    WHERE e.experiment_key = $1 AND e.created_at >= $2
    GROUP BY 1,2,3`, [KEY, start]);

  if (!rows.length) {
    console.log('\nNo exposures yet — nobody has reached a scoped tarot chat since the test started.');
    process.exit(0);
  }

  // ── POOLED (the decision metric) ──────────────────────────────────────────
  const pooled = { [CONTROL]: blank(), [TREATMENT]: blank() };
  for (const r of rows) {
    const t = (pooled[r.variant] ??= blank());
    for (const k of Object.keys(blank())) t[k] += r[k];
  }
  console.log('\n' + '─'.repeat(74));
  console.log('POOLED — this is the decision metric');
  console.log('─'.repeat(74));
  const c = armBlock(`Version C — LLM opener [CONTROL]`, pooled[CONTROL]);
  const b = armBlock(`Version B — smart template [VARIATION]`, pooled[TREATMENT]);

  const dRev = c.perChat ? ((b.perChat - c.perChat) / c.perChat) * 100 : 0;
  console.log(`\nRevenue per chat is the one honest number: C ${usd(c.perChat)} vs B ${usd(b.perChat)}` +
              `  →  B is ${dRev >= 0 ? '+' : ''}${f2(dRev)}% vs control.`);

  const sig = ztest(pooled[CONTROL].main_buys + pooled[CONTROL].ds_buys, pooled[CONTROL].chats,
                    pooled[TREATMENT].main_buys + pooled[TREATMENT].ds_buys, pooled[TREATMENT].chats);
  if (sig) {
    console.log(`Significance (Overall CR): z=${sig.z.toFixed(2)}  p=${sig.p.toFixed(4)}  ` +
                `${sig.p < 0.05 ? '✅ significant at 95%' : '— NOT significant, keep running'}`);
  }

  // SRM — is the split actually landing where it was configured?
  const wC = variants.find((v) => v.key === CONTROL)?.weight ?? 0;
  const wB = variants.find((v) => v.key === TREATMENT)?.weight ?? 0;
  const nTot = pooled[CONTROL].chats + pooled[TREATMENT].chats;
  if (wC && wB && nTot) {
    const obsB = pct(pooled[TREATMENT].chats, nTot);
    const expB = (wB / (wC + wB)) * 100;
    const chi = Math.pow(pooled[TREATMENT].chats - nTot * (expB / 100), 2) / (nTot * (expB / 100)) +
                Math.pow(pooled[CONTROL].chats - nTot * (1 - expB / 100), 2) / (nTot * (1 - expB / 100));
    console.log(`Split check : B is ${f2(obsB)}% of chats, configured ${f2(expB)}%  ` +
                `${chi > 10.83 ? '🔴 SRM — randomisation is skewed, results are suspect' : '✅ within tolerance'}`);
  }

  // ── PER AD URL — "which hooks is B winning on" ────────────────────────────
  console.log('\n' + '─'.repeat(74));
  console.log('BY AD URL — diagnostic (the best-looking row will look good by chance)');
  console.log('─'.repeat(74));
  const byUrl = new Map();
  for (const r of rows) {
    const id = `${r.hook}|${r.deck}`;
    if (!byUrl.has(id)) byUrl.set(id, { [CONTROL]: blank(), [TREATMENT]: blank() });
    const t = byUrl.get(id);
    t[r.variant] ??= blank();
    for (const k of Object.keys(blank())) t[r.variant][k] += r[k];
  }
  const urls = [...byUrl.entries()]
    .map(([id, t]) => ({ id, t, n: t[CONTROL].chats + t[TREATMENT].chats }))
    .filter((u) => u.n >= MIN)
    .sort((a, b2) => b2.n - a.n);

  console.log('\n' + 'ad URL'.padEnd(26) + 'arm'.padEnd(5) + 'chats'.padStart(7) +
              'buys'.padStart(6) + 'MainCR'.padStart(9) + 'OverCR'.padStart(9) + '$/chat'.padStart(9) + '  verdict');
  for (const { id, t } of urls) {
    const [hook, deck] = id.split('|');
    const label = deck === 'return-mhf' ? hook : `${hook} ·${deck}`;
    const rc = t[CONTROL], rb = t[TREATMENT];
    const pc = rc.chats ? (rc.main_list_c + rc.ds_list_c) / rc.chats : 0;
    const pb = rb.chats ? (rb.main_list_c + rb.ds_list_c) / rb.chats : 0;
    const s = ztest(rc.main_buys + rc.ds_buys, rc.chats, rb.main_buys + rb.ds_buys, rb.chats);
    let verdict = 'too early';
    if (s && s.p < 0.05) verdict = pb > pc ? '✅ B ahead (p<.05)' : '✅ C ahead (p<.05)';
    else if (rc.chats && rb.chats) verdict = pb > pc ? 'B leads (n.s.)' : 'C leads (n.s.)';
    for (const [arm, r, per] of [[CONTROL, rc, pc], [TREATMENT, rb, pb]]) {
      console.log(
        (arm === CONTROL ? label.slice(0, 25).padEnd(26) : ''.padEnd(26)) +
        arm.padEnd(5) +
        String(r.chats).padStart(7) +
        String(r.main_buys + r.ds_buys).padStart(6) +
        (f2(pct(r.main_buys, r.chats)) + '%').padStart(9) +
        (f2(pct(r.main_buys + r.ds_buys, r.chats)) + '%').padStart(9) +
        usd(per).padStart(9) +
        (arm === CONTROL ? '  ' + verdict : ''));
    }
  }
  if (MIN) console.log(`\n(ad URLs with fewer than ${MIN} chats hidden — pass --min 0 to show all)`);

  // ── LABELLED EXTRA: upsell-inclusive. NOT Joel's number. ──────────────────
  console.log('\n' + '─'.repeat(74));
  console.log('EXTRA — upsell-inclusive revenue. NOT Joel\'s format; do not quote as if it were.');
  console.log('─'.repeat(74));
  for (const arm of [CONTROL, TREATMENT]) {
    const r = pooled[arm];
    const all = r.main_list_c + r.ds_list_c + r.ups_c;
    console.log(`  ${arm}: main-line ${usd(r.main_list_c + r.ds_list_c)} + upsells ${usd(r.ups_c)} ` +
                `= ${usd(all)}  →  ${usd(r.chats ? all / r.chats : 0)} per chat`);
  }

  // Divergence guard: buy-COUNTS (Joel) vs distinct BUYERS (the dashboard). Equal
  // unless someone bought twice. Surfaced rather than silently reconciled, so the
  // two reports never drift apart unexplained.
  for (const arm of [CONTROL, TREATMENT]) {
    const r = pooled[arm];
    if (r.main_buys + r.ds_buys !== r.buyers) {
      console.log(`\n⚠️  arm ${arm}: ${r.main_buys + r.ds_buys} buy-counts vs ${r.buyers} distinct buyers ` +
                  `— someone bought more than once. This report counts BUYS (Joel); ` +
                  `/admin/experiments counts BUYERS. Both are right; they answer different questions.`);
    }
  }
  const unrec = rows.filter((r) => r.hook === '(unrecorded)').reduce((s, r) => s + r.chats, 0);
  if (unrec) console.log(`\n⚠️  ${unrec} chats carry no hook — they cannot be attributed to an ad URL. ` +
                         `Exposures are written once, so these can never be back-filled.`);
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 2;
} finally {
  await client.end().catch(() => {});
}
