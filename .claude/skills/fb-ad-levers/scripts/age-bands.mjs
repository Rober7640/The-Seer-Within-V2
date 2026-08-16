// fb-ad-levers — how the same wound changes by AGE, and what each band is worth.
// READ-ONLY.
//
// WHY THIS EXISTS. Age is the one dimension that adds specificity WITHOUT shrinking the
// pool, because Meta targets it for free. Splitting one question into four age-shaped
// versions covers the same audience with four ads instead of one. That is the opposite
// trade to deepening into a rare wound, which buys specificity by losing reach.
//
// 🔴 THE SAMPLE IS SELF-SELECTED. There is no age column in v1 `conversations`; this
// reads the age she VOLUNTEERS ("I'm 69"). Only ~0.8% do. That is a biased sample — but
// the bias runs the right way: a woman who writes her age is telling you age IS the
// wound, and she is exactly who an age-targeted ad reaches.
//
//   LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-ad-levers/scripts/age-bands.mjs --live
//   ... --theme 'soul ?mate'    restrict to one wound (default: all love+someone)
//   ... --samples 6             verbatims to print per band
import { connectReadOnly, beginReads, PAID } from '../../v1-funnel-live-audit/scripts/lib/live-db.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const THEME = arg('theme', null);
const SAMPLES = Number(arg('samples', 5));
// Which bucket's wound to age-split. Default love+someone (where the lever was measured);
// pass --bucket money to run it on the money bucket, --bucket all for every bucket.
const BUCKETS = arg('bucket', 'love,someone').split(',').map((s) => s.trim()).filter(Boolean);
const BANDS = [[25, 45], [45, 55], [55, 65], [65, 96]];

// Guard against "married 45 years" / "together for 30 years" — those are durations, not
// ages, and catching them silently fills the bands with the wrong women.
const AGE = /\b(?:i(?:'| a)?m|i am|im|age|aged|turning|turn)\s+(\d{2})\b|\bat\s+(\d{2})\s+(?:years old|yrs old|i )|\b(\d{2})\s*(?:years old|yrs old|yo)\b/i;

const { client, canary, mode } = await connectReadOnly({ live: argv.includes('--live') });
console.log(`\nage bands · ${mode} · canary ${canary} · bucket ${BUCKETS.join('+')}${THEME ? ` · wound /${THEME}/` : ''}`);
await beginReads(client, 180000);

const P = PAID.replace(/main_paid_at|purchased|upsell_offered/g, (m) => 'c.' + m);
const REV = `c.main_purchase_amount + COALESCE(c.bump_amount_cents,0)
 + CASE WHEN c.upsell_purchased THEN COALESCE(c.upsell_amount,0) ELSE 0 END
 + CASE WHEN c.upsell2_purchased THEN COALESCE(c.upsell2_amount,0) ELSE 0 END`;
const bucketSql = BUCKETS.includes('all') ? '' : ' AND c.bucket = ANY($1)';
const { rows } = await client.query(`SELECT c.concern, (${P}) paid,
  CASE WHEN ${P} THEN ${REV} ELSE 0 END::int rev FROM conversations c
  WHERE c.concern IS NOT NULL AND length(c.concern) > 15${bucketSql}`,
  BUCKETS.includes('all') ? [] : [BUCKETS]);

const themeRe = THEME ? new RegExp(THEME, 'i') : null;
const pool = themeRe ? rows.filter((r) => themeRe.test(r.concern)) : rows;
const aged = [];
for (const r of pool) {
  const m = r.concern.match(AGE);
  if (!m) continue;
  const a = Number(m[1] || m[2] || m[3]);
  if (a >= 25 && a <= 95) aged.push({ ...r, age: a });
}
const rev1k = (s) => (s.length ? (s.reduce((a, r) => a + Number(r.rev), 0) / s.length) * 10 : 0);

console.log(`\nstates her age: ${aged.length} of ${pool.length} (${(aged.length / pool.length * 100).toFixed(1)}%)`);
console.log(`pool base: $${rev1k(pool).toFixed(0)}/1,000\n`);
console.log(`age band      n     buy%    rev/1,000    mentions a death   Meta ad-set`);
const META = { '25-45': '25-44', '45-55': '45-54', '55-65': '55-64', '65-+': '65+' };
for (const [lo, hi] of BANDS) {
  const s = aged.filter((x) => x.age >= lo && x.age < hi);
  if (!s.length) continue;
  const wd = s.filter((x) => /widow|passed away|passed on|\bdied\b|death of|late (husband|wife|partner)|lost (my )?(husband|wife|partner)/i.test(x.concern));
  const key = `${lo}-${hi > 90 ? '+' : hi}`;
  console.log(`${key.padEnd(12)}${String(s.length).padStart(5)}${(s.filter((x) => x.paid).length / s.length * 100).toFixed(1).padStart(8)}%` +
    `${('$' + rev1k(s).toFixed(0)).padStart(12)}${((wd.length / s.length * 100).toFixed(0) + '%').padStart(18)}   ${META[key] || ''}`);
}

const thinBands = BANDS.map(([lo, hi]) => aged.filter((x) => x.age >= lo && x.age < hi))
  .filter((s) => s.length && s.filter((x) => x.paid).length < 8).length;
if (aged.length < 150 || thinBands >= 2) {
  console.log(`\n🔴 TOO THIN TO PRICE. ${aged.length} rows state an age${THEME ? ' inside this wound' : ''}` +
    `, and ${thinBands} band(s) have under 8 buyers.`);
  console.log(`   Do NOT quote the rev/1,000 column above. Only ~0.8% of women state an age, so`);
  console.log(`   scoping to one wound collapses the sample — the 2026-08 soulmate run fell to`);
  console.log(`   n=27 with zero buyers in two bands.`);
  console.log(`   ⇒ Price the age bands on the FULL love+someone pool (drop --theme), and use the`);
  console.log(`     themed run only to READ how her wound changes with age. Never present a`);
  console.log(`     pool-wide age value as if it were measured inside one wound.`);
}

console.log(`\n🔴 READ THE VERBATIMS. The bands differ in WHAT SHE FEARS, not just in value.`);
console.log(`   On the 2026-08 soulmate run: 45-55 feared NEVER, 65+ feared TOO LATE, and`);
console.log(`   1 in 5 of the 65+ band had buried a spouse. Same words, different wound.`);
let seed = 11 >>> 0;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [x[i], x[j]] = [x[j], x[i]]; } return x; };
for (const [lo, hi] of BANDS) {
  const s = aged.filter((x) => x.age >= lo && x.age < hi);
  if (!s.length) continue;
  console.log(`\n### ${lo}-${hi > 90 ? '+' : hi}`);
  shuffle(s).slice(0, SAMPLES).forEach((r) => console.log(`   (${r.age}) ${r.concern.replace(/\s+/g, ' ').slice(0, 165)}`));
}
console.log(`\n⚠ COMPLIANCE: age is a personal attribute. The banned FORM is the second-person`);
console.log(`  assertion — "Are you over 65 and still alone?". Put the age in the AD SET, never`);
console.log(`  in the copy, and you get the specificity while staying compliant.`);
await client.query('COMMIT');
await client.end();
