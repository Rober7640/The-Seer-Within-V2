// pull-read-voc — the VOC corpus behind the three /fb-read hooks. READ-ONLY.
//
//   node scripts/pull-read-voc.mjs --doc                       # rebuild the doc from the last pull
//   LIVE_AUDIT_CONFIRM=1 node scripts/pull-read-voc.mjs --live  # pull from production, then --doc
//
// WHY THIS FILE EXISTS. The seven personas in improve-v1/fb-read/evals/personas.mjs
// are composites of 180 real `concern` texts. The script that pulled them was a
// throwaway in a scratchpad and is gone, so the header comment records the RESULT
// ("3 theme searches, 5,095 matches, 60 buyers each") and not one of the searches.
// The corpus behind every persona, every guard and every hook choice was therefore
// unreproducible. That is what this fixes: the patterns live here, in the repo, and
// a re-pull is one command.
//
// 🔴 THE PATTERNS BELOW ARE RE-DERIVED, NOT RECOVERED. They will not reproduce the
// original 5,095 exactly. They are built from the tested sub-group regexes in
// .claude/skills/fb-ad-question-mining (Trust/Honesty, Reunion/Return,
// Loneliness/Timing + Healing/Moving-on), which have been precision-audited against
// this same table. Record whatever count this run produces — do not tune the
// patterns to hit an old number, which matches a total without matching the rows.
//
// 🔴 POSIX, NOT PCRE. Postgres `~*` is POSIX ERE: the word boundary is `\y`, NOT
// `\b` (which means backspace). Every short alternative is `\y`-anchored, because
// unanchored ones match inside other words — `ring` inside "wondering" once turned a
// build candidate into a below-base segment, and a bare `he` lives inside "she".
//
// 🔴 TWO OUTPUTS, AND ONLY ONE IS COMMITTABLE.
//   audit-runs/read-voc/   raw pull + per-hook quote files. GITIGNORED. Real customer
//                          text. Redaction is best-effort, never a guarantee.
//   docs/v1-read-love-voc.md   the doc. Redacted quotes only.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  connectReadOnly, beginReads, PAID, pct, dollars,
} from '../.claude/skills/v1-funnel-live-audit/scripts/lib/live-db.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const LIVE = argv.includes('--live');
const DOC_ONLY = argv.includes('--doc');
const QUOTES_PER_HOOK = Number(arg('quotes', 60));
const SEED = Number(arg('seed', 0.4242));

const OUT_DIR = 'audit-runs/read-voc';
const RAW = path.join(OUT_DIR, 'raw.json');
const DOC = 'docs/v1-read-love-voc.md';

// ── the three theme patterns ────────────────────────────────────────────────
//
// One per LIVE /fb-read hook. The hook is the question the ad asked, so the theme
// is the pool of women who would answer it — not a topic label applied afterwards.
// `bucket`/`sub_bucket` scope it first; the regex picks the flavour out of that.
//
// Each pattern is a superset of the hook's own wording ON PURPOSE. She does not
// arrive saying "will I love again" — she arrives saying "im 61 and i dont know who
// i am on my own". Matching only the headline would return the ad back to itself.
const THEMES = {
  'love-again': {
    label: 'Will I love again?',
    frame: 'self-frame · heartbreak, NOT bereavement',
    buckets: ['love'],
    subBuckets: ['SEEKING_LOVE', 'LOST_LOVE'],
    // Loneliness/Timing + the self-facing half of Healing/Moving-on. She is asking
    // about HER future, not about one man's behaviour.
    pattern: [
      'love again', 'find love again', 'will i ever', 'is there someone',
      'someone (out there|for me)', 'find (true |real )?love', 'find someone',
      'meet someone', 'meet the right', 'another chance', 'second chance',
      '\\yalone\\y', 'lonel', 'on my own', '\\ymy age\\y', 'too old',
      'start(ing)? over', 'move on', 'moving on', 'let (him|her|them) go',
      'get over', 'given up', 'giving up', 'open (my|her) heart', 'heart again',
      'be loved again', 'happy again', 'who i am', 'lost myself',
    ].join('|'),
  },
  'still-think': {
    label: 'Does he still think about me?',
    frame: 'decode-him · answer NEITHER way on what he thinks',
    buckets: ['love', 'someone'],
    subBuckets: ['LOST_LOVE', 'REUNION'],
    // Reunion/Return. The reunion-flavoured half — she is still oriented at HIM.
    pattern: [
      'think(s|ing)? (about|of) me', 'cross(es)? (his|her) mind', '\\yon (his|her) mind\\y',
      'miss(es)? me', 'come(s)? back', 'coming back', 'back together', '\\yreturn',
      'reconcile', 'reunite', 'get (him|her) back', 'want(s)? me back',
      'still (love|loves|care|cares|want|wants|think|thinks|have feelings|has feelings)',
      'do(es)? (he|she) still', '\\yghost(ed|ing)?\\y', 'no contact',
      'stopped (talking|texting|responding|communicating)', 'cut (me )?off',
      '\\yregret', 'any (hope|chance)', 'still possible', 'was it real',
      'what (went|did) (wrong|happen)', 'why did (he|she)',
    ].join('|'),
  },
  'hiding-something': {
    label: 'Is he hiding something from me?',
    frame: 'decode-him · never rule IN or OUT, never name the contents',
    buckets: ['love', 'someone'],
    subBuckets: ['BETRAYAL', 'TRUST_TRUTH'],
    // Trust/Honesty. Note the scam arm: money sent, never met. It is a real and
    // frequent slice of this hook, and the guard still bans naming what sits behind
    // the gap — including "he is a scammer".
    pattern: [
      '\\yhid(e|es|ing|den)\\y', '\\ysecret(s|ly)?\\y', '\\ylie\\y', '\\ylies\\y',
      '\\ylied\\y', '\\ylying\\y', 'not (being )?honest', 'honest with me',
      '\\ytruth\\y', '\\ytrust\\y', 'cheat(s|ed|ing)?\\y', '\\yaffair',
      'another woman', 'someone else', 'unfaithful', 'betray', 'suspicious',
      'not telling me', '\\yscam', 'catfish', '\\yreal (person|man)\\y',
      'never met', 'sent (him|money)', 'phone', 'hiding something',
    ].join('|'),
  },
};

