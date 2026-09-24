#!/usr/bin/env node
/**
 * build-marcus-audio.mjs
 * -----------------------------------------------------------------------------
 * Server-side Marcus (08) reading -> narrated audio, per Joel's marcus-audio-v1 spec.
 *
 * WHY THIS EXISTS (not n8n): n8n Cloud caps Code nodes at 60s and has no ffmpeg,
 * so it can neither run the queue-polling loop nor stitch. This module does both
 * and is the core of the server-side audio endpoints (Joel's plan: server does
 * the audio, n8n orchestrates).
 *
 * Follows Joel's spec exactly:
 *   - Narration is built from the STRUCTURED report (not flat text): each section
 *     (opening / numerology / personal card / each card / synthesis / closing) is
 *     spoken with a heading lead-in, flattened for speech (bullets -> sentences,
 *     markdown removed, "Image:" prefixes dropped).
 *   - Each section is split into <=480-char pieces (Chatterbox garbles long text).
 *   - Pauses (marcus-audio-v1.json): 300ms between pieces inside a section,
 *     600ms between sections, 900ms before the closing.
 *   - TTS: fal.ai Chatterbox via the QUEUE API (queue.fal.run) — reliable under
 *     fal's transient 503s. (Joel's draft used Replicate; we use fal, he knows.)
 *   - Assembly (Joel's narrate-sample.sh recipe): per-segment atempo=0.90
 *     (pitch-preserving) + an anullsrc silence of pauseBeforeMs before each
 *     segment, concat, then MP3.
 *
 * Requirements: Node 18+ (native fetch), ffmpeg on PATH (or --ffmpeg <path>),
 *   env FAL_AI_API_KEY (or --fal-key).
 *
 * Usage:
 *   node build-marcus-audio.mjs --report report.json --out marcus-audio.mp3
 *   # report.json = the structured report object {title,theme,opening,
 *   #   lifePathApplication,personalCardHeading,personalCardReading,synthesis,
 *   #   conclusion,sections:[{positionNumber,cardName,positionLabel,body}]}
 *
 * Options: --report <file> (required) --out <file> --voice <url> --chunk 480
 *   --conc 16 --tempo 0.90 --rate 44100 --ffmpeg <path> --fal-key <key>
 *   --script-out <file> (also write the built narration script JSON) --keep
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      a[k] = (k === 'keep') ? true : argv[++i];
    }
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));

const FAL_KEY = args['fal-key'] || process.env.FAL_AI_API_KEY || process.env.FAL_KEY;
const OUT = path.resolve(args.out || 'marcus-audio.mp3');
const VOICE = args.voice ||
  'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08/audio/voices/marcus-voice-v2-10s-7475c804.wav';
const CHUNK = parseInt(args.chunk || '480', 10);
const CONC = parseInt(args.conc || '16', 10);
const TEMPO = String(args.tempo || '0.90');
const RATE = parseInt(args.rate || '44100', 10);
const FFMPEG = args.ffmpeg || 'ffmpeg';
const KEEP = !!args.keep;

// marcus-audio-v1 pauses (ms)
const PAUSE = { paragraph: 300, section: 600, closing: 900 };

const SUBMIT_URL = 'https://queue.fal.run/fal-ai/chatterbox/text-to-speech';
const HEADERS = { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...m) => console.error('[marcus-audio]', ...m);
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

// ---------- flatten report text for speech ----------
function flatten(s) {
  return String(s || '')
    .replace(/^\s*Image:\s*/i, '')          // drop "Image:" lead-in
    .replace(/[*_#`>]/g, '')                 // markdown marks
    .replace(/^\s*[-•]\s*/gm, '')            // bullet markers
    .replace(/\s*\n\s*/g, ' ')               // join lines into flowing prose
    .replace(/\s+/g, ' ')
    .trim();
}

// split flowing text into <=max-char pieces on sentence boundaries
function splitPieces(text, max) {
  if (text.length <= max) return [text];
  const sents = text.match(/[^.!?]+[.!?]*/g) || [text];
  const out = [];
  let b = '';
  for (const s of sents) {
    if (b && (b + ' ' + s).length > max) { out.push(b.trim()); b = s; }
    else b = b ? b + ' ' + s : s;
  }
  if (b.trim()) out.push(b.trim());
  return out;
}

// ---------- build Joel-style section-tagged narration ----------
function buildNarration(report) {
  const parts = [];
  parts.push({ role: 'opening', sectionPause: 0,
    text: flatten(`${report.title}. ${report.theme}. ${report.opening}`) });
  if (report.lifePathApplication)
    parts.push({ role: 'numerology', sectionPause: PAUSE.section,
      text: flatten(`Your numerology foundation. ${report.lifePathApplication}`) });
  if (report.personalCardReading)
    parts.push({ role: 'personal-card', sectionPause: PAUSE.section,
      text: flatten(`${report.personalCardHeading || 'Your personal card.'} ${report.personalCardReading}`) });
  for (const s of (report.sections || [])) {
    const n = NUM[s.positionNumber] || String(s.positionNumber);
    const head = `Position ${n}. ${s.cardName}: ${s.positionLabel}.`;
    parts.push({ role: `card-${s.positionNumber}`, sectionPause: PAUSE.section,
      text: flatten(`${head} ${s.body}`) });
  }
  if (report.synthesis)
    parts.push({ role: 'synthesis', sectionPause: PAUSE.section,
      text: flatten(`How the reading comes together. ${report.synthesis}`) });
  parts.push({ role: 'closing', sectionPause: PAUSE.closing,
    text: flatten(`${report.conclusion} Marcus.`) });

  // explode each section into <=CHUNK pieces; first piece = section pause, rest = paragraph pause
  const segments = [];
  for (const part of parts) {
    const pieces = splitPieces(part.text, CHUNK);
    pieces.forEach((text, i) => {
      segments.push({
        index: segments.length + 1,
        role: part.role,
        pauseBeforeMs: i === 0 ? part.sectionPause : PAUSE.paragraph,
        chars: text.length,
        text,
      });
    });
  }
  segments[0].pauseBeforeMs = 0; // never a leading gap
  return segments;
}

// ---------- fal queue TTS ----------
async function falJson(url, opts = {}, tries = 6) {
  let last;
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(url, opts);
      if (res.status >= 500 || res.status === 429) throw new Error(`fal ${res.status}`);
      if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return await res.json();
    } catch (e) { last = e; await sleep(3000 * (t + 1)); }
  }
  throw last;
}
async function generate(seg) {
  const body = JSON.stringify({ text: seg.text, audio_url: VOICE, exaggeration: 0.25, temperature: 0.7, cfg: 0.5, seed: seg.index });
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const sub = await falJson(SUBMIT_URL, { method: 'POST', headers: HEADERS, body });
      for (let p = 0; p < 120; p++) {
        const st = await falJson(sub.status_url, { headers: HEADERS });
        if (st.status === 'COMPLETED') {
          const out = await falJson(sub.response_url, { headers: HEADERS });
          if (!out?.audio?.url) throw new Error('no audio url');
          return out.audio.url;
        }
        await sleep(3000);
      }
      throw new Error('poll timeout');
    } catch (e) { if (attempt === 7) throw e; await sleep(4000 * (attempt + 1)); }
  }
}
async function download(url, dest) {
  for (let t = 0; t < 5; t++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(`dl ${r.status}`); fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer())); return; }
    catch (e) { if (t === 4) throw e; await sleep(3000 * (t + 1)); }
  }
}
async function pool(items, conc, fn) {
  const res = new Array(items.length); let next = 0, done = 0;
  const worker = async () => { while (next < items.length) { const i = next++; res[i] = await fn(items[i], i); if (++done % 5 === 0 || done === items.length) log(`  ${done}/${items.length} segments`); } };
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, worker));
  return res;
}

