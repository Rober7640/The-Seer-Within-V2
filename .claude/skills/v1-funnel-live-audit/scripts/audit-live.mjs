// v1-funnel-live-audit — READ-ONLY analysis of REAL V1 (Evelyn) funnel data.
//
// The "find real issues" half of the V1 loop (the counterpart to V2's persona-audit):
// v1-funnel-audit / v1-funnel-eval verify that the CODE is correct on a synthetic
// sandbox user; THIS reads what REAL users actually did — where they drop off, which
// payments didn't reconcile, abandoned carts, price corruption in the wild, upsell
// take-rates, and the fb-palm derail's real impact — and prints a prioritized report.
// It only RECOMMENDS fixes; it never changes anything.
//
//   node .claude/skills/v1-funnel-live-audit/scripts/audit-live.mjs            # LOCAL sandbox (:5433) — verify the queries
//   LIVE_AUDIT_CONFIRM=1 node .../audit-live.mjs --live [--days 30]            # LIVE shared DB (read-only) — real findings
//
// SAFETY — the same contract as V2's scripts/pull-buyer-transcripts.ts:
//   1. Every read runs inside `BEGIN TRANSACTION READ ONLY`.
//   2. A startup CANARY attempts a write inside that transaction and ABORTS unless
//      Postgres rejects it with SQLSTATE 25006 — so read-only is PROVEN, not assumed.
//   3. Target is explicit: localhost → LOCAL mode (safe, no flag). A non-localhost
//      (shared/production) DB requires BOTH `--live` and `LIVE_AUDIT_CONFIRM=1`.
//   4. PII-safe: DB host redacted; only initials + aggregates in the report; output
//      under the gitignored audit-runs/ tree. No raw emails or transcripts are written.
import pg from 'pg';
import fs from 'node:fs';

// Naive `timestamp` columns are stored UTC — parse as UTC (same fix as server/lib/db.ts).
pg.types.setTypeParser(1114, (s) => new Date(s.replace(' ', 'T') + 'Z'));
pg.types.setTypeParser(1184, (s) => new Date(s));

const argv = process.argv.slice(2);
const LIVE = argv.includes('--live');
const daysArg = (() => { const i = argv.indexOf('--days'); return i >= 0 ? Number(argv[i + 1]) : null; })();
const ENV_FILE = LIVE ? '.env' : '.env.sandbox';
const OUT_DIR = 'audit-runs/v1-funnel-live-audit';