// ── redaction ───────────────────────────────────────────────────────────────
//
// 🔴 BEST EFFORT, NOT A GUARANTEE, AND THE RAW FILE IS GITIGNORED FOR THAT REASON.
// The corpus is mostly lowercase and unpunctuated, so capitalisation carries no
// signal here — "i was married 27 years and david left in february" is typical.
// That kills every heuristic that leans on case and leaves two reliable tools:
//
//   1. THE ROW'S OWN COLUMNS. `first_name` and `person_name` are exactly the two
//      names most likely to appear in her text, and we have them verbatim. This is
//      the precise half of the redaction and it is why quotes are never read from
//      the concern alone.
//   2. A GAZETTEER, deliberately conservative.
//
// 🔴 A NAME THAT IS ALSO A COMMON WORD IS NOT REDACTED. In THIS corpus "hope",
// "faith", "grace", "joy", "will", "may", "rose", "patience" and "destiny" are what
// she is writing ABOUT. Redacting them would gut the meaning of the quote to protect
// a name that is usually not a name. The trade is deliberate: recall is sacrificed
// for the readability of the evidence, and the raw file stays out of git.
const NAMES = `
david michael robert james john richard thomas daniel matthew anthony steven andrew
joshua kenneth brian george edward ronald timothy jason jeffrey nicholas stephen
justin brandon benjamin samuel gregory alexander patrick dennis jerry tyler aaron
jose henry adam douglas nathan peter zachary kyle walter harold jeremy keith roger
gerald ethan arthur terry christian sean lawrence austin jesse albert bruce gabriel
alan juan logan wayne ralph eugene randy vincent russell louis philip johnny bobby
kevin jimmy paul carlos martin dylan raymond
mary patricia jennifer linda elizabeth barbara susan jessica sarah karen nancy lisa
betty margaret sandra ashley kimberly emily donna michelle amanda dorothy melissa
deborah stephanie rebecca sharon laura cynthia kathleen angela shirley anna brenda
pamela emma nicole helen samantha katherine christine debra rachel carolyn janet
catherine maria heather diane olivia julie joyce victoria christina lauren joan
judith megan cheryl andrea hannah martha jacqueline frances gloria teresa kathryn
janice alice madison doris abigail julia sophia marilyn theresa beverly denise
lori tiffany natalie brittany charlotte marie
`.trim().split(/\s+/);

