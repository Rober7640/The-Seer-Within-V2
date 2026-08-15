// fb-ad-question-mining — SUB-BUCKET DISCOVERY. READ-ONLY.
//
// Surfaces candidate sub-buckets INSIDE one theme, from the corpus, so they don't have
// to be guessed. Output is a shortlist of phrases to READ — never headlines, and never a
// ranking to act on directly. Step 3 of the skill still applies: you read the quotes.
//
// 🔴 THIS IS NOT N-GRAM FREQUENCY MINING, which Step 3 forbids and which was corrected
// once already. The two rank on opposite things and surface opposite language:
//
//   FREQUENCY  ranks a phrase by how OFTEN it appears  → the most common phrasing wins
//              → "does he love me" → true of every woman in the bucket → targets nobody
//   LIFT       ranks by how much MORE the women who use it are worth, length-controlled
//              → "his children come before me" → rare BECAUSE it is specific
//              → identifies one woman: 40s, blended family, second relationship
//
// Rare-and-valuable is the signal. Frequency actively suppresses it, which is why the
// first attempt at this produced generic headlines.
//
//   LIVE_AUDIT_CONFIRM=1 node .../discover-subbuckets.mjs --live --theme commitment
//   ... --theme "commit|marry|propose"   (raw regex)  --min-n 12  --buckets love,someone
//
// Reuses the read-only contract from the v1-funnel-live-audit skill rather than carrying
// a second copy of the canary and the definition of a SALE — two copies would drift and
// report two different revenues for one window.
import {
  connectReadOnly, beginReads, PAID, pct, dollars,
} from '../../v1-funnel-live-audit/scripts/lib/live-db.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const LIVE = argv.includes('--live');
// 🔴 DELIBERATELY LOW. This is a CANDIDATE GENERATOR, not a ranker. A specific situation
// ("his children come before me") is rare BECAUSE it is specific, so any threshold high
// enough to be statistically comfortable also filters out everything worth finding.
// Raising min-n to 40 on a 9.5k corpus buried "should i stay" — a real sub-bucket — and
// surfaced "i wonder" instead. Confidence is not this script's job; the lander test is.
const MIN_N = Number(arg('min-n', 12));
const MIN_BUYERS = Number(arg('min-buyers', 4));
const BUCKETS = arg('buckets', 'love,someone').split(',').map((b) => `'${b.trim()}'`).join(',');

// Named themes so a run is reproducible; any raw regex is also accepted.
const THEMES = {
  commitment: 'commit|marry|marriage|propose|future|serious|exclusive|relationship|together',
  trust:      'lie|lying|honest|truth|trust|hiding|secret|cheat',
  reunion:    'come back|comes back|return|back together|reconcile|left me|walked away',
  loneliness: 'alone|lonely|by myself|no one|nobody|find someone|will i ever',
};
const themeArg = arg('theme', 'commitment');
const THEME = THEMES[themeArg] ?? themeArg;

const STOP = new Set(('i me my myself we our you your he him his she her it its they them their ' +
  'a an the and or but if of at by for with about into to from up down in out on off over under ' +
  'is am are was were be been being do does did doing have has had having will would shall should ' +
  'can could may might must this that these those there here then than so very just really').split(' '));
// Verbs/adverbs generic enough to carry no situation on their own.
const WEAK = new Set(('get got go going gone come came make made take took know knew think thought ' +
  'want wanted need needed say said tell told see saw look looked feel felt seem seems find ' +
  'try trying keep kept put give gave let lot much many more most now also even still ' +
  'when what where why how who which while because been ve don t s re m ll').split(' '));

const { client, canary, mode, redactedHost } = await connectReadOnly({ live: LIVE });
console.log(`\nsub-bucket discovery · ${mode}\nDB: ${redactedHost}\nCanary: ${canary}`);
await beginReads(client);

const REV = `c.main_purchase_amount + COALESCE(c.bump_amount_cents,0)
  + CASE WHEN c.upsell_purchased  THEN COALESCE(c.upsell_amount,0)  ELSE 0 END
  + CASE WHEN c.upsell2_purchased THEN COALESCE(c.upsell2_amount,0) ELSE 0 END`;
const P = PAID.replace(/main_paid_at|purchased|upsell_offered/g, (m) => 'c.' + m);

const { rows } = await client.query(`
  SELECT c.concern, (${P}) paid,
         CASE WHEN ${P} THEN ${REV} ELSE 0 END::int rev
  FROM conversations c
  WHERE c.concern IS NOT NULL AND length(c.concern) > 25
    AND c.bucket IN (${BUCKETS}) AND c.concern ~* '(${THEME})'`);

console.log(`theme "${themeArg}" · ${rows.length} concerns · ${rows.filter((r) => r.paid).length} buyers\n`);
if (rows.length < 300) { console.log('🔴 corpus too small to discover from — widen the theme.'); await client.query('COMMIT'); await client.end(); process.exit(0); }

