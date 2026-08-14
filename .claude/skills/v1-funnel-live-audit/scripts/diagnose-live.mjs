// v1-funnel-live-audit — DIAGNOSE mode. READ-ONLY.
//
// audit-live.mjs answers "is anything BROKEN?" — a fixed health check.
// This answers the question that actually gets asked: "conversions are down, WHY?"
//
// The two are different jobs. A funnel can pass every health check — webhook firing,
// no price corruption, no derail — while revenue per visitor halves, because the
// causes of a MOVE are mix, tests, and back-end value, none of which are defects.
//
//   node .../diagnose-live.mjs                                   # LOCAL sandbox
//   LIVE_AUDIT_CONFIRM=1 node .../diagnose-live.mjs --live       # LIVE (read-only)
//   ... --live --funnel tarot --days 42 --split 14
//
//   --funnel  tarot|palm|other|all   (default: auto — the family with the most recent leads)
//   --days    total lookback window (default 42)
//   --split   size in days of the "recent" half of the comparison (default 14)
//
// SAFETY: identical contract to audit-live.mjs — it shares lib/live-db.mjs, so the
// READ ONLY transaction, the canary, the target gate and the definition of a SALE
// cannot drift between the two scripts.
import fs from 'node:fs';
import {
  connectReadOnly, beginReads, PAID, IN_TEST_PURCHASE, FUNNEL_CASE, funnelFilter,
  pct, dollars, day, relChange, twoProportionZ,
} from './lib/live-db.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : dflt; };
const LIVE = argv.includes('--live');
const DAYS = Number(arg('days', 42));
const SPLIT = Number(arg('split', 14));
const OUT_DIR = 'audit-runs/v1-funnel-live-audit';

const findings = [];
const flag = (level, text) => findings.push({ level, text });

const { client, canary, mode, redactedHost } = await connectReadOnly({ live: LIVE });

const lines = [];
const out = (s = '') => { lines.push(s); console.log(s); };

out(`\nv1-funnel-live-audit · DIAGNOSE  ·  TARGET: ${mode}`);
out(`DB: ${redactedHost}`);
out(`Canary write: ${canary}`);

await beginReads(client);

// ── Pick the funnel ──────────────────────────────────────────────────────────
let FUNNEL = arg('funnel', null);
if (!FUNNEL) {
  const { rows } = await client.query(`
    SELECT ${FUNNEL_CASE} fam, count(*)::int n FROM conversations
    WHERE created_at > now() - interval '${SPLIT} days' GROUP BY 1 ORDER BY 2 DESC LIMIT 1`);
  FUNNEL = rows[0]?.fam ?? 'all';
  out(`Funnel: ${FUNNEL} (auto-detected — most leads in the last ${SPLIT}d)`);
} else {
  out(`Funnel: ${FUNNEL}`);
}
const F = funnelFilter(FUNNEL);
out(`Window: last ${DAYS} days, comparing the last ${SPLIT}d against the ${DAYS - SPLIT}d before it\n`);

// The five funnel steps, in order. Each is (numerator, denominator) so a step can be
// read as a conversion rate that is comparable across periods of different volume.
const STEPS = [
  ['lead → pitch',        `conversation_state = 'PITCH' OR ${PAID}`,        'TRUE'],
  ['pitch → checkout',    `stripe_session_id IS NOT NULL`,                  `conversation_state = 'PITCH' OR ${PAID}`],
  ['checkout → paid',     PAID,                                             `stripe_session_id IS NOT NULL`],
  ['paid → upsell-1',     `upsell_purchased`,                               `upsell_offered`],
  ['paid → upsell-2',     `upsell2_purchased`,                              `upsell2_offered`],
];

// ── 1. WHEN did it move? ─────────────────────────────────────────────────────
const { rows: wk } = await client.query(`
  SELECT date_trunc('week', created_at)::date wk, count(*)::int leads,
         count(*) FILTER (WHERE ${PAID})::int paid,
         COALESCE(SUM(main_purchase_amount) FILTER (WHERE ${PAID}),0)::bigint main,
         COALESCE(SUM(bump_amount_cents) FILTER (WHERE bump_purchased),0)::bigint bump,
         COALESCE(SUM(upsell_amount) FILTER (WHERE upsell_purchased),0)::bigint u1,
         COALESCE(SUM(upsell2_amount) FILTER (WHERE upsell2_purchased),0)::bigint u2
  FROM conversations WHERE created_at > now() - interval '${DAYS} days' AND ${F}
  GROUP BY 1 ORDER BY 1`);