// Countries/regions and US states with no everyday second meaning. Deliberately
// omitted, because in THIS corpus they are ordinary words far more often than
// places: china (a china cup — this is a TEA-LEAF funnel), turkey, chile, jordan,
// georgia, washington, phoenix, reading, mobile, salem.
const PLACES = `
england scotland ireland wales britain australia canada germany france spain italy
portugal greece poland romania mexico brazil colombia nigeria ghana kenya uganda
philippines indonesia malaysia vietnam thailand pakistan bangladesh
london manchester liverpool birmingham glasgow edinburgh dublin belfast leeds
sheffield bristol nottingham newcastle cardiff sydney melbourne brisbane toronto
vancouver montreal chicago houston dallas atlanta denver seattle boston philadelphia
detroit minneapolis baltimore milwaukee memphis nashville portland sacramento
texas california florida ohio michigan arizona nevada colorado oregon kansas
nebraska alabama kentucky tennessee missouri wisconsin minnesota oklahoma arkansas
mississippi louisiana iowa utah idaho montana wyoming virginia carolina dakota
`.trim().split(/\s+/);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordList = (list) => new RegExp(`\\b(${list.map(esc).join('|')})\\b`, 'gi');
const NAME_RE = wordList(NAMES);
const PLACE_RE = wordList(PLACES);

/**
 * Redact one concern. `row` supplies the two names we actually know.
 * Returns { text, hits } so a run can be audited rather than trusted.
 */
