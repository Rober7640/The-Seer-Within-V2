#!/usr/bin/env node
/**
 * One-time OAuth2 helper to mint a broadcast-scoped AWeber token by re-authorizing
 * the EXISTING app (AWEBER_CLIENT_ID/SECRET) with email.read + email.write added.
 *
 * Confidential client (has secret) -> standard auth-code flow, Basic auth at token
 * exchange (same scheme server/lib/aweber.ts already uses to refresh). No PKCE needed.
 *
 * Usage (run at repo root):
 *   node docs/aweber/aweber-oauth.cjs url               # prints the Allow link
 *   node docs/aweber/aweber-oauth.cjs exchange "<code-or-redirected-url>"
 *
 * `exchange` accepts either the bare ?code value or the full https://localhost/?code=... URL.
 * On success it writes AWEBER_BROADCAST_ACCESS_TOKEN / AWEBER_BROADCAST_REFRESH_TOKEN to .env.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(REPO, '.env');
const REDIRECT_URI = 'https://localhost';
const SCOPES = ['account.read', 'list.read', 'subscriber.read', 'subscriber.write', 'email.read', 'email.write'];

function readEnv() { return fs.readFileSync(ENV_PATH, 'utf8'); }
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
  if (new RegExp('^' + k + '=', 'm').test(text)) text = text.replace(new RegExp('^' + k + '=.*$', 'm'), line);
  else text = text.replace(/\n*$/, '\n') + line + '\n';
  fs.writeFileSync(ENV_PATH, text);
}

const env = readEnv();
const clientId = getVal(env, 'AWEBER_CLIENT_ID');
const clientSecret = getVal(env, 'AWEBER_CLIENT_SECRET');
if (!clientId || !clientSecret) { console.error('Missing AWEBER_CLIENT_ID / AWEBER_CLIENT_SECRET in .env'); process.exit(1); }

function buildUrl() {
  const q = [
    'response_type=code',
    'client_id=' + encodeURIComponent(clientId),
    'redirect_uri=' + encodeURIComponent(REDIRECT_URI),
    'scope=' + SCOPES.map(encodeURIComponent).join('%20'),
    'state=tsw' + clientId.slice(0, 6),
  ].join('&');
  return 'https://auth.aweber.com/oauth2/authorize?' + q;
}

async function exchange(arg) {
  let code = arg;
  const m = arg.match(/[?&]code=([^&]+)/);
  if (m) code = decodeURIComponent(m[1]);
  code = code.trim();
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const r = await fetch('https://auth.aweber.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${creds}` },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
  });
  const t = await r.text();
  if (!r.ok) { console.error('EXCHANGE FAILED', r.status, t.slice(0, 500)); process.exit(1); }
  const d = JSON.parse(t);
  setVal('AWEBER_BROADCAST_ACCESS_TOKEN', d.access_token);
  setVal('AWEBER_BROADCAST_REFRESH_TOKEN', d.refresh_token);
  console.log('SUCCESS — broadcast token written to .env.');
  console.log('  granted scopes:', d.scope || '(not returned)');
  console.log('  expires_in:', d.expires_in, 's');
}

const cmd = process.argv[2];
if (cmd === 'url') {
  console.log(buildUrl());
} else if (cmd === 'exchange') {
  if (!process.argv[3]) { console.error('usage: exchange "<code-or-redirected-url>"'); process.exit(1); }
  exchange(process.argv[3]).catch(e => { console.error('ERR', e.message); process.exit(1); });
} else {
  console.error('commands: url | exchange');
  process.exit(1);
}