out(`## 1. WHEN — weekly trend (${FUNNEL})`);
out(`week          leads    paid   cvr    revenue   $/1k leads   $/buyer`);
const series = [];
for (const r of wk) {
  const tot = Number(r.main) + Number(r.bump) + Number(r.u1) + Number(r.u2);
  const per1k = r.leads ? tot / (r.leads / 1000) : 0;
  series.push({ wk: day(r.wk), leads: r.leads, per1k });
  out(`${day(r.wk)}  ${String(r.leads).padStart(6)}  ${String(r.paid).padStart(6)}  ${pct(r.paid, r.leads).padStart(5)}  ${dollars(tot).padStart(9)}   ${dollars(per1k).padStart(9)}   ${dollars(r.paid ? tot / r.paid : 0).padStart(7)}`);
}
// Only compare weeks with enough volume to mean anything — a 20-lead week swings wildly.
const solid = series.filter((s) => s.leads >= 200);
if (solid.length >= 2) {
  const last = solid[solid.length - 1], prev = solid[solid.length - 2];
  const ch = relChange(last.per1k, prev.per1k);
  if (ch != null && ch < -0.15)
    flag('🔴', `Revenue per 1,000 leads fell ${(ch * 100).toFixed(0)}% week-over-week (${dollars(prev.per1k)} → ${dollars(last.per1k)}).`);
}
if (series.length >= 2) {
  const first = series[0], last = series[series.length - 1];
  if (first.leads && last.leads / first.leads > 5)
    out(`  ⓘ volume grew ${(last.leads / first.leads).toFixed(1)}× across this window — expect rate regression toward the true mean;\n    compare the SCALED weeks with each other, not against the low-volume ones.`);
}
out('');

// ── 2. WHERE in the funnel? ──────────────────────────────────────────────────
// 🔴 The whole point of this section: whether ONE step fell or ALL of them did.
// One step falling points at that step (a code change, a broken page, a new gate).
// Every step falling by a similar amount is the fingerprint of colder traffic, and
// no amount of funnel debugging will fix it. Getting this backwards costs days.
out(`## 2. WHERE — step conversion, last ${SPLIT}d vs the ${DAYS - SPLIT}d before`);
const RECENT = `created_at > now() - interval '${SPLIT} days'`;
const PRIOR = `created_at > now() - interval '${DAYS} days' AND created_at <= now() - interval '${SPLIT} days'`;
out(`step                 recent    prior    change`);
const changes = [];
let topDen = { r: 0, p: 0 };
for (const [label, num, den] of STEPS) {
  const { rows: [r] } = await client.query(`
    SELECT count(*) FILTER (WHERE (${den}) AND (${RECENT}))::int dr,
           count(*) FILTER (WHERE (${den}) AND (${num}) AND (${RECENT}))::int nr,
           count(*) FILTER (WHERE (${den}) AND (${PRIOR}))::int dp,
           count(*) FILTER (WHERE (${den}) AND (${num}) AND (${PRIOR}))::int np
    FROM conversations WHERE created_at > now() - interval '${DAYS} days' AND ${F}`);
  const rr = r.dr ? r.nr / r.dr : null, rp = r.dp ? r.np / r.dp : null;
  const ch = (rr != null && rp) ? (rr - rp) / rp : null;
  // Require a real denominator in BOTH periods, or the "change" is just noise.
  if (r.dr >= 30 && r.dp >= 30) changes.push({ label, ch });
  if (label === 'lead → pitch') topDen = { r: r.dr, p: r.dp };
  out(`${label.padEnd(20)} ${(rr == null ? '—' : pct(r.nr, r.dr)).padStart(7)}  ${(rp == null ? '—' : pct(r.np, r.dp)).padStart(7)}   ${ch == null ? '—' : `${(ch * 100).toFixed(0)}%`.padStart(6)}   (n=${r.dr} vs ${r.dp})`);
}

