#!/usr/bin/env bash
# narrate-sample.sh — REAL Marcus voice sample: four segments of real report text (narration-sample.json)
# through Chatterbox Turbo on Replicate, using the approved 10-second voice-v2 reference delivered as a
# one-hour signed S3 URL, then assembled with the marcus-audio-v1 recipe (atempo 0.9 + section pauses).
#
#   Writes: output/audio/marcus-real-voice-sample.mp3 (+ .wav), output/audio/segments/<n>-<predictionId>.wav,
#           output/audio/marcus-real-voice-sample.run.json (prediction ids, timings, hashes — NO token, NO signed URL)
#
# Refuses to run without a Replicate token. Reads REPLICATE_API_TOKEN or REPLICATE_API_KEY from the environment;
# if neither is exported it parses the repo-root .env for those two names plus AWS_ACCESS_KEY_ID,
# AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET (surrounding quotes stripped). The token is only ever placed in the
# Authorization header; it is never printed, logged or written. The signed URL lives in memory for the run only.
#
# This calls Replicate for real (costs money) and reads a private S3 object. It never touches n8n.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../../../../.." && pwd)"        # repo root (…/The-Seer-Within-V2-Production), 7 levels up
[ -f "$ROOT/package.json" ] && [ -d "$ROOT/node_modules/@aws-sdk/s3-request-presigner" ] || { echo "narrate-sample: repo root not found at $ROOT (expected package.json + node_modules/@aws-sdk/s3-request-presigner)" >&2; exit 1; }
FFMPEG="${MARCUS_LOCAL_FFMPEG:-/opt/homebrew/bin/ffmpeg}"
[ -x "$FFMPEG" ] || { echo "narrate-sample: ffmpeg not found at $FFMPEG" >&2; exit 1; }
[ -f "$HERE/narration-sample.json" ] || { echo "narrate-sample: narration-sample.json missing next to this script" >&2; exit 1; }
cd "$ROOT"
# One-time token gate in the shell (before any work) — value is never echoed.
if [ -z "${REPLICATE_API_TOKEN:-}" ] && [ -z "${REPLICATE_API_KEY:-}" ]; then
  if [ -f .env ] && grep -qE '^(REPLICATE_API_TOKEN|REPLICATE_API_KEY)=' .env; then
    echo "narrate-sample: token not exported; will read it from .env inside the runner (not printed)." >&2
  else
    echo "narrate-sample: REFUSING TO RUN — export REPLICATE_API_TOKEN (or REPLICATE_API_KEY), or put it in .env." >&2
    exit 2
  fi
fi
export NARRATE_ROOT="$ROOT" NARRATE_HERE="$HERE" NARRATE_FFMPEG="$FFMPEG"
exec node --input-type=module - <<'NODE'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ROOT = process.env.NARRATE_ROOT, HERE = process.env.NARRATE_HERE, FFMPEG = process.env.NARRATE_FFMPEG;
const FFPROBE = FFMPEG.replace(/ffmpeg$/, 'ffprobe');
// --- environment: exported values win; otherwise parse .env explicitly (quotes stripped). Never print values.
const WANT = ['REPLICATE_API_TOKEN', 'REPLICATE_API_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET'];
const env = {};
for (const k of WANT) if (process.env[k]) env[k] = process.env[k];
if (existsSync(join(ROOT, '.env'))) for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (!m || !WANT.includes(m[1]) || env[m[1]]) continue;
  let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v;
}
const token = env.REPLICATE_API_TOKEN || env.REPLICATE_API_KEY;
if (!token) { console.error('narrate-sample: REFUSING TO RUN — no Replicate token in the environment or .env.'); process.exit(2); }
for (const k of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET']) if (!env[k]) { console.error(`narrate-sample: missing ${k}`); process.exit(2); }

const spec = JSON.parse(readFileSync(join(HERE, 'narration-sample.json'), 'utf8'));
const pacing = spec.pacing; const tpl = spec.provider.requestBodyTemplate.input;
const outDir = join(ROOT, 'output', 'audio'), segDir = join(outDir, 'segments'); mkdirSync(segDir, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

// --- 1. one-hour signed URL for the approved 10-s reference (kept in memory only)
const s3 = new S3Client({ region: env.AWS_REGION, credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } });
const voiceUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: spec.provider.voice.privateObjectKey }), { expiresIn: 3600 });
const probeVoice = await fetch(voiceUrl, { method: 'GET', headers: { Range: 'bytes=0-63' } });
if (!probeVoice.ok) { console.error(`narrate-sample: signed voice URL not readable (HTTP ${probeVoice.status})`); process.exit(3); }
console.log(`voice reference ${spec.provider.voice.privateObjectKey} reachable via signed URL (expires in 1h; not recorded)`);

