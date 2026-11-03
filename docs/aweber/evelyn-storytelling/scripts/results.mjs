// Evelyn storytelling — RESULTS per sent email (READ-ONLY).
//
// What it answers: which emails (and so which FORMATS) actually sell — not just which get opened.
// Opens and buyer counts disagree on this list: 03 riddle + 04 old book had the LOWEST opens (~22%)
// and the MOST clicks and buyers (Oct 2026). Rank by buyers / revenue per 1k emailed, never by opens.
//
//  1. AWeber: every SENT broadcast on the home list since --since → emailed, opens, complaints, and
//     the /e/<code> link in its body.
//  2. Code → campaign: prod `email_link_codes` (falls back to `/e/<code>` lines in emails/*.md).
//  3. Prod DB funnel, SAME window for every email: lander arrivals in the 72h after the send →
//     signed-in → chatted (within 72h of their first click) → buyers + revenue (completed
//     credit_purchases within 72h of their first click). A fixed window stops early emails piling
//     up credit for later sales (the old 7-day sliding window in email-stats did exactly that).
//  4. Reconcile: emails whose sends-log row says "Scheduled … AWeber <id>" but whose broadcast is
//     gone (404) or never sent — 9 of them in Oct 2026 were deleted and their days used by other offers.
//
// Usage (from ~/tsw-preview):
//   OD="/Users/joel/Library/CloudStorage/OneDrive-altius/Fun Projects/The-Seer-Within-V2-Production-joel-chue/The-Seer-Within-V2-Production"
//   AWEBER_LIB="$OD/docs/aweber/evelyn-reframe-deck/scripts/aweber-lib.mjs" \
//     node --env-file="$OD/.env" docs/aweber/evelyn-storytelling/scripts/results.mjs [--since 2026-10-01] [--write]
//   --write   also writes ../RESULTS.md (generated — never hand-edit)
//   DB: EMAIL_STATS_DATABASE_URL, else DATABASE_URL. If the DB login fails the AWeber half still runs
//   and the report says so (2026-11-02: the .env prod password had been rotated → refresh it).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');                       // docs/aweber/evelyn-storytelling
const REPO = path.resolve(ROOT, '../../..');                 // ~/tsw-preview
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const SINCE = arg('--since', '2026-10-01');
const WRITE = process.argv.includes('--write');
const WINDOW_H = 72;