// ---------- ffmpeg assembly (Joel's recipe) ----------
function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, cmdArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg ${c}: ${err.slice(-700)}`))));
  });
}
async function assemble(wavs, segs, out) {
  const fmt = `aformat=sample_fmts=s16:sample_rates=${RATE}:channel_layouts=mono`;
  const inputs = []; const filters = []; const order = [];
  wavs.forEach((w, i) => {
    inputs.push('-i', w);
    const pause = segs[i].pauseBeforeMs || 0;
    if (i > 0 && pause > 0) { filters.push(`anullsrc=r=${RATE}:cl=mono:d=${pause / 1000},${fmt}[p${i}]`); order.push(`[p${i}]`); }
    filters.push(`[${i}:a]atempo=${TEMPO},${fmt}[a${i}]`); order.push(`[a${i}]`);
  });
  filters.push(`${order.join('')}concat=n=${order.length}:v=0:a=1[out]`);
  await run(FFMPEG, ['-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-b:a', '192k', out]);
}

// ---------- main ----------
async function main() {
  if (!FAL_KEY) { log('ERROR: no fal key'); process.exit(1); }
  if (!args.report) { log('ERROR: --report <structured report json> required'); process.exit(1); }
  const t0 = Date.now();
  const report = JSON.parse(fs.readFileSync(path.resolve(args.report), 'utf8'));
  const segs = buildNarration(report);
  if (args['script-out']) fs.writeFileSync(path.resolve(args['script-out']), JSON.stringify(segs, null, 2));
  const roles = [...new Set(segs.map((s) => s.role.replace(/-\d+$/, '')))];
  log(`${segs.length} segments across sections [${roles.join(', ')}], ${CONC} concurrent`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'marcus-audio-'));
  const wavs = await pool(segs, CONC, async (seg, i) => {
    const url = await generate(seg);
    const dest = path.join(tmp, `seg-${String(i + 1).padStart(3, '0')}.wav`);
    await download(url, dest);
    return dest;
  });
  log(`generated ${wavs.length} clips in ${((Date.now() - t0) / 1000).toFixed(0)}s; assembling (atempo ${TEMPO} + pauses)...`);
  await assemble(wavs, segs, OUT);
  if (!KEEP) fs.rmSync(tmp, { recursive: true, force: true });

  const mb = (fs.statSync(OUT).size / 1e6).toFixed(1);
  log(`DONE -> ${OUT} (${mb} MB) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  process.stdout.write(OUT + '\n');
}
main().catch((e) => { log('FAILED:', e?.message || e); process.exit(1); });