// 🔴 GUARD BEFORE VERDICT. If the two periods are wildly different in volume, the
// "prior" side is a different business — the pre-scale trickle, converting at rates
// no scaled week ever reaches. Comparing against it manufactures a decline at EVERY
// step and invites the reader to hunt a bug that does not exist. Say so and stop,
// rather than printing a confident verdict off a baseline that cannot support one.
const ratio = topDen.p ? topDen.r / topDen.p : Infinity;
if (ratio > 5 || ratio < 0.2) {
  out(`\n  ⚠️ NOT COMPARABLE: the recent period has ${ratio.toFixed(0)}× the volume of the prior one`);
  out(`    (${topDen.r} vs ${topDen.p} leads). The prior side is a different traffic regime, so these`);
  out(`    percentage changes are not evidence of anything. Re-run with --days/--split set so both`);
  out(`    halves sit INSIDE the scaled period (e.g. --days 14 --split 7), then read the verdict.`);
  flag('⚠️', `Step comparison skipped: recent/prior volume ratio is ${ratio.toFixed(0)}× — re-run with both halves inside one traffic regime.`);
} else {
  // A step counts as "fell" at 5%, not 10% — the traffic-quality signature is several
  // steps sagging together by modest amounts, which a 10% gate hides.
  const dropped = changes.filter((c) => c.ch != null && c.ch < -0.05);
  const half = Math.ceil(changes.length / 2);
  if (dropped.length >= half && changes.length >= 3) {
    out(`\n  → ${dropped.length} of ${changes.length} steps fell together. That is a TRAFFIC-QUALITY signature,`);
    out(`    not a broken step. Look at the ad/hook mix (§3) and the live tests (§4) — not at the funnel code.`);
    flag('⚠️', `${dropped.length} of ${changes.length} funnel steps declined together — diagnose as traffic mix, not as a defect.`);
  } else if (dropped.length >= 1) {
    out(`\n  → ${dropped.length} of ${changes.length} steps fell (${dropped.map((d) => `"${d.label}"`).join(', ')}) while the rest held.`);
    out(`    A LOCALISED drop is either a real defect / deliberate change at that step (check git log`);
    out(`    and §4 for a test touching it) OR a shift in the AD MIX toward hooks that convert worse`);
    out(`    downstream — §3 tells the two apart: if a low-earning hook gained share, it is mix.`);
    for (const d of dropped) flag('🔴', `Step "${d.label}" fell ${(d.ch * 100).toFixed(0)}% while ${changes.length - dropped.length} other step(s) held — check what shipped to it.`);
  } else {
    out(`\n  → no step declined. The move is upstream (traffic volume or cost), not in the funnel.`);
  }
}
out('');

// ── 3. WHICH AD — per-lander economics ───────────────────────────────────────
// Landers are identified from the exposure context (deck/hook/facing/angle), which is
// the only place the ad identity is recorded — conversations has no lander column.
//
// 🔴 ONLY exposures that carry `conversationId` can be joined to a purchase. Pooling
// in a visitor-keyed experiment's exposures (which carry no conversationId) silently
// adds viewers that can NEVER show a buyer, and every lander in that window reads as
// collapsing. That artifact is why this filter is explicit.
out(`## 3. WHICH AD — lander economics (30d, exposures joinable to a purchase)`);

// 🔴 SAY WHAT SHARE OF THE FUNNEL THIS COVERS. This table is built from exposures, not
// from the funnel itself, so it can be anything between a narrow slice and the whole
// picture — and the two demand opposite confidence. Without this line the reader either
// over-trusts a sample or (as happened on the first run) hedges a table that in fact
// covered 98% of traffic and needed no hedge at all.
//
// 🔴 NUMERATOR AND DENOMINATOR MUST BE THE SAME POPULATION, filtered the same way.
// Getting this wrong is silent and flattering: a numerator counting conversations of
// any age over a denominator limited to the window reported 98% coverage for a table
// that actually covers ~80%. Both sides are therefore scoped by the SAME date window,
// and the denominator is the UNION of the two ways a conversation can be identified as
// this funnel's — its price_variant, or an exposure labelling it — because neither
// alone is complete (178 tarot-labelled sessions carry a palm price_variant).
const LANDER_EXPOSURE = `EXISTS (
  SELECT 1 FROM experiment_exposures e
  WHERE e.context->>'conversationId' = c.id AND e.context ? 'hook'
    AND e.created_at > now() - interval '30 days'
    ${FUNNEL === 'all' ? '' : `AND e.context->>'funnel' = 'v1-${FUNNEL}'`})`;