const LIB = process.env.AWEBER_LIB;
if (!LIB) { console.error('set AWEBER_LIB to a checkout of aweber-lib.mjs that has a .env (see header)'); process.exit(1); }
const { api, BASE } = await import(pathToFileURL(LIB).href);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- emails on disk: campaign, format, codes ----------
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const logRows = new Map();   // NN -> {format, status}
for (const line of readme.split('\n')) {
  const m = line.match(/^\| (\d\d) \| ([^|]+) \|/);
  if (m) { const cells = line.split('|').map(s => s.trim()); logRows.set(m[1], { format: m[2].trim(), status: cells.at(-2) || '', line }); }
}
const idToCampaign = new Map();   // AWeber broadcast id (from the sends log) -> campaign
const emails = new Map();    // campaign -> {nn, slug, format, codes:Set}
const codeToCampaign = new Map();
for (const f of fs.readdirSync(path.join(ROOT, 'emails')).filter(f => /^\d\d-.*\.md$/.test(f))) {
  const src = fs.readFileSync(path.join(ROOT, 'emails', f), 'utf8');
  const camp = src.match(/\*\*Campaign:\*\*\s*`?(story-[a-z0-9-]+)/)?.[1];
  if (!camp) continue;
  const nn = f.slice(0, 2);
  emails.set(camp, { nn, slug: f.replace(/\.md$/, ''), format: logRows.get(nn)?.format || '?', logStatus: logRows.get(nn)?.status || '' });
  for (const m of src.matchAll(/\/e\/([A-Za-z0-9_-]{5,})/g)) codeToCampaign.set(m[1], camp);
  // the sends-log row also carries the /e/ code and the AWeber id for emails whose file has no Short Link line
  const row = logRows.get(nn)?.line || '';
  for (const m of row.matchAll(/\/e\/([A-Za-z0-9_-]{5,})/g)) codeToCampaign.set(m[1], camp);
  for (const m of row.matchAll(/AWeber (\d{8})/g)) idToCampaign.set(+m[1], camp);
}

// ---------- AWeber: sent broadcasts ----------
const sent = [];
let url = `${BASE}/broadcasts?status=sent&ws.size=100`;
while (url) {
  const r = await api('GET', url);
  if (!r.ok) throw new Error(`AWeber list failed ${r.status} — never read a failed list as "nothing sent"`);
  const entries = r.json.entries || [];
  sent.push(...entries);
  if (!entries.length || new Date(entries.at(-1).sent_at) < new Date(SINCE)) break;
  url = r.json.next_collection_link || null;
}
const rows = [];
for (const b of sent.filter(b => new Date(b.sent_at) >= new Date(SINCE))) {
  const r = await api('GET', `${BASE}/broadcasts/${b.broadcast_id}`);
  await sleep(350);
  if (!r.ok) throw new Error(`AWeber broadcast ${b.broadcast_id} read failed ${r.status}`);
  const j = r.json, s = j.stats || {};
  const code = (j.body_html || '').match(/theseerwithin\.com\/e\/([A-Za-z0-9_-]{5,})/)?.[1] || null;
  rows.push({ id: j.broadcast_id, sent_at: j.sent_at, subject: (j.subject || '').replace(/\{\{ subscriber\.first_name \| capitalize \}\}/g, '{name}'),
    emailed: s.num_emailed || 0, opens: s.unique_opens || 0, complaints: s.num_complaints || 0, code, campaign: null });
}

// ---------- prod DB (optional) ----------
let db = null, dbNote = '';
try {
  const raw = process.env.EMAIL_STATS_DATABASE_URL || process.env.DATABASE_URL;
  if (!raw) throw new Error('no DATABASE_URL in env');
  const u = new URL(raw);
  const req = createRequire(path.join(REPO, 'package.json'));
  const pg = req('pg');
  db = new pg.Client({ host: u.hostname, port: +u.port || 5432, user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password), database: u.pathname.slice(1) || 'postgres', ssl: { rejectUnauthorized: false } });
  await db.connect();
  await db.query('SET default_transaction_read_only = on');
  const codes = rows.map(r => r.code).filter(Boolean);
  if (codes.length) for (const x of (await db.query('SELECT code, campaign FROM email_link_codes WHERE code = ANY($1)', [codes])).rows) codeToCampaign.set(x.code, x.campaign);
} catch (e) { dbNote = `⚠ prod DB not reached (${e.message}) — clicks/chats/buyers missing. Refresh EMAIL_STATS_DATABASE_URL.`; db = null; }

for (const r of rows) r.campaign = (r.code && codeToCampaign.get(r.code)) || idToCampaign.get(+r.id) || null;

const FUNNEL = `
  WITH clk AS (
    SELECT resolved_user_id uid, MIN(started_at) t0, COUNT(*) n
    FROM evelyn_lander_sessions
    WHERE campaign = $1 AND started_at >= $2::timestamptz AND started_at < $2::timestamptz + make_interval(hours => $3)
    GROUP BY 1)
  SELECT
    (SELECT COALESCE(SUM(n),0) FROM clk)                              AS clicks,
    (SELECT COUNT(*) FROM clk WHERE uid IS NOT NULL)                  AS signed,
    (SELECT COUNT(*) FROM clk k WHERE uid IS NOT NULL AND EXISTS (SELECT 1 FROM chat_sessions s
        WHERE s.user_id = k.uid AND s.started_at >= k.t0 AND s.started_at < k.t0 + make_interval(hours => $3))) AS chatted,
    (SELECT COUNT(DISTINCT k.uid) FROM clk k JOIN credit_purchases p ON p.user_id = k.uid AND p.status = 'completed'
        AND p.created_at >= k.t0 AND p.created_at < k.t0 + make_interval(hours => $3))                         AS buyers,
    (SELECT COALESCE(SUM(p.price_usd),0) FROM clk k JOIN credit_purchases p ON p.user_id = k.uid AND p.status = 'completed'
        AND p.created_at >= k.t0 AND p.created_at < k.t0 + make_interval(hours => $3))                         AS cents`;
if (db) {
  for (const r of rows.filter(r => r.campaign)) {
    const x = (await db.query(FUNNEL, [r.campaign, r.sent_at, WINDOW_H])).rows[0];
    Object.assign(r, { clicks: +x.clicks, signed: +x.signed, chatted: +x.chatted, buyers: +x.buyers, revenue: +x.cents / 100 });
  }
  await db.end();
}

// ---------- reconcile the sends log ----------
const sentCampaigns = new Set(rows.map(r => r.campaign).filter(Boolean));
const missing = [];
for (const [camp, e] of emails) {
  const id = e.logStatus.match(/AWeber (\d{8})/)?.[1];
  if (!id || sentCampaigns.has(camp) || !/Scheduled/i.test(e.logStatus)) continue;
  const r = await api('GET', `${BASE}/broadcasts/${id}`); await sleep(350);
  const state = r.status === 404 ? 'DELETED (404)' : (r.ok ? r.json.status : `read failed ${r.status}`);
  if (state !== 'scheduled' && state !== 'sent') missing.push({ nn: e.nn, camp, id, state });
}

// ---------- report ----------
const per1k = (n, d) => d ? (1000 * n / d) : 0;
const f1 = (x) => x.toFixed(1), f2 = (x) => x.toFixed(2);
const story = rows.filter(r => r.campaign?.startsWith('story-')).sort((a, b) => a.sent_at.localeCompare(b.sent_at));
const other = rows.filter(r => !r.campaign?.startsWith('story-')).sort((a, b) => a.sent_at.localeCompare(b.sent_at));
const L = [];
L.push(`# Evelyn storytelling — results (generated ${new Date().toISOString().slice(0, 10)}, sends since ${SINCE})`, '');
L.push(`> Generated by \`scripts/results.mjs\` — do not hand-edit. Funnel = first ${WINDOW_H}h after each send. Rank by **buyers / $ per 1k emailed**, not opens.`);
if (dbNote) L.push('', dbNote);
L.push('', '## Storytelling emails', '', '| Sent | # | Format | Subject | Emailed | Open % | Clicks/1k | Chats | Buyers | $/1k | Complaints/10k |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of story) {
  const e = emails.get(r.campaign) || {};
  L.push(`| ${r.sent_at.slice(0, 10)} | ${e.nn ?? '?'} | ${e.format ?? '?'} | ${r.subject.replace(/\|/g, '/')} | ${r.emailed} | ${f1(per1k(r.opens, r.emailed) / 10)} | ${r.clicks != null ? f1(per1k(r.clicks, r.emailed)) : '—'} | ${r.chatted ?? '—'} | ${r.buyers ?? '—'} | ${r.revenue != null ? f2(per1k(r.revenue, r.emailed)) : '—'} | ${f2(per1k(r.complaints, r.emailed) * 10)} |`);
}
// by format
const byFmt = new Map();
for (const r of story) { const k = (emails.get(r.campaign)?.format || '?').split('·')[0].trim() + ' · ' + ((emails.get(r.campaign)?.format || '').split('·')[1] || '').trim().split(' (')[0];
  const a = byFmt.get(k) || { n: 0, emailed: 0, opens: 0, clicks: 0, buyers: 0, revenue: 0 }; a.n++; a.emailed += r.emailed; a.opens += r.opens; a.clicks += r.clicks || 0; a.buyers += r.buyers || 0; a.revenue += r.revenue || 0; byFmt.set(k, a); }
L.push('', '## By format', '', '| Format | Sends | Open % | Clicks/1k | Buyers/1k | $/1k |', '|---|---|---|---|---|---|');
for (const [k, a] of [...byFmt].sort((x, y) => per1k(y[1].revenue, y[1].emailed) - per1k(x[1].revenue, x[1].emailed)))
  L.push(`| ${k} | ${a.n} | ${f1(per1k(a.opens, a.emailed) / 10)} | ${db ? f1(per1k(a.clicks, a.emailed)) : '—'} | ${db ? f2(per1k(a.buyers, a.emailed)) : '—'} | ${db ? f2(per1k(a.revenue, a.emailed)) : '—'} |`);
L.push('', '## Other sends on the same list (same days — the comparison bar)', '', '| Sent | Subject | Open % | Campaign |', '|---|---|---|---|');
for (const r of other) L.push(`| ${r.sent_at.slice(0, 10)} | ${r.subject.replace(/\|/g, '/')} | ${f1(per1k(r.opens, r.emailed) / 10)} | ${r.campaign || (r.code ? '/e/' + r.code : 'non-/e/ link')} |`);
L.push('', '## Sends log vs AWeber', '');
if (!missing.length) L.push('Every "Scheduled" row is still scheduled or was sent. ✅');
else { L.push('⚠ Logged as scheduled but NOT sent — fix the sends log (mark "not sent — slot reused") and treat them as available:', '');
  for (const m of missing) L.push(`- ${m.nn} \`${m.camp}\` — AWeber ${m.id}: ${m.state}`); }
const out = L.join('\n') + '\n';
console.log(out);
if (WRITE) { fs.writeFileSync(path.join(ROOT, 'RESULTS.md'), out); console.error(`wrote ${path.join(ROOT, 'RESULTS.md')}`); }
