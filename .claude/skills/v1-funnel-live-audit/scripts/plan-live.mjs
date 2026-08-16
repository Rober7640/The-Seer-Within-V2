// v1-funnel-live-audit — PLAN mode. READ-ONLY.
//
// audit    — is anything BROKEN?
// diagnose — why did the number MOVE?
// plan     — what do we test NEXT, and can it actually run?   ← this file
//
// 🔴 THIS FILE HOLDS NO JUDGEMENT AND NO STATE. The queue, the reasons for the order
// and the decision log live in docs/v1-test-queue.md, maintained by a human. This reads
// LIVE state and does the three calculations that were previously done by hand and got
// done wrong under time pressure:
//
//   1. COLLISION  — does a proposed test touch a beat another test already owns?
//                   Rediscovered three separate times in one session before this existed.
//   2. SAMPLE     — targetN from the live baseline, an effect size and current traffic,
//                   converted back into EXPOSURES (what `conversion.targetN` counts).
//   3. DRIFT      — has the doc gone stale against what is actually running?
//
// It NEVER tallies arm outcomes. That is diagnose --tally, which counts the look.
//
//   LIVE_AUDIT_CONFIRM=1 node .../plan-live.mjs --live
//   ... --live --size --effect 30 --metric pitch-paid
//   ... --live --beats price,objections
import fs from 'node:fs';
import { connectReadOnly, beginReads, PAID, pct, day } from './lib/live-db.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const LIVE = argv.includes('--live');
const QUEUE_DOC = 'docs/v1-test-queue.md';

// ── THE BEAT MAP ─────────────────────────────────────────────────────────────
// 🔴 EDIT THIS when a test starts touching a new part of the funnel. It is the whole
// point of the collision check, and it is config rather than data because no table
// records "which stretch of script does this experiment rewrite".
//
// A beat is a stretch of the funnel that one test can own at a time. Two tests on the
// same beat means neither result reads clean — not because the statistics collide
// (assignment is orthogonal) but because the COPY contradicts itself in one of the cells.
const BEATS = {
  'opener':      { where: 'first chat message, before email',        tests: ['v1_tarot_version_bc_2026'] },
  'reading':     { where: 'READING_1 → FUTURE_PACING',               tests: [] },
  'crisis':      { where: 'CRISIS_REVEAL → CRISIS_COST',             tests: ['v1_clearing_theme_palm_2026_b'] },
  'permission':  { where: 'PERMISSION_ASK gate',                     tests: [] },
  'ritual':      { where: 'pitch: ritual + deliverable bubbles',     tests: ['v1_close_depth_2026'] },
  'price':       { where: 'pitch: price + guarantee + proof',        tests: ['hours-55-35_tarot', 'v1_close_depth_2026'] },
  'objections':  { where: 'post-pitch objection handling',           tests: ['hours-55-35_tarot', 'v1_close_depth_2026'] },
  'bump':        { where: 'order-bump row before Stripe',            tests: ['v1_bump_copy_2026', 'hours-55-35_tarot'] },
  'upsell':      { where: '/welcome1 → /welcome2',                   tests: [] },
};

const { client, canary, mode, redactedHost } = await connectReadOnly({ live: LIVE });
console.log(`\nv1-funnel-live-audit · PLAN  ·  ${mode}`);
console.log(`DB: ${redactedHost}\nCanary: ${canary}\n`);
await beginReads(client, 60000);

const P = PAID.replace(/main_paid_at|purchased|upsell_offered/g, (m) => 'c.' + m);

// ── A. Live experiment state ─────────────────────────────────────────────────
const { rows: exps } = await client.query(`
  SELECT key, status, subject_type, started_at, scope, conversion
  FROM experiments WHERE status IN ('running','draft','paused')
  ORDER BY CASE status WHEN 'running' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END, started_at DESC NULLS LAST`);
const v1 = exps.filter((e) => e.subject_type !== 'user');

console.log(`## Live experiment state`);
console.log(`key                              status   subject   progress          scope`);
for (const e of v1) {
  const { rows: [x] } = await client.query(
    `SELECT count(*)::int n FROM experiment_exposures WHERE experiment_key = $1`, [e.key]);
  const target = e.conversion?.targetN ?? null;
  const prog = target ? `${x.n}/${target} (${pct(x.n, target)})` : (x.n ? `${x.n} exposures` : '—');
  const sc = e.scope?.funnel ? (Array.isArray(e.scope.funnel) ? e.scope.funnel.join('+') : e.scope.funnel) : 'global';
  console.log(`${e.key.padEnd(32)} ${e.status.padEnd(8)} ${(e.subject_type ?? '').padEnd(9)} ${prog.padEnd(17)} ${sc}`);
}

// ── B. Collision map ─────────────────────────────────────────────────────────
// Only RUNNING tests can collide today; draft ones are a future collision worth seeing.
const runningKeys = new Set(v1.filter((e) => e.status === 'running').map((e) => e.key));
const askedBeats = (arg('beats', null) ?? '').split(',').map((s) => s.trim()).filter(Boolean);

console.log(`\n## Beat map — who owns which stretch of the funnel`);
console.log(`beat         where                                  tests`);
for (const [name, b] of Object.entries(BEATS)) {
  if (askedBeats.length && !askedBeats.includes(name)) continue;
  const live = b.tests.filter((t) => runningKeys.has(t));
  const marks = b.tests.map((t) => (runningKeys.has(t) ? `${t}*` : t)).join(', ') || '—';
  console.log(`${name.padEnd(12)} ${b.where.padEnd(38)} ${marks}`);
  if (live.length > 1) console.log(`${''.padEnd(51)}🔴 ${live.length} RUNNING tests on this beat — neither reads clean`);
}
console.log(`  (* = running now. A beat with two live tests means the copy contradicts itself`);
console.log(`   in one cell; assignment is orthogonal, so the problem is never statistical.)`);