const CF = F.replace(/price_variant/g, 'c.price_variant');
const { rows: [cvg] } = await client.query(`
  SELECT count(*) FILTER (WHERE ${CF} OR ${LANDER_EXPOSURE})::int funnel_n,
         count(*) FILTER (WHERE ${LANDER_EXPOSURE})::int labelled
  FROM conversations c WHERE c.created_at > now() - interval '30 days'`);
const cvgPct = cvg.funnel_n ? cvg.labelled / cvg.funnel_n : 0;
out(`   coverage: ${cvg.labelled} of ${cvg.funnel_n} ${FUNNEL} conversations carry a lander label (${pct(cvg.labelled, cvg.funnel_n)})` +
    `${cvgPct >= 0.9 ? ' — effectively the whole funnel, read it as such.' : cvgPct >= 0.5 ? ' — a majority, but not everything.' : ' — a MINORITY slice; treat the ranking as indicative only.'}`);
if (cvg.funnel_n > 500 && cvgPct < 0.5)
  flag('⚠️', `The lander table covers only ${pct(cvg.labelled, cvg.funnel_n)} of ${FUNNEL} traffic — rank hooks from it, but don't quote its totals as the funnel's.`);
const { rows: hooks } = await client.query(`
  SELECT COALESCE(e.context->>'hook','(none)') hook,
         COALESCE(e.context->>'angle','?') angle,
         count(*)::int viewers,
         count(*) FILTER (WHERE ${IN_TEST_PURCHASE})::int buyers,
         COALESCE(SUM(c.main_purchase_amount) FILTER (WHERE ${IN_TEST_PURCHASE}),0)::bigint main,
         COALESCE(SUM(COALESCE(c.bump_amount_cents,0)) FILTER (WHERE ${IN_TEST_PURCHASE}),0)::bigint bump,
         COALESCE(SUM(COALESCE(c.upsell_amount,0)) FILTER (WHERE ${IN_TEST_PURCHASE} AND c.upsell_purchased),0)::bigint u1,
         COALESCE(SUM(COALESCE(c.upsell2_amount,0)) FILTER (WHERE ${IN_TEST_PURCHASE} AND c.upsell2_purchased),0)::bigint u2,
         count(*) FILTER (WHERE ${IN_TEST_PURCHASE} AND c.upsell_purchased)::int u1n,
         count(*) FILTER (WHERE ${IN_TEST_PURCHASE} AND c.upsell2_purchased)::int u2n,
         count(*) FILTER (WHERE ${IN_TEST_PURCHASE} AND c.bump_purchased)::int bn
  FROM experiment_exposures e
  JOIN conversations c ON c.id = e.context->>'conversationId'
  WHERE e.created_at > now() - interval '30 days' AND e.context ? 'hook'
    AND (${FUNNEL === 'all' ? 'TRUE' : `e.context->>'funnel' = 'v1-${FUNNEL}'`})
  GROUP BY 1,2 HAVING count(*) >= 30`);

