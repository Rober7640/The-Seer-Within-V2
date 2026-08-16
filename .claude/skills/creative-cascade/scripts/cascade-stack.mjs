// creative-cascade — JOB B. Stack order, decay watch, dark cells, blend math. READ-ONLY.
//
// 🔴 WHAT THIS ADDS THAT fb-ad-question-mining CANNOT.
// That skill states plainly: "Efficiency decay is asserted, not observed — `conversations`
// holds no per-segment spend curve." True at the SEGMENT level, because nothing in the
// running system records a segment. But the funnel DOES record the QUESTION (hook) on the
// exposure row, and every row is timestamped. So decay IS observable one level up, at the
// question and at the angleForHook family. That is what this script watches.
//
// 🔴 WHAT IT STILL CANNOT SEE — read before quoting any number here.
//   · NO SPEND. NO IMPRESSIONS. NO CPM/CPC/CPA/frequency/ROAS. None of it is in this DB.
//     A conversation count is impressions × CTR × lander-conversion, and Meta chose two of
//     those three. So rising conversations is NOT proof of rising spend.
//   · Therefore "tapping out" here is a PROXY: revenue per 1,000 falling while volume
//     rises. That is consistent with a pool thinning, and equally consistent with creative
//     fatigue, a seasonal shift, or Meta changing who it delivers to. It narrows the
//     question; it does not close it. Only an Ads Manager CPA curve closes it.
//   · Attribution is partial (see the coverage line the script prints first). Absence of a
//     hook in the DB is NOT proof no ad ran on it.
//
//   LIVE_AUDIT_CONFIRM=1 node .claude/skills/creative-cascade/scripts/cascade-stack.mjs \
//     --live --days 120 [--bins 4] [--level family|question] [--target 5824]
//
// Reuses v1-funnel-live-audit's read-only contract — the two-key gate, the canary write,
// and above all its PAID definition. The raw `purchased` flag is set at checkout-CLICK and
// over-counts real sales by ~2.5×; never redefine a sale locally.
import {
  connectReadOnly, beginReads, PAID, pct, dollars,
} from '../../v1-funnel-live-audit/scripts/lib/live-db.mjs';
import { readRegistry } from './lib/registry.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const LIVE = argv.includes('--live');
const DAYS = Number(arg('days', 120));
const BINS = Number(arg('bins', 4));
const LEVEL = arg('level', 'family');            // family (angleForHook) | question (hook)
// --target is stated in DOLLARS per 1,000 conversations (the unit every report in this
// repo uses, e.g. the $5,824 commitment base). Everything internal is cents, so convert
// once here — mixing the two silently turned a $5,824 target into $58 on the first run.
const TARGET = arg('target', null) ? Number(arg('target')) * 100 : null;
const MIN_BIN_N = Number(arg('min-bin-n', 120));
const MIN_N = Number(arg('min-n', 200));
if (!['family', 'question'].includes(LEVEL)) { console.error('🔴 --level must be family|question'); process.exit(2); }

const R = readRegistry();
const { client, canary, mode, redactedHost } = await connectReadOnly({ live: LIVE });
console.log(`\ncreative-cascade stack · ${mode}\nDB: ${redactedHost}\nCanary: ${canary}`);
console.log(`window: last ${DAYS} days · ${BINS} bins · level=${LEVEL}\n`);
await beginReads(client, 120000);

const P = PAID.replace(/main_paid_at|purchased|upsell_offered/g, (m) => 'c.' + m);
const REV = `c.main_purchase_amount + COALESCE(c.bump_amount_cents,0)
 + CASE WHEN c.upsell_purchased THEN COALESCE(c.upsell_amount,0) ELSE 0 END
 + CASE WHEN c.upsell2_purchased THEN COALESCE(c.upsell2_amount,0) ELSE 0 END`;