// ── build phrase → document index ────────────────────────────────────────────
const docs = rows.map((r, i) => ({
  i, len: r.concern.length, paid: r.paid, rev: Number(r.rev),
  toks: r.concern.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean),
}));
const index = new Map();
for (const d of docs) {
  const seen = new Set();
  for (let n = 2; n <= 5; n++) {
    for (let k = 0; k + n <= d.toks.length; k++) {
      const gram = d.toks.slice(k, k + n);
      // A situation needs a CONTENT word. Function-word soup ("lot i", "neither of",
      // "spend the") scores like a theme but means nothing, and at a low min-n it
      // otherwise floods the list. Require a token that is neither a stopword nor one
      // of the weak all-purpose verbs that appear in every concern.
      if (!gram.some((t) => !STOP.has(t) && !WEAK.has(t) && t.length > 2)) continue;
      const key = gram.join(' ');
      if (seen.has(key)) continue;
      seen.add(key);
      (index.get(key) ?? index.set(key, []).get(key)).push(d.i);
    }
  }
}

// ── score each candidate against a LENGTH-MATCHED baseline ───────────────────
// Length is the dominant confound: longer concerns buy far more, so any phrase that
// simply takes more words to say inherits a lift that has nothing to do with its meaning.
const CEIL = rows.length * 0.12;   // more common than this is generic by construction
const per1k = (set) => set.length ? (set.reduce((a, i) => a + docs[i].rev, 0) / (set.length / 1000)) : 0;
const wilsonLo = (k, n) => {
  if (!n) return 0;
  const z = 1.96, p = k / n, dd = 1 + z * z / n;
  return Math.max(0, ((p + z * z / (2 * n)) - z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / dd);
};

const cands = [];
for (const [phrase, ids] of index) {
  if (ids.length < MIN_N || ids.length > CEIL) continue;
  const buyers = ids.filter((i) => docs[i].paid).length;
  if (buyers < MIN_BUYERS) continue;              // no lift is estimable below this
  const lens = ids.map((i) => docs[i].len).sort((a, b) => a - b);
  const lo = lens[Math.floor(lens.length * 0.15)], hi = lens[Math.floor(lens.length * 0.85)];
  const inSet = new Set(ids);
  const base = docs.filter((d) => !inSet.has(d.i) && d.len >= lo && d.len <= hi).map((d) => d.i);
  if (base.length < 100) continue;
  const bBuyers = base.filter((i) => docs[i].paid).length;
  const sub1k = per1k(ids), base1k = per1k(base);
  // 🔴 Thousands of phrases are tested, so the best point estimate is guaranteed to be
  // noise. Require the phrase's conversion LOWER BOUND to clear the baseline rate before
  // its revenue lift is allowed to count at all.
  if (wilsonLo(buyers, ids.length) <= bBuyers / base.length) continue;
  cands.push({
    phrase, n: ids.length, buyers, cvr: buyers / ids.length,
    baseCvr: bBuyers / base.length, sub1k, base1k,
    lift: base1k ? sub1k / base1k - 1 : 0, medLen: lens[Math.floor(lens.length / 2)],
    // 🔴 RANK ON THIS, NOT ON `lift`. Ranking thousands of phrases by a point estimate
    // guarantees the winners are the smallest samples — variance, not signal. The
    // conservative lift uses the Wilson LOWER bound on the phrase's conversion, so a
    // phrase only outranks another by being both better AND better-evidenced.
    safeLift: (wilsonLo(buyers, ids.length) / (bBuyers / base.length)) - 1,
  });
}

// Drop a phrase whose meaning is already carried by a stronger, longer one.
cands.sort((a, b) => b.lift - a.lift);
const kept = [];
for (const c of cands) {
  if (kept.some((k) => k.phrase.includes(c.phrase) || c.phrase.includes(k.phrase))) continue;
  kept.push(c);
}

console.log(`## Candidate sub-bucket phrases — ranked by LENGTH-CONTROLLED revenue lift`);
console.log(`   ${index.size} phrases considered · ${cands.length} cleared the conversion floor · ${kept.length} after dedup\n`);
console.log('phrase                              n  buyers    cvr   vs base    $/1k   raw lift   SAFE lift');
const TOPN = Number(arg('top', 20));
for (const c of kept.slice(0, TOPN))
  console.log(`${c.phrase.slice(0, 34).padEnd(35)} ${String(c.n).padStart(4)} ${String(c.buyers).padStart(6)} ` +
    `${pct(c.buyers, c.n).padStart(6)} ${pct(c.baseCvr * 100, 100).padStart(7)}  ${dollars(c.sub1k).padStart(7)}  ` +
    `${((c.lift * 100).toFixed(0) + '%').padStart(8)}  ${((c.safeLift * 100).toFixed(0) + '%').padStart(9)}`);

console.log(`\n## Read these — verbatims for the top phrases (Step 3 still applies)`);
for (const c of kept.slice(0, 10)) {
  console.log(`\n  ▸ "${c.phrase}"  (n=${c.n}, ${c.buyers} buyers, safe lift +${(c.safeLift * 100).toFixed(0)}%)`);
  const ex = index.get(c.phrase).filter((i) => docs[i].paid).slice(0, 3);
  for (const i of ex) console.log(`      "${rows[i].concern.replace(/\s+/g, ' ').slice(0, 150)}…"`);
}
console.log(`\nⓘ These are candidates to READ and cluster into named sub-buckets, not headlines`);
console.log(`  and not a ranking to act on. Multiple-testing still applies after the floor.`);

await client.query('COMMIT');
await client.end();