if (!hooks.length) {
  out(`- no joinable lander exposures in this window (no live email-keyed test carrying deck/hook context).`);
} else {
  const rows = hooks.map((r) => {
    const tot = Number(r.main) + Number(r.bump) + Number(r.u1) + Number(r.u2);
    return {
      ...r, tot,
      per1k: tot / (r.viewers / 1000),
      perBuyer: r.buyers ? tot / r.buyers : 0,
      mainPerBuyer: r.buyers ? Number(r.main) / r.buyers : 0,
      backPerBuyer: r.buyers ? (Number(r.bump) + Number(r.u1) + Number(r.u2)) / r.buyers : 0,
    };
  }).sort((a, b) => b.per1k - a.per1k);

  // The front-end column is nearly constant (everyone pays the same price), so the
  // spread in $/1k is almost entirely the BACK end. Showing main/buyer beside the
  // back-end columns is what makes that visible instead of merely assertable.
  out(`hook                       angle         viewers buyers    cvr  main/buyer  bump  U1 take  U2 take  back/buyer  rev/buyer     $/1k`);
  for (const r of rows) out(
    `${r.hook.slice(0, 26).padEnd(26)} ${r.angle.slice(0, 12).padEnd(12)} ${String(r.viewers).padStart(7)} ${String(r.buyers).padStart(6)} ${pct(r.buyers, r.viewers).padStart(6)} ` +
    `${dollars(r.mainPerBuyer).padStart(11)} ${pct(r.bn, r.buyers).padStart(5)} ${pct(r.u1n, r.buyers).padStart(7)} ${pct(r.u2n, r.buyers).padStart(7)} ` +
    `${dollars(r.backPerBuyer).padStart(11)} ${dollars(r.perBuyer).padStart(10)} ${dollars(r.per1k).padStart(8)}`);

  // 🔴 Rank on revenue per 1,000 — NEVER on buy-rate. Buy-rate hides the back end, and
  // the two orderings genuinely disagree here: a hook can top the conversion table and
  // sit near the bottom on revenue because its buyers do not take the upsells.
  const byCvr = [...rows].sort((a, b) => (b.buyers / b.viewers) - (a.buyers / a.viewers));
  if (byCvr[0] && rows[0] && byCvr[0].hook !== rows[0].hook)
    out(`\n  ⓘ best by BUY-RATE is "${byCvr[0].hook}" (${pct(byCvr[0].buyers, byCvr[0].viewers)}, ${dollars(byCvr[0].per1k)}/1k) but best by REVENUE is\n    "${rows[0].hook}" (${dollars(rows[0].per1k)}/1k). Rank on revenue per 1,000 — buy-rate would pick the wrong ad.`);

  // Concentration: is the majority of spend sitting on a below-median earner?
  const totalViewers = rows.reduce((a, r) => a + r.viewers, 0);
  const median = [...rows].map((r) => r.per1k).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
  for (const r of rows) {
    const share = r.viewers / totalViewers;
    if (share > 0.30 && r.per1k < median) {
      // Value of moving HALF that traffic to the median earner — deliberately conservative.
      const upside = (r.viewers / 2) * (median - r.per1k) / 1000;
      flag('🔴', `"${r.hook}" holds ${pct(r.viewers, totalViewers)} of traffic at ${dollars(r.per1k)}/1k, below the ${dollars(median)}/1k median. ` +
        `Moving half of it to a median hook is worth ~${dollars(upside)} over this window.`);
    }
  }
  // A hook whose buyers do not come back for the back end is a different problem
  // from a hook that does not convert — and it is fixed differently (offer, not ad).
  const avgPerBuyer = rows.reduce((a, r) => a + r.tot, 0) / Math.max(1, rows.reduce((a, r) => a + r.buyers, 0));
  for (const r of rows) {
    if (r.buyers >= 20 && r.perBuyer < avgPerBuyer * 0.75)
      flag('⚠️', `"${r.hook}" buyers are worth ${dollars(r.perBuyer)} vs ${dollars(avgPerBuyer)} average (U1 ${pct(r.u1n, r.buyers)}). ` +
        `It sells the front end but not the back end — an OFFER-match problem, not an ad problem.`);
  }
}
out('');

// ── 4. WHICH TEST — every running experiment, tallied with the right join ────
// Two join shapes exist and using the wrong one reports zeros:
//   email-keyed  → exposure context carries conversationId (assigned at lead capture)
//   visitor-keyed→ no conversationId; join through conversations.ab_visitor_id, and
//                  via a LATERAL so one repeat visitor counts once, not once per session.
out(`## 4. WHICH TEST — running experiments`);
const { rows: allExps } = await client.query(`
  SELECT key, subject_type, started_at, variants, scope FROM experiments
  WHERE status = 'running' AND started_at IS NOT NULL ORDER BY started_at DESC`);

// 🔴 A 'user'-keyed test is a V2 CHAT-SERVICE test. Its subjects are user accounts and
// its purchases live in credit_purchases — it never touches `conversations`. Tallying it
// here would print "buyers=0, $/1k=$0" for a perfectly healthy test and invite someone
// to kill it. Name it and skip it; it is out of scope for a V1 script.
const exps = allExps.filter((e) => e.subject_type !== 'user');
const v2 = allExps.filter((e) => e.subject_type === 'user');
if (v2.length) out(`  (skipping ${v2.length} V2 chat-service test(s) — ${v2.map((e) => e.key).join(', ')} — they buy through credit_purchases, not this funnel.)`);