function readDatabaseUrl(file) {
  if (!fs.existsSync(file)) { console.error(`🔴 env file not found: ${file}`); process.exit(2); }
  const m = [...fs.readFileSync(file, 'utf8').matchAll(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/gm)].pop();
  if (!m) { console.error(`🔴 no DATABASE_URL in ${file}`); process.exit(2); }
  return m[1].trim().replace(/^["']|["']$/g, '');
}

const url = readDatabaseUrl(ENV_FILE);
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /\/\/(localhost|127\.0\.0\.1)[:/]/.test(url);
const redactedHost = url.replace(/:\/\/([^:]+):[^@]*@/, '://$1:***@').split('?')[0];

// ── target-safety gate ───────────────────────────────────────────────────────
if (!isLocal) {
  // A non-localhost URL is the shared/production DB (dev + prod share ONE DB).
  if (!LIVE || process.env.LIVE_AUDIT_CONFIRM !== '1') {
    console.error(`\n🔴 REFUSING to touch a non-local DB without explicit confirmation.`);
    console.error(`   Target would be: ${redactedHost}`);
    console.error(`   This is the LIVE / SHARED production DB. To run the real read-only audit:`);
    console.error(`     LIVE_AUDIT_CONFIRM=1 node .claude/skills/v1-funnel-live-audit/scripts/audit-live.mjs --live [--days 30]`);
    console.error(`   (It is strictly read-only — READ ONLY transaction + canary — but it reads real customer data,`);
    console.error(`    so it must be run deliberately.)\n`);
    process.exit(2);
  }
}
const MODE = isLocal ? 'LOCAL SANDBOX' : 'LIVE / SHARED PRODUCTION DB';

const findings = []; // { level: '🔴'|'⚠️', text }
const flag = (level, text) => findings.push({ level, text });
const money = (c) => (c == null ? 'null' : `$${(c / 100).toFixed(2)}`);
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');

// Palm identity tokens — used to measure the known-open derail on REAL transcripts.
const PALM_TOKENS = ['thumb', 'trident', 'gathering', 'three lines', 'converging', 'the mark', 'your palm'];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const client = new pg.Client({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });
  await client.connect();

  const lines = [];
  const out = (s = '') => { lines.push(s); console.log(s); };
  out(`\nv1-funnel-live-audit  ·  TARGET: ${MODE}`);
  out(`DB: ${redactedHost}`);

  // 1. CANARY — a write inside READ ONLY must be rejected (SQLSTATE 25006) or ABORT.
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
  out(`Canary write: ${canary}`);
  if (!canary.startsWith('rejected')) {
    console.error('🔴 ABORT: canary write was not rejected — refusing to run.');
    await client.end();
    process.exit(1);
  }

  // 2. All reads inside one explicit READ ONLY transaction.
  await client.query('BEGIN TRANSACTION READ ONLY');
  await client.query("SET LOCAL timezone = 'UTC'");
  await client.query('SET LOCAL statement_timeout = 30000');

  const W = daysArg ? `created_at > now() - interval '${Number(daysArg)} days'` : 'TRUE';
  out(`Window: ${daysArg ? `last ${daysArg} days` : 'all time'}\n`);

  // ── A. Overview ─────────────────────────────────────────────────────────────
  const { rows: [ov] } = await client.query(`
    SELECT count(*)::int total,
           count(*) FILTER (WHERE purchased OR main_paid_at IS NOT NULL)::int paid,
           count(*) FILTER (WHERE concern IS NOT NULL)::int engaged,
           count(*) FILTER (WHERE conversation_state = 'PITCH' OR purchased OR main_paid_at IS NOT NULL)::int reached_pitch,
           COALESCE(SUM(main_purchase_amount) FILTER (WHERE purchased OR main_paid_at IS NOT NULL), 0)::bigint revenue_cents,
           min(created_at) first_at, max(created_at) last_at
    FROM conversations WHERE ${W}`);
  out(`## A. Overview`);
  out(`- conversations: ${ov.total}  ·  paid: ${ov.paid} (${pct(ov.paid, ov.total)})  ·  revenue: ${money(Number(ov.revenue_cents))}`);
  out(`- span: ${ov.first_at ? new Date(ov.first_at).toISOString().slice(0, 10) : '—'} → ${ov.last_at ? new Date(ov.last_at).toISOString().slice(0, 10) : '—'}\n`);

  // ── B. Funnel drop-off ──────────────────────────────────────────────────────
  const { rows: [f] } = await client.query(`
    SELECT count(*)::int leads,
           count(*) FILTER (WHERE concern IS NOT NULL)::int engaged,
           count(*) FILTER (WHERE conversation_state = 'PITCH' OR purchased OR main_paid_at IS NOT NULL)::int pitched,
           count(*) FILTER (WHERE purchased OR main_paid_at IS NOT NULL)::int paid,
           count(*) FILTER (WHERE upsell_offered)::int u1_offered,
           count(*) FILTER (WHERE upsell_purchased)::int u1_paid,
           count(*) FILTER (WHERE upsell2_purchased)::int u2_paid
    FROM conversations WHERE ${W}`);
  out(`## B. Funnel drop-off`);
  const step = (label, n, prev) => out(`- ${label.padEnd(22)} ${String(n).padStart(6)}  ${prev != null ? `(${pct(n, prev)} of prev)` : ''}`);
  step('leads', f.leads, null);
  step('→ engaged (gave concern)', f.engaged, f.leads);
  step('→ reached pitch', f.pitched, f.engaged);
  step('→ paid (main)', f.paid, f.pitched);
  step('→ upsell-1 offered', f.u1_offered, f.paid);
  step('→ upsell-1 bought', f.u1_paid, f.u1_offered);
  step('→ upsell-2 bought', f.u2_paid, f.u1_offered);
  const { rows: states } = await client.query(`
    SELECT COALESCE(conversation_state, '(no saved progress)') state, count(*)::int n
    FROM conversations
    WHERE ${W} AND NOT (purchased OR main_paid_at IS NOT NULL)
    GROUP BY 1 ORDER BY 2 DESC LIMIT 8`);
  out(`  non-buyers stopped at:`);
  for (const s of states) out(`    ${s.state.padEnd(24)} ${String(s.n).padStart(6)}`);
  out('');

  // ── C. Payment reconciliation gap (the migration-019 class, in the wild) ─────
  const { rows: [rec] } = await client.query(`
    SELECT count(*) FILTER (WHERE purchased AND main_paid_at IS NULL)::int browser_only,
           count(*) FILTER (WHERE (NOT purchased) AND main_paid_at IS NOT NULL)::int webhook_only
    FROM conversations WHERE ${W}`);
  out(`## C. Payment reconciliation`);
  out(`- purchased=true but main_paid_at NULL (browser-confirmed, webhook not stamped): ${rec.browser_only}`);
  out(`- main_paid_at set but purchased=false (webhook-confirmed, browser missed): ${rec.webhook_only}`);
  if (rec.webhook_only > 0) flag('⚠️', `${rec.webhook_only} rows are paid per the webhook but not flagged purchased — the dashboard/UI may under-count these.`);
  out('');

  // ── D. Abandoned carts ──────────────────────────────────────────────────────
  const { rows: [ab] } = await client.query(`
    SELECT count(*) FILTER (WHERE stripe_session_id IS NOT NULL)::int with_session,
           count(*) FILTER (WHERE stripe_session_id IS NOT NULL AND NOT (purchased OR main_paid_at IS NOT NULL))::int abandoned
    FROM conversations WHERE ${W}`);
  out(`## D. Abandoned carts (checkout session created, never completed)`);
  out(`- ${ab.abandoned} abandoned of ${ab.with_session} with a checkout session (${pct(ab.abandoned, ab.with_session)})`);
  if (ab.with_session > 20 && ab.abandoned / ab.with_session > 0.5) flag('⚠️', `${pct(ab.abandoned, ab.with_session)} of checkouts are abandoned — worth a look at the Stripe hosted-page step.`);
  out('');

  // ── E. Price-variant charge correctness in the wild (the 45-corruption class) ─
  const { rows: variants } = await client.query(`
    SELECT COALESCE(price_variant, '(none)') v, count(*)::int n,
           count(*) FILTER (WHERE purchased OR main_paid_at IS NOT NULL)::int buyers,
           count(*) FILTER (WHERE (purchased OR main_paid_at IS NOT NULL) AND price_amount_cents IS NULL)::int null_main,
           count(*) FILTER (WHERE (purchased OR main_paid_at IS NOT NULL) AND downsell_amount_cents IS NULL)::int null_grace,
           count(DISTINCT price_amount_cents) FILTER (WHERE price_amount_cents IS NOT NULL)::int distinct_main,
           min(price_amount_cents) min_main, max(price_amount_cents) max_main
    FROM conversations WHERE ${W} GROUP BY 1 HAVING count(*) > 0 ORDER BY 2 DESC LIMIT 20`);
  out(`## E. Price-variant integrity (corruption / drift among assigned rows)`);
  for (const v of variants) {
    out(`- ${v.v.padEnd(14)} n=${String(v.n).padStart(5)} buyers=${String(v.buyers).padStart(4)} main=${money(v.min_main)}${v.min_main !== v.max_main ? `..${money(v.max_main)}` : ''}${v.null_grace ? `  🔴 null_grace=${v.null_grace}` : ''}${v.null_main ? `  🔴 null_main=${v.null_main}` : ''}`);
    if (v.null_grace > 0) flag('🔴', `${v.v}: ${v.null_grace} paid row(s) with NULL downsell/grace cents — the "45-corruption" class (a corrupted config key breaks the grace charge).`);
    if (v.null_main > 0) flag('🔴', `${v.v}: ${v.null_main} paid row(s) with NULL main price cents.`);
    if (v.distinct_main > 1) flag('⚠️', `${v.v}: ${v.distinct_main} different main prices in one arm (${money(v.min_main)}..${money(v.max_main)}) — the pool likely changed mid-flight.`);
  }
  out('');

  // ── F. Upsell health ────────────────────────────────────────────────────────
  const { rows: [up] } = await client.query(`
    SELECT count(*) FILTER (WHERE upsell_offered)::int u1_off,
           count(*) FILTER (WHERE upsell_purchased)::int u1_buy,
           count(*) FILTER (WHERE upsell_purchased AND upsell_amount IS NULL)::int u1_noamt,
           count(*) FILTER (WHERE upsell2_offered)::int u2_off,
           count(*) FILTER (WHERE upsell2_purchased)::int u2_buy,
           count(*) FILTER (WHERE upsell2_purchased AND upsell2_amount IS NULL)::int u2_noamt
    FROM conversations WHERE ${W}`);
  out(`## F. Upsell health`);
  out(`- Upsell-1: offered ${up.u1_off} → bought ${up.u1_buy} (take ${pct(up.u1_buy, up.u1_off)})`);
  out(`- Upsell-2: offered ${up.u2_off} → bought ${up.u2_buy} (take ${pct(up.u2_buy, up.u2_off)})`);
  if (up.u1_noamt > 0) flag('⚠️', `${up.u1_noamt} upsell-1 purchases recorded with NULL amount.`);
  if (up.u2_noamt > 0) flag('⚠️', `${up.u2_noamt} upsell-2 purchases recorded with NULL amount.`);
  out('');

  // ── G. fb-palm derail — real-user signal (transcript scan) ───────────────────
  const { rows: palm } = await client.query(`
    SELECT messages FROM conversations
    WHERE ${W} AND price_variant ILIKE '%palm%' AND messages IS NOT NULL
    LIMIT 400`);
  let scanned = 0, derailed = 0, persisted = 0;
  for (const r of palm) {
    try {
      const msgs = JSON.parse(r.messages);
      if (!Array.isArray(msgs) || msgs.length < 6) continue;
      const textOf = (m) => (typeof m === 'string' ? m : (m?.text || m?.content || '')).toLowerCase();
      const early = msgs.slice(0, 4).map(textOf).join(' ');
      const later = msgs.slice(4).map(textOf).join(' ');
      const inEarly = PALM_TOKENS.some((t) => early.includes(t));
      const inLater = PALM_TOKENS.some((t) => later.includes(t));
      if (!inEarly) continue;
      scanned++;
      if (inLater) persisted++; else derailed++;
    } catch { /* skip unparseable */ }
  }
  out(`## G. fb-palm identity derail — real transcripts`);
  if (scanned === 0) {
    out(`- no palm transcripts with the identity in the opener were found in this window (nothing to measure).`);
  } else {
    out(`- ${scanned} palm sessions carried the palm identity in the opener; ${persisted} kept it later, ${derailed} DROPPED it (${pct(derailed, scanned)}).`);
    if (derailed > 0) flag('🔴', `fb-palm derail hits ${derailed}/${scanned} (${pct(derailed, scanned)}) real palm sessions — identity present in the opener, gone by the reading/crisis. Fix: improve-v1/04-fb-palm-derail-PROVEN.md §3 (unshipped).`);
  }
  out('');

  await client.query('COMMIT');
  await client.end();

  // ── Prioritized findings ────────────────────────────────────────────────────
  out(`## Issues found (prioritized)`);
  if (findings.length === 0) out(`- ✅ none flagged in this window.`);
  const reds = findings.filter((x) => x.level === '🔴');
  const ambers = findings.filter((x) => x.level === '⚠️');
  for (const x of [...reds, ...ambers]) out(`- ${x.level} ${x.text}`);
  out('');

  const report = `# v1-funnel-live-audit — ${MODE}\n\nDB: ${redactedHost} · window: ${daysArg ? `last ${daysArg}d` : 'all time'} · ${reds.length} 🔴 / ${ambers.length} ⚠️\n\n` +
    lines.filter((l) => l.startsWith('## ') || l.startsWith('- ') || l.startsWith('    ')).join('\n') + '\n';
  fs.writeFileSync(`${OUT_DIR}/report.md`, report);
  console.log(`wrote ${OUT_DIR}/report.md`);
  console.log(reds.length ? `\n🔴 ${reds.length} high-severity issue(s) — see the report.\n` : `\n✅ no high-severity issues in this window.\n`);
}

main().catch((e) => { console.error('\n🔴 LIVE-AUDIT ERROR:', e.message); process.exit(2); });
