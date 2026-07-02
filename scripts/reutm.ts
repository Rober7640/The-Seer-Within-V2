// Re-UTM everything to the attribution scheme:
//   utm_content = the email's identity (daily: its date · sequence: email_N)
//   utm_term    = the creative (daily: blurb LV-XX · sequence: a cta slug)
// Local outbox HTML is the source of truth (transformed in place, idempotent) and is
// pushed to the live Kit broadcasts (90) + the 4 follow-up sequence emails. Throttled +
// retried so it survives Kit rate limits. Safe to re-run.
//   npx tsx scripts/reutm.ts
import 'dotenv/config';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const key = process.env.KIT_API_KEY;
if (!key) { console.error('❌ KIT_API_KEY not set'); process.exit(1); }
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.resolve(__dirname, '../docs/kit/luna-voss-emails/outbox');
const SEQ = 2800896;
const H = { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** fetch with backoff on Kit rate limits ("Retry later" / 429). */
async function kfetch(url: string, opts: any = {}, tries = 7): Promise<Response> {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, opts);
    if (r.status !== 429) return r;
    await sleep(2000 * (i + 1));
  }
  throw new Error('rate-limited after retries: ' + url);
}

const reutmDaily = (html: string, date: string) =>
  html.replace(/utm_content=(LV-\d+)/g, `utm_content=${date}&amp;utm_term=$1`);

const INTRO_OLD = 'utm_source=email&amp;utm_medium=evelyn_list&amp;utm_campaign=luna-referral&amp;utm_content=email_8';
const INTRO_NEW = 'utm_source=kit&amp;utm_medium=email&amp;utm_campaign=luna-followup&amp;utm_content=email_1&amp;utm_term=intro';

const SEQ_EMAILS = [
  { id: 9987296, file: '_luna-intro-from-evelyn.html', kind: 'intro' as const, publish: true },
  { id: 9987374, file: '_followup-2-horoscope-vs-chart.html', kind: 'followup' as const, cnt: 'email_2', term: 'horoscope-vs-chart' },
  { id: 9987375, file: '_followup-3-no-excuses.html', kind: 'followup' as const, cnt: 'email_3', term: 'no-excuses' },
  { id: 9987376, file: '_followup-4-the-real-question.html', kind: 'followup' as const, cnt: 'email_4', term: 'real-question' },
];
const reutmSeq = (html: string, e: any) =>
  e.kind === 'intro'
    ? html.split(INTRO_OLD).join(INTRO_NEW)
    : (html.includes('utm_term=') ? html : html.split(`utm_content=${e.cnt}`).join(`utm_content=${e.cnt}&amp;utm_term=${e.term}`));

// ── 1. Local daily outbox files (source of truth) ──
let localDaily = 0;
for (const f of readdirSync(OUTBOX)) {
  const m = f.match(/^(\d{4}-\d{2}-\d{2})\.html$/);
  if (!m) continue;
  const p = path.join(OUTBOX, f); const s = readFileSync(p, 'utf8');
  if (s.includes('utm_content=LV-')) { writeFileSync(p, reutmDaily(s, m[1])); localDaily++; }
}
console.log(`local daily files re-utm'd: ${localDaily}`);

// ── 2. Local sequence files ──
let localSeq = 0;
for (const e of SEQ_EMAILS) {
  const p = path.join(OUTBOX, e.file);
  if (!existsSync(p)) continue;
  const s = readFileSync(p, 'utf8'); const out = reutmSeq(s, e);
  if (out !== s) { writeFileSync(p, out); localSeq++; }
}
console.log(`local sequence files re-utm'd: ${localSeq}`);

// ── 3. Push local content to live Kit broadcasts (patch: content+subject) ──
const drafts: Record<string, any> = JSON.parse(readFileSync(path.join(OUTBOX, 'kit-drafts.json'), 'utf8'));
let kitOk = 0, kitFail = 0;
for (const [date, rec] of Object.entries(drafts)) {
  const file = path.join(OUTBOX, `${date}.html`);
  if (!existsSync(file)) { kitFail++; console.error(`  no local file ${date}`); continue; }
  const content = readFileSync(file, 'utf8');
  const p = await kfetch(`https://api.kit.com/v4/broadcasts/${rec.id}`, {
    method: 'PUT', headers: H, body: JSON.stringify({ subject: rec.subject, content, public: false, send_at: null }),
  });
  if (p.ok) kitOk++; else { kitFail++; console.error(`  broadcast ${date} HTTP ${p.status}`); }
  await sleep(250);
}
console.log(`Kit broadcasts updated: ${kitOk} (failed ${kitFail})`);

// ── 4. Live Kit sequence emails ──
let seqOk = 0, seqFail = 0;
for (const e of SEQ_EMAILS) {
  const g = await kfetch(`https://api.kit.com/v4/sequences/${SEQ}/emails/${e.id}`, { headers: H });
  const gd: any = await g.json();
  const se = gd?.email ?? gd?.sequence_email ?? gd;
  if (!se?.content) { seqFail++; console.error(`  seq ${e.id}: no content`); continue; }
  const out = reutmSeq(se.content, e);
  if (out === se.content) { console.log(`  seq ${e.id} (${e.file}): already current`); continue; }
  const body: any = { content: out };
  if ((e as any).publish) body.published = true;        // email 1 is live → promote
  const p = await kfetch(`https://api.kit.com/v4/sequences/${SEQ}/emails/${e.id}`, { method: 'PUT', headers: H, body: JSON.stringify(body) });
  if (p.ok) { seqOk++; console.log(`  seq ${e.id} (${e.file}) updated`); } else { seqFail++; console.error(`  seq ${e.id} HTTP ${p.status}`); }
  await sleep(300);
}
console.log(`Kit sequence emails updated: ${seqOk} (failed ${seqFail})\n\nDone.`);