for (const e of exps) {
  const weights = Object.fromEntries((e.variants ?? []).map((v) => [v.key, v.weight]));
  const emailKeyed = e.subject_type === 'email';
  const q = emailKeyed
    ? `SELECT e.variant v, count(*)::int viewers,
              count(*) FILTER (WHERE ${IN_TEST_PURCHASE})::int buyers,
              COALESCE(SUM(c.main_purchase_amount + COALESCE(c.bump_amount_cents,0)) FILTER (WHERE ${IN_TEST_PURCHASE}),0)::bigint rev
       FROM experiment_exposures e LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
       WHERE e.experiment_key = $1 GROUP BY 1 ORDER BY 1`
    : `SELECT e.variant v, count(*)::int viewers,
              count(*) FILTER (WHERE p.purchases > 0)::int buyers,
              COALESCE(SUM(p.revenue),0)::bigint rev
       FROM experiment_exposures e
       LEFT JOIN LATERAL (
         SELECT count(*) purchases,
                COALESCE(sum(c.main_purchase_amount + COALESCE(c.bump_amount_cents,0)),0) revenue
         FROM conversations c
         WHERE c.ab_visitor_id = e.subject_id AND c.main_paid_at IS NOT NULL AND c.main_paid_at >= e.created_at
       ) p ON true
       WHERE e.experiment_key = $1 GROUP BY 1 ORDER BY 1`;
  const { rows: arms } = await client.query(q, [e.key]);
  const live = arms.filter((a) => a.viewers > 0);

  // 🔴 A TEST IS ONLY AS OLD AS IT HAS RUN, and every number below is scoped to that
  // age — NOT to the --days window the rest of this report uses. Printing them side by
  // side without the age invites the reader to take a 4-day loss for a monthly one and
  // under-react. Age comes from the exposures, not started_at: a test can be started
  // and sit idle, and what matters is the span over which it actually collected data.
  const { rows: [span] } = await client.query(
    `SELECT min(created_at) a, max(created_at) b FROM experiment_exposures WHERE experiment_key = $1`, [e.key]);
  const ageDays = span.a ? Math.max((new Date(span.b) - new Date(span.a)) / 86400000, 0.1) : null;
  out(`\n- ${e.key}  (${e.subject_type}-keyed, started ${day(e.started_at)}` +
      `${ageDays ? `, ${ageDays.toFixed(1)} days of data: ${day(span.a)} → ${day(span.b)}` : ''})`);
  if (!live.length) { out(`    no exposures yet.`); continue; }
  const totalV = live.reduce((a, r) => a + r.viewers, 0);
  for (const a of live) {
    const per1k = Number(a.rev) / 100 / (a.viewers / 1000);
    out(`    ${a.v.padEnd(9)} viewers=${String(a.viewers).padStart(6)} (${pct(a.viewers, totalV).padStart(6)}, weight ${weights[a.v] ?? '?'})  buyers=${String(a.buyers).padStart(4)} ${pct(a.buyers, a.viewers).padStart(6)}  $/1k=$${per1k.toFixed(0)}`);
  }
  if (live.length === 2) {
    const [x, y] = [...live].sort((a, b) => (b.buyers / b.viewers) - (a.buyers / a.viewers));
    const sig = twoProportionZ(x.buyers, x.viewers, y.buyers, y.viewers);
    const loserShare = y.viewers / totalV;
    const gap = relChange(y.buyers / y.viewers, x.buyers / x.viewers);
    if (sig) out(`    ${x.v} leads ${y.v} by ${gap == null ? '—' : `${(-gap * 100).toFixed(0)}%`} · z=${sig.z.toFixed(2)} p=${sig.p.toFixed(3)}${sig.p < 0.05 ? ' (significant)' : ' (NOT significant — directional only)'}`);
    // 🔴 The finding that pays for this whole script: the worse-performing arm is
    // holding MORE THAN ITS FAIR SHARE of the traffic. That is a live cost every day it
    // runs, and it is invisible in any dashboard that only asks "has it reached p<0.05?".
    //
    // Three guards, each of which this script got wrong on its first live run:
    //   · loserShare > 0.55, NOT > 0.5 — an even 50/50 split is a test running CORRECTLY.
    //     Flagging it tells the operator to "fix" a test that has nothing wrong with it.
    //   · both arms need ≥20 buyers — a 10-vs-5 gap on huge traffic is a 0.1% conversion
    //     rate where one buyer either way swings the "loss" by tens of percent.
    //   · the cost estimate is only shown when it is built on those real buyer counts.
    const enoughBuyers = x.buyers >= 20 && y.buyers >= 20;
    if (loserShare > 0.55 && gap != null && gap < -0.15 && enoughBuyers) {
      const cost = y.viewers * ((Number(x.rev) / 100 / x.viewers) - (Number(y.rev) / 100 / y.viewers));
      // Quote the DAILY RATE, not just the total. A running test's loss is not a closed
      // number — it is a meter, and the total alone reads as damage already done rather
      // than damage still being done. The daily figure is what justifies acting today.
      const perDay = ageDays ? cost / ageDays : null;
      flag('🔴', `${e.key}: the WORSE arm "${y.v}" holds ${pct(y.viewers, totalV)} of traffic (${(-gap * 100).toFixed(0)}% below "${x.v}"). ` +
        `Cost ~${dollars(cost * 100)}${ageDays ? ` over ${ageDays.toFixed(1)} days ≈ ${dollars(perDay * 100)}/day and still accruing` : ''}` +
        `${sig && sig.p >= 0.05 ? '. Not yet significant — but re-weight to 50/50 rather than leave the unproven arm holding the majority' : ''}.`);
    } else if (loserShare > 0.55 && gap != null && gap < -0.15) {
      out(`    ⓘ "${y.v}" is behind AND holds ${pct(y.viewers, totalV)} of traffic, but on ${x.buyers}/${y.buyers} buyers`);
      out(`      that is too few to act on. Watch it; re-check once both arms clear 20 buyers.`);
    }
  }
}
out('');

