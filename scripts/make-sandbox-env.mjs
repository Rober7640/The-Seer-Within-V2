// Generate .env.sandbox — the env file for running the app against the ISOLATED
// local Postgres sandbox with ZERO outbound side-effects.
//
//   node scripts/make-sandbox-env.mjs
//   DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts
//
// ── Why this file exists (learn from the 2026-07-14 miss) ─────────────────────
// The obvious approach — "just blank the API keys on the command line" — DOES NOT
// WORK on Windows:
//
//   1. PowerShell `$env:FB_ACCESS_TOKEN = ''` does not set the var to an empty
//      string, it DELETES it from the environment; then
//   2. server/index.ts does `import "dotenv/config"`, which sees the var missing
//      and happily repopulates it from the real `.env`.
//
// Net effect: a "sandboxed" test run fired 309 real Lead events at the live Meta
// pixel and made 309 AWeber calls (0 added — saved only by rate-limiting). The DB
// was correctly isolated; the *integrations* were not.
//
// The fix is to control what dotenv itself loads. dotenv honours DOTENV_CONFIG_PATH,
// so we hand it a file where every outbound credential is present-but-EMPTY. Empty
// string is falsy, so every integration guard (`if (!FB_ACCESS_TOKEN) return`) takes
// its no-op path — and dotenv never reaches the real .env at all.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, '.env');
const OUT = path.join(ROOT, '.env.sandbox');

const SANDBOX_DB = 'postgresql://postgres@127.0.0.1:5433/seer';

// Every outbound integration credential. Present-but-empty ⇒ the code's own
// "not configured" guard fires and the call is never made.
const MUTED = [
  'FB_ACCESS_TOKEN', 'FB_PIXEL_ID', 'FB_CAPI_ENDPOINT',
  'AWEBER_ACCESS_TOKEN', 'AWEBER_REFRESH_TOKEN', 'AWEBER_CLIENT_ID',
  'AWEBER_CLIENT_SECRET', 'AWEBER_ACCOUNT_ID', 'AWEBER_LIST_ID',
  'RESEND_API_KEY', 'RESEND_AUDIENCE_ID',
  'KIT_API_KEY', 'KIT_FORM_ID',
  'TRACKDESK_API_KEY',
  'POSTHOG_API_KEY', 'POSTHOG_HOST',
  'GOOGLE_ADS_CONVERSION_ID', 'GOOGLE_ADS_CONVERSION_LABEL',
  'NEVERBOUNCE_API_KEY',
  'SENTRY_DSN',
];

if (!fs.existsSync(SRC)) {
  console.error('No .env found — cannot derive .env.sandbox.');
  process.exit(1);
}

const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
const out = [];
const seen = new Set();

for (const line of lines) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue; // drop comments/blanks — this file is machine-generated
  const [, key, value] = m;

  if (MUTED.includes(key)) {
    if (!seen.has(key)) { out.push(`${key}=`); seen.add(key); }
    continue;
  }
  if (key === 'DATABASE_URL') {
    if (!seen.has(key)) { out.push(`DATABASE_URL=${SANDBOX_DB}`); seen.add(key); }
    continue;
  }
  if (key === 'STRIPE_SECRET_KEY') {
    // .env legitimately carries BOTH a test and a live key; dotenv keeps the LAST
    // one, which is live. Keep ONLY the test key.
    if (value.startsWith('sk_test_') && !seen.has(key)) { out.push(line); seen.add(key); }
    continue;
  }
  if (key === 'BASE_URL') {
    if (!seen.has(key)) { out.push('BASE_URL=http://localhost:5000'); seen.add(key); }
    continue;
  }
  out.push(line);
}

// The pool under test — identical to what the go-live SQL writes to production, so
// dev rehearses byte-for-byte what prod will get.
const pool = fs.readFileSync(path.join(ROOT, 'improve-v1', 'go-live-pool.json'), 'utf8');
out.push(`V1_PRICE_VARIANTS_JSON=${JSON.stringify(JSON.parse(pool))}`);
out.push('NODE_ENV=development');

fs.writeFileSync(OUT, out.join('\n') + '\n', 'utf8');

// ── Self-check: assert the dangerous keys really are empty ────────────────────
const written = fs.readFileSync(OUT, 'utf8');
const bad = MUTED.filter((k) => new RegExp(`^${k}=.+$`, 'm').test(written));
if (bad.length) {
  console.error('🔴 .env.sandbox still carries live credentials:', bad.join(', '));
  process.exit(1);
}
if (!/^DATABASE_URL=postgresql:\/\/postgres@127\.0\.0\.1:5433\/seer$/m.test(written)) {
  console.error('🔴 .env.sandbox is not pointed at the local sandbox DB.');
  process.exit(1);
}
if (/^STRIPE_SECRET_KEY=sk_live/m.test(written)) {
  console.error('🔴 .env.sandbox carries a LIVE Stripe key.');
  process.exit(1);
}

console.log('✅ .env.sandbox written');
console.log(`   DB      → ${SANDBOX_DB}`);
console.log(`   Stripe  → ${/^STRIPE_SECRET_KEY=sk_test/m.test(written) ? 'TEST key' : '(none)'}`);
console.log(`   Muted   → ${MUTED.length} outbound integrations (FB, AWeber, Resend, Kit, Trackdesk, PostHog, GAds, NeverBounce)`);
console.log(`   Pool    → improve-v1/go-live-pool.json (the exact go-live config)`);
