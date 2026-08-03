#!/usr/bin/env node
/**
 * Host a tarot card for an Evelyn email hero: optimize PNG -> JPEG (<200KB) and upload to S3, verify GET.
 * Source deck: docs/aweber/tarot-images/<slug>.png  ->  S3 evelyn/tarot/<slug>.jpg
 * Usage (run at repo root):  node docs/aweber/evelyn-tarot-emails/host-card.cjs <card-slug>
 *   e.g.  node docs/aweber/evelyn-tarot-emails/host-card.cjs the-star
 * Reads AWS_* + S3_BUCKET + ASSET_BASE_URL from repo .env. Idempotent (re-running overwrites).
 */
const fs = require('fs'), path = require('path'), os = require('os'), https = require('https');
const { execSync } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const slug = process.argv[2];
if (!slug) { console.error('usage: host-card.cjs <card-slug>  (e.g. ace-of-cups)'); process.exit(1); }
const SRC = path.join(__dirname, '../tarot-images', slug + '.png');
if (!fs.existsSync(SRC)) { console.error('no source PNG:', SRC); process.exit(1); }

const env = fs.readFileSync(path.join(__dirname, '../../../.env'), 'utf8');
const get = (k) => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); if (!m) throw new Error('missing ' + k); let v = m[1].trim(); if (v[0] === '"' || v[0] === "'") v = v.slice(1, -1); return v; };
const REGION = get('AWS_REGION'), BUCKET = get('S3_BUCKET'), BASE = get('ASSET_BASE_URL').replace(/\/$/, '');

// optimize: PNG -> JPEG q82, step quality down until under 200KB
const out = path.join(os.tmpdir(), slug + '.jpg');
let q = 82;
execSync(`sips -s format jpeg -s formatOptions ${q} "${SRC}" --out "${out}"`, { stdio: 'ignore' });
while (fs.statSync(out).size > 200 * 1024 && q > 50) { q -= 8; execSync(`sips -s format jpeg -s formatOptions ${q} "${SRC}" --out "${out}"`, { stdio: 'ignore' }); }
const body = fs.readFileSync(out);
console.log(`optimized ${slug}.jpg -> ${Math.round(body.length / 1024)}KB (q${q})`);

(async () => {
  const s3 = new S3Client({ region: REGION, credentials: { accessKeyId: get('AWS_ACCESS_KEY_ID'), secretAccessKey: get('AWS_SECRET_ACCESS_KEY') } });
  const Key = `evelyn/tarot/${slug}.jpg`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key, Body: body, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const url = `${BASE}/${Key}`;
  await new Promise((res, rej) => https.get(url, (r) => { console.log(`uploaded -> ${url}  (GET ${r.statusCode})`); r.resume(); res(); }).on('error', rej));
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
