// fb-ad-question-mining — SIZE proposed sub-buckets, ad-independently. READ-ONLY.
//
// 🔴 THE CONFOUND THIS EXISTS TO DODGE. The concern corpus contains whoever the ads we
// happened to run brought in, and META chose that mix — we did not. So a sub-bucket's
// raw COUNT is part demand and part Meta's delivery decision, and the two cannot be
// separated after the fact. Ranking build order by n therefore ranks Meta's past ad
// choices, not the market.
//
// Revenue per 1,000 (Step 2b) is NOT broken by this — it is already a rate, so sending
// 10× the traffic to a sub-group leaves it unchanged. But it measures value DENSITY, and
// a build decision also needs addressable SIZE. This adds the size axis without n:
//
//   PREVALENCE  = share of women who volunteer the frame, computed WITHIN each source
//                 hook's own traffic. A property of the audience, not of the ad mix.
//   FLATNESS    = how much prevalence varies across source hooks.
//                 flat  → no current ad targets it, women say it anyway → UNTAPPED
//                 spiked→ one ad already captures her → the count reflects that ad
//   REV/BUYER   = value once she buys. Also ad-independent (measured within her cohort).
//
// Usage — sub-buckets are supplied as JSON so a run is reproducible and reviewable:
//   LIVE_AUDIT_CONFIRM=1 node .../size-subbuckets.mjs --live --subs ./subs.json
//   subs.json = { "YEARS": "regex", "RANK": "regex", ... }   (POSIX regex, case-insensitive)
//
// Reuses v1-funnel-live-audit's read-only contract rather than a second copy of the
// canary and the definition of a SALE.
import fs from 'node:fs';
import { connectReadOnly, beginReads, PAID, pct, dollars } from '../../v1-funnel-live-audit/scripts/lib/live-db.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const LIVE = argv.includes('--live');
const BUCKETS = arg('buckets', 'love,someone').split(',').map((b) => `'${b.trim()}'`).join(',');
const MIN_HOOK_N = Number(arg('min-hook-n', 120));

const subsPath = arg('subs', null);
if (!subsPath || !fs.existsSync(subsPath)) {
  console.error('🔴 --subs <file.json> required: { "NAME": "regex", ... }');
  process.exit(2);
}
const SUBS = JSON.parse(fs.readFileSync(subsPath, 'utf8'));

const { client, canary, mode, redactedHost } = await connectReadOnly({ live: LIVE });
console.log(`\nsub-bucket sizing · ${mode}\nDB: ${redactedHost}\nCanary: ${canary}\n`);
await beginReads(client, 120000);

const P = PAID.replace(/main_paid_at|purchased|upsell_offered/g, (m) => 'c.' + m);
const REV = `c.main_purchase_amount + COALESCE(c.bump_amount_cents,0)
 + CASE WHEN c.upsell_purchased THEN COALESCE(c.upsell_amount,0) ELSE 0 END
 + CASE WHEN c.upsell2_purchased THEN COALESCE(c.upsell2_amount,0) ELSE 0 END`;

// One pull. The per-row correlated subquery for "which ad brought her" times out; this
// materialises the map once and does the rest in JS.
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
  SELECT c.concern, m.hook, (${P}) paid, CASE WHEN ${P} THEN ${REV} ELSE 0 END::int rev
  FROM conversations c LEFT JOIN map m ON m.cid = c.id
  WHERE c.concern IS NOT NULL AND length(c.concern) > 15 AND c.bucket IN (${BUCKETS})`);

const withHook = rows.filter((r) => r.hook);
console.log(`${rows.length} concerns · ${withHook.length} with a known source ad\n`);

const byHook = {};
for (const r of withHook) (byHook[r.hook] ||= []).push(r);
const hooks = Object.entries(byHook).filter(([, v]) => v.length >= MIN_HOOK_N)
  .sort((a, b) => b[1].length - a[1].length).slice(0, 6);
if (hooks.length < 2) console.log('⚠ fewer than 2 hooks with enough traffic — flatness is not computable.\n');

const res = [];
for (const [name, src] of Object.entries(SUBS)) {
  const re = new RegExp(src, 'i');
  const set = rows.filter((r) => re.test(r.concern));
  const buyers = set.filter((r) => r.paid);
  const cells = hooks.map(([, v]) => v.filter((r) => re.test(r.concern)).length / v.length);
  const lo = Math.min(...cells), hi = Math.max(...cells);
  res.push({
    name, n: set.length, buyers: buyers.length,
    prevalence: cells.length ? cells.reduce((a, b) => a + b, 0) / cells.length : set.length / rows.length,
    spread: cells.length && lo > 0 ? hi / lo : null,
    cvr: set.length ? buyers.length / set.length : 0,
    revPerBuyer: buyers.length ? buyers.reduce((a, r) => a + Number(r.rev), 0) / buyers.length : 0,
    cells,
  });
}

console.log('## Prevalence by source ad (a flat row = nothing targets it, she says it anyway)');
console.log('sub-bucket   ' + hooks.map(([h]) => h.replace('cards-', '').slice(0, 9).padStart(10)).join('') + '    spread');
for (const r of res)
  console.log(`${r.name.padEnd(12)} ` + r.cells.map((c) => (c * 100).toFixed(1).padStart(9) + '%').join('') +
    `   ${r.spread == null ? '  —' : r.spread.toFixed(1) + '×'}` +
    `${r.spread != null && r.spread < 1.8 ? '  ← FLAT: untapped' : r.spread > 3 ? '  ← spiked: already served' : ''}`);

console.log('\n## Build ranking — prevalence first, rev/buyer as tiebreaker');
console.log('   (n shown for evidence only — it is part demand, part Meta\'s delivery choice)');
console.log('sub-bucket   prevalence   cvr    rev/buyer      n     verdict');
for (const r of [...res].sort((a, b) => b.prevalence - a.prevalence)) {
  const untapped = r.spread != null && r.spread < 1.8;
  const verdict = untapped && r.prevalence > 0.02 ? 'BUILD — sizeable and unserved'
    : untapped ? 'build — unserved but thin'
    : r.spread > 3 ? 'already served by an existing ad'
    : 'watch';
  console.log(`${r.name.padEnd(12)} ${(r.prevalence * 100).toFixed(1).padStart(9)}%  ${pct(r.buyers, r.n).padStart(6)}  ${dollars(r.revPerBuyer).padStart(8)}  ${String(r.n).padStart(6)}   ${verdict}`);
}

console.log(`\nⓘ LIMIT: "flat" means no CURRENT ad targets it — the hooks compared are only the`);
console.log(`  ones running. It cannot see demand no question has ever touched. Running the ad`);
console.log(`  is what makes its prevalence spike; that is the point of running it.`);
await client.query('COMMIT');
await client.end();
