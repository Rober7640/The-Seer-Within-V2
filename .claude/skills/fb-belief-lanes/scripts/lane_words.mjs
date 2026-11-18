// lane_words.mjs - how often buyers type given words in their own chat answers, and how many of those chats paid.
//
//   LIVE_AUDIT_CONFIRM=1 node lane_words.mjs --term "label=regex" [--term ...]
//       [--prefilter "<postgres regex>"] [--buckets love,someone] [--days 365]
//       [--quotes 60] [--quote-terms label1,label2]
//
// READ ONLY: uses the read-only live DB helper (connectReadOnly + ROLLBACK). Nothing is written.
// Only the short columns (concern, deeper_response, block_source, emotional_response) are read;
// a regex over the messages table times out.
//
// Term regexes are JavaScript (case-insensitive), e.g. --term "horoscope=horoscope".
// --prefilter is a Postgres regex that narrows the rows fetched; it defaults to the union of all term regexes
// (so keep term regexes in the syntax both engines share, or pass --prefilter yourself).
// --quote-terms picks the terms whose lines are shown as sample quotes (default: all terms).
//
// Output: base (convos, paid, paid%), a table term | convos | paid | paid%, the "any quote-term" totals,
// then up to --quotes sample lines (paid first, marked $), each 20-200 chars, deduped.
//
// CAVEAT: compare words with each other, not with the base rate: a chat that typed these words already got further.
import { connectReadOnly, beginReads, PAID } from '/Users/joel/Library/CloudStorage/OneDrive-altius/Fun Projects/The-Seer-Within-V2-Production-joel-chue/The-Seer-Within-V2-Production/.claude/skills/v1-funnel-live-audit/scripts/lib/live-db.mjs';

const argv = process.argv.slice(2);
const opt = { term: [], prefilter: null, buckets: 'love,someone', days: 365, quotes: 60, 'quote-terms': null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
  const k = a.slice(2); if (!(k in opt)) throw new Error(`unknown option ${a}`);
  const v = argv[++i]; if (v === undefined) throw new Error(`${a} needs a value`);
  if (k === 'term') opt.term.push(v); else opt[k] = v;
}
if (!opt.term.length) throw new Error('give at least one --term "label=regex"');
const days = Number(opt.days); if (!Number.isInteger(days) || days < 1) throw new Error('--days must be a positive integer');
const nQuotes = Number(opt.quotes);
const buckets = String(opt.buckets).split(',').map(s => s.trim()).filter(Boolean);
if (!buckets.every(b => /^[a-z_]+$/i.test(b))) throw new Error('--buckets: letters only');

const TERMS = {};
for (const t of opt.term) {
  const i = t.indexOf('='); if (i < 1) throw new Error(`--term needs label=regex, got "${t}"`);
  TERMS[t.slice(0, i)] = new RegExp(t.slice(i + 1), 'i');
}
const quoteLabels = opt['quote-terms'] ? String(opt['quote-terms']).split(',').map(s => s.trim()) : Object.keys(TERMS);
for (const l of quoteLabels) if (!TERMS[l]) throw new Error(`--quote-terms: no term labelled "${l}"`);
// JS \b (word boundary) is backspace in Postgres; translate to \y
const prefilter = opt.prefilter ?? Object.values(TERMS).map(r => r.source.replace(/\\b/g, '\\y')).join('|');

const inList = buckets.map(b => `'${b}'`).join(',');
const { client } = await connectReadOnly({ live: true });
await beginReads(client, 120000);
const r = await client.query(`SELECT concern, deeper_response, block_source, emotional_response, ${PAID} AS paid
  FROM conversations WHERE created_at > now() - interval '${days} days' AND bucket IN (${inList})
  AND concat_ws(' ', concern, deeper_response, block_source, emotional_response) ~* $1`, [prefilter]);
const tot = await client.query(`SELECT count(*)::int n, count(*) FILTER (WHERE ${PAID})::int p FROM conversations WHERE created_at > now() - interval '${days} days' AND bucket IN (${inList})`);
await client.query('ROLLBACK'); await client.end();

console.log(`base: ${tot.rows[0].n} ${buckets.join('/')} convos, ${tot.rows[0].p} paid (${(100*tot.rows[0].p/tot.rows[0].n).toFixed(1)}%)`);
const txt = row => [row.concern, row.deeper_response, row.block_source, row.emotional_response].filter(Boolean).join(' | ');
console.log('\nterm | convos | paid | paid%');
for (const [k, re] of Object.entries(TERMS)) {
  const hit = r.rows.filter(row => re.test(txt(row))); const p = hit.filter(x => x.paid).length;
  console.log(`${k} | ${hit.length} | ${p} | ${hit.length ? (100*p/hit.length).toFixed(1) : '-'}%`);
}
const isQ = s => quoteLabels.some(k => TERMS[k].test(s));
const anyQ = r.rows.filter(row => isQ(txt(row)));
console.log(`\nany of (${quoteLabels.join(', ')}): ${anyQ.length} convos, ${anyQ.filter(x => x.paid).length} paid`);
const seen = new Set(); const qs = [];
for (const row of anyQ) for (const t of [row.concern, row.deeper_response, row.block_source, row.emotional_response]) {
  if (!t) continue; const s = t.replace(/\s+/g, ' ').trim();
  if (s.length < 20 || s.length > 200 || seen.has(s) || !isQ(s)) continue;
  seen.add(s); qs.push({ paid: row.paid, s });
}
const shuf = a => a.sort(() => Math.random() - .5);
const pick = [...shuf(qs.filter(q => q.paid)), ...shuf(qs.filter(q => !q.paid))].slice(0, nQuotes);
console.log(`\n${qs.length} matching lines; showing ${pick.length} ($ = paid)`);
for (const q of pick) console.log(`${q.paid ? '$' : '-'} ${q.s}`);