// ── 5. MEASUREMENT INTEGRITY ─────────────────────────────────────────────────
// A wrong number read confidently is worse than no number. These are the two ways
// this funnel's experiment results silently lie.
out(`## 5. MEASUREMENT INTEGRITY`);
// 🔴 SCOPE THIS TO THE TEST, NOT TO A CALENDAR WINDOW. ab_visitor_id only started
// being stamped when the first visitor-keyed test shipped. Measuring coverage over an
// arbitrary window straddling that date reports a huge "gap" that is really just the
// days before the feature existed — and sends the operator to fix a column that is
// already at 100%. Only rows the test could actually have covered are in scope.
// Coverage is measured PER TEST, on that test's own funnel and since its own start
// date. Pooling several visitor tests under the earliest start date re-introduces the
// bug this section exists to avoid: an older test on a DIFFERENT funnel drags the
// window back before the stamp existed, and a column sitting at 100% reads as broken.
const visitorTests = exps.filter((e) => e.subject_type === 'visitor');
if (!visitorTests.length) {
  out(`- ab_visitor_id: no visitor-keyed test is running, so nothing depends on this stamp today.`);
}
for (const t of visitorTests) {
  // Which traffic is this test actually measuring? scope.funnel if it says so, else
  // infer from the key. If NEITHER identifies it, skip — silently falling back to the
  // funnel under analysis measures a palm test against tarot rows and emits a 🔴 about
  // a funnel the test never touched. A missing answer beats a confident wrong one.
  const scoped = typeof t.scope?.funnel === 'string'
    ? t.scope.funnel.replace(/^v1-/, '')
    : (/palm/i.test(t.key) ? 'palm' : /tarot/i.test(t.key) ? 'tarot' : null);
  if (!scoped) {
    out(`- ab_visitor_id · ${t.key}: cannot tell which funnel it targets (no scope.funnel, no hint in the key) — skipped.`);
    continue;
  }
  const tf = funnelFilter(scoped);
  const { rows: [cov] } = await client.query(`
    SELECT count(*)::int n, count(ab_visitor_id)::int stamped,
           count(*) FILTER (WHERE ${PAID})::int paid,
           count(*) FILTER (WHERE (${PAID}) AND ab_visitor_id IS NOT NULL)::int paid_stamped
    FROM conversations WHERE created_at >= $1 AND ${tf}`, [t.started_at]);
  const label = `${t.key} (${scoped} traffic since ${day(t.started_at)})`;
  if (cov.n < 100) { out(`- ab_visitor_id · ${label}: only ${cov.n} conversations — too few to judge coverage.`); continue; }
  out(`- ab_visitor_id · ${label}: ${cov.stamped}/${cov.n} stamped (${pct(cov.stamped, cov.n)}); on paid ${cov.paid_stamped}/${cov.paid} (${pct(cov.paid_stamped, cov.paid)})`);
  if (cov.stamped / cov.n < 0.95)
    flag('🔴', `ab_visitor_id is missing on ${pct(cov.n - cov.stamped, cov.n)} of the traffic ${t.key} is measuring — ` +
      `both arms under-count buyers, and the result is biased if the gap is uneven. Fix the stamp before calling it.`);
  else
    out(`  ✅ coverage is sound — ${t.key}'s tally can be trusted on volume grounds.`);
}
const { rows: [orphan] } = await client.query(`
  SELECT count(*)::int total,
         count(*) FILTER (WHERE NOT (context ? 'conversationId'))::int no_convid
  FROM experiment_exposures WHERE created_at > now() - interval '${SPLIT} days'`);