// The ONLY per-ad key this database holds. The tarot lander identity (deck/hook/facing/
// angle) is written into experiment_exposures.context at lead capture; the palm hook is
// written onto the order-bump exposure. There is no ad id, campaign id or utm_content
// column on `conversations` — utm_content is sent to analytics and never persisted. So
// this join is the whole of ad attribution, and it only covers leads that were enrolled
// in an experiment that logs the lander context.
const { rows } = await client.query(`
  WITH map AS (
    SELECT DISTINCT ON (cid) cid, hook FROM (
      SELECT c.id cid, e.context->>'hook' hook, e.created_at t
      FROM experiment_exposures e JOIN conversations c ON c.id = e.context->>'conversationId'
      WHERE e.context ? 'hook'
      UNION ALL
      SELECT c.id, e.context->>'hook', e.created_at
      FROM experiment_exposures e JOIN conversations c ON c.ab_visitor_id = e.subject_id
      WHERE e.context ? 'hook' AND NOT (e.context ? 'conversationId')
    ) x ORDER BY cid, t
  )
  SELECT c.created_at, m.hook, (${P}) paid,
         CASE WHEN ${P} THEN ${REV} ELSE 0 END::int rev
  FROM conversations c LEFT JOIN map m ON m.cid = c.id
  WHERE c.created_at >= now() - interval '${DAYS} days'`);

const withHook = rows.filter((r) => r.hook);
const cov = rows.length ? withHook.length / rows.length : 0;
console.log(`## Attribution coverage`);
console.log(`   ${rows.length} conversations in window · ${withHook.length} with a known source question (${pct(withHook.length, rows.length)})`);
if (cov < 0.4) {
  console.log(`\n🔴 COVERAGE IS ${pct(withHook.length, rows.length)}. Everything below is computed on that slice only.`);
  console.log(`   Attribution exists only for leads enrolled in an experiment that logs the lander`);
  console.log(`   context. A question missing below may be running hard and simply unattributed.`);
  console.log(`   Do NOT read "not in this table" as "no ad on it".`);
}

const keyOf = (h) => (LEVEL === 'family' ? R.groupOf(h) : h);
// 🔴 At question level the label is the SLUG, not the headline. Headlines are not unique
// — `cards-return` and `cards-come-back` are both "Will he come back?" — so labelling by
// headline merges two different landers into one row and makes the ranking unbuildable.
// The slug is unique and is what goes in the URL anyway.
const label = (k) => k;
const headlineOf = (h) => R.tarotHeadlines.get(h) || R.palmHeadlines.get(h) || '';

