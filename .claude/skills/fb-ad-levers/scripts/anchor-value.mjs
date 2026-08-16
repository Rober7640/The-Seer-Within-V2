// fb-ad-levers — rank the VOCABULARY she uses by what it is worth. READ-ONLY.
//
// WHY THIS EXISTS. The words in an ad are not decoration — they are a targeting input.
// Meta matches creative content to people who engage with similar content, so the
// keyword decides which pool you buy from. This ranks candidate anchors by revenue.
//
// 🔴 WHAT THIS CAN AND CANNOT TELL YOU. It measures words SHE writes in her concern,
// AFTER clicking. So it proves a word correlates with a valuable customer. It does NOT
// prove an ad carrying that word attracts her. Only a lander test closes that gap.
//
// 🔴 The corpus is contaminated by our own past targeting. "soulmate" is 5% of all
// concerns partly because we run soulmate ads. Read share with that in mind; read
// revenue per 1,000 as the finding (it is a rate, so traffic volume does not move it).
//
//   LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-ad-levers/scripts/anchor-value.mjs --live
//   ... --min-n 200        raise the floor
//   ... --words ./my.json  {"label": "regex", ...} to test your own candidates
import fs from 'node:fs';
import { connectReadOnly, beginReads, PAID } from '../../v1-funnel-live-audit/scripts/lib/live-db.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const MIN_N = Number(arg('min-n', 80));
// Restrict the corpus to one bucket, e.g. --bucket money. Default: every bucket.
const BUCKETS = arg('bucket', 'all').split(',').map((s) => s.trim()).filter(Boolean);

// Measured 2026-08-16 across 69,987 concerns. MECHANISM words (a practice with a
// procedure) beat SENTIMENT words (a thing she feels) by 2-3x. Kept as the default set
// so a re-run reproduces the finding; override with --words.
const DEFAULT = {
  'reading': 'reading', 'divine': 'divine', 'aligned/alignment': 'align',
  'psychic/medium': 'psychic|medium\\b', 'tarot/cards': 'tarot|cards?\\b',
  'energy': 'energy|energies', 'healing': 'healing|heal\\b', 'spirit(ual)': 'spirit',
  'journey': 'journey', 'block(ed)': 'block', 'angel': 'angel',
  'god/prayer': 'god\\b|pray|blessed', 'connection': 'connection', 'purpose': 'purpose',
  'closure': 'closure', 'twin flame': 'twin ?flame', 'clarity': 'clarity',
  'manifest': 'manifest', 'destiny': 'destin', 'sign(s)': 'signs?\\b',
  'soulmate': 'soul ?mate', 'meant to be': 'meant to be|meant for me',
  'intuition/gut': 'intuition|gut\\b', 'universe': 'universe', 'karma': 'karma|karmic',
  'curse/hex': 'curse|hex\\b|jinx', 'past life': 'past li(fe|ves)',
  'zodiac/astro': 'zodiac|astrolog|horoscope|birth chart|retrograde',
};
const wordsPath = arg('words', null);
const WORDS = wordsPath ? JSON.parse(fs.readFileSync(wordsPath, 'utf8')) : DEFAULT;

const { client, canary, mode } = await connectReadOnly({ live: argv.includes('--live') });
console.log(`\nanchor value · ${mode} · canary ${canary} · bucket ${BUCKETS.join('+')}`);
await beginReads(client, 180000);

const P = PAID.replace(/main_paid_at|purchased|upsell_offered/g, (m) => 'c.' + m);
const REV = `c.main_purchase_amount + COALESCE(c.bump_amount_cents,0)
 + CASE WHEN c.upsell_purchased THEN COALESCE(c.upsell_amount,0) ELSE 0 END
 + CASE WHEN c.upsell2_purchased THEN COALESCE(c.upsell2_amount,0) ELSE 0 END`;
// 🔴 Filter in JS, never in SQL. Postgres regex uses \y for a word boundary; \b there
// means BACKSPACE, so a pattern with \b silently matches nothing and the query succeeds.
const bucketSql = BUCKETS.includes('all') ? '' : ' AND c.bucket = ANY($1)';
const { rows } = await client.query(`SELECT c.concern, (${P}) paid,
  CASE WHEN ${P} THEN ${REV} ELSE 0 END::int rev FROM conversations c
  WHERE c.concern IS NOT NULL AND length(c.concern) > 15${bucketSql}`,
  BUCKETS.includes('all') ? [] : [BUCKETS]);

const rev1k = (s) => (s.length ? (s.reduce((a, r) => a + Number(r.rev), 0) / s.length) * 10 : 0);
const base = rev1k(rows);
const out = [];
for (const [label, src] of Object.entries(WORDS)) {
  if (label.startsWith('_')) continue;
  const re = new RegExp(src, 'i');
  const s = rows.filter((r) => re.test(r.concern));
  if (s.length < MIN_N) continue;
  out.push({ label, n: s.length, share: s.length / rows.length * 100,
    buy: s.filter((r) => r.paid).length / s.length * 100, rev: rev1k(s) });
}
out.sort((a, b) => b.rev - a.rev);

console.log(`\ncorpus n=${rows.length} · base $${base.toFixed(0)}/1,000 · min ${MIN_N} mentions\n`);
console.log(`keyword                mentions   share    buy%    rev/1,000   vs base`);
for (const r of out) {
  const d = (r.rev / base - 1) * 100;
  console.log(`${r.label.padEnd(23)}${String(r.n).padStart(8)}${r.share.toFixed(1).padStart(7)}%` +
    `${r.buy.toFixed(1).padStart(8)}%${('$' + r.rev.toFixed(0)).padStart(12)}` +
    `${((d >= 0 ? '+' : '') + d.toFixed(0) + '%').padStart(9)}`);
}
console.log(`\nⓘ Words she writes AFTER clicking — a correlate, not proof an ad carrying it`);
console.log(`  attracts her. Share is contaminated by our own past targeting; rank on rev/1,000.`);
await client.query('COMMIT');
await client.end();