if (askedBeats.length) {
  const clash = askedBeats.flatMap((n) => (BEATS[n]?.tests ?? []).filter((t) => runningKeys.has(t)));
  console.log(`\n  → a new test on [${askedBeats.join(', ')}] would collide with: ${[...new Set(clash)].join(', ') || 'nothing running'}`);
}

// ── C. Sample size ───────────────────────────────────────────────────────────
if (argv.includes('--size')) {
  const effect = Number(arg('effect', 30)) / 100;
  const metric = arg('metric', 'pitch-paid');
  const funnel = arg('funnel', 'tarot');
  const F = funnel === 'all' ? 'TRUE' : `c.price_variant ILIKE '%${funnel}%'`;

  // Denominator per metric. Exposure for an email-keyed test happens at LEAD CAPTURE,
  // so whatever denominator the effect is measured on must be converted back to leads —
  // that ratio is the step everyone forgets, and it is why targetN is not the same
  // number as "women needed at the pitch".
  const DEN = {
    'lead-paid':    `TRUE`,
    'engaged-paid': `c.concern IS NOT NULL`,
    'pitch-paid':   `c.conversation_state = 'PITCH' OR ${P}`,
  }[metric];
  if (!DEN) { console.error(`🔴 --metric must be lead-paid | engaged-paid | pitch-paid`); process.exit(2); }

  const { rows: [b] } = await client.query(`
    SELECT count(*)::int leads,
           count(*) FILTER (WHERE ${DEN})::int den,
           count(*) FILTER (WHERE (${DEN}) AND ${P})::int num
    FROM conversations c WHERE c.created_at > now() - interval '7 days' AND ${F}`);
  const p1 = b.den ? b.num / b.den : 0;
  const p2 = p1 * (1 + effect);
  const pBar = (p1 + p2) / 2;
  // 80% power, 5% two-sided: (1.96 + 0.8416)^2 = 7.849
  const perArm = Math.ceil((2 * 7.849 * pBar * (1 - pBar)) / ((p2 - p1) ** 2));
  const denTotal = perArm * 2;
  const denPerLead = b.leads ? b.den / b.leads : 1;      // e.g. 55% of leads reach the pitch
  const targetN = Math.ceil(denTotal / denPerLead / 100) * 100;
  const leadsPerDay = b.leads / 7;

  console.log(`\n## Sample size — ${metric}, +${(effect * 100).toFixed(0)}% relative, ${funnel}`);
  console.log(`  baseline (last 7d)   ${b.num}/${b.den} = ${(p1 * 100).toFixed(1)}%  →  target ${(p2 * 100).toFixed(1)}%`);
  console.log(`  needed at that step  ${perArm} per arm · ${denTotal} total`);
  console.log(`  that step is ${pct(b.den, b.leads)} of leads, so:`);
  console.log(`  🔴 targetN (EXPOSURES, what conversion.targetN counts) = ${targetN}`);
  console.log(`  at ${leadsPerDay.toFixed(0)} leads/day → ~${Math.ceil(targetN / leadsPerDay)} days`);
  console.log(`\n  sensitivity — an effect smaller than +${(effect * 100).toFixed(0)}% will NOT be visible:`);
  for (const e2 of [0.15, 0.20, 0.30, 0.45]) {
    const q2 = p1 * (1 + e2), qBar = (p1 + q2) / 2;
    const n2 = Math.ceil((2 * 7.849 * qBar * (1 - qBar)) / ((q2 - p1) ** 2)) * 2 / denPerLead;
    console.log(`    +${(e2 * 100).toFixed(0).padStart(2)}% → ${Math.ceil(n2 / 100) * 100} exposures · ~${Math.ceil(n2 / leadsPerDay)} days`);
  }
}

// ── D. Drift — has the queue doc gone stale? ─────────────────────────────────
// The doc is the only place judgement lives, so its worst failure is being quietly
// wrong. This does not fix it; it says which way it has drifted.
console.log(`\n## Queue doc`);
if (!fs.existsSync(QUEUE_DOC)) {
  console.log(`  🔴 ${QUEUE_DOC} not found — plan mode has no queue to read. Create it.`);
} else {
  const doc = fs.readFileSync(QUEUE_DOC, 'utf8');
  // Substring match, not a regex on backticked tokens — keys carry suffixes ("_2026_b")
  // that a tidy pattern misses, and a drift check that silently fails to match is worse
  // than no check at all.
  //
  // Only RUNNING tests are a drift problem. A draft or paused test absent from the queue
  // is usually correct: it is dormant, and listing every dormant experiment would bury
  // the four that matter.
  const running = v1.filter((e) => e.status === 'running');
  const missing = running.filter((e) => !doc.includes(e.key));
  console.log(`  ${QUEUE_DOC} · ${doc.split('\n').length} lines`);
  if (missing.length) console.log(`  🔴 RUNNING but not in the doc: ${missing.map((e) => e.key).join(', ')}`);
  else console.log(`  ✅ every running test appears in the doc.`);
  const dormant = v1.filter((e) => e.status !== 'running' && doc.includes(e.key));
  if (dormant.length) console.log(`  ⓘ doc also covers ${dormant.length} non-running test(s): ${dormant.map((e) => e.key).join(', ')}`);
  const m = doc.match(/^\s*\|\s*\*\*NEXT\*\*\s*\|([^|]+)\|/mi);
  if (m) console.log(`\n  NEXT per the doc: ${m[1].trim()}`);
}
console.log(`\nⓘ arm outcomes are NOT shown here — that is diagnose --tally, which counts the look.\n`);

await client.query('COMMIT');
await client.end();
