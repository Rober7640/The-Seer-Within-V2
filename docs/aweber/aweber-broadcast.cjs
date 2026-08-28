#!/usr/bin/env node
/**
 * AWeber broadcast tool — create + schedule daily emails via the API.
 *
 * Requires a token authorized with email.read + email.write (the "dev account" app).
 * Reads AWEBER_BROADCAST_* from .env, falling back to AWEBER_* for client creds.
 *
 *   AWEBER_BROADCAST_ACCESS_TOKEN   (required)
 *   AWEBER_BROADCAST_REFRESH_TOKEN  (required — rotates each refresh; persisted back to .env)
 *   AWEBER_BROADCAST_CLIENT_ID      (falls back to AWEBER_CLIENT_ID)
 *   AWEBER_BROADCAST_CLIENT_SECRET  (falls back to AWEBER_CLIENT_SECRET)
 *   AWEBER_ACCOUNT_ID, AWEBER_LIST_ID
 *
 * Usage (run at repo root):
 *   node docs/aweber/aweber-broadcast.cjs probe
 *   node docs/aweber/aweber-broadcast.cjs list
 *   node docs/aweber/aweber-broadcast.cjs create <html-file> --subject "..." [--text <txt-file>] [--list <id>]
 *   node docs/aweber/aweber-broadcast.cjs schedule <broadcastId> --at <ISO8601-UTC> [--list <id>]
 *
 * `create` makes an UNSCHEDULED DRAFT only (safe — nothing sends). `schedule` is a
 * separate, explicit step. Nothing in this script ever sends immediately.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(REPO, '.env');
const BASE = 'https://api.aweber.com/1.0';

// ── .env read/write (persist rotated refresh tokens) ────────────────────────
function readEnv() {
  return fs.readFileSync(ENV_PATH, 'utf8');
}
function getVal(text, k) {
  const m = text.match(new RegExp('^' + k + '=(.*)$', 'm'));
  if (!m) return undefined;
  let v = m[1].trim();
  if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}
function setVal(k, v) {
  let text = readEnv();
  const line = `${k}=${v}`;
  if (new RegExp('^' + k + '=', 'm').test(text)) {
    text = text.replace(new RegExp('^' + k + '=.*$', 'm'), line);
  } else {
    text = text.replace(/\n*$/, '\n') + line + '\n';
  }
  fs.writeFileSync(ENV_PATH, text);
}

let env = readEnv();
const ACCOUNT_ID = getVal(env, 'AWEBER_ACCOUNT_ID');
const DEFAULT_LIST = getVal(env, 'AWEBER_LIST_ID');
let accessToken = getVal(env, 'AWEBER_BROADCAST_ACCESS_TOKEN') || getVal(env, 'AWEBER_ACCESS_TOKEN');
const refreshToken = getVal(env, 'AWEBER_BROADCAST_REFRESH_TOKEN') || getVal(env, 'AWEBER_REFRESH_TOKEN');
const clientId = getVal(env, 'AWEBER_BROADCAST_CLIENT_ID') || getVal(env, 'AWEBER_CLIENT_ID');
const clientSecret = getVal(env, 'AWEBER_BROADCAST_CLIENT_SECRET') || getVal(env, 'AWEBER_CLIENT_SECRET');
// Which var names to persist a rotated token back into:
const usingBroadcastVars = !!getVal(env, 'AWEBER_BROADCAST_ACCESS_TOKEN');
const ACCESS_VAR = usingBroadcastVars ? 'AWEBER_BROADCAST_ACCESS_TOKEN' : 'AWEBER_ACCESS_TOKEN';
const REFRESH_VAR = usingBroadcastVars ? 'AWEBER_BROADCAST_REFRESH_TOKEN' : 'AWEBER_REFRESH_TOKEN';

if (!accessToken || !refreshToken) { console.error('Missing AWeber tokens in .env'); process.exit(1); }
if (!ACCOUNT_ID) { console.error('Missing AWEBER_ACCOUNT_ID in .env'); process.exit(1); }

async function refresh() {
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const r = await fetch('https://auth.aweber.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${creds}` },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: getVal(readEnv(), REFRESH_VAR) || refreshToken }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`token refresh failed ${r.status}: ${t.slice(0, 300)}`);
  const d = JSON.parse(t);
  accessToken = d.access_token;
  setVal(ACCESS_VAR, d.access_token);
  if (d.refresh_token) setVal(REFRESH_VAR, d.refresh_token); // rotates — persist it
  console.error('[auth] token refreshed + persisted to .env');
}

function encodeForm(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    p.append(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));
  }
  return p;
}
async function api(method, endpoint, body, retry = true) {
  // AWeber writes require application/x-www-form-urlencoded (JSON -> 415).
  const headers = { Authorization: `Bearer ${accessToken}` };
  const opts = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.body = encodeForm(body);
  }
  const r = await fetch(`${BASE}${endpoint}`, opts);
  if (r.status === 401 && retry) { await refresh(); return api(method, endpoint, body, false); }
  return r;
}

// ── helpers ─────────────────────────────────────────────────────────────────
function flag(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
function htmlToText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<(br|\/p|\/div|\/tr|\/h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    // Decode the entities we actually emit. The old catch-all `&[a-z]+;` -> ' ' turned every
    // &rsquo; into a space ("I don t draw for people one at a time"), so anything with
    // contractions shipped a mangled text part. Prefer --text for real sends; this is a fallback.
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&rarr;/g, '→').replace(/&hellip;/g, '…')
    .replace(/&amp;/g, '&').replace(/&zwnj;/g, '').replace(/&[a-z]+;/g, ' ')
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ')
    .split('\n').map(l => l.trim()).join('\n').trim();
}

// ── commands ────────────────────────────────────────────────────────────────
async function cmdProbe() {
  const list = flag('list', DEFAULT_LIST);
  const r = await api('GET', `/accounts/${ACCOUNT_ID}/lists/${list}/broadcasts?status=draft`);
  const t = await r.text();
  console.log('GET broadcasts ->', r.status);
  if (r.ok) { const d = JSON.parse(t); console.log('OK — email scope present. draft broadcasts:', d.total_size); }
  else console.log(t.slice(0, 400));
}

async function cmdList() {
  const list = flag('list', DEFAULT_LIST);
  for (const status of ['draft', 'scheduled']) {
    const r = await api('GET', `/accounts/${ACCOUNT_ID}/lists/${list}/broadcasts?status=${status}`);
    const d = JSON.parse(await r.text());
    console.log(`\n== ${status} (${d.total_size}) ==`);
    (d.entries || []).forEach(b => {
      const id = (b.self_link || '').split('/').pop();
      console.log(`  [${id}] ${b.subject || '(no subject)'}  ${b.scheduled_for ? '→ ' + b.scheduled_for : ''}`);
    });
  }
}

async function cmdCreate() {
  const file = process.argv[3];
  if (!file || file.startsWith('--')) { console.error('usage: create <html-file> --subject "..."'); process.exit(1); }
  const subject = flag('subject');
  if (!subject) { console.error('--subject is required'); process.exit(1); }
  const list = flag('list', DEFAULT_LIST);
  const html = fs.readFileSync(path.resolve(REPO, file), 'utf8');
  // AWeber stores html and text as separate fields. Deriving text from html loses link URLs,
  // so anything with real CTAs should pass --text (see esl-to-text.cjs in the backend deck).
  const textFile = flag('text');
  const text = textFile ? fs.readFileSync(path.resolve(REPO, textFile), 'utf8') : htmlToText(html);
  const payload = {
    subject,
    body_html: html,
    body_text: text,
    click_tracking_enabled: true,
    is_archived: false,
    notify_on_send: false,
  };
  const r = await api('POST', `/accounts/${ACCOUNT_ID}/lists/${list}/broadcasts`, payload);
  const t = await r.text();
  if (!r.ok) { console.error('CREATE FAILED', r.status, t.slice(0, 600)); process.exit(1); }
  const d = JSON.parse(t);
  const id = (d.self_link || '').split('/').pop();
  console.log(`DRAFT created. broadcastId=${id}  subject="${subject}"  list=${list}`);
  console.log('  (unscheduled — review in AWeber, then `schedule ' + id + ' --at <ISO>`)');
}

async function cmdSchedule() {
  const id = process.argv[3];
  const at = flag('at');
  if (!id || !at) { console.error('usage: schedule <broadcastId> --at <ISO8601-UTC, e.g. 2026-07-01T23:00:00Z>'); process.exit(1); }
  const list = flag('list', DEFAULT_LIST);
  const r = await api('POST', `/accounts/${ACCOUNT_ID}/lists/${list}/broadcasts/${id}/schedule`, { scheduled_for: at });
  const t = await r.text();
  if (!r.ok) { console.error('SCHEDULE FAILED', r.status, t.slice(0, 600)); process.exit(1); }
  console.log(`SCHEDULED broadcast ${id} for ${at} (UTC).`);
}

const cmd = process.argv[2];
const run = { probe: cmdProbe, list: cmdList, create: cmdCreate, schedule: cmdSchedule }[cmd];
if (!run) { console.error('commands: probe | list | create | schedule'); process.exit(1); }
run().catch(e => { console.error('ERR', e.message); process.exit(1); });