out(`- exposures without conversationId: ${orphan.no_convid}/${orphan.total} (${pct(orphan.no_convid, orphan.total)}) — these are visitor-keyed and MUST use the ab_visitor_id join.`);

// Assigned split vs configured weight: a live test drifting off its own weights.
for (const e of exps) {
  const weights = Object.fromEntries((e.variants ?? []).map((v) => [v.key, v.weight]));
  const wTotal = Object.values(weights).reduce((a, b) => a + (b || 0), 0);
  if (!wTotal) continue;
  const { rows: split } = await client.query(
    `SELECT variant v, count(*)::int n FROM experiment_exposures WHERE experiment_key = $1 GROUP BY 1`, [e.key]);
  const n = split.reduce((a, r) => a + r.n, 0);
  if (n < 200) continue;
  for (const s of split) {
    const want = (weights[s.v] || 0) / wTotal, got = s.n / n;
    if (Math.abs(got - want) > 0.08)
      flag('⚠️', `${e.key} arm "${s.v}" is getting ${(got * 100).toFixed(0)}% of exposures but is configured for ${(want * 100).toFixed(0)}% — assignment has drifted off its weights.`);
  }
}

// Buyers who were offered upsell-1 but never upsell-2 — revenue that never got asked for.
const { rows: [u] } = await client.query(`
  SELECT count(*) FILTER (WHERE upsell_offered)::int u1off,
         count(*) FILTER (WHERE upsell2_offered)::int u2off,
         count(*) FILTER (WHERE upsell_purchased)::int u1buy,
         count(*) FILTER (WHERE upsell2_purchased)::int u2buy,
         COALESCE(AVG(upsell2_amount) FILTER (WHERE upsell2_purchased),0)::int u2price
  FROM conversations WHERE created_at > now() - interval '${DAYS} days' AND ${F}`);
const gap = u.u1off - u.u2off;
out(`- upsell-2 reach: ${u.u2off} of ${u.u1off} buyers reached the second offer (${pct(u.u2off, u.u1off)})`);
if (u.u1off > 50 && gap / u.u1off > 0.1) {
  const take = u.u2off ? u.u2buy / u.u2off : 0;
  flag('⚠️', `${gap} buyers (${pct(gap, u.u1off)}) were offered upsell-1 but never upsell-2 — at the observed ${pct(u.u2buy, u.u2off)} take that is ~${dollars(gap * take * u.u2price)} never asked for.`);
}
out('');

await client.query('COMMIT');
await client.end();

// ── Prioritized findings ─────────────────────────────────────────────────────
out(`## Diagnosis (prioritized)`);
const reds = findings.filter((x) => x.level === '🔴');
const ambers = findings.filter((x) => x.level === '⚠️');
if (!findings.length) out(`- ✅ nothing stood out in this window.`);
for (const x of [...reds, ...ambers]) out(`- ${x.level} ${x.text}`);
out('');

fs.mkdirSync(OUT_DIR, { recursive: true });
const report = `# v1-funnel-live-audit · DIAGNOSE — ${mode}\n\n` +
  `DB: ${redactedHost} · funnel: ${FUNNEL} · window: ${DAYS}d (split ${SPLIT}d) · ${reds.length} 🔴 / ${ambers.length} ⚠️\n\n` +
  '```\n' + lines.join('\n') + '\n```\n';
fs.writeFileSync(`${OUT_DIR}/diagnose.md`, report);
console.log(`wrote ${OUT_DIR}/diagnose.md`);
console.log(reds.length ? `\n🔴 ${reds.length} high-priority finding(s).\n` : `\n✅ no high-priority findings.\n`);