export function redact(concern, row = {}) {
  const hits = [];
  let t = String(concern);
  const mark = (re, tag) => {
    t = t.replace(re, (m) => { hits.push(`${tag}:${m}`); return tag; });
  };

  // Contact details first — they are unambiguous and would survive the word lists.
  mark(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]');
  mark(/\bhttps?:\/\/\S+/gi, '[URL]');
  mark(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[PHONE]');

  // The row's own names — the precise half. Guard against a blank or one-letter
  // value, which would otherwise redact every occurrence of that letter.
  for (const v of [row.first_name, row.person_name]) {
    const n = String(v ?? '').trim();
    if (n.length >= 3) mark(new RegExp(`\\b${esc(n)}\\b`, 'gi'), '[NAME]');
  }

  mark(NAME_RE, '[NAME]');
  mark(PLACE_RE, '[PLACE]');
  return { text: t, hits };
}

// ── the pull ────────────────────────────────────────────────────────────────

function themeSql(t) {
  const buckets = t.buckets.map((b) => `'${b}'`).join(',');
  const subs = t.subBuckets.map((s) => `'${s}'`).join(',');
  return `bucket IN (${buckets}) AND sub_bucket IN (${subs}) AND concern ~* '(${t.pattern})'`;
}

async function pull() {
  const { client, canary, mode, redactedHost, isLocal } = await connectReadOnly({ live: LIVE });
  console.log(`\n/fb-read VOC pull · ${mode}\nDB: ${redactedHost}\nCanary: ${canary}\n`);
  if (isLocal) console.log('⚠ LOCAL sandbox DB — this holds walk rows, not the real corpus.\n');
  await beginReads(client, 180000);

  // Reproducible sampling. `random()` alone makes a re-run a different corpus, so a
  // quote in the doc could never be traced back to the pull that produced it.
  await client.query('SELECT setseed($1)', [SEED]);

  const REV = `COALESCE(main_purchase_amount,0) + COALESCE(bump_amount_cents,0)
    + CASE WHEN upsell_purchased THEN COALESCE(upsell_amount,0) ELSE 0 END
    + CASE WHEN upsell2_purchased THEN COALESCE(upsell2_amount,0) ELSE 0 END`;

  const out = { pulledAt: new Date().toISOString(), mode, seed: SEED, themes: {} };

  for (const [hook, t] of Object.entries(THEMES)) {
    const where = themeSql(t);

    // Economics over EVERY matching conversation — buyers and non-buyers. The quote
    // query below filters to buyers, which is right for reading and wrong for every
    // rate here, because the denominator is all conversations.
    const { rows: [econ] } = await client.query(`
      SELECT COUNT(*)::int                                            AS convos,
             COUNT(*) FILTER (WHERE ${PAID})::int                     AS buyers,
             COUNT(*) FILTER (WHERE ${PAID} AND upsell_offered)::int  AS reached_u1,
             COUNT(*) FILTER (WHERE upsell_purchased)::int            AS took_u1,
             COALESCE(SUM(CASE WHEN ${PAID} THEN ${REV} ELSE 0 END),0)::bigint AS revenue,
             MIN(created_at) AS first_seen, MAX(created_at) AS last_seen
        FROM conversations
       WHERE ${where} AND concern IS NOT NULL AND LENGTH(TRIM(concern)) > 8`);

    // Buy-rate by how much she wrote. This out-predicted every theme on the money
    // bucket (2.2×), so it is pulled for every hook rather than assumed to transfer.
    const { rows: lengths } = await client.query(`
      SELECT CASE WHEN LENGTH(concern) < 50 THEN '1. under 50'
                  WHEN LENGTH(concern) < 100 THEN '2. 50-99'
                  WHEN LENGTH(concern) < 200 THEN '3. 100-199'
                  WHEN LENGTH(concern) < 300 THEN '4. 200-299'
                  ELSE '5. 300+' END                        AS band,
             COUNT(*)::int                                  AS convos,
             COUNT(*) FILTER (WHERE ${PAID})::int           AS buyers,
             COALESCE(SUM(CASE WHEN ${PAID} THEN ${REV} ELSE 0 END),0)::bigint AS revenue
        FROM conversations
       WHERE ${where} AND concern IS NOT NULL AND LENGTH(TRIM(concern)) > 8
       GROUP BY 1 ORDER BY 1`);

    // The quotes. Buyers only — these are the women the funnel actually served, and
    // they are who the personas must sound like.
    const { rows: quotes } = await client.query(`
      SELECT id, concern, first_name, person_name, LENGTH(concern) AS len, created_at
        FROM conversations
       WHERE ${where} AND ${PAID}
         AND concern IS NOT NULL AND LENGTH(TRIM(concern)) > 40
       ORDER BY random() LIMIT ${QUOTES_PER_HOOK}`);

    out.themes[hook] = {
      ...t, econ, lengths,
      quotes: quotes.map((q) => {
        const { text, hits } = redact(q.concern, q);
        return { id: q.id, len: q.len, redacted: text, hits, raw: q.concern };
      }),
    };
    console.log(`  ${hook.padEnd(18)} ${String(econ.convos).padStart(6)} convos · ${String(econ.buyers).padStart(5)} buyers · ${quotes.length} quotes`);
  }

  await client.query('ROLLBACK');
  await client.end();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(RAW, JSON.stringify(out, null, 2));
  console.log(`\n  → ${RAW}  (gitignored — real customer text)\n`);
  return out;
}

// ── the doc ─────────────────────────────────────────────────────────────────
//
// Tables and evidence only. The PROSE — what each theme is, who she is, what it
// means for the build — is written by a human who has READ the quotes. Leading with
// a generated summary is the method error this project has already corrected once:
// stats confirm a theme you found by reading, they never surface it.

function buildDoc(data) {
  const L = [];
  const totals = { convos: 0, buyers: 0, revenue: 0 };
  for (const t of Object.values(data.themes)) {
    totals.convos += t.econ.convos;
    totals.buyers += t.econ.buyers;
    totals.revenue += Number(t.econ.revenue);
  }
  const per1k = (rev, n) => (n ? `$${Math.round((Number(rev) / n) * 1000 / 100).toLocaleString()}` : '—');

  L.push('# /fb-read love hooks — what she actually wrote, in her own words', '');
  L.push('**What this is.** The V1 `conversations` corpus behind the three live `/fb-read` hooks — the women who would answer each ad question, found by theme rather than by the headline itself. It is the source the seven eval personas in `improve-v1/fb-read/evals/personas.mjs` are composites of.', '');
  L.push(`**Data.** Pulled read-only ${data.pulledAt.slice(0, 10)} from the ${data.mode}. ${totals.convos.toLocaleString()} conversations, ${totals.buyers.toLocaleString()} of them buyers. Quotes are a reproducible random sample of **buyers** (seed \`${data.seed}\`); the rates below are over **all** conversations, buyers and non-buyers.`, '');
  L.push('**Quotes are redacted and verbatim otherwise** — spelling, typos and run-ons left exactly as she typed them. `[NAME]` and `[PLACE]` are substitutions; nothing else is changed.', '');
  L.push('**A sale means paid**, not "clicked checkout" — `main_paid_at` stamped by the Stripe webhook, or the buyer reached the upsell page. The raw `purchased` flag is set at checkout-click and over-counts by roughly 2.5×.', '');
  L.push('---', '', '## The three hooks', '');
  L.push('| Hook | The ad question | Convos | Buyers | Conv. | Rev/buyer | $ per 1,000 |');
  L.push('|---|---|---:|---:|---:|---:|---:|');
  for (const [hook, t] of Object.entries(data.themes)) {
    const e = t.econ;
    L.push(`| \`${hook}\` | ${t.label} | ${e.convos.toLocaleString()} | ${e.buyers.toLocaleString()} | ${pct(e.buyers, e.convos)} | ${e.buyers ? dollars(Number(e.revenue) / e.buyers) : '—'} | **${per1k(e.revenue, e.convos)}** |`);
  }
  L.push(`| **All three** | | **${totals.convos.toLocaleString()}** | **${totals.buyers.toLocaleString()}** | **${pct(totals.buyers, totals.convos)}** | **${totals.buyers ? dollars(totals.revenue / totals.buyers) : '—'}** | **${per1k(totals.revenue, totals.convos)}** |`);
  L.push('', '<!-- WRITE: what the ranking means. Which hook to spend into, and its ceiling. -->', '');
  L.push('---', '', '## How much she writes, and what it is worth', '');
  L.push('The strongest single predictor on the money bucket was not the theme but the LENGTH of what she typed. Pulled per hook here rather than assumed to carry over.', '');
  L.push('| Hook | Band | Convos | Buy-rate | $ per 1,000 |');
  L.push('|---|---|---:|---:|---:|');
  for (const [hook, t] of Object.entries(data.themes)) {
    for (const b of t.lengths) {
      L.push(`| \`${hook}\` | ${b.band.replace(/^\d\. /, '')} chars | ${b.convos.toLocaleString()} | ${pct(b.buyers, b.convos)} | ${per1k(b.revenue, b.convos)} |`);
    }
  }
  L.push('', '<!-- WRITE: does the length effect hold here? If it does it outranks hook choice. -->', '');

  for (const [hook, t] of Object.entries(data.themes)) {
    L.push('---', '', `## \`${hook}\` — ${t.label}`, '');
    L.push(`**Frame.** ${t.frame}`, '');
    L.push(`**Scope.** \`bucket IN (${t.buckets.join(', ')})\` · \`sub_bucket IN (${t.subBuckets.join(', ')})\` · ${t.econ.convos.toLocaleString()} conversations, ${t.econ.buyers.toLocaleString()} buyers.`, '');
    L.push('<!-- WRITE: what this theme is. Who she is. What she volunteers unprompted. -->', '');
    L.push('**Her words**', '');
    for (const q of t.quotes) L.push(`> ${q.redacted.replace(/\s+/g, ' ').trim()}`, '');
  }

  L.push('---', '', '## Method', '');
  L.push('```bash', 'LIVE_AUDIT_CONFIRM=1 node scripts/pull-read-voc.mjs --live   # pull (production, read-only)', 'node scripts/pull-read-voc.mjs --doc                        # rebuild this file from the pull', '```', '');
  L.push('The three theme patterns are in `scripts/pull-read-voc.mjs` and are the only definition of them. They are **re-derived** from the precision-audited sub-group regexes in `.claude/skills/fb-ad-question-mining`, not recovered from the original pull, whose script was never saved — so these counts supersede the "5,095 matches" recorded in the personas header rather than reproducing it.', '');
  L.push('Reads run inside a `READ ONLY` transaction, proven by a canary write that Postgres must reject. The raw pull, including unredacted text, stays in `audit-runs/read-voc/` and is gitignored.', '');
  L.push('**Redaction is best-effort.** Names that are also ordinary words are deliberately left in — in this corpus "hope", "faith", "grace" and "will" are what she is writing about. Check `hits` in the raw file to audit what a run actually caught.', '');
  return L.join('\n');
}

// ── run ─────────────────────────────────────────────────────────────────────
//
// 🔴 GUARDED. `redact` is exported so it can be unit-tested, and without this an
// `import { redact }` would run the module body — i.e. open a production
// connection as a side effect of a test.
if (import.meta.url !== pathToFileURL(process.argv[1]).href) {
  // imported, not executed — expose the helpers and do nothing else.
} else {
  await main();
}

async function main() {
let data;
if (DOC_ONLY) {
  if (!fs.existsSync(RAW)) {
    console.error(`🔴 no pull to build from: ${RAW}\n   run the pull first:  LIVE_AUDIT_CONFIRM=1 node scripts/pull-read-voc.mjs --live`);
    process.exit(2);
  }
  data = JSON.parse(fs.readFileSync(RAW, 'utf8'));
} else {
  data = await pull();
}

fs.writeFileSync(DOC, buildDoc(data));
const quoted = Object.values(data.themes).reduce((n, t) => n + t.quotes.length, 0);
const redactions = Object.values(data.themes).reduce((n, t) => n + t.quotes.reduce((m, q) => m + q.hits.length, 0), 0);
console.log(`  → ${DOC}  (${quoted} quotes, ${redactions} redactions)\n`);
}