const groups = new Map();
for (const r of withHook) {
  const k = keyOf(r.hook);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

const stat = (rs) => {
  const n = rs.length, buyers = rs.filter((r) => r.paid).length;
  const rev = rs.reduce((s, r) => s + (r.rev || 0), 0);
  return { n, buyers, rev, rev1k: n ? (rev / n) * 1000 : 0, revBuyer: buyers ? rev / buyers : 0 };
};

const all = stat(withHook);
const table = [...groups].map(([k, rs]) => ({ k, ...stat(rs), share: rs.length / withHook.length }))
  .filter((r) => r.n >= MIN_N)
  .sort((a, b) => b.rev1k - a.rev1k);
const dropped = [...groups].filter(([, rs]) => rs.length < MIN_N);

console.log(`\n## Efficiency — ranked by revenue per 1,000 conversations`);
console.log(`   (never by buy-rate: it hides order value and upsell take, and ranks groups wrong)\n`);
console.log(`${'group'.padEnd(26)}${'conv'.padStart(7)}${'share'.padStart(8)}${'buy%'.padStart(7)}${'rev/buyer'.padStart(11)}${'rev/1,000'.padStart(11)}`);
console.log('─'.repeat(70));
for (const r of table) {
  console.log(`${label(r.k).slice(0, 25).padEnd(26)}${String(r.n).padStart(7)}${pct(r.n, withHook.length).padStart(8)}` +
    `${pct(r.buyers, r.n).padStart(7)}${dollars(r.revBuyer).padStart(11)}${dollars(r.rev1k).padStart(11)}`);
}
console.log('─'.repeat(70));
console.log(`${'BLENDED'.padEnd(26)}${String(all.n).padStart(7)}${'100%'.padStart(8)}${pct(all.buyers, all.n).padStart(7)}${dollars(all.revBuyer).padStart(11)}${dollars(all.rev1k).padStart(11)}`);
if (dropped.length) {
  const dn = dropped.reduce((s, [, rs]) => s + rs.length, 0);
  console.log(`\n   ${dropped.length} of ${groups.size} groups omitted under --min-n ${MIN_N} — ${dn} conversations, ` +
    `${pct(dn, withHook.length)} of the mix. That share is itself a finding: it is unrankable, not bad.`);
  console.log(`   ${dropped.map(([k]) => label(k)).slice(0, 8).join(', ')}${dropped.length > 8 ? ' …' : ''}`);
}
// 🔴 Slugs that are live in production but absent from the registry. The census counts
// the registry, so these prove the registry is NOT a complete list of what has run.
// Surfaced loudly because they otherwise sit in the table looking like a family name.
const unknowns = [...groups.keys()].filter((k) => String(k).startsWith('unknown:'));
if (unknowns.length) {
  console.log(`\n   ⚑ ${unknowns.length} hook slug(s) in production exposures exist NOWHERE in the registry:`);
  for (const u of unknowns) console.log(`      ${u.replace('unknown:', '').padEnd(26)} ${groups.get(u).length} conversation(s)`);
  console.log(`      The registry is therefore not a complete list of what has run. Find out where`);
  console.log(`      these came from before quoting the census as the full roster.`);
}
if (LEVEL === 'question') {
  console.log(`\n   what each asks (headlines are NOT unique — that is why rows are keyed by slug):`);
  for (const r of table) console.log(`     ${r.k.padEnd(26)} "${headlineOf(r.k)}"`);
}

// ── DARK CELLS — built, attributable, and no traffic in the window ──
const seen = new Set(withHook.map((r) => r.hook));
const darkTarot = R.tarotHooks.filter((h) => !seen.has(h));
const darkPalm = R.palmHooks.filter((h) => !seen.has(h));

console.log(`\n## Dark cells — built questions with NO attributed conversation in ${DAYS} days\n`);
// 🔴 A funnel with ZERO attributed rows is an attribution outage, not a dark funnel.
// Palm's hook is written only onto the ORDER-BUMP exposure, so when that experiment is
// not enrolling, every palm question reads "dark" while the funnel runs at full volume.
// Printing that as 10/10 dark would be the most damaging thing this script could say.
const funnelDead = (hooks, dark) => hooks.length > 0 && dark.length === hooks.length;
if (funnelDead(R.palmHooks, darkPalm)) {
  console.log(`   🔴 PALM: 0 of ${R.palmHooks.length} palm questions have ANY attributed row. That is an`);
  console.log(`      ATTRIBUTION OUTAGE, not a dark funnel. The palm hook is recorded only on the`);
  console.log(`      order-bump exposure (server/routes.ts ~line 1126), so when that experiment is`);
  console.log(`      not enrolling, palm attribution stops entirely while the funnel keeps running.`);
  console.log(`      Report palm as UNMEASURED here. Never as "not running".\n`);
} else if (darkPalm.length) {
  for (const h of darkPalm) console.log(`   ${'palm'.padEnd(20)} ${h.padEnd(24)} ${R.palmHeadlines.get(h) || ''}`);
}
if (funnelDead(R.tarotHooks, darkTarot)) {
  console.log(`   🔴 TAROT: 0 of ${R.tarotHooks.length} attributed — attribution outage, not a dark funnel.\n`);
} else {
  console.log(`   tarot: ${darkTarot.length} of ${R.tarotHooks.length} questions dark\n`);
  for (const h of darkTarot) console.log(`   ${R.groupOf(h).padEnd(20)} ${h.padEnd(24)} ${R.tarotHeadlines.get(h) || ''}`);
}
console.log(`\n   ⚠ With coverage at ${pct(withHook.length, rows.length)}, "dark" means "no ATTRIBUTED conversation".`);
console.log(`     Confirm against Ads Manager before telling anyone an ad is not running.`);

// ── DECAY — the proxy, per group, over time ──
const now = Date.now();
const binOf = (d) => {
  const age = (now - new Date(d).getTime()) / 86400000;
  return Math.min(BINS - 1, Math.max(0, BINS - 1 - Math.floor((age / DAYS) * BINS)));
};
const binDays = DAYS / BINS;

// 🔴 THE MISTAKE THIS SECTION IS BUILT TO AVOID — it fired on the very first live run.
// Scoring decay on a group's RAW attributed volume read "decode-him: vol +1191%, rev
// -71%, TAPPING OUT". Neither number was about decode-him. Attribution coverage itself
// ramped over the window (an experiment started enrolling more traffic), so every
// group's count exploded and every group's rate fell together. Raw volume here measures
// how much we LOGGED, not how much we BOUGHT.
//
// So both axes are made relative:
//   volume → the group's SHARE of attributed traffic in that bin
//   value  → the group's rev/1,000 INDEXED to the blend in that same bin (1.00 = blend)
// A coverage ramp moves the blend and every group with it, and cancels out. What
// survives is a group getting relatively worse while absorbing relatively more mix,
// which is the actual shape of a pool tapping out.
const binStats = Array.from({ length: BINS }, () => []);
for (const x of withHook) binStats[binOf(x.created_at)].push(x);
const blendBin = binStats.map((b) => stat(b));

console.log(`\n## Decay watch — ${BINS} bins of ~${binDays.toFixed(0)} days, oldest on the left\n`);
console.log(`   attributed volume, all groups: ${blendBin.map((b) => `${(b.n / binDays).toFixed(0)}/d`).join(' → ')}`);
console.log(`   blended rev/1,000:             ${blendBin.map((b) => dollars(b.rev1k)).join(' → ')}`);
const covRamp = blendBin[0].n ? blendBin[BINS - 1].n / blendBin[0].n : 1;
if (covRamp > 2 || covRamp < 0.5) {
  console.log(`\n   ⚠ Attributed volume changed ${covRamp.toFixed(1)}× across the window. That is almost`);
  console.log(`     certainly ATTRIBUTION COVERAGE moving, not spend. This is exactly why the rows`);
  console.log(`     below are scored on SHARE and on an index to the blend, never on raw counts.`);
}
console.log(`\n${'group'.padEnd(26)}${Array.from({ length: BINS }, (_, i) => `bin${i + 1}`.padStart(12)).join('')}   verdict`);
console.log('─'.repeat(30 + BINS * 12 + 24));

for (const r of table) {
  const rs = groups.get(r.k);
  const bins = Array.from({ length: BINS }, () => []);
  for (const x of rs) bins[binOf(x.created_at)].push(x);
  const s = bins.map((b) => stat(b));
  const shareOf = (i) => (blendBin[i].n ? s[i].n / blendBin[i].n : 0);
  const idxOf = (i) => (blendBin[i].rev1k ? s[i].rev1k / blendBin[i].rev1k : 0);

  const shareLine = s.map((x, i) => `${(shareOf(i) * 100).toFixed(0)}% mix`.padStart(12)).join('');
  const idxLine = s.map((x, i) => (x.n >= MIN_BIN_N ? `${idxOf(i).toFixed(2)}× bl` : '·').padStart(12)).join('');

  let verdict;
  const f = 0, l = BINS - 1;
  if (s[f].n < MIN_BIN_N || s[l].n < MIN_BIN_N) verdict = 'THIN — cannot say';
  else {
    const dShare = shareOf(l) - shareOf(f);                       // percentage points
    const dIdx = idxOf(f) ? (idxOf(l) - idxOf(f)) / idxOf(f) : 0; // relative to blend
    const pp = `${dShare >= 0 ? '+' : ''}${(dShare * 100).toFixed(0)}pp mix`;
    const iv = `${(dIdx * 100).toFixed(0)}% vs blend`;
    if (dShare >= 0.05 && dIdx <= -0.15) verdict = `TAPPING OUT? ${pp} / ${iv}`;
    else if (dIdx <= -0.15) verdict = `DECAYING vs blend ${iv}`;
    else if (dShare >= 0.05) verdict = `SCALING CLEAN ${pp}`;
    else verdict = 'HOLDING';
  }
  console.log(`${label(r.k).slice(0, 25).padEnd(26)}${shareLine}   ${verdict}`);
  console.log(`${''.padEnd(26)}${idxLine}`);
}
console.log(`\n   reading it: top row = share of attributed mix · bottom row = rev/1,000 as a`);
console.log(`   multiple of the blend that bin (1.00× = exactly average).`);
if (LEVEL === 'family') {
  console.log(`\n   🔴 RUN THIS AGAIN WITH --level question BEFORE BELIEVING ANY VERDICT ABOVE.`);
  console.log(`      A family verdict AVERAGES its questions and will hide a bad one. On the first`);
  console.log(`      live run "decode-him" read SCALING CLEAN while the single question holding 55%`);
  console.log(`      of the whole account's mix, cards-return, read TAPPING OUT? at 0.76× the blend.`);
  console.log(`      When the two levels disagree, THE QUESTION LEVEL WINS — it is where the money is.`);
}
console.log(`\n   🔴 "TAPPING OUT?" keeps its question mark and always will. Getting relatively`);
console.log(`      worse while taking more of the mix is the SHAPE of a pool thinning, and it is`);
console.log(`      equally the shape of creative fatigue, a seasonal shift, or Meta changing who`);
console.log(`      it delivers to. It tells you where to look in Ads Manager. It is not a`);
console.log(`      saturation measurement, and it must never be reported as one.`);
console.log(`   ⚠ A bin marked · is under --min-bin-n ${MIN_BIN_N} and was not scored.`);

// ── BLEND — what stacking actually costs, in mix terms ──
console.log(`\n## Stack order`);
console.log(`   1. Spend into the top of the efficiency table while it stays HOLDING or SCALING CLEAN.`);
console.log(`   2. The moment a rung reads TAPPING OUT?, stop adding to it and open the next rung down.`);
console.log(`   3. A rung below the blend still earns — it just pulls the blend down. That is a mix`);
console.log(`      decision, not a rejection. The headroom column below is how much it can hold.\n`);

if (TARGET == null) {
  console.log(`   ⚠ No --target given, so this order is RELATIVE only: first rung, second rung.`);
  console.log(`     It cannot say how many rungs are enough. No account CPA or ROAS target exists`);
  console.log(`     anywhere in this repo — the operator has to state one. Re-run with`);
  console.log(`     --target <revenue per 1,000 the account must blend to>.`);
} else {
  console.log(`   target blend: ${dollars(TARGET)} per 1,000 · actual now: ${dollars(all.rev1k)} ` +
    `(${all.rev1k >= TARGET ? 'ABOVE' : 'BELOW'} target)\n`);
  console.log(`${'group'.padEnd(26)}${'rev/1,000'.padStart(11)}${'share'.padStart(8)}   max share before the blend breaks`);
  console.log('─'.repeat(84));
  for (const r of table) {
    // Rest-of-account rate at its current relative mix.
    const restN = all.n - r.n, restRev = all.rev - r.rev;
    const rRest = restN ? (restRev / restN) * 1000 : 0;
    let head;
    if (r.rev1k >= TARGET) head = 'above target — more of it RAISES the blend';
    else if (rRest <= TARGET) head = 'rest of account is already below target — no headroom to give';
    else {
      const s = (rRest - TARGET) / (rRest - r.rev1k);
      head = `${(s * 100).toFixed(0)}% of mix (now ${(r.share * 100).toFixed(0)}%)`;
    }
    console.log(`${label(r.k).slice(0, 25).padEnd(26)}${dollars(r.rev1k).padStart(11)}` +
      `${((r.share * 100).toFixed(0) + '%').padStart(8)}   ${head}`);
  }
  console.log(`\n   🔴 "Max share" is a MIX ceiling, not a TAM ceiling. It says how much of the`);
  console.log(`      account this rung can hold before the blend drops under target, assuming the`);
  console.log(`      other rungs keep their current relative mix and their current rates. It says`);
  console.log(`      NOTHING about how many such women exist on Facebook. Nothing in this repo does.`);
}

console.log(`\n## Limits of this run — quote these with the numbers, not instead of them`);
console.log(`   · No spend, impressions, CPM, CPC, CPA, frequency or ROAS. Not thin — absent.`);
console.log(`   · Attribution coverage ${pct(withHook.length, rows.length)}; dark ≠ not running.`);
console.log(`   · Grouped at the ${LEVEL} level. SEGMENT and INJURY are not recorded anywhere in`);
console.log(`     the running system, so no per-segment decay is computable — see cascade-map.mjs.`);
console.log(`   · angleForHook's "angle" is roughly a THEME, not a cascade injury. Do not relabel it.`);
console.log(`   · To close the decay question you need a Meta export — see LIMITS in SKILL.md.\n`);

await client.query('ROLLBACK');
await client.end();