// --- 2. submit + poll each segment (seed = 1-based index, exactly as build-workflow.py)
const run = { startedAt: new Date().toISOString(), model: 'resemble-ai/chatterbox-turbo', voiceVersion: spec.provider.voice.version, voiceSha256: spec.provider.voice.sha256, segments: [] };
for (let i = 0; i < spec.segments.length; i++) {
  const s = spec.segments[i];
  const input = { ...tpl, text: s.text, reference_audio: voiceUrl, seed: i + 1 };
  const created = await fetch('https://api.replicate.com/v1/models/resemble-ai/chatterbox-turbo/predictions', { method: 'POST', headers, body: JSON.stringify({ input }) });
  const pred = await created.json();
  if (!created.ok || !pred.id) { console.error(`narrate-sample: create failed for ${s.id}: HTTP ${created.status} ${JSON.stringify(pred).slice(0, 300)}`); process.exit(4); }
  console.log(`${s.id}: prediction ${pred.id} ${pred.status} (${s.chars} chars, seed ${i + 1})`);
  let p = pred; const t0 = Date.now();
  while (!['succeeded', 'failed', 'canceled'].includes(p.status)) {
    if (Date.now() - t0 > 10 * 60 * 1000) { console.error(`narrate-sample: ${pred.id} timed out`); process.exit(5); }
    await sleep(5000);
    p = await (await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, { headers })).json();
  }
  if (p.status !== 'succeeded') { console.error(`narrate-sample: ${pred.id} ${p.status}: ${p.error}`); process.exit(6); }
  const url = Array.isArray(p.output) ? p.output[0] : p.output;
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  const ext = (new URL(url).pathname.match(/\.(wav|mp3|flac|ogg)$/i) || [, 'wav'])[1].toLowerCase();
  const file = join(segDir, `${String(i + 1).padStart(2, '0')}-${pred.id}.${ext}`); writeFileSync(file, bytes);
  const probe = JSON.parse(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'stream=sample_rate,codec_name:format=duration', '-of', 'json', file], { encoding: 'utf8' }).stdout);
  const rec = { id: s.id, predictionId: pred.id, status: p.status, chars: s.chars, seed: i + 1, file, bytes: bytes.length, sha256: sha(bytes), durationSeconds: Number(probe.format?.duration), sampleRate: Number(probe.streams?.[0]?.sample_rate), codec: probe.streams?.[0]?.codec_name, predictTimeSeconds: p.metrics?.predict_time ?? null, createdAt: p.created_at, completedAt: p.completed_at, outputUrlHost: new URL(url).host };
  run.segments.push(rec); console.log(`  -> ${rec.bytes} B, ${rec.durationSeconds}s @ ${rec.sampleRate} Hz, predict_time ${rec.predictTimeSeconds}s, sha256 ${rec.sha256.slice(0, 16)}…`);
}

// --- 3. assemble: same recipe as the local adapter (atempo per segment, silence between, then mp3)
const rate = run.segments[0].sampleRate || 24000; const fmt = `aformat=sample_fmts=s16:sample_rates=${rate}:channel_layouts=mono`;
const filters = [], order = [];
spec.segments.forEach((s, i) => { if (i > 0) { filters.push(`anullsrc=r=${rate}:cl=mono:d=${s.pauseBeforeMs / 1000},${fmt}[p${i}]`); order.push(`[p${i}]`); } filters.push(`[${i}:a]atempo=${pacing.timeStretchRatio},${fmt}[a${i}]`); order.push(`[a${i}]`); });
filters.push(`${order.join('')}concat=n=${order.length}:v=0:a=1[out]`);
const wav = join(outDir, 'marcus-real-voice-sample.wav'), mp3 = join(outDir, 'marcus-real-voice-sample.mp3');
let r = spawnSync(FFMPEG, ['-y', '-v', 'error', ...run.segments.flatMap(s => ['-i', s.file]), '-filter_complex', filters.join(';'), '-map', '[out]', wav], { encoding: 'utf8' });
if (r.status !== 0) { console.error('ffmpeg concat failed: ' + r.stderr); process.exit(7); }
r = spawnSync(FFMPEG, ['-y', '-v', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '3', mp3], { encoding: 'utf8' });
if (r.status !== 0) { console.error('ffmpeg mp3 failed: ' + r.stderr); process.exit(7); }
const dur = (f) => Number(JSON.parse(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', f], { encoding: 'utf8' }).stdout).format.duration);
const expected = run.segments.reduce((t, s) => t + s.durationSeconds / pacing.timeStretchRatio, 0) + spec.segments.reduce((t, s) => t + s.pauseBeforeMs / 1000, 0);
run.assembled = { wav: { path: wav, bytes: readFileSync(wav).length, sha256: sha(readFileSync(wav)), durationSeconds: dur(wav) }, mp3: { path: mp3, bytes: readFileSync(mp3).length, sha256: sha(readFileSync(mp3)), durationSeconds: dur(mp3) }, expectedDurationSeconds: Number(expected.toFixed(3)), pacing: { configVersion: pacing.configVersion, timeStretchRatio: pacing.timeStretchRatio, pausesMs: spec.segments.map(s => s.pauseBeforeMs), sampleRate: rate } };
run.rawSpeechSeconds = Number(run.segments.reduce((t, s) => t + s.durationSeconds, 0).toFixed(3));
run.totalPredictTimeSeconds = Number(run.segments.reduce((t, s) => t + (s.predictTimeSeconds || 0), 0).toFixed(3));
run.costNote = 'Replicate does not return a price in the prediction object; only metrics.predict_time. Check the Replicate billing page for the charge.';
run.finishedAt = new Date().toISOString();
writeFileSync(join(outDir, 'marcus-real-voice-sample.run.json'), JSON.stringify(run, null, 2) + '\n');
console.log(`assembled ${mp3}: ${run.assembled.mp3.durationSeconds}s (expected ${run.assembled.expectedDurationSeconds}s), ${run.assembled.mp3.bytes} B, sha256 ${run.assembled.mp3.sha256}`);
console.log(`run record: ${join(outDir, 'marcus-real-voice-sample.run.json')} (no token, no signed URL inside)`);
NODE
