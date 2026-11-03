// Evelyn chat-email sales tally from STRIPE (READ-ONLY). Works when the prod DB is unreachable.
//
// Each email that links to Evelyn's chat (/e/ short link) gets every Evelyn V2 chat purchase from its
// send (10:30 UTC) until the next Evelyn chat email (max 72h), minus a baseline of what Evelyn makes on
// a day with no chat email (default $80/day, measured Sep 30–Oct 4 + no-ask days in Oct 2026).
// Output: net $ per 1k emailed — the ranking README "What sells" uses.
//
// Limits: Stripe can't see which link a buyer clicked, so overlapping effects (late sales, other
// personas' emails, repeat whales) land on whichever email was latest. Fine for ranking; not exact.
//
// Usage (from ~/tsw-preview):
//   AWEBER_LIB="$OD/docs/aweber/evelyn-reframe-deck/scripts/aweber-lib.mjs" \
//     node --env-file="$OD/.env" docs/aweber/evelyn-storytelling/scripts/stripe-tally.mjs [--since 2026-10-01] [--baseline 80]
// Key: STRIPE_READ_KEY (restricted rk_live_, read-only — preferred) else STRIPE_SECRET_KEY. Must be LIVE
// (sk_test_ sees only test payments). V2 chat purchases are PaymentIntents with metadata.app =
// 'the-seer-within-chat'; Evelyn = personaId 7f03b55e-9a35-4bb7-ac80-a5dff7228910.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const SINCE = arg('--since', '2026-10-01');
const BASE_PER_DAY = +arg('--baseline', '80');
const EVELYN = '7f03b55e-9a35-4bb7-ac80-a5dff7228910';
const KEY = process.env.STRIPE_READ_KEY || process.env.STRIPE_SECRET_KEY;
if (!KEY) throw new Error('no STRIPE_READ_KEY / STRIPE_SECRET_KEY in env');
if (KEY.includes('_test_')) throw new Error('Stripe key is TEST mode — it cannot see real sales. Use a live (ideally restricted read-only rk_live_) key.');
const { api, BASE } = await import(pathToFileURL(process.env.AWEBER_LIB).href);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// --- Stripe: Evelyn chat purchases ---
const since = Math.floor(Date.parse(SINCE) / 1000) - 3 * 86400;
const q = encodeURIComponent(`metadata['app']:'the-seer-within-chat' AND status:'succeeded' AND created>${since}`);
const buys = []; let page = null;
do {
  const r = await fetch(`https://api.stripe.com/v1/payment_intents/search?limit=100&query=${q}${page ? '&page=' + page : ''}`, { headers: { Authorization: 'Bearer ' + KEY } });
  const j = await r.json();
  if (!j.data) throw new Error('Stripe search failed: ' + JSON.stringify(j).slice(0, 200));
  for (const p of j.data) if (p.metadata?.personaId === EVELYN) buys.push({ t: p.created, usd: p.amount / 100, user: p.metadata.userId });
  page = j.has_more ? j.next_page : null;
} while (page);

// --- AWeber: sent broadcasts that link to Evelyn's chat ---
const sent = []; let url = `${BASE}/broadcasts?status=sent&ws.size=100`;
while (url) {
  const r = await api('GET', url);
  if (!r.ok) throw new Error(`AWeber list failed ${r.status}`);
  const e = r.json.entries || []; sent.push(...e);
  if (!e.length || new Date(e.at(-1).sent_at) < new Date(SINCE)) break;
  url = r.json.next_collection_link || null;
}
const chat = [];
for (const b of sent.filter(b => new Date(b.sent_at) >= new Date(SINCE))) {
  const r = await api('GET', `${BASE}/broadcasts/${b.broadcast_id}`); await sleep(350);
  const html = r.json.body_html || '';
  if (!/theseerwithin\.com\/e\//.test(html)) continue;
  chat.push({ id: b.broadcast_id, sent: r.json.sent_at, subject: r.json.subject.replace(/\{\{ subscriber\.first_name \| capitalize \}\}/g, '{name}'), emailed: r.json.stats.num_emailed, opens: r.json.stats.unique_opens });
}
chat.sort((a, b) => a.sent.localeCompare(b.sent));

// campaign labels from the sends log (AWeber id -> "NN Format")
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const label = new Map();
for (const line of readme.split('\n')) { const m = line.match(/^\| (\d\d) \| ([^|]+) \|/); if (m) for (const id of line.matchAll(/AWeber (\d{8})/g)) label.set(+id[1], `${m[1]} ${m[2].trim()}`); }

console.log(`| Sent | Email | Subject | Gap (days) | Window (h) | Buyers | $ | Net $ / 1k | Open % |\n|---|---|---|---|---|---|---|---|---|`);
chat.forEach((c, i) => {
  const t0 = Date.parse(c.sent.slice(0, 10) + 'T10:30:00Z') / 1000;
  const next = chat[i + 1] ? Date.parse(chat[i + 1].sent.slice(0, 10) + 'T10:30:00Z') / 1000 : Infinity;
  const t1 = Math.min(next, t0 + 72 * 3600), hours = (t1 - t0) / 3600;
  const gap = i ? (t0 - Date.parse(chat[i - 1].sent.slice(0, 10) + 'T10:30:00Z') / 1000) / 86400 : NaN;
  const w = buys.filter(b => b.t >= t0 && b.t < t1);
  const usd = w.reduce((s, b) => s + b.usd, 0), net = usd - BASE_PER_DAY * hours / 24;
  console.log(`| ${c.sent.slice(0, 10)} | ${label.get(+c.id) || '—'} | ${c.subject.slice(0, 60).replace(/\|/g, '/')} | ${isNaN(gap) ? '?' : gap.toFixed(0)} | ${hours.toFixed(0)} | ${new Set(w.map(b => b.user)).size} | ${usd.toFixed(0)} | ${(1000 * net / c.emailed).toFixed(2)} | ${(100 * c.opens / c.emailed).toFixed(1)} |`);
});
console.log(`\n(baseline $${BASE_PER_DAY}/day subtracted; first row's gap unknown — check the sends before --since)`);
