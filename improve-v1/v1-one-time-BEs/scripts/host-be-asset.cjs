#!/usr/bin/env node
/**
 * Upload backend-deck imagery to S3. Sibling of docs/aweber/evelyn-tarot-emails/host-card.cjs,
 * which is left alone because it serves the LIVE tarot broadcasts.
 *
 * ⚠ WRITES TO A NEW PREFIX ON PURPOSE. `evelyn/tarot/*` already holds a DIFFERENT rendering of
 *   the deck and is referenced by tarot emails that have shipped or are scheduled (e.g.
 *   the-lovers.jpg in broadcast 61135582). Overwriting those keys would change artwork inside
 *   mail already in inboxes. The RWS deck therefore lives at `evelyn/tarot-rws/`.
 *
 * Usage (repo root):
 *   node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs card <slug> [...]
 *   node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs file <path> <s3-key>
 *
 * Cards are resized to 480px wide (2x the 240px email display) and JPEG-encoded.
 * Reads AWS_* + S3_BUCKET + ASSET_BASE_URL from repo .env. Idempotent within its own prefix.
 */
const fs = require('fs'), path = require('path'), os = require('os'), https = require('https');
const { execSync } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const ROOT = path.join(__dirname, '../../..');
const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const get = (k) => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); if (!m) throw new Error('missing ' + k); let v = m[1].trim(); if (v[0] === '"' || v[0] === "'") v = v.slice(1, -1); return v; };
const BASE = get('ASSET_BASE_URL').replace(/\/$/, ''), BUCKET = get('S3_BUCKET');
const s3 = new S3Client({ region: get('AWS_REGION'), credentials: { accessKeyId: get('AWS_ACCESS_KEY_ID'), secretAccessKey: get('AWS_SECRET_ACCESS_KEY') } });

const PROTECTED = /^evelyn\/tarot\//;   // the live deck. never write here from this script.

async function put(localPath, Key, ContentType) {
  if (PROTECTED.test(Key)) throw new Error(`refusing to write ${Key} — that prefix serves live broadcasts`);
  const Body = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key, Body, ContentType, CacheControl: 'public, max-age=31536000, immutable' }));
  const url = `${BASE}/${Key}`;
  const code = await new Promise((res, rej) => https.get(url, (r) => { r.resume(); res(r.statusCode); }).on('error', rej));
  console.log(`  ${String(Math.round(Body.length / 1024)).padStart(4)} KB  GET ${code}  ${url}`);
  return url;
}

(async () => {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === 'file') {
    const [src, key] = rest;
    await put(src, key, key.endsWith('.png') ? 'image/png' : 'image/jpeg');
  } else if (mode === 'card') {
    for (const slug of rest) {
      const src = path.join(ROOT, 'assets/tarot-rws', slug + '.png');
      if (!fs.existsSync(src)) { console.error(`  MISSING ${slug}`); continue; }
      // No resize. The source deck is 350x600 native; the email displays cards at 240px, so the
      // source is already only ~1.46x. `sips -Z 480` would scale the LONG edge to 480 and hand
      // back 280x480 — softer than the original. Convert format only.
      const out = path.join(os.tmpdir(), `rws-${slug}.jpg`);
      execSync(`sips -s format jpeg -s formatOptions 82 "${src}" --out "${out}"`, { stdio: 'ignore' });
      await put(out, `evelyn/tarot-rws/${slug}.jpg`, 'image/jpeg');
    }
  } else {
    console.error('usage: host-be-asset.cjs card <slug>... | file <path> <s3-key>');
    process.exit(1);
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
